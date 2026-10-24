

export type Screen = 'home' | 'wizard' | 'view' | 'print' | 'pin';
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SectionType = 'trees' | 'structural' | 'bees' | 'animals' | 'geological' | 'hydrological' | 'fire' | 'generic';

export interface Photo {
  id: string;
  dataUrl: string;
  caption: string;
  lat?: number;
  lng?: number;
}

export interface Agency {
  id: string;
  label: string;
  selected: boolean;
  vehicles: string;
  responsible: string;
}

export interface Losses {
  furniture: boolean;
  food: boolean;
  clothes: boolean;
  documents: boolean;
  property: boolean;
  others: boolean;
  othersDesc: string;
  victims: string;
  injured: string;
  deaths: string;
}

export interface OccurrenceReport {
  id: string;
  roNumber: string;
  // Presente apenas em R.O.s criados offline antes de receber número definitivo.
  needsNumber?: boolean;
  emergency: boolean | null;
  vehicle: string;
  date: string;
  startTime: string;
  endTime: string;
  origin: string;
  originText: string;
  agent: string;
  re: string;
  // UID Firebase do agente que criou/editou o R.O. — campo autenticado verificável pelo servidor.
  // Ausente em R.O.s históricos criados antes da migração para contas individuais.
  authorUid?: string;
  lastAuditId?: string;
  reporterName: string;
  rgCpf: string;
  phone: string;
  reporterEmail: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  occurrenceTypeId: string;
  occurrenceTypeLabel: string;
  quadrant: string;
  riskArea: string;
  dynamicFields: Record<string, unknown>;
  agencies: Agency[];
  losses: Losses;
  photoScenario: string;
  photos: Photo[];
  photoConclusion: string;
  observations: string;
  declarant1: string;
  declarant1Role: string;
  declarant1Sig: string;
  agentParticipants: string[];
  agentLocked: boolean;
  filledBy: string;
  role: string;
  relatedDocs: string;
  cobrade: { active: boolean; code: string; label: string };
  interdicao: {
    active: boolean;
    numero: string;
    fichaAvaliacao: string;
    causas: string[];
    causaOutros: string;
    danos: string[];
    danosOutros: string;
    bensAfetados: string[];
    valorParticular: string;
    valorMunicipal: string;
    valorEstadual: string;
    tipo: 'parcial' | 'total' | '';
    evacuarImovel: '' | 'sim' | 'nao';
    prazoAbandono: string;
    destinoMorador: string;
    destinoOutros: string;
    destinoContato: string;
    destinoTelefone: string;
    destinoEndereco: string;
    observacoes: string;
    responsavelTipo: 'proprietario' | 'morador' | 'locatario' | 'testemunha' | '';
    responsavelNome: string;
    responsavelRG: string;
    responsavelTelefone: string;
    responsavelAssinatura: string;
  };
  conclusion: string;
  conclusionStatus: 'encaminhar' | 'arquivar' | 'monitoramento' | '';
  encaminharDest: string[];
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  editHistory: { at: string; by: string; action: string }[];
}

// ─────────────────────────────────────────────
// COBRADE DATA
// ─────────────────────────────────────────────
