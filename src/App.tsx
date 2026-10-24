/**
 * Defesa Civil Cajamar/SP — Sistema Digital de Registro de Ocorrências
 */
import { lazy, Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { collection, doc, onSnapshot, writeBatch, query, orderBy, where, getDocFromServer } from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { X } from 'lucide-react';
import { db, auth } from './firebase';
import { addAuditToBatch, createAuditEntry, type AuditEntry } from './audit-log';
import { assignRONumber } from './ro-numbering';
import { BulkDeleteError, deleteROsInChunks } from './ro-delete';
import { acknowledgeRecoveryStep, acknowledgeRecoveryThrough, listRecoveryRecords, saveRecoveryRecord, type RecoveryRecord } from './sync-recovery';
import { checkAgentAuthorizationPure, type AgentIdentityState } from './ro-utils';
import { Screen, OccurrenceReport } from './types';
import { Agent, loadAgentIdentity, AGENTS } from './constants';
import { nowHHMM, getDefaultInterdicao, normalizeRO, createNewRO, reportUpdateFields } from './report-model';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';

// Telas pesadas carregam sob demanda: a tela inicial abre mais rápido em campo (rede fraca).
const WizardScreen = lazy(() => import('./wizard/WizardScreen').then(m => ({ default: m.WizardScreen })));
const ViewROScreen = lazy(() => import('./screens/ViewScreen').then(m => ({ default: m.ViewROScreen })));
const PrintScreen = lazy(() => import('./screens/PrintScreen').then(m => ({ default: m.PrintScreen })));
const PinScreen = lazy(() => import('./screens/PinScreen').then(m => ({ default: m.PinScreen })));

function AppInner() {
  const [screen, setScreen] = useState<Screen>('home');
  const [ros, setRos] = useState<OccurrenceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null | 'checking'>('checking');
  const [currentRO, setCurrentRO] = useState<OccurrenceReport | null>(null);
  const editMode = useRef(false);
  const editSnapshot = useRef<OccurrenceReport | null>(null);
  const [syncStates, setSyncStates] = useState<Record<string, 'pending' | 'confirmed' | 'rejected'>>({});
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [identity, setIdentity] = useState<AgentIdentityState | 'checking'>('checking');
  const [recoveryRecords, setRecoveryRecords] = useState<RecoveryRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEntry[]>([]);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState<string | null>(null);
  const remoteRecordState = useRef(new Map<string, 'pending-create' | 'exists' | 'missing'>());
  const numberingInFlight = useRef(new Set<string>());

  // ── Autenticação — carrega perfil individual ao logar ──
  useEffect(() => {
    let generation = 0;
    return onAuthStateChanged(auth, async u => {
      const current = ++generation;
      setUser(u);
      if (u) {
        setIdentity('checking');
        const resolved = await loadAgentIdentity(u);
        if (current === generation) setIdentity(resolved);
      } else {
        setIdentity({ status: 'unverified', reason: 'missing-profile' });
      }
    });
  }, []);

  useEffect(() => {
    if (!user || user === 'checking') return;
    void listRecoveryRecords().then(setRecoveryRecords).catch(() => {
      setSyncMessage('Não foi possível abrir a área local de recuperação. Os R.O.s atuais continuam na tela.');
    });
  }, [user]);

  // ── Sincronização em tempo real via Firestore (só se autenticado) ──
  // Solicita permissão de notificação ao logar
  useEffect(() => {
    if (!user || user === 'checking') return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const rosIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const reconcilePendingNumber = useCallback(async (ro: OccurrenceReport) => {
    if (!ro.needsNumber || !navigator.onLine || !user || user === 'checking' || identity === 'checking' || identity.status === 'unverified') return;
    if (numberingInFlight.current.has(ro.id)) return;
    numberingInFlight.current.add(ro.id);
    const actorName = identity.status === 'individual'
      ? (identity.profile.display ?? identity.profile.name ?? 'Agente')
      : 'Conta legada';
    try {
      for (let attempt = 0; attempt < 7 && navigator.onLine; attempt++) {
        const assignment = await assignRONumber(db, ro.id, new Date().getFullYear().toString(), {
          uid: user.uid,
          agentName: actorName,
        });
        if (assignment) {
          remoteRecordState.current.set(ro.id, 'exists');
          const patchRO = (current: OccurrenceReport): OccurrenceReport => {
            const updated = {
              ...current,
              roNumber: assignment.roNumber,
              needsNumber: false,
              lastAuditId: assignment.auditId || current.lastAuditId,
            };
            if (current.interdicao && (!current.interdicao.numero || current.interdicao.numero === current.roNumber)) {
              updated.interdicao = { ...current.interdicao, numero: assignment.roNumber };
            }
            return updated;
          };
          setRos(current => current.map(item => item.id === ro.id ? patchRO(item) : item));
          setCurrentRO(current => current?.id === ro.id ? patchRO(current) : current);
          setSyncStates(current => ({ ...current, [ro.id]: 'confirmed' }));
          return;
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 15000)));
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setSyncStates(current => ({ ...current, [ro.id]: 'rejected' }));
      setSyncMessage(`A numeração do R.O. ${ro.roNumber || ro.id} foi rejeitada pelo servidor. Os dados permanecem salvos como pendentes; corrija o motivo e tente novamente. ${reason}`);
    } finally {
      numberingInFlight.current.delete(ro.id);
    }
  }, [identity, user]);

  useEffect(() => {
    if (!user || user === 'checking') return;
    const q = query(collection(db, 'ros'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, { includeMetadataChanges: true }, snap => {
      const list = snap.docs.map(d => normalizeRO({ ...(d.data() as Partial<OccurrenceReport>), id: d.id }));
      setRos(list);
      if (!snap.metadata.fromCache) {
        setSyncStates(current => {
          const next = { ...current };
          for (const item of snap.docs) {
            next[item.id] = item.metadata.hasPendingWrites ? 'pending' : 'confirmed';
          }
          return next;
        });
      }
      setLoading(false);
      list.filter(ro => ro.needsNumber).forEach(ro => { void reconcilePendingNumber(ro); });

      // Notificação quando outro agente salva um R.O. novo
      if (!firstLoad.current && Notification.permission === 'granted') {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const ro = normalizeRO(change.doc.data() as Partial<OccurrenceReport>);
            if (!rosIds.current.has(ro.id) && ro.status === 'completed') {
              const ag = AGENTS.find(a => a.name === ro.agent);
              new Notification('🔶 Novo R.O. registrado', {
                body: `R.O. ${ro.roNumber} — ${ro.occurrenceTypeLabel || 'Ocorrência'}\n${ro.address || ''}\nPor: ${ag?.display ?? ro.agent ?? 'Agente'}`,
                icon: '/pwa-192x192.png',
              });
            }
          }
        });
      }
      firstLoad.current = false;
      rosIds.current = new Set(list.map(r => r.id));
    }, () => setLoading(false));
    return unsub;
  }, [user, reconcilePendingNumber]);

  useEffect(() => {
    if (!currentRO || !user || user === 'checking') {
      setAuditEvents([]);
      return;
    }
    const auditQuery = query(
      collection(db, 'auditLog'),
      where('roId', '==', currentRO.id),
      orderBy('at', 'asc'),
    );
    return onSnapshot(auditQuery, snapshot => {
      setAuditEvents(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AuditEntry)));
    }, () => setAuditEvents([]));
  }, [currentRO?.id, user]);

  // ── Offline ──
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on  = () => {
      setIsOnline(true);
      setRos(prev => {
        prev.filter(r => r.needsNumber).forEach(r => { void reconcilePendingNumber(r); });
        return prev; // sem mudança imediata; as atualizações chegam pelas promises acima
      });
    };
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [reconcilePendingNumber]);

  // ── Tema escuro ──
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('dc_dark') === '1'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('dc_dark', darkMode ? '1' : '0'); } catch { /* noop */ }
  }, [darkMode]);

  const handleNew = () => {
    editMode.current = false;
    setScreen('pin');
  };

  const handlePinConfirm = useCallback(async (agentData: Agent) => {
    const authorization = identity === 'checking'
      ? { authorized: false, reason: 'A identidade ainda está sendo verificada.' }
      : checkAgentAuthorizationPure(identity, agentData.re);
    const currentUid = user && user !== 'checking' ? user.uid : undefined;
    if (!authorization.authorized || !currentUid) {
      setSyncMessage(authorization.reason ?? 'Não foi possível verificar o usuário autenticado.');
      return;
    }

    const ro = createNewRO('');
    const legacy = identity !== 'checking' && identity.status === 'legacy';
    const initialRO: OccurrenceReport = {
      ...ro,
      roNumber: '',
      needsNumber: true,
      agent: agentData.name,
      re: agentData.re,
      role: agentData.role,
      agentLocked: true,
      authorUid: currentUid,
      editHistory: [],
    };
    const audit = createAuditEntry({
      at: new Date().toISOString(),
      uid: currentUid,
      agentName: legacy ? `Conta legada — ${agentData.name}` : agentData.display,
      action: 'ro_draft_created',
      roId: initialRO.id,
    });
    initialRO.lastAuditId = audit.id;

    remoteRecordState.current.set(initialRO.id, 'pending-create');
    setSyncStates(current => ({ ...current, [initialRO.id]: 'pending' }));
    setCurrentRO(initialRO);
    setScreen('wizard');

    const batch = writeBatch(db);
    batch.set(doc(db, 'ros', initialRO.id), initialRO);
    addAuditToBatch(batch, audit);
    void batch.commit().then(async () => {
      remoteRecordState.current.set(initialRO.id, 'exists');
      setSyncStates(current => ({ ...current, [initialRO.id]: 'confirmed' }));
      await acknowledgeRecoveryStep(initialRO.id, audit.id).catch(() => undefined);
      setRecoveryRecords(await listRecoveryRecords().catch(() => []));
      void reconcilePendingNumber(initialRO);
    }).catch(async error => {
      if (navigator.onLine) {
        const serverSnapshot = await getDocFromServer(doc(db, 'ros', initialRO.id)).catch(() => null);
        const serverData = serverSnapshot?.data();
        if (serverData?.lastAuditId !== audit.id &&
          typeof serverData?.updatedAt === 'string' && serverData.updatedAt > initialRO.updatedAt) {
          remoteRecordState.current.set(initialRO.id, 'exists');
          setSyncStates(current => ({ ...current, [initialRO.id]: 'confirmed' }));
          return; // Uma gravação posterior confirmou o snapshot completo do R.O.
        }
      }
      remoteRecordState.current.set(initialRO.id, 'missing');
      setSyncStates(current => ({ ...current, [initialRO.id]: 'rejected' }));
      const reason = error instanceof Error ? error.message : String(error);
      try {
        await saveRecoveryRecord({
          roId: initialRO.id,
          steps: [{ operation: 'create', report: initialRO as unknown as Record<string, unknown>, audit }],
          reason,
          updatedAt: new Date().toISOString(),
        });
        setRecoveryRecords(await listRecoveryRecords());
        setSyncMessage('O servidor rejeitou a criação do rascunho. Uma cópia recuperável foi guardada neste aparelho; reenvie pela tela inicial após corrigir o acesso.');
      } catch {
        setSyncMessage('O servidor rejeitou a criação e o aparelho não conseguiu guardar uma cópia de recuperação. Mantenha esta tela aberta e copie os dados antes de sair.');
      }
    });
  }, [identity, user, reconcilePendingNumber]);

  const handleUpdate = useCallback((updates: Partial<OccurrenceReport>) => {
    setCurrentRO(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      if (updates.roNumber) {
        const prevNumero = prev.interdicao?.numero;
        if (!prevNumero || prevNumero === prev.roNumber) {
          next.interdicao = {
            ...(prev.interdicao || getDefaultInterdicao(updates.roNumber)),
            ...(next.interdicao || {}),
            numero: updates.roNumber,
          };
        }
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentRO) return;
    const now = new Date().toISOString();
    const agentName = identity !== 'checking' && identity.status === 'individual'
      ? (identity.profile.display ?? identity.profile.name ?? 'Agente')
      : `Conta legada — ${AGENTS.find(a => a.name === currentRO.agent)?.display ?? currentRO.agent ?? 'Agente'}`;
    const isEdit = editMode.current;
    const currentUid = (user && user !== 'checking') ? user.uid : undefined;
    if (!currentUid) {
      setSyncMessage('Sessão não autenticada. O R.O. continua aberto e não foi enviado.');
      return;
    }
    const audit = createAuditEntry({
      at: now,
      uid: currentUid,
      agentName,
      action: isEdit ? 'ro_edited' : 'ro_saved',
      roId: currentRO.id,
      roNumber: currentRO.roNumber || undefined,
    });
    const saved: OccurrenceReport = {
      ...currentRO,
      endTime: currentRO.endTime || nowHHMM(),
      status: 'completed' as const,
      updatedAt: now,
      lastAuditId: audit.id,
    };
    const operation = remoteRecordState.current.get(saved.id) === 'exists' ? 'update' : 'create';
    const batch = writeBatch(db);
    const roRef = doc(db, 'ros', saved.id);
    if (operation === 'create') {
      batch.set(roRef, saved);
    } else {
      const mutable = { ...saved } as Partial<OccurrenceReport> & Record<string, unknown>;
      delete mutable.id;
      delete mutable.createdAt;
      delete mutable.authorUid;
      delete mutable.agent;
      delete mutable.re;
      delete mutable.editHistory;
      // A numeração é alterada exclusivamente pela transação de reconciliação.
      delete mutable.roNumber;
      delete mutable.needsNumber;
      batch.update(roRef, mutable);
    }
    addAuditToBatch(batch, audit);
    setSyncMessage(null);
    setSyncStates(current => ({ ...current, [saved.id]: 'pending' }));
    void batch.commit().then(async () => {
      remoteRecordState.current.set(saved.id, 'exists');
      setSyncStates(current => ({ ...current, [saved.id]: 'confirmed' }));
      await acknowledgeRecoveryThrough(saved.id, audit.id, audit.at).catch(() => undefined);
      setRecoveryRecords(await listRecoveryRecords().catch(() => []));
      if (saved.needsNumber) void reconcilePendingNumber(saved);
    }).catch(async error => {
      setSyncStates(current => ({ ...current, [saved.id]: 'rejected' }));
      const code = (error as { code?: string })?.code ?? '';
      const reason = error instanceof Error ? error.message : String(error);
      const permanent = ['permission-denied', 'invalid-argument', 'failed-precondition', 'not-found'].includes(code);
      try {
        await saveRecoveryRecord({
          roId: saved.id,
          steps: [{ operation, report: saved as unknown as Record<string, unknown>, audit }],
          reason,
          updatedAt: new Date().toISOString(),
        });
        setRecoveryRecords(await listRecoveryRecords());
        setSyncMessage(permanent
          ? 'O servidor rejeitou este R.O. por uma regra ou dado inválido. A cópia foi guardada neste aparelho; corrija a causa e use “Tentar sincronizar”.'
          : 'A sincronização falhou. O R.O. e a tentativa de auditoria foram guardados na recuperação local para nova tentativa.');
      } catch {
        setSyncMessage('O servidor rejeitou este R.O. e o aparelho não conseguiu guardar a cópia de recuperação. Mantenha esta tela aberta e exporte os dados antes de sair.');
      }
    });
    editSnapshot.current = null;
    editMode.current = false;
    setCurrentRO(saved);
    setScreen('view');
  }, [currentRO, user, identity, reconcilePendingNumber]);

  const handleCancel = useCallback(async () => {
    if (editMode.current && currentRO) {
      // Reverte para o snapshot salvo antes da edição, evitando mostrar dados não persistidos
      const snapshot = editSnapshot.current;
      editMode.current = false;
      editSnapshot.current = null;
      setCurrentRO(snapshot ?? currentRO);
      setScreen('view');
      return;
    }
    // “Salvar rascunho” persiste os dados do formulário em vez de descartar o que foi digitado.
    if (currentRO && user && user !== 'checking') {
      const operation = remoteRecordState.current.get(currentRO.id) === 'exists' ? 'update' : 'create';
      const audit = createAuditEntry({
        at: new Date().toISOString(),
        uid: user.uid,
        agentName: identity !== 'checking' && identity.status === 'individual'
          ? identity.profile.display ?? identity.profile.name ?? 'Agente'
          : `Conta legada — ${AGENTS.find(a => a.name === currentRO.agent)?.display ?? currentRO.agent}`,
        action: operation === 'create' ? 'ro_draft_created' : 'ro_draft_updated',
        roId: currentRO.id,
        roNumber: currentRO.roNumber || undefined,
      });
      const draft: OccurrenceReport = {
        ...currentRO,
        status: 'draft',
        updatedAt: new Date().toISOString(),
        lastAuditId: audit.id,
      };
      const batch = writeBatch(db);
      const ref = doc(db, 'ros', draft.id);
      if (operation === 'create') batch.set(ref, draft);
      else batch.update(ref, reportUpdateFields(draft));
      addAuditToBatch(batch, audit);
      setSyncStates(state => ({ ...state, [draft.id]: 'pending' }));
      void batch.commit().then(async () => {
        remoteRecordState.current.set(draft.id, 'exists');
        setSyncStates(state => ({ ...state, [draft.id]: 'confirmed' }));
        await acknowledgeRecoveryThrough(draft.id, audit.id, audit.at).catch(() => undefined);
        setRecoveryRecords(await listRecoveryRecords().catch(() => []));
        if (draft.needsNumber) void reconcilePendingNumber(draft);
      }).catch(async error => {
        setSyncStates(state => ({ ...state, [draft.id]: 'rejected' }));
        try {
          await saveRecoveryRecord({
            roId: draft.id,
            steps: [{ operation, report: draft as unknown as Record<string, unknown>, audit }],
            reason: error instanceof Error ? error.message : String(error),
            updatedAt: new Date().toISOString(),
          });
          setRecoveryRecords(await listRecoveryRecords());
          setSyncMessage('O rascunho não foi confirmado pelo servidor; a cópia local está disponível para reenvio na tela inicial.');
        } catch {
          setSyncMessage('Falha ao salvar o rascunho e ao criar a cópia local de recuperação. Mantenha a aplicação aberta para preservar os dados.');
        }
      });
      setRos(previous => previous.some(item => item.id === draft.id)
        ? previous.map(item => item.id === draft.id ? draft : item)
        : [...previous, draft]);
    }
    setScreen('home');
    setCurrentRO(null);
  }, [currentRO, user, identity, reconcilePendingNumber]);

  const handleView = (ro: OccurrenceReport) => { setCurrentRO(normalizeRO(ro)); setScreen('view'); };
  const handleBack = () => { setScreen('home'); setCurrentRO(null); };
  const handleEdit = () => {
    setCurrentRO(prev => {
      if (!prev) return null;
      const normalized = normalizeRO(prev);
      // Guarda snapshot para reverter se o agente cancelar a edição
      editSnapshot.current = normalized;
      return normalized;
    });
    editMode.current = true;
    setScreen('wizard');
  };

  const handleDelete = async (id: string) => {
    const currentUid = (user && user !== 'checking') ? user.uid : undefined;
    const ro = ros.find(r => r.id === id);
    if (!currentUid || !ro) return;
    try {
      const batch = writeBatch(db);
      const audit = createAuditEntry({
        at: new Date().toISOString(),
        uid: currentUid,
        agentName: identity !== 'checking' && identity.status === 'individual'
          ? identity.profile.display ?? identity.profile.name ?? 'Administrador'
          : 'Administrador',
        action: 'ro_deleted',
        roId: id,
        roNumber: ro.roNumber || undefined,
      });
      batch.delete(doc(db, 'ros', id));
      addAuditToBatch(batch, audit);
      await batch.commit();
      setSyncMessage(null);
    } catch (error) {
      setSyncMessage(`Não foi possível excluir o R.O. ${ro.roNumber}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const handleDeleteAll = async () => {
    if (!user || user === 'checking') throw new Error('Sessão não autenticada.');
    const targets = [...ros];
    setBulkDeleteMessage(null);
    try {
      const result = await deleteROsInChunks(db, targets, {
        uid: user.uid,
        agentName: identity !== 'checking' && identity.status === 'individual'
          ? identity.profile.display ?? identity.profile.name ?? 'Administrador'
          : 'Administrador',
      });
      setBulkDeleteMessage(`${result.deleted} R.O.s excluídos com sucesso.`);
    } catch (error) {
      const message = error instanceof BulkDeleteError
        ? `${error.message}. ${error.total - error.deleted} registros permanecem; tente excluir novamente.`
        : `Falha ao excluir os R.O.s: ${error instanceof Error ? error.message : String(error)}`;
      setBulkDeleteMessage(message);
      throw new Error(message);
    }
  };

  const retryRecovery = async (roId: string) => {
    const record = recoveryRecords.find(item => item.roId === roId);
    if (!record || !navigator.onLine) {
      setSyncMessage('Conecte-se à internet para tentar novamente.');
      return;
    }
    setSyncStates(current => ({ ...current, [roId]: 'pending' }));
    try {
      for (const step of record.steps) {
        const roRef = doc(db, 'ros', roId);
        const serverSnapshot = await getDocFromServer(roRef);
        const serverData = serverSnapshot.data();
        const serverIsNewer = typeof serverData?.updatedAt === 'string' &&
          typeof step.report.updatedAt === 'string' && serverData.updatedAt > step.report.updatedAt;
        if (serverData?.lastAuditId === step.audit.id || serverIsNewer) {
          await acknowledgeRecoveryStep(roId, step.audit.id);
          continue;
        }

        const batch = writeBatch(db);
        if (step.operation === 'create' && !serverSnapshot.exists()) {
          batch.set(roRef, step.report);
        } else if (serverSnapshot.exists()) {
          batch.update(roRef, reportUpdateFields(normalizeRO(step.report as Partial<OccurrenceReport>)));
        } else {
          throw new Error('O documento ainda não existe no servidor; a etapa de criação precisa ser recuperada primeiro.');
        }
        addAuditToBatch(batch, step.audit);
        await batch.commit();
        await acknowledgeRecoveryStep(roId, step.audit.id);
      }
      const remainingRecovery = await listRecoveryRecords();
      setRecoveryRecords(remainingRecovery);
      remoteRecordState.current.set(roId, 'exists');
      if (remainingRecovery.some(item => item.roId === roId)) {
        setSyncStates(current => ({ ...current, [roId]: 'pending' }));
        setSyncMessage('Uma etapa foi confirmada, mas ainda há alterações mais recentes aguardando tentativa.');
        return;
      }
      setSyncStates(current => ({ ...current, [roId]: 'confirmed' }));
      setSyncMessage('R.O. e trilha de auditoria confirmados pelo servidor.');
      const recovered = record.steps.at(-1)?.report as Partial<OccurrenceReport> | undefined;
      if (recovered?.needsNumber) void reconcilePendingNumber(normalizeRO(recovered));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const updated = { ...record, reason, updatedAt: new Date().toISOString() };
      await saveRecoveryRecord(updated).catch(() => undefined);
      setRecoveryRecords(await listRecoveryRecords().catch(() => recoveryRecords));
      setSyncStates(current => ({ ...current, [roId]: 'rejected' }));
      setSyncMessage(`A nova tentativa foi rejeitada. A cópia local continua preservada: ${reason}`);
    }
  };

  // Aguardando Firebase verificar sessão salva
  if (user === 'checking')
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1B3A6B]">
        <p className="text-blue-300 text-sm">🔶 Verificando acesso...</p>
      </div>
    );

  // Não autenticado → tela de login
  if (!user)
    return <LoginScreen onLogin={() => {}} />;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1B3A6B]">
        <div className="text-center text-white">
          <p className="text-2xl font-black mb-2">🔶 DEFESA CIVIL</p>
          <p className="text-sm text-blue-300">Carregando ocorrências...</p>
        </div>
      </div>
    );

  const offlineBanner = !isOnline && (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-yellow-900 text-xs font-bold text-center py-2 no-print leading-tight">
      ⚠️ Sem conexão — gravações ficam pendentes até o servidor confirmá-las
    </div>
  );

  const provisorioBanner = currentRO?.needsNumber && (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-xs font-bold text-center py-2 no-print leading-tight">
      📋 Sem conexão — número do R.O. será atribuído ao voltar online
    </div>
  );

  const currentSyncState = currentRO ? syncStates[currentRO.id] : undefined;
  const syncMessageBanner = syncMessage && (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-700 text-white text-xs font-bold text-center py-2 px-4 no-print leading-tight flex items-center justify-between gap-2">
      <span>⚠️ {syncMessage}</span>
      <button type="button" onClick={() => setSyncMessage(null)}
        className="shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
        <X size={12} />
      </button>
    </div>
  );

  if (screen === 'pin')
    return <PinScreen onConfirm={handlePinConfirm} onCancel={() => setScreen('home')} identity={identity} />;

  if (screen === 'wizard' && currentRO)
    return <>{offlineBanner}{provisorioBanner}{syncMessageBanner}<WizardScreen ro={currentRO} onUpdate={handleUpdate} onSave={handleSave} onCancel={handleCancel} /></>;

  if (screen === 'print' && currentRO)
    return <PrintScreen ro={currentRO} onClose={() => setScreen('view')} />;

  if (screen === 'view' && currentRO)
    return <>{offlineBanner}{syncMessageBanner}<ViewROScreen ro={currentRO} onBack={handleBack} onPrint={() => setScreen('print')} onEdit={handleEdit} auditEvents={auditEvents} syncState={currentSyncState} /></>;

  return <>{offlineBanner}<HomeScreen ros={ros} onNew={handleNew} onView={handleView} onDelete={handleDelete} onDeleteAll={handleDeleteAll}
    darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} onSignOut={() => signOut(auth)}
    recoveryRecords={recoveryRecords} onRetryRecovery={retryRecovery} syncMessage={syncMessage} bulkDeleteMessage={bulkDeleteMessage} /></>;
}


export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Carregando…</div>}>
      <AppInner />
    </Suspense>
  );
}
