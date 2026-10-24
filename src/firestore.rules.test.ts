import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignRONumber } from './ro-numbering';
import { createAuditEntry, type AuditAction } from './audit-log';
import { deleteROsInChunks } from './ro-delete';

const PROJECT_ID = 'demo-dc-ocorrencias';
const ADMIN_UID = 'admin-with-claim';
const OLD_SHARED_UID = 'heEO6l4moPcnKoOmvgUlDAptSfX2';
const AGENT_UID = 'agent-uid-001';
const LEGACY_UID = 'legacy-shared-user';
const UNKNOWN_UID = 'unknown-uid';
const LEGACY_EMAIL = 'defesacivil0199@gmail.com';
const CURRENT_YEAR = String(new Date().getFullYear());
const CURRENT_YEAR_NUMBER = new Date().getFullYear();
const RULES_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'firestore.rules');

let testEnv: RulesTestEnvironment;

function authenticated(uid = AGENT_UID, token: Record<string, unknown> = {}) {
  return testEnv.authenticatedContext(uid, token).firestore();
}

function modularFirestore(compat: ReturnType<RulesTestContext['firestore']>): Firestore {
  return (compat as unknown as { _delegate: Firestore })._delegate;
}

function reportData(id: string, authorUid = AGENT_UID, re = '12345', extra: Record<string, unknown> = {}) {
  return {
    id,
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
    authorUid,
    agent: 'Agente Teste',
    re,
    roNumber: '',
    needsNumber: true,
    reporterName: 'Pessoa solicitante',
    address: 'Rua de teste',
    editHistory: [],
    lastAuditId: 'seed-audit-id',
    ...extra,
  };
}

function auditData(uid = AGENT_UID, action: AuditAction = 'ro_draft_created', roId = 'test-ro') {
  return {
    at: new Date().toISOString(),
    uid,
    agentName: 'Agente Teste',
    action,
    roId,
  };
}

async function seedPendingRO(id: string, extra: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'ros', id), reportData(id, AGENT_UID, '12345', extra));
  });
}

async function attemptNumberAssignment(db: ReturnType<RulesTestContext['firestore']>, roId: string, year: string, count: number, number: string) {
  const firestore = modularFirestore(db);
  const audit = {
    ...createAuditEntry({
    at: new Date().toISOString(),
    uid: AGENT_UID,
    agentName: 'Agente Teste',
    action: 'ro_number_assigned',
    roId,
    roNumber: number,
    }),
    id: `test-number-${roId}`,
  };
  const batch = writeBatch(db);
  batch.update(doc(firestore, 'meta', 'counter'), { year, count, lastRoId: roId, lastRoNumber: number });
  batch.update(doc(firestore, 'ros', roId), { roNumber: number, needsNumber: false, lastAuditId: audit.id });
  const { id, ...event } = audit;
  batch.set(doc(firestore, 'auditLog', id), event);
  return batch.commit();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8097,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'agentProfiles', AGENT_UID), { name: 'Agente Teste', display: 'Agente Teste', re: '12345' }),
      setDoc(doc(db, 'agentProfiles', 'agent-uid-002'), { name: 'Outro Agente', re: '54321' }),
      setDoc(doc(db, 'ros', 'pending-seed'), reportData('pending-seed')),
      setDoc(doc(db, 'meta', 'counter'), { year: CURRENT_YEAR, count: 0, lastRoId: '', lastRoNumber: '' }),
    ]);
  });
});

