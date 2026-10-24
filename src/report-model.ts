import { OccurrenceReport } from './types';
import { DEFAULT_AGENCIES } from './constants';

export function genId() {
  return Math.random().toString(36).slice(2, 11);
}

export function formatBRLInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (!num) return '';
  const val = (num / 100).toFixed(2);
  const [intPart, decPart] = val.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formattedInt},${decPart}`;
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getDefaultInterdicao(roNumber = ''): OccurrenceReport['interdicao'] {
  return {
    active: false,
    numero: roNumber,
    fichaAvaliacao: '',
    causas: [],
    causaOutros: '',
    danos: [],
    danosOutros: '',
    bensAfetados: [],
    valorParticular: '',
    valorMunicipal: '',
    valorEstadual: '',
    tipo: '',
    evacuarImovel: '',
    prazoAbandono: '',
    destinoMorador: '',
    destinoOutros: '',
    destinoContato: '',
    destinoTelefone: '',
    destinoEndereco: '',
    observacoes: '',
    responsavelTipo: '',
    responsavelNome: '',
    responsavelRG: '',
    responsavelTelefone: '',
    responsavelAssinatura: '',
  };
}

export function normalizeRO(raw: Partial<OccurrenceReport> = {}): OccurrenceReport {
  const roNumber = raw.roNumber || '';
  const defInterdicao = getDefaultInterdicao(roNumber);
  const rawInterdicao = (raw.interdicao || {}) as Partial<OccurrenceReport['interdicao']>;

  return {
    id: raw.id || genId(),
    roNumber,
    needsNumber: raw.needsNumber ?? false,
    emergency: raw.emergency ?? null,
    vehicle: raw.vehicle || '',
    date: raw.date || todayISO(),
    startTime: raw.startTime || nowHHMM(),
    endTime: raw.endTime || '',
    origin: raw.origin || '',
    originText: raw.originText || '',
    agent: raw.agent || '',
    re: raw.re || '',
    authorUid: raw.authorUid,   // undefined em R.O.s históricos — campo opcional para compatibilidade
    reporterName: raw.reporterName || '',
    rgCpf: raw.rgCpf || '',
    phone: raw.phone || '',
    reporterEmail: raw.reporterEmail || '',
    address: raw.address || '',
    addressNumber: raw.addressNumber || '',
    neighborhood: raw.neighborhood || '',
    occurrenceTypeId: raw.occurrenceTypeId || '',
    occurrenceTypeLabel: raw.occurrenceTypeLabel || '',
    quadrant: raw.quadrant || '',
    riskArea: raw.riskArea || '',
    dynamicFields: raw.dynamicFields || {},
    agencies: raw.agencies ?? DEFAULT_AGENCIES.map(a => ({ ...a })),
    losses: raw.losses ?? { furniture: false, food: false, clothes: false, documents: false, property: false, others: false, othersDesc: '', victims: '', injured: '', deaths: '' },
    photoScenario: raw.photoScenario || '',
    photos: raw.photos ?? [],
    photoConclusion: raw.photoConclusion || '',
    observations: raw.observations || '',
    declarant1: raw.declarant1 || '',
    declarant1Role: raw.declarant1Role || '',
    declarant1Sig: raw.declarant1Sig || '',
    agentParticipants: raw.agentParticipants ?? [],
    agentLocked: !!raw.agentLocked,
    filledBy: raw.filledBy || '',
    role: raw.role || '',
    relatedDocs: raw.relatedDocs || '',
    cobrade: raw.cobrade ?? { active: false, code: '', label: '' },
    conclusion: raw.conclusion || '',
    conclusionStatus: raw.conclusionStatus || ('' as any),
    encaminharDest: raw.encaminharDest ?? [],
    status: raw.status || 'draft',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    editHistory: raw.editHistory ?? [],
    interdicao: {
      ...defInterdicao,
      ...rawInterdicao,
      active: !!rawInterdicao.active,
      numero: rawInterdicao.numero || roNumber,
      causas: Array.isArray(rawInterdicao.causas) ? rawInterdicao.causas : [],
      danos: Array.isArray(rawInterdicao.danos) ? rawInterdicao.danos : [],
      bensAfetados: Array.isArray(rawInterdicao.bensAfetados) ? rawInterdicao.bensAfetados : [],
      valorParticular: rawInterdicao.valorParticular || '',
      valorMunicipal: rawInterdicao.valorMunicipal || '',
      valorEstadual: rawInterdicao.valorEstadual || '',
      fichaAvaliacao: rawInterdicao.fichaAvaliacao || '',
      causaOutros: rawInterdicao.causaOutros || '',
      danosOutros: rawInterdicao.danosOutros || '',
      tipo: rawInterdicao.tipo || '',
      evacuarImovel: rawInterdicao.evacuarImovel || '',
      prazoAbandono: rawInterdicao.prazoAbandono || '',
      destinoMorador: rawInterdicao.destinoMorador || '',
      destinoOutros: rawInterdicao.destinoOutros || '',
      destinoContato: rawInterdicao.destinoContato || '',
      destinoTelefone: rawInterdicao.destinoTelefone || '',
      destinoEndereco: rawInterdicao.destinoEndereco || '',
      observacoes: rawInterdicao.observacoes || '',
      responsavelTipo: rawInterdicao.responsavelTipo || '',
      responsavelNome: rawInterdicao.responsavelNome || '',
      responsavelRG: rawInterdicao.responsavelRG || '',
      responsavelTelefone: rawInterdicao.responsavelTelefone || '',
      responsavelAssinatura: rawInterdicao.responsavelAssinatura || '',
    },
  };
}

export function createNewRO(roNumber: string): OccurrenceReport {
  return normalizeRO({ roNumber });
}

export function reportUpdateFields(report: OccurrenceReport): Record<string, unknown> {
  const mutable = { ...report } as Record<string, unknown>;
  for (const key of ['id', 'createdAt', 'authorUid', 'agent', 're', 'editHistory', 'roNumber', 'needsNumber']) {
    delete mutable[key];
  }
  return mutable;
}

export async function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = url;
  });
}

export function cn(...c: (string | boolean | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

export function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────
