/**
 * Funções puras para criação e normalização de R.O.
 * Separadas do App.tsx para permitir testes sem dependências de React/Firebase.
 */

export interface InterdicaoBase {
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
}

export function getDefaultInterdicao(roNumber = ''): InterdicaoBase {
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

/** Retorna a parte lógica da normalização de interdicao — testável sem Firebase. */
export function mergeInterdicao(
  rawInterdicao: Partial<InterdicaoBase>,
  roNumber: string,
): InterdicaoBase {
  const def = getDefaultInterdicao(roNumber);
  return {
    ...def,
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
  };
}

/**
 * @deprecated buildOfflineRONumber não é mais usado — o modo offline agora usa roNumber vazio
 * com needsNumber=true e reconciliação automática ao voltar online. Mantido para compatibilidade
 * com testes existentes até que sejam migrados.
 */
export function buildOfflineRONumber(
  storedYear: string | null,
  storedCount: number | null,
  fullYear: string,
): { number: string; nextCount: number } {
  const isSameYear = storedYear === fullYear;
  const n = isSameYear ? (storedCount ?? 0) + 1 : 1;
  return { number: `${String(n).padStart(3, '0')}P/${fullYear}`, nextCount: n };
}

// ─── Identidade do agente — testável sem Firebase ───────────────────────────

export interface AgentProfileLike {
  uid: string;
  re: string;
}

/**
 * Verifica se o perfil Firebase autenticado autoriza registrar em nome do agente selecionado.
 * Exportado para testes — espelha checkAgentAuthorization em App.tsx.
 */
export function checkAgentAuthorizationPure(
  profile: AgentProfileLike | null,
  selectedRE: string,
): { authorized: boolean; isLegacyMode: boolean } {
  if (!profile) return { authorized: true, isLegacyMode: true };
  if (profile.re === selectedRE) return { authorized: true, isLegacyMode: false };
  return { authorized: false, isLegacyMode: false };
}

// ─── Lógica de contador — testável sem Firebase ─────────────────────────────

export interface CounterState {
  year: string;   // 4 dígitos, ex: "2026"
  count: number;
}

/**
 * Calcula o próximo número de R.O. e o novo estado do contador, sem efeitos colaterais.
 * Usado nos testes para verificar a lógica de virada de ano e incremento.
 */
export function computeNextNumber(
  stored: CounterState | null,
  fullYear: string,
): { roNumber: string; newCounter: CounterState } {
  const isSameYear = stored?.year === fullYear;
  const n = isSameYear ? (stored!.count + 1) : 1;
  return {
    roNumber: `${String(n).padStart(3, '0')}/${fullYear}`,
    newCounter: { year: fullYear, count: n },
  };
}

/**
 * Decide se um R.O. existente precisa ter seu número de auto de interdição atualizado
 * após a reconciliação de número offline.
 */
export function shouldUpdateInterdicaoNumber(
  currentInterdicaoNumero: string,
  oldRoNumber: string,
): boolean {
  // Atualiza se o número do auto estava vazio ou era igual ao número provisório (vazio)
  return !currentInterdicaoNumero || currentInterdicaoNumero === oldRoNumber;
}