describe('identidade, autoria e legado', () => {
  it('autoriza o R.O. com perfil individual e autoria do próprio UID', async () => {
    const db = authenticated();
    const audit = createAuditEntry(auditData(AGENT_UID, 'ro_draft_created', 'new-agent-ro'));
    const ro = { ...reportData('new-agent-ro'), lastAuditId: audit.id };
    const batch = writeBatch(db);
    batch.set(doc(db, 'ros', ro.id), ro);
    const { id, ...event } = audit;
    batch.set(doc(db, 'auditLog', id), event);
    await assertSucceeds(batch.commit());
  });

  it('autoriza explicitamente a conta legada sem lhe dar privilégio administrativo', async () => {
    const db = authenticated(LEGACY_UID, { email: LEGACY_EMAIL });
    const audit = createAuditEntry({ ...auditData(LEGACY_UID, 'ro_draft_created', 'legacy-ro'), agentName: 'Conta legada' });
    const ro = { ...reportData('legacy-ro', LEGACY_UID, '54321'), lastAuditId: audit.id };
    const batch = writeBatch(db);
    batch.set(doc(db, 'ros', ro.id), ro);
    const { id, ...event } = audit;
    batch.set(doc(db, 'auditLog', id), event);
    await assertSucceeds(batch.commit());
    await assertFails(deleteDoc(doc(db, 'ros', 'pending-seed')));
  });

  it('não transforma perfil ausente em autorização e não mantém admin no UID legado fixo', async () => {
    const db = authenticated(UNKNOWN_UID);
    await assertFails(getDoc(doc(db, 'ros', 'pending-seed')));
    await assertFails(deleteDoc(doc(db, 'ros', 'pending-seed')));
    await assertFails(getDoc(doc(authenticated(OLD_SHARED_UID), 'ros', 'pending-seed')));
  });

  it('exige authorUid e rejeita autoria forjada', async () => {
    const db = authenticated();
    const noAuthor = { ...reportData('no-author') } as Record<string, unknown>;
    delete noAuthor.authorUid;
    await assertFails(setDoc(doc(db, 'ros', 'no-author'), noAuthor));

    const forged = reportData('forged-author', 'agent-uid-002');
    await assertFails(setDoc(doc(db, 'ros', 'forged-author'), forged));
  });

  it('exige que o RE do novo R.O. corresponda ao perfil individual', async () => {
    const db = authenticated();
    const audit = createAuditEntry(auditData(AGENT_UID, 'ro_draft_created', 'wrong-re-ro'));
    const ro = { ...reportData('wrong-re-ro', AGENT_UID, '54321'), lastAuditId: audit.id };
    const batch = writeBatch(db);
    batch.set(doc(db, 'ros', ro.id), ro);
    const { id, ...event } = audit;
    batch.set(doc(db, 'auditLog', id), event);
    await assertFails(batch.commit());
  });
});

