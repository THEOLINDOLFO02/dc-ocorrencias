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
 * Lógica de geração de número offline — testável sem Firebase.
 * Retorna { number, isProvisional } sem efeitos colaterais.
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