describe('contador e reconciliação de numeração', () => {
  it('cria R.O. online primeiro e depois atribui o número em transação', async () => {
    const db = authenticated();
    const audit = createAuditEntry(auditData(AGENT_UID, 'ro_draft_created', 'online-ro'));
    const ro = { ...reportData('online-ro'), lastAuditId: audit.id };
    const batch = writeBatch(db);
    batch.set(doc(db, 'ros', ro.id), ro);
    const { id, ...event } = audit;
    batch.set(doc(db, 'auditLog', id), event);
    await assertSucceeds(batch.commit());

    const assignment = await assignRONumber(modularFirestore(db), ro.id, CURRENT_YEAR, { uid: AGENT_UID, agentName: 'Agente Teste' });
    expect(assignment?.roNumber).toBe(`001/${CURRENT_YEAR}`);
    expect((await getDoc(doc(db, 'ros', ro.id))).data()?.needsNumber).toBe(false);
    const counter = (await getDoc(doc(db, 'meta', 'counter'))).data();
    expect(counter?.count).toBe(1);
    expect(counter?.lastRoId).toBe(ro.id);
    expect(counter?.lastRoNumber).toBe(assignment?.roNumber);
  });

  it('recupera após o documento pendente tornar-se disponível e preserva dados vinculados', async () => {
    const db = authenticated();
    const noDocument = await assignRONumber(modularFirestore(db), 'offline-ro', CURRENT_YEAR, { uid: AGENT_UID, agentName: 'Agente Teste' });
    expect(noDocument).toBeNull();
    await seedPendingRO('offline-ro', {
      reporterName: 'Munícipe rural',
      interdicao: { active: true, numero: '' },
      photos: [{ id: 'photo-1', dataUrl: 'data:image/jpeg;base64,AA==', caption: 'Fachada' }],
    });
    const assigned = await assignRONumber(modularFirestore(db), 'offline-ro', CURRENT_YEAR, { uid: AGENT_UID, agentName: 'Agente Teste' });
    expect(assigned?.roNumber).toBe(`001/${CURRENT_YEAR}`);
    const persisted = (await getDoc(doc(db, 'ros', 'offline-ro'))).data();
    expect(persisted?.reporterName).toBe('Munícipe rural');
    expect(persisted?.interdicao).toEqual({ active: true, numero: '' });
    expect(persisted?.photos).toHaveLength(1);
  });

  it('atribui números distintos em chamadas concorrentes', async () => {
    const db = authenticated();
    await Promise.all([seedPendingRO('parallel-a'), seedPendingRO('parallel-b')]);
    const results = await Promise.all([
      assignRONumber(modularFirestore(db), 'parallel-a', CURRENT_YEAR, { uid: AGENT_UID, agentName: 'Agente Teste' }),
      assignRONumber(modularFirestore(db), 'parallel-b', CURRENT_YEAR, { uid: AGENT_UID, agentName: 'Agente Teste' }),
    ]);
    const numbers = results.map(result => result?.roNumber);
    expect(new Set(numbers).size).toBe(2);
    expect(numbers).toContain(`001/${CURRENT_YEAR}`);
    expect(numbers).toContain(`002/${CURRENT_YEAR}`);
  });

  it('reinicia em 001 apenas ao avançar para o ano atual do servidor', async () => {
    const db = authenticated();
    const previousYear = String(CURRENT_YEAR_NUMBER - 1);
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'meta', 'counter'), {
        year: previousYear,
        count: 44,
        lastRoId: 'previous-year-ro',
        lastRoNumber: `044/${previousYear}`,
      });
      await setDoc(doc(context.firestore(), 'ros', 'rollover-ro'), reportData('rollover-ro'));
    });
    const result = await assignRONumber(modularFirestore(db), 'rollover-ro', CURRENT_YEAR, {
      uid: AGENT_UID,
      agentName: 'Agente Teste',
    });
    expect(result?.roNumber).toBe(`001/${CURRENT_YEAR}`);
    const counter = (await getDoc(doc(db, 'meta', 'counter'))).data();
    expect(counter?.year).toBe(CURRENT_YEAR);
    expect(counter?.count).toBe(1);
    expect(counter?.lastRoId).toBe('rollover-ro');
  });

  it('rejeita número fora da sequência sem gravar RO, contador ou auditoria', async () => {
    const db = authenticated();
    await seedPendingRO('out-of-sequence');
    await assertFails(attemptNumberAssignment(db, 'out-of-sequence', CURRENT_YEAR, 1, `009/${CURRENT_YEAR}`));
    await testEnv.withSecurityRulesDisabled(async context => {
      const server = context.firestore();
      expect((await getDoc(doc(server, 'ros', 'out-of-sequence'))).data()?.needsNumber).toBe(true);
      expect((await getDoc(doc(server, 'meta', 'counter'))).data()?.count).toBe(0);
      expect((await getDoc(doc(server, 'auditLog', 'test-number-out-of-sequence'))).exists()).toBe(false);
    });
  });

  it('rejeita reutilização de número já atribuído e não deixa gravação parcial', async () => {
    const db = authenticated();
    await testEnv.withSecurityRulesDisabled(async context => {
      const server = context.firestore();
      await setDoc(doc(server, 'ros', 'already-numbered'), reportData('already-numbered', AGENT_UID, '12345', {
        needsNumber: false,
        roNumber: `001/${CURRENT_YEAR}`,
      }));
      await setDoc(doc(server, 'meta', 'counter'), {
        year: CURRENT_YEAR,
        count: 1,
        lastRoId: 'already-numbered',
        lastRoNumber: `001/${CURRENT_YEAR}`,
      });
      await setDoc(doc(server, 'ros', 'reuse-number'), reportData('reuse-number'));
    });

    await assertFails(attemptNumberAssignment(db, 'reuse-number', CURRENT_YEAR, 2, `001/${CURRENT_YEAR}`));
    await testEnv.withSecurityRulesDisabled(async context => {
      const server = context.firestore();
      expect((await getDoc(doc(server, 'ros', 'reuse-number'))).data()?.needsNumber).toBe(true);
      expect((await getDoc(doc(server, 'meta', 'counter'))).data()?.count).toBe(1);
    });
  });

  it('rejeita adulteração do contador mesmo com R.O. pendente legítimo', async () => {
    const db = authenticated();
    await seedPendingRO('counter-tamper');
    await assertFails(attemptNumberAssignment(db, 'counter-tamper', CURRENT_YEAR, 9, `009/${CURRENT_YEAR}`));
    await testEnv.withSecurityRulesDisabled(async context => {
      const server = context.firestore();
      expect((await getDoc(doc(server, 'ros', 'counter-tamper'))).data()?.needsNumber).toBe(true);
      expect((await getDoc(doc(server, 'meta', 'counter'))).data()?.count).toBe(0);
    });
  });

  it('rejeita mudança de ano que não corresponde ao ano do servidor', async () => {
    const db = authenticated();
    const invalidYear = String(CURRENT_YEAR_NUMBER + 1);
    await seedPendingRO('invalid-year');
    await assertFails(attemptNumberAssignment(db, 'invalid-year', invalidYear, 1, `001/${invalidYear}`));
    await testEnv.withSecurityRulesDisabled(async context => {
      const server = context.firestore();
      expect((await getDoc(doc(server, 'ros', 'invalid-year'))).data()?.needsNumber).toBe(true);
      expect((await getDoc(doc(server, 'meta', 'counter'))).data()?.year).toBe(CURRENT_YEAR);
    });
  });

  it('rejeita adulteração direta do contador', async () => {
    const db = authenticated();
    await assertFails(setDoc(doc(db, 'meta', 'counter'), {
      year: '2099', count: 1, lastRoId: 'inventado', lastRoNumber: '001/2099',
    }));
  });
});

describe('integridade do histórico e auditoria', () => {
  it('bloqueia substituição de editHistory por outro array do mesmo tamanho', async () => {
    const db = authenticated();
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'ros', 'history-ro'), reportData('history-ro', AGENT_UID, '12345', {
        needsNumber: false,
        roNumber: '009/2026',
        editHistory: [
          { at: '2026-01-01T00:00:00.000Z', by: 'A', action: 'Criado' },
          { at: '2026-01-02T00:00:00.000Z', by: 'B', action: 'Editado' },
        ],
      }));
    });
    await assertFails(setDoc(doc(db, 'ros', 'history-ro'), {
      ...reportData('history-ro', AGENT_UID, '12345', { needsNumber: false, roNumber: '009/2026' }),
      editHistory: [
        { at: '2026-01-02T00:00:00.000Z', by: 'B', action: 'Editado' },
        { at: '2026-01-01T00:00:00.000Z', by: 'A', action: 'Criado' },
      ],
    }));
  });

  it('rejeita ação de auditoria inválida e mantém R.O. + auditoria atômicos', async () => {
    const db = authenticated();
    const audit = { id: 'invalid-audit', ...auditData(AGENT_UID, 'ro_draft_created', 'invalid-event'), action: 'admin_override' as never };
    const ro = { ...reportData('invalid-event'), lastAuditId: audit.id };
    const batch = writeBatch(db);
    batch.set(doc(db, 'ros', ro.id), ro);
    const { id, ...event } = audit;
    batch.set(doc(db, 'auditLog', id), event);
    await assertFails(batch.commit());
    await testEnv.withSecurityRulesDisabled(async context => {
      expect((await getDoc(doc(context.firestore(), 'ros', ro.id))).exists()).toBe(false);
    });
  });

  it('rejeita evento ro_deleted sem exclusão correspondente no mesmo lote', async () => {
    const db = authenticated(ADMIN_UID, { admin: true });
    const audit = createAuditEntry(auditData(ADMIN_UID, 'ro_deleted', 'pending-seed'));
    const batch = writeBatch(db);
    const { id, ...event } = audit;
    batch.set(doc(db, 'auditLog', id), event);
    await assertFails(batch.commit());
    await testEnv.withSecurityRulesDisabled(async context => {
      expect((await getDoc(doc(context.firestore(), 'ros', 'pending-seed'))).exists()).toBe(true);
      expect((await getDoc(doc(context.firestore(), 'auditLog', id))).exists()).toBe(false);
    });
  });

  it('exclui mais de 500 registros em lotes auditados sem exceder o limite do Firestore', async () => {
    const db = authenticated(ADMIN_UID, { admin: true });
    const reports = Array.from({ length: 501 }, (_, index) => ({ id: `bulk-${index}`, roNumber: `${index + 1}/2026` }));
    await testEnv.withSecurityRulesDisabled(async context => {
      await Promise.all(reports.map(report => setDoc(doc(context.firestore(), 'ros', report.id), reportData(report.id))));
    });
    const result = await deleteROsInChunks(modularFirestore(db), reports, { uid: ADMIN_UID, agentName: 'Administrador' });
    expect(result).toEqual({ deleted: 501, total: 501 });
    await testEnv.withSecurityRulesDisabled(async context => {
      expect((await getDoc(doc(context.firestore(), 'ros', 'bulk-500'))).exists()).toBe(false);
    });
  });
});

describe('viaturas publicadas pelo painel', () => {
  it('agente autenticado lê; ninguém escreve pelo app, nem admin com claim', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'viaturas', 'VTR-001'), { prefixo: 'VTR-001', ordem: 0 });
    });
    await assertSucceeds(getDoc(doc(authenticated(AGENT_UID), 'viaturas', 'VTR-001')));
    await assertFails(getDoc(doc(authenticated(UNKNOWN_UID), 'viaturas', 'VTR-001')));
    await assertFails(setDoc(doc(authenticated(AGENT_UID), 'viaturas', 'VTR-009'), { prefixo: 'VTR-009', ordem: 9 }));
    await assertFails(setDoc(doc(authenticated(ADMIN_UID, { admin: true }), 'viaturas', 'VTR-009'), { prefixo: 'VTR-009', ordem: 9 }));
    await assertFails(deleteDoc(doc(authenticated(AGENT_UID), 'viaturas', 'VTR-001')));
  });
});

describe('papel administrativo', () => {
  it('admin precisa de custom claim; o antigo UID fixo não é suficiente', async () => {
    await assertFails(deleteDoc(doc(authenticated(OLD_SHARED_UID), 'ros', 'pending-seed')));
    await assertSucceeds(deleteDoc(doc(authenticated(ADMIN_UID, { admin: true }), 'ros', 'pending-seed')));
  });
});
