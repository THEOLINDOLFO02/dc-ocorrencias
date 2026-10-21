/**
 * Defesa Civil Cajamar/SP — Sistema Digital de Registro de Ocorrências
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  runTransaction, writeBatch, query, orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { writeAuditLog } from './audit-log';
import {
  Camera, ChevronLeft, ChevronRight, Plus, Check,
  Trash2, X, Search, AlertTriangle, FileText, Clock, Printer, Pencil,
  Moon, Sun, BarChart2, ChevronDown, History, Share2, Mail, MessageCircle, LogOut,
  Filter, Download,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Screen = 'home' | 'wizard' | 'view' | 'print' | 'pin';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type SectionType = 'trees' | 'structural' | 'bees' | 'animals' | 'geological' | 'hydrological' | 'fire' | 'generic';

interface Photo {
  id: string;
  dataUrl: string;
  caption: string;
  lat?: number;
  lng?: number;
}

interface Agency {
  id: string;
  label: string;
  selected: boolean;
  vehicles: string;
  responsible: string;
}

interface Losses {
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

interface OccurrenceReport {
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

interface CobradeItem { code: string; label: string; group: string; subgroup: string; }

const COBRADE_LIST: CobradeItem[] = [
  // ── DESASTRES NATURAIS ──
  // Geológico > Terremotos
  { code:'1.1.1.1.0', label:'Tremor de terra',                       group:'Desastres Naturais', subgroup:'Geológico – Terremotos' },
  { code:'1.1.1.2.0', label:'Tsunami',                             group:'Desastres Naturais', subgroup:'Geológico – Terremotos' },
  // Geológico > Movimento de Massa
  { code:'1.1.3.1.1', label:'Queda / tombamento de blocos',          group:'Desastres Naturais', subgroup:'Geológico – Movimento de Massa' },
  { code:'1.1.3.1.4', label:'Queda / tombamento de lajes',           group:'Desastres Naturais', subgroup:'Geológico – Movimento de Massa' },
  { code:'1.1.3.2.1', label:'Deslizamento de solo',                  group:'Desastres Naturais', subgroup:'Geológico – Movimento de Massa' },
  { code:'1.1.3.2.2', label:'Deslizamento de rocha',                 group:'Desastres Naturais', subgroup:'Geológico – Movimento de Massa' },
  { code:'1.1.3.3.1', label:'Corrida de solo/lama',                  group:'Desastres Naturais', subgroup:'Geológico – Movimento de Massa' },
  { code:'1.1.3.3.2', label:'Corrida de rocha/detrito',              group:'Desastres Naturais', subgroup:'Geológico – Movimento de Massa' },
  { code:'1.1.3.4.0', label:'Subsidência e colapso de terreno',      group:'Desastres Naturais', subgroup:'Geológico – Movimento de Massa' },
  // Geológico > Erosão
  { code:'1.1.4.2.0', label:'Erosão de margem fluvial',              group:'Desastres Naturais', subgroup:'Geológico – Erosão' },
  { code:'1.1.4.3.1', label:'Erosão laminar',                        group:'Desastres Naturais', subgroup:'Geológico – Erosão' },
  { code:'1.1.4.3.2', label:'Erosão em ravinas',                     group:'Desastres Naturais', subgroup:'Geológico – Erosão' },
  { code:'1.1.4.3.3', label:'Erosão em boçorocas',                   group:'Desastres Naturais', subgroup:'Geológico – Erosão' },
  // Hidrológico
  { code:'1.2.1.1.0', label:'Inundação gradual',                     group:'Desastres Naturais', subgroup:'Hidrológico – Inundações' },
  { code:'1.2.1.2.0', label:'Inundação brusca',                      group:'Desastres Naturais', subgroup:'Hidrológico – Inundações' },
  { code:'1.2.2.1.0', label:'Enxurrada',                             group:'Desastres Naturais', subgroup:'Hidrológico – Enxurradas' },
  { code:'1.2.3.1.0', label:'Alagamento',                            group:'Desastres Naturais', subgroup:'Hidrológico – Alagamentos' },
  // Meteorológico
  { code:'1.3.1.1.0', label:'Ciclone extratropical',                 group:'Desastres Naturais', subgroup:'Meteorológico – Sistemas de Grande Escala' },
  { code:'1.3.1.2.0', label:'Frente fria / zona de convergência',    group:'Desastres Naturais', subgroup:'Meteorológico – Sistemas de Grande Escala' },
  { code:'1.3.2.1.1', label:'Vendaval / ciclone extratropical local',group:'Desastres Naturais', subgroup:'Meteorológico – Tempestades Locais Severas' },
  { code:'1.3.2.1.2', label:'Chuva intensa',                         group:'Desastres Naturais', subgroup:'Meteorológico – Tempestades Locais Severas' },
  { code:'1.3.2.1.3', label:'Granizo',                               group:'Desastres Naturais', subgroup:'Meteorológico – Tempestades Locais Severas' },
  { code:'1.3.2.1.4', label:'Tornado',                               group:'Desastres Naturais', subgroup:'Meteorológico – Tempestades Locais Severas' },
  { code:'1.3.2.1.5', label:'Tempestade de raios',                   group:'Desastres Naturais', subgroup:'Meteorológico – Tempestades Locais Severas' },
  { code:'1.3.3.1.0', label:'Onda de calor',                         group:'Desastres Naturais', subgroup:'Meteorológico – Temperaturas Extremas' },
  { code:'1.3.3.2.1', label:'Geada',                                 group:'Desastres Naturais', subgroup:'Meteorológico – Temperaturas Extremas' },
  { code:'1.3.3.2.2', label:'Neve',                                  group:'Desastres Naturais', subgroup:'Meteorológico – Temperaturas Extremas' },
  // Climatológico
  { code:'1.4.1.1.0', label:'Seca',                                  group:'Desastres Naturais', subgroup:'Climatológico – Seca / Estiagem' },
  { code:'1.4.1.2.0', label:'Estiagem',                              group:'Desastres Naturais', subgroup:'Climatológico – Seca / Estiagem' },
  { code:'1.4.1.5.0', label:'Baixa umidade do ar',                   group:'Desastres Naturais', subgroup:'Climatológico – Seca / Estiagem' },
  { code:'1.4.2.1.0', label:'Incêndio florestal',                    group:'Desastres Naturais', subgroup:'Climatológico – Incêndio Florestal' },
  { code:'1.4.2.2.0', label:'Incêndio em área de proteção ambiental',group:'Desastres Naturais', subgroup:'Climatológico – Incêndio Florestal' },
  // Biológico
  { code:'1.5.1.1.0', label:'Epidemia de doença infecciosa viral',   group:'Desastres Naturais', subgroup:'Biológico – Epidemias' },
  { code:'1.5.1.2.0', label:'Epidemia de doença bacteriana',         group:'Desastres Naturais', subgroup:'Biológico – Epidemias' },
  { code:'1.5.1.3.0', label:'Epidemia de doença parasitária',        group:'Desastres Naturais', subgroup:'Biológico – Epidemias' },
  { code:'1.5.2.1.0', label:'Infestação de animais',                 group:'Desastres Naturais', subgroup:'Biológico – Infestações' },
  { code:'1.5.2.2.0', label:'Infestação de insetos',                 group:'Desastres Naturais', subgroup:'Biológico – Infestações' },
  // ── DESASTRES TECNOLÓGICOS ──
  { code:'2.1.3.1.0', label:'Desastre em usina nuclear',             group:'Desastres Tecnológicos', subgroup:'Substâncias Radioativas' },
  { code:'2.2.1.1.0', label:'Vazamento em planta/armazenamento industrial', group:'Desastres Tecnológicos', subgroup:'Produtos Perigosos – Planta Industrial' },
  { code:'2.2.2.1.0', label:'Transporte rodoviário de produtos perigosos',  group:'Desastres Tecnológicos', subgroup:'Produtos Perigosos – Transporte' },
  { code:'2.2.2.2.0', label:'Transporte ferroviário de produtos perigosos', group:'Desastres Tecnológicos', subgroup:'Produtos Perigosos – Transporte' },
  { code:'2.2.2.5.0', label:'Transporte dutoviário de produtos perigosos',  group:'Desastres Tecnológicos', subgroup:'Produtos Perigosos – Transporte' },
  { code:'2.3.1.1.0', label:'Incêndio em área urbana',               group:'Desastres Tecnológicos', subgroup:'Incêndios Urbanos' },
  { code:'2.4.1.1.0', label:'Colapso de edificação',                 group:'Desastres Tecnológicos', subgroup:'Obras Civis' },
  { code:'2.4.2.1.0', label:'Ruptura de barragem',                   group:'Desastres Tecnológicos', subgroup:'Obras Civis' },
  { code:'2.5.1.1.0', label:'Acidente de transporte rodoviário',     group:'Desastres Tecnológicos', subgroup:'Transporte' },
  { code:'2.5.3.1.0', label:'Acidente de transporte aéreo',          group:'Desastres Tecnológicos', subgroup:'Transporte' },
  { code:'2.5.4.1.0', label:'Acidente de transporte aquaviário',     group:'Desastres Tecnológicos', subgroup:'Transporte' },
];

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

interface OccurrenceType {
  id: string;
  label: string;
  emoji: string;
  category: string;
  section: SectionType;
}

const OCCURRENCE_TYPES: OccurrenceType[] = [
  // Árvores
  { id: 'supressao-arvore',   label: 'Supressão de Árvore',              emoji: '🪚', category: 'Árvores',        section: 'trees'        },
  { id: 'poda-galhos',        label: 'Poda / Corte de Galhos',           emoji: '✂️', category: 'Árvores',        section: 'trees'        },
  { id: 'vistoria-arvore',    label: 'Vistoria de Árvore',               emoji: '🌳', category: 'Árvores',        section: 'trees'        },
  // Estrutural
  { id: 'vistoria-estrutural',label: 'Vistoria Estrutural',              emoji: '🏚️', category: 'Estrutural',     section: 'structural'   },
  // Fauna
  { id: 'vistoria-insetos',   label: 'Vistoria de Insetos',              emoji: '🐝', category: 'Fauna',          section: 'bees'         },
  { id: 'manejo-abelhas',     label: 'Manejo de Abelhas',                emoji: '🍯', category: 'Fauna',          section: 'bees'         },
  { id: 'remocao-vespas',     label: 'Remoção de Vespas',                emoji: '🦟', category: 'Fauna',          section: 'bees'         },
  { id: 'resgate-fauna',      label: 'Resgate / Manejo de Fauna',        emoji: '🐍', category: 'Fauna',          section: 'animals'      },
  // Incêndio
  { id: 'combate-incendio',   label: 'Combate a Incêndio',               emoji: '🔥', category: 'Incêndio',       section: 'fire'         },
  // Geológico
  { id: 'risco-deslizamento', label: 'Risco de Deslizamento',            emoji: '⛰️', category: 'Geológico',      section: 'geological'   },
  // Hidrológico
  { id: 'alagamento',         label: 'Alagamento',                       emoji: '💧', category: 'Hidrológico',    section: 'hydrological' },
  { id: 'inundacao',          label: 'Inundação',                        emoji: '🌊', category: 'Hidrológico',    section: 'hydrological' },
  { id: 'enxurrada',          label: 'Enxurrada',                        emoji: '🌧️', category: 'Hidrológico',    section: 'hydrological' },
  // Infraestrutura
  { id: 'queda-poste',        label: 'Queda de Poste / Fio Elétrico',   emoji: '⚡', category: 'Infraestrutura', section: 'generic'      },
  { id: 'fixacao-placas',     label: 'Fixação / Manutenção de Placas',  emoji: '⚠️', category: 'Infraestrutura', section: 'generic'      },
  // Suprimentos
  { id: 'entrega-telhas',     label: 'Entrega de Telhas',                emoji: '🏠', category: 'Suprimentos',    section: 'generic'      },
  { id: 'entrega-lonas',      label: 'Entrega de Lonas',                 emoji: '🧱', category: 'Suprimentos',    section: 'generic'      },
  { id: 'entrega-agua',       label: 'Entrega de Água Potável',          emoji: '💧', category: 'Suprimentos',    section: 'generic'      },
  { id: 'caminhao-pipa',      label: 'Caminhão Pipa',                    emoji: '🚒', category: 'Suprimentos',    section: 'generic'      },
  // Resgate e Apoio
  { id: 'resgate-pessoas',    label: 'Resgate de Pessoas',               emoji: '🆘', category: 'Resgate e Apoio',section: 'generic'      },
  { id: 'apoio-operacional',  label: 'Apoio PM / GCM / Bombeiros / Trânsito', emoji: '🤝', category: 'Resgate e Apoio', section: 'generic' },
  { id: 'apoio-logistico',    label: 'Apoio Logístico',                  emoji: '📦', category: 'Resgate e Apoio',section: 'generic'      },
  { id: 'protecao-isolamento',label: 'Proteção / Isolamento de Local',   emoji: '🚧', category: 'Resgate e Apoio',section: 'generic'      },
  // Campanhas
  { id: 'campanha',           label: 'Campanha (Dengue / Raiva)',        emoji: '📢', category: 'Campanhas',      section: 'generic'      },
  // Outros
  { id: 'outros-servicos',    label: 'Outros Serviços',                  emoji: '📋', category: 'Outros',         section: 'generic'      },
];

const DEFAULT_AGENCIES: Agency[] = [
  { id: 'ambulancia', label: 'Ambulância',  selected: false, vehicles: '', responsible: '' },
  { id: 'bombeiro',   label: 'Bombeiro',    selected: false, vehicles: '', responsible: '' },
  { id: 'cetesb',     label: 'CETESB',      selected: false, vehicles: '', responsible: '' },
  { id: 'gcm',        label: 'GCM',         selected: false, vehicles: '', responsible: '' },
  { id: 'obras',      label: 'Obras',       selected: false, vehicles: '', responsible: '' },
  { id: 'pm-sp',      label: 'PM-SP',       selected: false, vehicles: '', responsible: '' },
  { id: 'pol-civil',  label: 'Pol. Civil',  selected: false, vehicles: '', responsible: '' },
  { id: 'transito',   label: 'Trânsito',    selected: false, vehicles: '', responsible: '' },
  { id: 'zoonoses',   label: 'Zoonoses',    selected: false, vehicles: '', responsible: '' },
];

const ORIGINS = [
  { id: '199',         label: '199'                                       },
  { id: 'presencial',  label: 'Presencial na Base'                        },
  { id: 'demandaInt',  label: 'Demanda interna'                           },
  { id: 'PMC',         label: 'PMC (Prefeitura – outras secretarias)'     },
  { id: 'procAdm',     label: 'Proc. Adm. nº'       , hasText: true       },
  { id: 'oficio',      label: 'Ofício nº'            , hasText: true       },
  { id: 'outros',      label: 'Outros'               , hasText: true       },
];

const toTitleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

interface Agent { name: string; display: string; re: string; role: string; }

// ─────────────────────────────────────────────
// PERFIL DE AGENTE — modelo de identidade individual
// ─────────────────────────────────────────────

/**
 * Perfil armazenado em Firestore: /agentProfiles/{uid}
 * Criado pelo admin; jamais pelo próprio agente.
 * Vincula o UID Firebase (identidade autenticada) ao perfil operacional.
 */
export interface AgentProfile {
  uid: string;
  re: string;
  name: string;
  display: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenta carregar o perfil do agente autenticado a partir do Firestore.
 * Retorna null se:
 *   - o documento não existe (conta ainda não vinculada — migração pendente)
 *   - ocorre erro de rede (offline)
 *
 * Nunca lança exceção — o chamador decide como lidar com perfil ausente.
 */
async function loadAgentProfile(uid: string): Promise<AgentProfile | null> {
  try {
    const { getDoc, doc: fsDoc } = await import('firebase/firestore');
    const snap = await getDoc(fsDoc(db, 'agentProfiles', uid));
    if (!snap.exists()) return null;
    return { uid, ...(snap.data() as Omit<AgentProfile, 'uid'>) };
  } catch {
    return null;
  }
}

/**
 * Verifica se o agente autenticado tem permissão para registrar um R.O.
 * em nome do agente informado no formulário.
 *
 * Regras:
 * - Se o perfil carregado do servidor coincide com o agente do formulário → autorizado
 * - Se o perfil é null (conta compartilhada legada / perfil não criado) → autorizado com aviso
 * - Se o perfil existe mas difere do agente selecionado → negado (tentativa de usurpação)
 */
export function checkAgentAuthorization(
  profile: AgentProfile | null,
  selectedRE: string,
): { authorized: boolean; isLegacyMode: boolean } {
  if (!profile) return { authorized: true, isLegacyMode: true };
  if (profile.re === selectedRE) return { authorized: true, isLegacyMode: false };
  return { authorized: false, isLegacyMode: false };
}

const AGENTS: Agent[] = [
  { name: 'AMERICO FERREIRA SOARES',               display: 'Américo Ferreira Soares',               re: '13606', role: 'Agente de Defesa Civil' },
  { name: 'ANDREA DE OLIVEIRA SOUZA',              display: 'Andrea de Oliveira Souza',              re: '20264', role: 'Agente de Defesa Civil' },
  { name: 'ANGELA MARIA MACIEL GONCALVES BARBOSA', display: 'Ângela Maria Maciel G. Barbosa',        re: '11381', role: 'Agente de Defesa Civil' },
  { name: 'ANTONIO CARLOS GALEOTI FREITAS ARRUDA', display: 'Antonio Carlos G. de Freitas Arruda',   re: '8769',  role: 'Coordenador de Defesa Civil' },
  { name: 'ASSUERO LOPES DA SILVA',                display: 'Assuero Lopes da Silva',                re: '13608', role: 'Agente de Defesa Civil' },
  { name: 'CARLOS ROBERTO BARBOSA',                display: 'Carlos Roberto Barbosa',                re: '11332', role: 'Agente de Defesa Civil' },
  { name: 'DAYANE RANGEL RAMOS PEREIRA',           display: 'Dayane Rangel Ramos Pereira',           re: '20607', role: 'Articulador de Políticas Públicas' },
  { name: 'EDUARDO WELLINGTON DE ARAUJO',          display: 'Eduardo Wellington de Araújo',          re: '20615', role: 'Agente de Defesa Civil' },
  { name: 'GABRIEL FERRACINI',                     display: 'Gabriel Ferracini',                     re: '20242', role: 'Agente de Defesa Civil' },
  { name: 'GILVAN ARAUJO SANTOS',                  display: 'Gilvan Araujo Santos',                  re: '20235', role: 'Agente de Defesa Civil' },
  { name: 'HAMILTON MARTINS FIGUEIRA',             display: 'Hamilton Martins Figueira',             re: '20246', role: 'Agente de Defesa Civil' },
  { name: 'HENRIQUE SCHUNK COSTA',                 display: 'Henrique Schunk Costa',                 re: '18560', role: 'Agente Administrativo' },
  { name: 'ITAMAR JORGE VACARI',                   display: 'Itamar Jorge Vacari',                   re: '11385', role: 'Agente de Defesa Civil' },
  { name: 'JOSE APARECIDO AZEVEDO',                display: 'José Aparecido Azevedo',                re: '13611', role: 'Agente de Defesa Civil' },
  { name: 'JOSE APARECIDO BRAZ',                   display: 'José Aparecido Braz',                   re: '11339', role: 'Agente de Defesa Civil' },
  { name: 'JOSE AUGUSTO SOARES',                   display: 'José Augusto Soares',                   re: '11340', role: 'Agente de Defesa Civil' },
  { name: 'JOSE ROBERTO DE SOUZA AMARAL',          display: 'José Roberto de Souza Amaral',          re: '12643', role: 'Agente Administrativo' },
  { name: 'LUIZ CARLOS TEIXEIRA DOS SANTOS',       display: 'Luiz Carlos Teixeira dos Santos',       re: '13614', role: 'Agente de Defesa Civil' },
  { name: 'MARCIO DE FREITAS SILVESTRE',           display: 'Marcio de Freitas Silvestre',           re: '13615', role: 'Agente de Defesa Civil' },
  { name: 'MARIA LUCIA DE SOUZA ALBARRAZ',         display: 'Maria Lucia de Souza Albarraz',         re: '12546', role: 'Auxiliar de Serviços Gerais' },
  { name: 'MARLENE PEREIRA DA SILVA BARBOSA',      display: 'Marlene Pereira da Silva Barbosa',      re: '10342', role: 'Auxiliar de Serviços Gerais' },
  { name: 'ROGERIO DA SILVA RAMOS',                display: 'Rogério da Silva Ramos',                re: '13633', role: 'Agente de Defesa Civil' },
  { name: 'SIDINEI MARQUES BARBOZA',               display: 'Sidinei Marques Barboza',               re: '18768', role: 'Diretor de Defesa Civil' },
  { name: 'THEOBALDO LINDOLFO SILVA CARVALHO',     display: 'Theobaldo Lindolfo S. Carvalho',        re: '20236', role: 'Agente de Defesa Civil' },
  { name: 'VALDEIR DE LIMA PEREIRA ALBARRAZ',      display: 'Valdeir de Lima Pereira Albarraz',      re: '20606', role: 'Agente de Defesa Civil' },
  { name: 'VANESSA ALEXANDRE DA SILVA',            display: 'Vanessa Alexandre da Silva',            re: '10325', role: 'Auxiliar Administrativo' },
  { name: 'WILSON ROBERTO DE SOUZA ESPINDOLA',     display: 'Wilson Roberto de Souza Espindola',     re: '13020', role: 'Agente Administrativo' },
  { name: 'OUTRO',                                 display: 'Outro (outra secretaria)',               re: '',      role: '' },
];

const SECRETARIAS = [
  'Secretaria de Educação',
  'Secretaria de Saúde',
  'Secretaria de Obras e Serviços Urbanos',
  'Secretaria de Meio Ambiente',
  'Secretaria de Assistência e Desenvolvimento Social',
  'Secretaria de Planejamento e Gestão',
  'Secretaria de Administração',
  'Secretaria de Finanças',
  'Secretaria de Habitação',
  'Secretaria de Segurança Pública e Trânsito',
  'Secretaria de Cultura, Esporte e Lazer',
  'Secretaria de Serviços Municipais',
  'Secretaria de Governo',
  'Gabinete do Prefeito',
  'Procuradoria Geral do Município',
  'Controladoria Interna',
  'DAEC – Depto. de Águas e Esgotos de Cajamar',
  'Vigilância Sanitária',
  'Corpo de Bombeiros (Parceria)',
  'Polícia Militar (Parceria)',
  'SABESP',
  'Outros / Externo',
];

const STEP_LABELS = ['Cabeçalho', 'Solicitante', 'Ocorrência', 'Detalhes', 'Apoio', 'Fotos', 'Concluir'];
const STORAGE_KEY = 'dc_ros_v1';

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Atribui o próximo número definitivo ao documento ros/{roId} via transação Firestore.
 * - Idempotente: se o R.O. já tem número definitivo (needsNumber=false), retorna o existente.
 * - Seguro contra concorrência: a transação lê e escreve o contador atomicamente.
 * - Seguro contra virada de ano: compara sempre com fullYear de 4 dígitos.
 * Retorna o número atribuído ou null em caso de falha (sem conexão ou erro do servidor).
 */
async function assignRONumber(roId: string, fullYear: string): Promise<string | null> {
  try {
    const counterRef = doc(db, 'meta', 'counter');
    const roRef = doc(db, 'ros', roId);
    return await runTransaction(db, async t => {
      const [counterSnap, roSnap] = await Promise.all([t.get(counterRef), t.get(roRef)]);

      // Idempotência: outro dispositivo já reconciliou este R.O. antes de nós
      const roData = roSnap.data() as Partial<OccurrenceReport> | undefined;
      if (roData?.roNumber && !roData.needsNumber) return roData.roNumber;

      // Sempre 4 dígitos no ano para evitar ambiguidade "26" vs "2026"
      const storedYear = counterSnap.data()?.year as string | undefined;
      const isSameYear = storedYear === fullYear;
      const n = isSameYear ? ((counterSnap.data()?.count as number) ?? 0) + 1 : 1;
      const roNumber = `${String(n).padStart(3, '0')}/${fullYear}`;

      t.set(counterRef, { year: fullYear, count: n });
      // Atualiza o R.O. com o número definitivo dentro da mesma transação
      t.update(roRef, { roNumber, needsNumber: false });

      // Cache local: ajuda dispositivos offline a não reutilizarem sequências já usadas
      try { localStorage.setItem('dc_counter', JSON.stringify({ year: fullYear, count: n })); } catch { /* noop */ }

      return roNumber;
    });
  } catch {
    return null;
  }
}

/**
 * Prepara os campos de numeração ao criar um novo R.O.:
 * - Online  → chama assignRONumber (número definitivo garantido pelo servidor)
 * - Offline → roNumber vazio + needsNumber=true (reconciliado automaticamente ao voltar online)
 */
async function nextRONumber(roId: string): Promise<{ roNumber: string; needsNumber: boolean }> {
  const fullYear = new Date().getFullYear().toString();
  if (navigator.onLine) {
    const roNumber = await assignRONumber(roId, fullYear);
    if (roNumber) return { roNumber, needsNumber: false };
  }
  return { roNumber: '', needsNumber: true };
}

function formatBRLInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (!num) return '';
  const val = (num / 100).toFixed(2);
  const [intPart, decPart] = val.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formattedInt},${decPart}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDefaultInterdicao(roNumber = ''): OccurrenceReport['interdicao'] {
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

function normalizeRO(raw: Partial<OccurrenceReport> = {}): OccurrenceReport {
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
    editHistory: raw.editHistory ?? [{ at: new Date().toISOString(), by: 'Sistema', action: 'Criado' }],
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

function createNewRO(roNumber: string): OccurrenceReport {
  return normalizeRO({ roNumber });
}

async function compressImage(file: File): Promise<string> {
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

function cn(...c: (string | boolean | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={!active ? { backgroundColor: 'var(--border)', color: 'var(--text-main)' } : undefined}
      className={cn('flex-1 py-3 text-sm font-semibold rounded-xl transition-all',
        active ? 'bg-[#1B3A6B] text-white shadow-sm' : 'active:opacity-80')}>
      {label}
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label style={{ color: 'var(--text-main)' }} className="block text-xs font-bold uppercase tracking-wider opacity-90">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <input type={type} inputMode={inputMode} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-4 py-3 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
        checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-400')}
        style={!checked ? { backgroundColor: 'var(--bg-card)' } : undefined}>
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </div>
      <span style={{ color: 'var(--text-main)' }} className="text-sm font-semibold">{label}</span>
    </label>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      className={cn('rounded-2xl p-4 shadow-sm border transition-colors', className)}
    >
      {children}
    </div>
  );
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--text-main)' }} className="text-[11px] font-bold uppercase tracking-widest mb-3 opacity-80">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────
// DYNAMIC SECTIONS
// ─────────────────────────────────────────────

type DF = Record<string, unknown>;
type DSProps = { fields: DF; onChange: (f: DF) => void };

function TreesSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Há risco?">
        <div className="flex gap-2">
          <Toggle label="Sim — autorizar corte/poda" active={fields.hasRisk === true}  onClick={() => s('hasRisk', true)}  />
          <Toggle label="Não — orientar munícipe"    active={fields.hasRisk === false} onClick={() => s('hasRisk', false)} />
        </div>
      </Field>
      <Field label="Árvore já tombada?">
        <div className="flex gap-2">
          <Toggle label="Sim" active={fields.fallen === 'sim'} onClick={() => s('fallen', 'sim')} />
          <Toggle label="Não" active={fields.fallen === 'nao'} onClick={() => s('fallen', 'nao')} />
        </div>
      </Field>
      {fields.fallen === 'sim' && (
        <Field label="Quantidade">
          <Input value={String(fields.fallenCount ?? '')} onChange={v => s('fallenCount', v)} placeholder="Qtd de árvores" type="number" />
        </Field>
      )}
      {fields.hasRisk === true && (
        <Field label="O que foi feito?">
          <div className="space-y-1">
            <Checkbox checked={!!fields.detSupressao} onChange={v => s('detSupressao', v)} label="Determinação de Supressão" />
            <Checkbox checked={!!fields.supressao}    onChange={v => s('supressao', v)}    label="Supressão realizada"       />
          </div>
        </Field>
      )}
    </div>
  );
}

function StructuralSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Patologias identificadas">
        <div className="space-y-1">
          {[['fissuras','Fissuras'],['rachaduras','Rachaduras'],['recalque','Recalque'],['hidraulica','Hidráulica (vazamentos)']].map(([k,l]) => (
            <Checkbox key={k} checked={!!fields[k]} onChange={v => s(k, v)} label={l} />
          ))}
        </div>
      </Field>
      <Field label="Outras patologias">
        <Input value={String(fields.outrosPatologias ?? '')} onChange={v => s('outrosPatologias', v)} placeholder="Descreva..." />
      </Field>
      <Field label="Há risco?">
        <div className="flex gap-2">
          <Toggle label="Sim" active={fields.hasRisk === true}  onClick={() => s('hasRisk', true)}  />
          <Toggle label="Não" active={fields.hasRisk === false} onClick={() => s('hasRisk', false)} />
        </div>
      </Field>
      {fields.hasRisk === true && (
        <Field label="Extensão do risco">
          <div className="flex gap-2">
            {['Total','Parcial','Outros'].map(opt => (
              <Toggle key={opt} label={opt} active={fields.riskExtent === opt.toLowerCase()} onClick={() => s('riskExtent', opt.toLowerCase())} />
            ))}
          </div>
        </Field>
      )}
      <Field label="Causa humana (se houver)">
        <div className="space-y-1">
          <Checkbox checked={!!fields.barragemRompimento} onChange={v => s('barragemRompimento', v)} label="Rompimento de Barragem"  />
          <Checkbox checked={!!fields.sistemaDrenagem}    onChange={v => s('sistemaDrenagem', v)}    label="Sistema de Drenagem"    />
        </div>
      </Field>
    </div>
  );
}

function BeesSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Necessidade de retirada?">
        <div className="flex gap-2">
          <Toggle label="Sim — atacando"    active={fields.needsRemoval === true}  onClick={() => s('needsRemoval', true)}  />
          <Toggle label="Não — em formação" active={fields.needsRemoval === false} onClick={() => s('needsRemoval', false)} />
        </div>
      </Field>
      <Field label="Espécie">
        <div className="space-y-1">
          {['Europa','Jataí','Marimbondo','Vespa'].map(sp => (
            <Checkbox key={sp} checked={!!fields[sp.toLowerCase()]} onChange={v => s(sp.toLowerCase(), v)} label={sp} />
          ))}
        </div>
      </Field>
    </div>
  );
}

function AnimalsSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Espécie / Classificação">
        <div className="space-y-1">
          <Checkbox checked={!!fields.reptil}      onChange={v => s('reptil', v)}      label="Réptil"           />
          <Checkbox checked={!!fields.peconhento}  onChange={v => s('peconhento', v)}  label="Peçonhento"       />
          <Checkbox checked={!!fields.naoPecon}    onChange={v => s('naoPecon', v)}    label="Não Peçonhento"   />
        </div>
      </Field>
      <Field label="Outros">
        <Input value={String(fields.outros ?? '')} onChange={v => s('outros', v)} placeholder="Descreva o animal..." />
      </Field>
    </div>
  );
}

function GeologicalSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Tipo">
        <div className="flex gap-2">
          <Toggle label="Ameaça"       active={fields.type === 'ameaca'}   onClick={() => s('type', 'ameaca')}   />
          <Toggle label="Já ocorrido"  active={fields.type === 'ocorrido'} onClick={() => s('type', 'ocorrido')} />
        </div>
      </Field>
      <Field label="Ficha de Avaliação nº">
        <Input value={String(fields.fichaAvaliacao ?? '')} onChange={v => s('fichaAvaliacao', v)} placeholder="Número da ficha" />
      </Field>
      <Field label="Auto de Interdição nº">
        <Input value={String(fields.autoInterdicao ?? '')} onChange={v => s('autoInterdicao', v)} placeholder="Número do auto" />
      </Field>
    </div>
  );
}

function HydroSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Causa">
        <div className="space-y-1">
          <Checkbox checked={!!fields.chuva}        onChange={v => s('chuva', v)}        label="Chuva"        />
          <Checkbox checked={!!fields.assoreamento} onChange={v => s('assoreamento', v)} label="Assoreamento" />
        </div>
      </Field>
      <Field label="Outro">
        <Input value={String(fields.outro ?? '')} onChange={v => s('outro', v)} placeholder="Descreva..." />
      </Field>
    </div>
  );
}

function FireSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Tipo de incêndio">
        <div className="grid grid-cols-2 gap-2">
          {[['urbano','Urbano'],['florestal','Florestal'],['industrial','Industrial'],['residencial','Residencial']].map(([id,lbl]) => (
            <Toggle key={id} label={lbl} active={fields.type === id} onClick={() => s('type', id)} />
          ))}
        </div>
      </Field>
      <Field label="Outros">
        <Input value={String(fields.outros ?? '')} onChange={v => s('outros', v)} placeholder="Descreva..." />
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────
// AGENT PICKER — modal de busca
// ─────────────────────────────────────────────

function AgentPicker({ value, onChange }: { value: string; onChange: (name: string, re: string, role: string) => void }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');

  const selected = AGENTS.find(a => a.name === value);
  const q = query.trim().toLowerCase();
  const filtered = AGENTS.filter(a =>
    !q ||
    a.display.toLowerCase().includes(q) ||
    a.re.includes(q) ||
    a.role.toLowerCase().includes(q)
  );

  const pick = (a: Agent) => {
    onChange(a.name, a.re, a.role);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Botão de seleção */}
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
        {selected ? (
          <>
            <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {selected.display.split(' ').slice(0, 2).map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{selected.display}</p>
              <p className="text-xs text-gray-500">{selected.role}{selected.re ? ` · RE ${selected.re}` : ''}</p>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onChange('', '', ''); }}
              className="p-1 text-gray-400 hover:text-red-400 flex-shrink-0">
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">Selecionar responsável pelo preenchimento...</span>
            <ChevronRight size={16} className="text-gray-300 ml-auto flex-shrink-0" />
          </>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header do modal */}
          <div className="bg-[#1B3A6B] text-white px-4 pt-12 pb-3 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="p-1 -ml-1">
                <ChevronLeft size={24} />
              </button>
              <p className="font-bold text-base">Preenchido Por</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome, RE ou cargo..."
                className="w-full bg-white/15 text-white placeholder-blue-300 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none" />
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">Nenhum agente encontrado</div>
            )}
            {filtered.map(a => (
              <button key={a.name} type="button" onClick={() => pick(a)}
                className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                  value === a.name ? 'bg-blue-50' : 'bg-white active:bg-gray-50')}>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                  a.name === 'OUTRO' ? 'bg-gray-100 text-gray-500' : value === a.name ? 'bg-[#1B3A6B] text-white' : 'bg-blue-100 text-[#1B3A6B]')}>
                  {a.name === 'OUTRO' ? '＋' : a.display.split(' ').slice(0, 2).map(w => w[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.display}</p>
                  <p className="text-xs text-gray-500">{a.role}{a.re ? ` · RE ${a.re}` : ''}</p>
                </div>
                {value === a.name && <Check size={18} className="text-[#1B3A6B] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// AGENT MULTI-PICKER — modal de busca com checkboxes
// ─────────────────────────────────────────────

function AgentMultiPicker({ value, onChange }: { value: string[]; onChange: (names: string[]) => void }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = AGENTS.filter(a =>
    a.role !== '' &&
    (!q || a.display.toLowerCase().includes(q) || a.re.includes(q) || a.role.toLowerCase().includes(q))
  );

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter(n => n !== name) : [...value, name]);
  };

  return (
    <>
      {/* Botão de seleção */}
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
        {value.length > 0 ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {value.length === 1
                  ? (AGENTS.find(a => a.name === value[0])?.display ?? value[0])
                  : `${value.length} agentes selecionados`}
              </p>
              {value.length === 1 && (
                <p className="text-xs text-gray-500">{AGENTS.find(a => a.name === value[0])?.role}</p>
              )}
            </div>
            <span className="bg-[#1B3A6B] text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
              {value.length}
            </span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange([]); }}
              className="p-1 text-gray-400 hover:text-red-400 flex-shrink-0">
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">Buscar e selecionar agentes...</span>
            <ChevronRight size={16} className="text-gray-300 ml-auto flex-shrink-0" />
          </>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="bg-[#1B3A6B] text-white px-4 pt-12 pb-3 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="p-1 -ml-1">
                <ChevronLeft size={24} />
              </button>
              <p className="font-bold text-base flex-1">Agentes Participantes</p>
              {value.length > 0 && (
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {value.length} selecionado{value.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome, RE ou cargo..."
                className="w-full bg-white/15 text-white placeholder-blue-300 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">Nenhum agente encontrado</div>
            )}
            {filtered.map(a => {
              const checked = value.includes(a.name);
              return (
                <button key={a.name} type="button" onClick={() => toggle(a.name)}
                  className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                    checked ? 'bg-blue-50' : 'bg-white active:bg-gray-50')}>
                  <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300')}>
                    {checked && <Check size={12} className="text-white" />}
                  </div>
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                    checked ? 'bg-[#1B3A6B] text-white' : 'bg-blue-100 text-[#1B3A6B]')}>
                    {a.display.split(' ').slice(0, 2).map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.display}</p>
                    <p className="text-xs text-gray-500">{a.role}{a.re ? ` · RE ${a.re}` : ''}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-4 border-t border-gray-200 bg-white safe-area-pb">
            <button type="button" onClick={() => { setOpen(false); setQuery(''); }}
              className="w-full py-4 rounded-2xl bg-[#1B3A6B] text-white font-bold text-sm">
              Confirmar {value.length > 0 ? `(${value.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// WIZARD STEPS
// ─────────────────────────────────────────────

type StepProps = { ro: OccurrenceReport; onChange: (u: Partial<OccurrenceReport>) => void };

function StepCabecalho({ ro, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Emergência?</SecTitle>
        <div className="flex gap-2">
          <Toggle label="🚨 Sim" active={ro.emergency === true}  onClick={() => onChange({ emergency: true  })} />
          <Toggle label="Não"    active={ro.emergency === false} onClick={() => onChange({ emergency: false })} />
        </div>
      </Card>

      <Card>
        <SecTitle>Identificação</SecTitle>
        <div className="space-y-3">
          <Field label="Nº do R.O.">
            <Input value={ro.roNumber} onChange={v => onChange({ roNumber: v })} placeholder="Ex: 001/2026" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" required>
              <Input type="date" value={ro.date} onChange={v => onChange({ date: v })} />
            </Field>
            <Field label="Hora inicial" required>
              <Input type="time" value={ro.startTime} onChange={v => onChange({ startTime: v })} />
            </Field>
          </div>
          <Field label="Hora final">
            <Input type="time" value={ro.endTime} onChange={v => onChange({ endTime: v })} />
          </Field>
        </div>
      </Card>

      <Card>
        <SecTitle>Veículo</SecTitle>
        <Field label="Viatura" required>
          <select value={ro.vehicle} onChange={e => onChange({ vehicle: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
            <option value="">Selecione a viatura...</option>
            <option value="VTR-001">VTR-001</option>
            <option value="VTR-002">VTR-002</option>
            <option value="VTR-003">VTR-003</option>
            <option value="VTR-004">VTR-004</option>
            <option value="VTR-005">VTR-005</option>
            <option value="Outros">Outros</option>
          </select>
        </Field>
      </Card>

      <Card>
        <SecTitle>Preenchido Por</SecTitle>
        {ro.agentLocked ? (
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {(AGENTS.find(a => a.name === ro.agent)?.display ?? ro.agent).charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--text-main)]">
                {AGENTS.find(a => a.name === ro.agent)?.display ?? ro.agent}
              </p>
              {ro.role && <p className="text-xs text-[var(--text-muted)]">{ro.role}</p>}
              {ro.re && <p className="text-xs text-[var(--text-muted)]">RE: {ro.re}</p>}
            </div>
            <span className="ml-auto text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">🔒 Identificado</span>
          </div>
        ) : (
          <Field label="Responsável pelo preenchimento" required>
            <AgentPicker value={ro.agent} onChange={(name, re, role) => onChange({ agent: name, re, role })} />
          </Field>
        )}
      </Card>

      <Card>
        <SecTitle>Origem da Solicitação</SecTitle>
        {/* opções sem campo de texto: grid 2 colunas */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {ORIGINS.filter(o => !o.hasText).map(o => (
            <Toggle key={o.id} label={o.label} active={ro.origin === o.id}
              onClick={() => onChange({ origin: ro.origin === o.id ? '' : o.id, originText: '' })} />
          ))}
        </div>
        {/* opções com campo de texto: cada uma em linha própria */}
        <div className="space-y-2">
          {ORIGINS.filter(o => o.hasText).map(o => (
            <div key={o.id}>
              <Toggle label={o.label} active={ro.origin === o.id}
                onClick={() => onChange({ origin: ro.origin === o.id ? '' : o.id, originText: '' })} />
              {ro.origin === o.id && (
                <div className="mt-1.5 ml-1">
                  <Input value={ro.originText} onChange={v => onChange({ originText: v })}
                    placeholder={o.id === 'procAdm' ? 'Número do processo...' : o.id === 'oficio' ? 'Número do ofício...' : 'Especifique...'} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface NominatimResult {
  display_name: string;
  address: {
    road?: string; pedestrian?: string; path?: string;
    suburb?: string; neighbourhood?: string; quarter?: string;
    house_number?: string;
  };
}

function AddressAutocomplete({ value, onChange, onSelect }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (road: string, number: string, suburb: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (q: string) => {
    if (q.length < 4) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Cajamar, SP')}&format=json&addressdetails=1&limit=5&countrycodes=br`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 500);
  };

  const pick = (r: NominatimResult) => {
    const road = r.address.road ?? r.address.pedestrian ?? r.address.path ?? '';
    const number = r.address.house_number ?? '';
    const suburb = r.address.suburb ?? r.address.neighbourhood ?? r.address.quarter ?? '';
    onSelect(road, number, suburb);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input value={value} onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value); }}
          placeholder="Rua, Av., Estrada..."
          className="w-full px-4 py-3 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>
        )}
      </div>
      {suggestions.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          className="absolute z-30 left-0 right-0 mt-1 border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((r, i) => (
            <button key={i} type="button" onClick={() => pick(r)}
              style={{ color: 'var(--text-main)', borderColor: 'var(--border)' }}
              className="w-full px-4 py-3 text-left text-xs border-b last:border-0 active:opacity-70 leading-tight">
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepSolicitante({ ro, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Dados do Solicitante</SecTitle>
        <div className="space-y-3">
          <Field label="Nome" required>
            <Input value={ro.reporterName} onChange={v => onChange({ reporterName: v })} placeholder="Nome completo" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RG / CPF">
              <Input value={ro.rgCpf} onChange={v => onChange({ rgCpf: v })} placeholder="000.000.000-00" />
            </Field>
            <Field label="Telefone">
              <Input type="tel" value={ro.phone} onChange={v => onChange({ phone: v })} placeholder="(11) 90000-0000" />
            </Field>
          </div>
          <Field label="E-mail">
            <Input type="email" value={ro.reporterEmail ?? ''} onChange={v => onChange({ reporterEmail: v })} placeholder="email@exemplo.com" />
          </Field>
        </div>
      </Card>

      <Card>
        <SecTitle>Endereço da Ocorrência</SecTitle>
        <div className="space-y-3">
          <Field label="Logradouro" required>
            <AddressAutocomplete
              value={ro.address}
              onChange={v => onChange({ address: v })}
              onSelect={(road, number, suburb) => onChange({
                address: road,
                addressNumber: number || ro.addressNumber,
                neighborhood: suburb || ro.neighborhood,
              })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nº">
              <Input value={ro.addressNumber} onChange={v => onChange({ addressNumber: v })} placeholder="Nº" />
            </Field>
            <div className="col-span-2">
              <Field label="Bairro" required>
                <Input value={ro.neighborhood} onChange={v => onChange({ neighborhood: v })} placeholder="Bairro" />
              </Field>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CobradeSelector({ cobrade, onChange }: {
  cobrade: { active: boolean; code: string; label: string };
  onChange: (c: { active: boolean; code: string; label: string }) => void;
}) {
  const existingItem = COBRADE_LIST.find(c => c.code === cobrade.code);
  const [selGroup, setSelGroup] = useState<string>(existingItem?.group ?? '');
  const [selSub,   setSelSub]   = useState<string>(existingItem?.subgroup ?? '');

  const groups    = [...new Set(COBRADE_LIST.map(c => c.group))];
  const subgroups = selGroup ? [...new Set(COBRADE_LIST.filter(c => c.group === selGroup).map(c => c.subgroup))] : [];
  const items     = selSub   ? COBRADE_LIST.filter(c => c.subgroup === selSub) : [];

  const sel = (cls: string) =>
    `w-full rounded-xl px-3 py-2.5 text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 ${cls}`;

  return (
    <div className="mt-3 space-y-3">
      <Field label="1. Grupo">
        <select value={selGroup} onChange={e => { setSelGroup(e.target.value); setSelSub(''); onChange({ ...cobrade, code: '', label: '' }); }} className={sel('')}>
          <option value="">Selecione o grupo...</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      {selGroup && (
        <Field label="2. Subgrupo / Tipo">
          <select value={selSub} onChange={e => { setSelSub(e.target.value); onChange({ ...cobrade, code: '', label: '' }); }} className={sel('')}>
            <option value="">Selecione o subgrupo...</option>
            {subgroups.map(s => <option key={s} value={s}>{s.split(' – ')[1] ?? s}</option>)}
          </select>
        </Field>
      )}
      {selSub && (
        <Field label="3. Evento / Código">
          <select value={cobrade.code} onChange={e => {
            const item = COBRADE_LIST.find(c => c.code === e.target.value);
            if (item) onChange({ active: true, code: item.code, label: item.label });
          }} className={sel('')}>
            <option value="">Selecione o evento...</option>
            {items.map(i => <option key={i.code} value={i.code}>{i.label}</option>)}
          </select>
        </Field>
      )}
      {cobrade.code && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-0.5">Código COBRADE selecionado</p>
          <p className="text-sm font-bold text-orange-900 font-mono">{cobrade.code}</p>
          <p className="text-xs text-orange-700 mt-0.5">{cobrade.label}</p>
        </div>
      )}
    </div>
  );
}

function StepOcorrencia({ ro, onChange }: StepProps) {
  const [search, setSearch] = useState('');

  const filtered = OCCURRENCE_TYPES.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );
  const categories = [...new Set(filtered.map(t => t.category))];

  const selectType = (t: OccurrenceType) => {
    onChange({ occurrenceTypeId: t.id, occurrenceTypeLabel: t.label, dynamicFields: {} });
    setSearch('');
  };

  const selectedType = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);

  return (
    <div className="space-y-4">
      {/* COBRADE — topo */}
      <Card>
        <SecTitle>COBRADE</SecTitle>
        <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
          Classificação e Codificação Brasileira de Desastres. Preencha somente se a ocorrência se enquadrar como desastre.
        </p>
        <Field label="Esta ocorrência é um desastre (COBRADE)?">
          <div className="flex gap-3 mt-1">
            {['Sim', 'Não'].map(opt => {
              const isActive = opt === 'Sim' ? !!ro.cobrade?.active : ro.cobrade?.active === false;
              return (
                <button key={opt} type="button"
                  onClick={() => onChange({ cobrade: { active: opt === 'Sim', code: '', label: '' } })}
                  className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors',
                    isActive ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 text-gray-600 bg-white')}>
                  {opt}
                </button>
              );
            })}
          </div>
        </Field>
        {ro.cobrade?.active && (
          <CobradeSelector cobrade={ro.cobrade} onChange={c => onChange({ cobrade: c })} />
        )}
      </Card>

      {/* Tipo de Ocorrência */}
      <Card>
        <SecTitle>Tipo de Ocorrência</SecTitle>

        {ro.occurrenceTypeId ? (
          <div className="flex items-center gap-3 p-3 bg-[#1B3A6B] rounded-xl">
            <span className="text-2xl">{selectedType?.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{ro.occurrenceTypeLabel}</p>
              <p className="text-blue-300 text-xs">{selectedType?.category}</p>
            </div>
            <button type="button"
              onClick={() => onChange({ occurrenceTypeId: '', occurrenceTypeLabel: '', dynamicFields: {} })}
              className="text-blue-300 hover:text-white p-1 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tipo de ocorrência..."
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 -mx-1 px-1">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">{cat}</p>
                  {filtered.filter(t => t.category === cat).map(type => (
                    <button key={type.id} type="button" onClick={() => selectType(type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-left transition-colors">
                      <span className="text-xl w-7 text-center">{type.emoji}</span>
                      <span className="text-sm text-gray-800">{type.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <SecTitle>Localização</SecTitle>
        <Field label="Área de Risco">
          <div className="flex gap-3 mt-1">
            {['Sim', 'Não'].map(opt => (
              <button key={opt} type="button"
                onClick={() => onChange({ riskArea: opt })}
                className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors',
                  ro.riskArea === opt
                    ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white'
                    : 'border-gray-300 text-gray-600 bg-white')}>
                {opt}
              </button>
            ))}
          </div>
        </Field>
      </Card>
    </div>
  );
}

function StepDetalhes({ ro, onChange }: StepProps) {
  const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);
  const section = type?.section ?? 'generic';
  const setDF = (f: DF) => onChange({ dynamicFields: f });

  if (section === 'generic' || !type) {
    return (
      <Card>
        <div className="text-center py-8">
          <span className="text-5xl mb-3 block">✅</span>
          <p className="text-gray-500 text-sm font-medium">Sem campos adicionais para este tipo.</p>
          <p className="text-gray-400 text-xs mt-1">Continue para o próximo passo.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{type.emoji}</span>
        <SecTitle>{type.label}</SecTitle>
      </div>
      {section === 'trees'      && <TreesSection      fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'structural' && <StructuralSection fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'bees'       && <BeesSection       fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'animals'    && <AnimalsSection    fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'geological' && <GeologicalSection fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'hydrological' && <HydroSection   fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'fire'       && <FireSection       fields={ro.dynamicFields} onChange={setDF} />}
    </Card>
  );
}

function StepApoio({ ro, onChange }: StepProps) {
  const updateAgency = (id: string, updates: Partial<Agency>) =>
    onChange({ agencies: ro.agencies.map(a => a.id === id ? { ...a, ...updates } : a) });

  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Órgãos acionados</SecTitle>
        <div className="space-y-1">
          {ro.agencies.map(ag => (
            <div key={ag.id}>
              <label className="flex items-center gap-3 py-2 cursor-pointer select-none"
                onClick={() => updateAgency(ag.id, { selected: !ag.selected })}>
                <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                  ag.selected ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300 bg-white')}>
                  {ag.selected && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span style={{ color: 'var(--text-main)' }} className="text-sm font-medium">{ag.label}</span>
              </label>
              {ag.selected && (
                <div className="ml-8 grid grid-cols-2 gap-2 mb-2">
                  <input value={ag.vehicles} onChange={e => updateAgency(ag.id, { vehicles: e.target.value })}
                    placeholder="Viaturas"
                    className="px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  <input value={ag.responsible} onChange={e => updateAgency(ag.id, { responsible: e.target.value })}
                    placeholder="Encarregado"
                    className="px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SecTitle>Perdas e Danos — Materiais</SecTitle>
        <div className="space-y-1 mb-4">
          {[['furniture','Móveis'],['food','Alimentos'],['clothes','Roupas'],['documents','Documentos'],['property','Imóvel'],['others','Outros']].map(([k,l]) => (
            <Checkbox key={k} checked={!!(ro.losses as unknown as Record<string,unknown>)[k]}
              onChange={v => onChange({ losses: { ...ro.losses, [k]: v } })} label={l} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['victims','Vítimas'],['injured','Feridos'],['deaths','Mortos']].map(([k,l]) => (
            <Field key={k} label={l}>
              <Input type="number" value={(ro.losses as unknown as Record<string,string>)[k]}
                onChange={v => onChange({ losses: { ...ro.losses, [k]: v } })} placeholder="0" />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30000 }
    );
  });
}

function StepFotos({ ro, onChange }: StepProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>, fromCamera: boolean) => {
    const files = e.target.files;
    if (!files) return;
    const gps = fromCamera ? await getGPS() : null;
    const newPhotos: Photo[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await compressImage(file);
      const photo: Photo = { id: genId(), dataUrl, caption: `Foto ${ro.photos.length + newPhotos.length + 1} – ` };
      if (gps) { photo.lat = gps.lat; photo.lng = gps.lng; }
      newPhotos.push(photo);
    }
    onChange({ photos: [...ro.photos, ...newPhotos] });
    if (inputRef.current) inputRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Cenário encontrado</SecTitle>
        <Textarea value={ro.photoScenario} onChange={v => onChange({ photoScenario: v })}
          placeholder="Descreva o cenário encontrado ao chegar no local..." rows={4} />
      </Card>

      <Card>
        <SecTitle>Fotos ({ro.photos.length})</SecTitle>
        {/* Câmera */}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple
          onChange={e => handleFiles(e, true)} className="hidden" />
        {/* Galeria */}
        <input ref={galleryRef} type="file" accept="image/*" multiple
          onChange={e => handleFiles(e, false)} className="hidden" />
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors">
            <Camera size={20} />
            <span className="text-sm font-semibold">Câmera</span>
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors">
            <FileText size={20} />
            <span className="text-sm font-semibold">Galeria</span>
          </button>
        </div>

        <div className="space-y-4">
          {ro.photos.map((photo, idx) => (
            <div key={photo.id}>
              <div className="relative">
                <img src={photo.dataUrl} alt={`Foto ${idx + 1}`}
                  className="w-full rounded-xl object-cover max-h-64" />
                <button type="button" onClick={() => onChange({ photos: ro.photos.filter(p => p.id !== photo.id) })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md">
                  <Trash2 size={14} />
                </button>
              </div>
              <input value={photo.caption}
                onChange={e => onChange({ photos: ro.photos.map(p => p.id === photo.id ? { ...p, caption: e.target.value } : p) })}
                placeholder={`Foto ${idx + 1} – Legenda...`}
                className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              {photo.lat != null && (
                <p className="text-[11px] text-green-700 mt-1 flex items-center gap-1">
                  📍 {photo.lat.toFixed(6)}, {photo.lng!.toFixed(6)}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

function StepConcluir({ ro, onChange }: StepProps) {
  const [showSecretarias, setShowSecretarias] = useState(false);

  const toggleDest = (s: string) => {
    const curr = ro.encaminharDest ?? [];
    onChange({ encaminharDest: curr.includes(s) ? curr.filter(d => d !== s) : [...curr, s] });
  };

  const statusConfig = [
    { id: 'encaminhar',    label: 'Encaminhar',            color: 'bg-blue-100 text-blue-700 border-blue-300',   activeColor: 'bg-blue-500 text-white border-blue-600' },
    { id: 'arquivar',      label: 'Arquivar / Finalizado', color: 'bg-green-100 text-green-700 border-green-300', activeColor: 'bg-green-500 text-white border-green-600' },
    { id: 'monitoramento', label: 'Monitoramento',         color: 'bg-orange-100 text-orange-700 border-orange-300', activeColor: 'bg-orange-500 text-white border-orange-600' },
  ] as const;

  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Observações</SecTitle>
        <Textarea value={ro.observations} onChange={v => onChange({ observations: v })}
          placeholder="Observações gerais sobre a ocorrência..." rows={4} />
      </Card>

      <Card>
        <SecTitle>Declarante</SecTitle>
        <div className="space-y-3">
          <Field label="Nome do Declarante">
            <Input value={ro.declarant1} onChange={v => onChange({ declarant1: v })} placeholder="Nome completo" />
          </Field>
          <Field label="Função / Vínculo">
            <Input value={ro.declarant1Role} onChange={v => onChange({ declarant1Role: v })} placeholder="Ex.: Morador, Proprietário..." />
          </Field>
          <Field label="Assinatura (escreva com o dedo)">
            <SignaturePad value={ro.declarant1Sig} onChange={v => onChange({ declarant1Sig: v })} />
          </Field>
        </div>
      </Card>

      <Card>
        <SecTitle>Agentes Participantes</SecTitle>
        <p className="text-xs text-gray-500 mb-3">Selecione todos os agentes que participaram da ocorrência</p>
        <AgentMultiPicker value={ro.agentParticipants ?? []} onChange={v => onChange({ agentParticipants: v })} />
      </Card>

      <Card>
        <SecTitle>Desfecho / Conclusão Final</SecTitle>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {statusConfig.map(s => (
            <button key={s.id} type="button"
              onClick={() => {
                onChange({ conclusionStatus: ro.conclusionStatus === s.id ? '' : s.id as OccurrenceReport['conclusionStatus'] });
                if (s.id !== 'encaminhar') onChange({ encaminharDest: [] });
                if (s.id === 'encaminhar' && ro.conclusionStatus !== 'encaminhar') setShowSecretarias(true);
              }}
              className={cn('py-3 px-2 rounded-xl border-2 font-bold text-sm transition-colors',
                ro.conclusionStatus === s.id ? s.activeColor : s.color)}>
              {s.label}
            </button>
          ))}
        </div>

        {ro.conclusionStatus === 'encaminhar' && (
          <div className="mb-3">
            <button type="button" onClick={() => setShowSecretarias(!showSecretarias)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-semibold">
              <span>Secretarias / Departamentos</span>
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                {(ro.encaminharDest ?? []).length} selecionado(s)
              </span>
            </button>
            {showSecretarias && (
              <div className="mt-2 border border-blue-200 rounded-xl overflow-hidden">
                {SECRETARIAS.map(s => (
                  <button key={s} type="button" onClick={() => toggleDest(s)}
                    className={cn('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-0 transition-colors',
                      (ro.encaminharDest ?? []).includes(s) ? 'bg-blue-50' : 'bg-white active:bg-gray-50')}>
                    <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                      (ro.encaminharDest ?? []).includes(s) ? 'bg-blue-500 border-blue-500' : 'border-gray-300')}>
                      {(ro.encaminharDest ?? []).includes(s) && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-xs text-gray-700">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Textarea value={ro.conclusion} onChange={v => onChange({ conclusion: v })}
          placeholder="Conclusão e providências finais..." rows={3} />
      </Card>

      {/* ── Auto de Interdição ── */}
      {(() => {
        const interdicao = {
          ...getDefaultInterdicao(ro.roNumber),
          ...(ro.interdicao || {}),
          numero: ro.interdicao?.numero || ro.roNumber || '',
          causas: Array.isArray(ro.interdicao?.causas) ? ro.interdicao.causas : [],
          danos: Array.isArray(ro.interdicao?.danos) ? ro.interdicao.danos : [],
          bensAfetados: Array.isArray(ro.interdicao?.bensAfetados) ? ro.interdicao.bensAfetados : [],
        };

        const updateInterdicao = (patch: Partial<OccurrenceReport['interdicao']>) => {
          onChange({
            interdicao: {
              ...interdicao,
              ...patch,
            },
          });
        };

        return (
          <>
            <Card>
              <SecTitle>Auto de Interdição</SecTitle>
              <Field label="Emitir Auto de Interdição?">
                <div className="flex gap-3 mt-1">
                  {['Sim', 'Não'].map(opt => {
                    const isActive = opt === 'Sim' ? !!interdicao.active : !interdicao.active;
                    return (
                      <button key={opt} type="button"
                        onClick={() => updateInterdicao({ active: opt === 'Sim', numero: interdicao.numero || ro.roNumber })}
                        className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                          isActive ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Card>

            {interdicao.active && (
              <div className="space-y-4">
                <Card>
                  <SecTitle>Identificação do Auto</SecTitle>
                  <div className="space-y-3">
                    <Field label="Nº do Auto de Interdição">
                      <Input value={interdicao.numero || ro.roNumber} onChange={v => updateInterdicao({ numero: v })} placeholder="Ex.: 001/2026" />
                    </Field>
                    <Field label="Ficha de Avaliação">
                      <Input value={interdicao.fichaAvaliacao || ''} onChange={v => updateInterdicao({ fichaAvaliacao: v })} placeholder="Nº da ficha" />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>1 — Causa da Interdição</SecTitle>
                  <div className="space-y-2">
                    {['Inundação','Enchente','Incêndio','Má Construção','Explosão','Desgaste Natural','Deslizamento de Terra','Desbarrancamento','Desabamento','Obras de Terceiros'].map(c => (
                      <button key={c} type="button"
                        onClick={() => {
                          const curr = interdicao.causas;
                          updateInterdicao({ causas: curr.includes(c) ? curr.filter(x => x !== c) : [...curr, c] });
                        }}
                        className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors',
                          interdicao.causas.includes(c) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-700 border-gray-200')}>
                        <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          interdicao.causas.includes(c) ? 'bg-white border-white' : 'border-gray-400')}>
                          {interdicao.causas.includes(c) && <Check size={12} className="text-[#1B3A6B]" />}
                        </div>
                        {c}
                      </button>
                    ))}
                    <Field label="Outros">
                      <Input value={interdicao.causaOutros || ''} onChange={v => updateInterdicao({ causaOutros: v })} placeholder="Descreva..." />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>2 — Danos Aparentes</SecTitle>
                  <div className="space-y-2">
                    {['Teto','Parede','Pisos','Estrutura','Fundações'].map(d => (
                      <button key={d} type="button"
                        onClick={() => {
                          const curr = interdicao.danos;
                          updateInterdicao({ danos: curr.includes(d) ? curr.filter(x => x !== d) : [...curr, d] });
                        }}
                        className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors',
                          interdicao.danos.includes(d) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-700 border-gray-200')}>
                        <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          interdicao.danos.includes(d) ? 'bg-white border-white' : 'border-gray-400')}>
                          {interdicao.danos.includes(d) && <Check size={12} className="text-[#1B3A6B]" />}
                        </div>
                        {d}
                      </button>
                    ))}
                    <Field label="Outros">
                      <Input value={interdicao.danosOutros || ''} onChange={v => updateInterdicao({ danosOutros: v })} placeholder="Descreva..." />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>3 — Bens Afetados</SecTitle>
                  <div className="space-y-3">
                    {[['particular','Particular'],['municipal','Municipal'],['estadual','Estadual']].map(([id, label]) => (
                      <div key={id}>
                        <button type="button"
                          onClick={() => {
                            const curr = interdicao.bensAfetados;
                            updateInterdicao({ bensAfetados: curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id] });
                          }}
                          className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors',
                            interdicao.bensAfetados.includes(id) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-700 border-gray-200')}>
                          <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                            interdicao.bensAfetados.includes(id) ? 'bg-white border-white' : 'border-gray-400')}>
                            {interdicao.bensAfetados.includes(id) && <Check size={12} className="text-[#1B3A6B]" />}
                          </div>
                          {label}
                        </button>
                        {interdicao.bensAfetados.includes(id) && (
                          <div className="mt-2 pl-2">
                            <Input
                              inputMode="numeric"
                              value={id === 'particular' ? (interdicao.valorParticular || '') : id === 'municipal' ? (interdicao.valorMunicipal || '') : (interdicao.valorEstadual || '')}
                              onChange={v => {
                                const formatted = formatBRLInput(v);
                                const fieldKey = id === 'particular' ? 'valorParticular' : id === 'municipal' ? 'valorMunicipal' : 'valorEstadual';
                                updateInterdicao({ [fieldKey]: formatted });
                              }}
                              placeholder="R$ 0,00" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SecTitle>4 — Tipo de Interdição</SecTitle>
                  <div className="flex gap-3 mb-4">
                    {[['parcial','Parcial'],['total','Total']].map(([id, label]) => (
                      <button key={id} type="button"
                        onClick={() => updateInterdicao({ tipo: id as 'parcial' | 'total' })}
                        className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                          interdicao.tipo === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <Field label="Evacuará o imóvel?">
                    <div className="flex gap-3">
                      {[['sim','Sim'],['nao','Não']].map(([id, label]) => (
                        <button key={id} type="button"
                          onClick={() => updateInterdicao({ evacuarImovel: id as 'sim' | 'nao' })}
                          className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                            interdicao.evacuarImovel === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {interdicao.evacuarImovel === 'sim' && (
                    <div className="mt-3">
                      <Field label="Prazo para abandono (deixe vazio para Imediatamente)">
                        <Input value={interdicao.prazoAbandono || ''} onChange={v => updateInterdicao({ prazoAbandono: v })} placeholder="Ex.: 24 horas, 3 dias..." />
                      </Field>
                    </div>
                  )}
                </Card>

                <Card>
                  <SecTitle>5 — Destino do Morador</SecTitle>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {[['parentes','Parentes / Vizinhos'],['outros','Outros']].map(([id, label]) => (
                        <button key={id} type="button"
                          onClick={() => updateInterdicao({ destinoMorador: id })}
                          className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                            interdicao.destinoMorador === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {interdicao.destinoMorador === 'outros' && (
                      <Input value={interdicao.destinoOutros || ''} onChange={v => updateInterdicao({ destinoOutros: v })} placeholder="Especifique..." />
                    )}
                    <Field label="Contato">
                      <Input value={interdicao.destinoContato || ''} onChange={v => updateInterdicao({ destinoContato: v })} placeholder="Nome para contato" />
                    </Field>
                    <Field label="Telefone">
                      <Input value={interdicao.destinoTelefone || ''} onChange={v => updateInterdicao({ destinoTelefone: v })} placeholder="(11) 00000-0000" />
                    </Field>
                    <Field label="Endereço de destino">
                      <Input value={interdicao.destinoEndereco || ''} onChange={v => updateInterdicao({ destinoEndereco: v })} placeholder="Endereço completo" />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>6 — Observações Importantes</SecTitle>
                  <Textarea value={interdicao.observacoes || ''} onChange={v => updateInterdicao({ observacoes: v })} rows={4} placeholder="Observações relevantes sobre a interdição..." />
                </Card>

                <Card>
                  <SecTitle>7 — Responsável pela Moradia / Testemunha</SecTitle>
                  <div className="space-y-3">
                    <Field label="Tipo">
                      <div className="grid grid-cols-2 gap-2">
                        {[['proprietario','Proprietário'],['morador','Morador'],['locatario','Locatário'],['testemunha','Testemunha']].map(([id, label]) => (
                          <button key={id} type="button"
                            onClick={() => updateInterdicao({ responsavelTipo: id as OccurrenceReport['interdicao']['responsavelTipo'] })}
                            className={cn('py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors',
                              interdicao.responsavelTipo === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Nome">
                      <Input value={interdicao.responsavelNome || ''} onChange={v => updateInterdicao({ responsavelNome: v })} placeholder="Nome completo" />
                    </Field>
                    <Field label="RG">
                      <Input value={interdicao.responsavelRG || ''} onChange={v => updateInterdicao({ responsavelRG: v })} placeholder="Número do RG" />
                    </Field>
                    <Field label="Telefone">
                      <Input value={interdicao.responsavelTelefone || ''} onChange={v => updateInterdicao({ responsavelTelefone: v })} placeholder="(11) 00000-0000" />
                    </Field>
                    <Field label="Assinatura do responsável (escreva com o dedo)">
                      <SignaturePad value={interdicao.responsavelAssinatura || ''} onChange={v => updateInterdicao({ responsavelAssinatura: v })} />
                    </Field>
                  </div>
                </Card>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

// Componente de assinatura em canvas
function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const move = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing.current) return; e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1B3A6B'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y); ctx.stroke(); ctx.moveTo(x, y);
  };
  const end = () => {
    drawing.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div>
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50">
        <canvas ref={canvasRef} width={600} height={150} className="w-full touch-none"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
        {value && <img src={value} alt="assinatura" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}
        {!value && <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">Assine aqui</p>}
      </div>
      {value && (
        <button type="button" onClick={clear} className="mt-1 text-xs text-red-500 underline">Limpar assinatura</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// WIZARD
// ─────────────────────────────────────────────

interface ValidationError { message: string; step: WizardStep; }

function validateRO(ro: OccurrenceReport): ValidationError | null {
  if (!ro.agent)             return { message: 'Informe quem está preenchendo o R.O.', step: 1 };
  if (!ro.address)           return { message: 'Informe o endereço da ocorrência.', step: 2 };
  if (!ro.neighborhood)      return { message: 'Informe o bairro da ocorrência.',   step: 2 };
  if (!ro.occurrenceTypeId)  return { message: 'Selecione o tipo de ocorrência.',   step: 3 };
  return null;
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <p className="text-[10px] font-black text-[#1B3A6B] uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function ReviewRow({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      {label && <span className="text-[11px] text-gray-500 min-w-[90px] flex-shrink-0">{label}</span>}
      <span className={cn('text-xs font-semibold flex-1', highlight ? 'text-orange-600' : 'text-gray-800')}>{value}</span>
    </div>
  );
}

function WizardScreen({ ro, onUpdate, onSave, onCancel }: {
  ro: OccurrenceReport;
  onUpdate: (u: Partial<OccurrenceReport>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [showReview, setShowReview] = useState(false);
  const TOTAL = 7;

  const goNext = () => {
    if (step < TOTAL) { setStep((step + 1) as WizardStep); window.scrollTo(0, 0); return; }
    const err = validateRO(ro);
    if (err) { setValidationError(err); return; }
    setShowReview(true);
  };
  const goBack = () => {
    if (step > 1) { setStep((step - 1) as WizardStep); window.scrollTo(0, 0); }
    else setConfirmLeave(true);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }} className="min-h-screen flex flex-col transition-colors">
      {/* Header */}
      <div className="bg-[#1B3A6B] text-white sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={goBack} className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-blue-300 font-medium">R.O. {ro.roNumber}</p>
            <p className="font-bold text-sm truncate">{STEP_LABELS[step - 1]}</p>
          </div>
          <span className="text-xs text-blue-300 flex-shrink-0">{step}/{TOTAL}</span>
        </div>
        <div className="h-1 bg-[#0d2147]">
          <div className="h-full bg-orange-400 transition-all duration-300"
            style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-28">
        {step === 1 && <StepCabecalho   ro={ro} onChange={onUpdate} />}
        {step === 2 && <StepSolicitante ro={ro} onChange={onUpdate} />}
        {step === 3 && <StepOcorrencia  ro={ro} onChange={onUpdate} />}
        {step === 4 && <StepDetalhes    ro={ro} onChange={onUpdate} />}
        {step === 5 && <StepApoio       ro={ro} onChange={onUpdate} />}
        {step === 6 && <StepFotos       ro={ro} onChange={onUpdate} />}
        {step === 7 && <StepConcluir    ro={ro} onChange={onUpdate} />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 safe-area-pb">
        <button type="button" onClick={goBack}
          className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm active:bg-gray-50">
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </button>
        <button type="button" onClick={goNext}
          className="flex-[2] py-3.5 rounded-xl bg-[#1B3A6B] text-white font-bold text-sm flex items-center justify-center gap-2 active:bg-[#142d52] shadow-sm">
          {step === TOTAL
            ? <><Check size={18} strokeWidth={3} /> Salvar R.O.</>
            : <>Continuar <ChevronRight size={18} /></>}
        </button>
      </div>

      {/* Modal — revisão antes de salvar */}
      {showReview && (
        <div className="fixed inset-0 bg-black/70 flex flex-col z-50 overflow-y-auto">
          <div className="bg-white rounded-t-3xl mt-auto min-h-[85vh] flex flex-col">
            <div className="sticky top-0 bg-white rounded-t-3xl px-5 pt-5 pb-3 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-[#1B3A6B] text-base">Revisão do R.O.</p>
                  <p className="text-xs text-gray-500 mt-0.5">Confirme os dados antes de salvar</p>
                </div>
                <button type="button" onClick={() => setShowReview(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Identificação */}
              <ReviewSection title="Identificação">
                <ReviewRow label="Nº R.O." value={ro.roNumber} />
                <ReviewRow label="Data" value={ro.date} />
                <ReviewRow label="Hora inicial" value={ro.startTime} />
                <ReviewRow label="Viatura" value={ro.vehicle} />
                <ReviewRow label="Preenchido por" value={AGENTS.find(a => a.name === ro.agent)?.display ?? ro.agent} />
                {ro.role && <ReviewRow label="Cargo" value={ro.role} />}
              </ReviewSection>

              {/* Endereço */}
              <ReviewSection title="Endereço">
                <ReviewRow label="Logradouro" value={[ro.address, ro.addressNumber].filter(Boolean).join(', ')} />
                <ReviewRow label="Bairro" value={ro.neighborhood} />
              </ReviewSection>

              {/* Ocorrência */}
              <ReviewSection title="Ocorrência">
                <ReviewRow label="Tipo" value={ro.occurrenceTypeLabel} />
                {ro.emergency && <ReviewRow label="Emergência" value="Sim" highlight />}
              </ReviewSection>

              {/* Solicitante */}
              {(ro.reporterName || ro.phone) && (
                <ReviewSection title="Solicitante">
                  <ReviewRow label="Nome" value={ro.reporterName} />
                  <ReviewRow label="Telefone" value={ro.phone} />
                </ReviewSection>
              )}

              {/* Equipe */}
              {(ro.agentParticipants ?? []).length > 0 && (
                <ReviewSection title="Agentes Participantes">
                  {(ro.agentParticipants ?? []).map(n => (
                    <ReviewRow key={n} label="" value={AGENTS.find(a => a.name === n)?.display ?? n} />
                  ))}
                </ReviewSection>
              )}

              {/* Fotos */}
              {ro.photos.length > 0 && (
                <ReviewSection title="Fotos">
                  <ReviewRow label="Total de fotos" value={`${ro.photos.length} foto(s)`} />
                </ReviewSection>
              )}

              {/* Desfecho */}
              {ro.conclusionStatus && (
                <ReviewSection title="Desfecho">
                  <ReviewRow label="Status" value={{ encaminhar: 'Encaminhar', arquivar: 'Arquivar / Finalizado', monitoramento: 'Monitoramento', '': '' }[ro.conclusionStatus] ?? ''} />
                  {ro.conclusion && <ReviewRow label="Conclusão" value={ro.conclusion} />}
                </ReviewSection>
              )}

              {/* Auto de Interdição */}
              {ro.interdicao?.active && (
                <ReviewSection title="Auto de Interdição">
                  <ReviewRow label="Nº do Auto" value={ro.interdicao.numero} highlight />
                  <ReviewRow label="Tipo" value={ro.interdicao.tipo === 'parcial' ? 'Parcial' : 'Total'} />
                  {ro.interdicao.causas.length > 0 && <ReviewRow label="Causas" value={ro.interdicao.causas.join(', ')} />}
                </ReviewSection>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <button type="button" onClick={() => { setShowReview(false); onSave(); }}
                className="w-full py-4 rounded-2xl bg-green-600 text-white font-black text-sm flex items-center justify-center gap-2 active:opacity-80 shadow-lg">
                <Check size={20} strokeWidth={3} /> Confirmar e Salvar R.O.
              </button>
              <button type="button" onClick={() => setShowReview(false)}
                className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">
                Voltar e corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — erro de validação */}
      {validationError && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <p className="font-bold text-gray-800 text-base">Campo obrigatório</p>
            </div>
            <p className="text-sm text-gray-500 mb-5">{validationError.message}</p>
            <button type="button"
              onClick={() => { setStep(validationError.step); setValidationError(null); window.scrollTo(0, 0); }}
              className="w-full py-3 rounded-xl bg-[#1B3A6B] text-white font-bold text-sm">
              Ir para a etapa {validationError.step}
            </button>
          </div>
        </div>
      )}

      {/* Modal — confirmação de saída */}
      {confirmLeave && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="font-bold text-gray-800 text-base mb-2">Sair do preenchimento?</p>
            <p className="text-sm text-gray-500 mb-5">O rascunho será salvo e você poderá continuar depois.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmLeave(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">
                Continuar aqui
              </button>
              <button type="button" onClick={() => { setConfirmLeave(false); onCancel(); }}
                className="flex-1 py-3 rounded-xl bg-[#1B3A6B] text-white font-bold text-sm">
                Salvar rascunho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────

function HomeScreen({ ros, onNew, onView, onDelete, onDeleteAll, darkMode, onToggleDark, onSignOut }: {
  ros: OccurrenceReport[];
  onNew: () => void;
  onView: (r: OccurrenceReport) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
}) {
  const [query, setQuery]           = useState('');
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [showStats, setShowStats]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  const q = query.trim().toLowerCase();
  const filtered = [...ros].reverse().filter(ro => {
    if (q && !(
      ro.roNumber.toLowerCase().includes(q) ||
      ro.occurrenceTypeLabel.toLowerCase().includes(q) ||
      ro.neighborhood.toLowerCase().includes(q) ||
      ro.address.toLowerCase().includes(q) ||
      ro.rgCpf.toLowerCase().includes(q) ||
      ro.reporterName.toLowerCase().includes(q)
    )) return false;
    if (dateFrom && ro.date < dateFrom) return false;
    if (dateTo   && ro.date > dateTo)   return false;
    return true;
  });

  const exportCSV = () => {
    const header = ['Nº R.O.','Data','Tipo','Endereço','Bairro','Preenchido Por','Status','Desfecho'];
    const rows = [...ros].reverse().map(r => [
      r.roNumber, r.date, r.occurrenceTypeLabel,
      [r.address, r.addressNumber].filter(Boolean).join(', '),
      r.neighborhood,
      AGENTS.find(a => a.name === r.agent)?.display ?? r.agent ?? '',
      r.status === 'completed' ? 'Concluído' : 'Rascunho',
      ({ encaminhar: 'Encaminhar', arquivar: 'Arquivar', monitoramento: 'Monitoramento', '': '' } as Record<string,string>)[r.conclusionStatus] ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ROs_DefesaCivil_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Estatísticas ──
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rosThisMonth = ros.filter(r => r.date.startsWith(thisMonth));
  const completed = ros.filter(r => r.status === 'completed').length;

  const byType = ros.reduce<Record<string, number>>((acc, r) => {
    const k = r.occurrenceTypeLabel || 'Sem tipo';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byAgent = ros.reduce<Record<string, number>>((acc, r) => {
    if (!r.agent) return acc;
    const ag = AGENTS.find(a => a.name === r.agent);
    const k = ag?.display ?? r.agent;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topAgents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byNeighborhood = ros.reduce<Record<string, number>>((acc, r) => {
    if (!r.neighborhood) return acc;
    acc[r.neighborhood] = (acc[r.neighborhood] ?? 0) + 1;
    return acc;
  }, {});
  const topNeighborhoods = Object.entries(byNeighborhood).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Últimos 6 meses
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const count = ros.filter(r => r.date.startsWith(key)).length;
    return { key, label, count };
  });
  const maxMonth = Math.max(...last6Months.map(m => m.count), 1);

  const dk = darkMode;
  const modalBg  = dk ? 'bg-slate-800' : 'bg-white';
  const modalTxt = dk ? 'text-slate-100' : 'text-gray-800';
  const modalSub = dk ? 'text-slate-400' : 'text-gray-500';
  const cardBg   = dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';
  const cardTxt  = dk ? 'text-slate-200' : 'text-gray-700';
  const numClr   = dk ? 'text-blue-300' : 'text-[#1B3A6B]';
  const mutedTxt = dk ? 'text-slate-500' : 'text-gray-400';
  const listBg   = dk ? 'bg-slate-900' : 'bg-gray-50';
  const statBg   = dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  return (
    <div className={cn('min-h-screen flex flex-col', listBg)}>
      {/* Header */}
      <div className="bg-[#1B3A6B] text-white">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-black text-white">DC</span>
              </div>
              <div>
                <p className="text-xs text-blue-300 font-medium">Defesa Civil — Cajamar/SP</p>
                <p className="font-bold text-lg leading-tight">Registro de Ocorrências</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Sair */}
              <button type="button" onClick={onSignOut}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                title="Sair">
                <LogOut size={18} className="text-red-300" />
              </button>
              {/* Toggle dark mode */}
              <button type="button" onClick={onToggleDark}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                title={dk ? 'Modo claro' : 'Modo escuro'}>
                {dk ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} className="text-blue-200" />}
              </button>
              {/* Estatísticas */}
              {ros.length > 0 && (
                <button type="button" onClick={() => setShowStats(s => !s)}
                  className={cn('p-2 rounded-xl transition-colors', showStats ? 'bg-orange-400' : 'bg-white/10 hover:bg-white/20')}
                  title="Estatísticas">
                  <BarChart2 size={18} className="text-white" />
                </button>
              )}
              {/* Excluir todos */}
              {ros.length > 0 && (
                <button type="button" onClick={() => setConfirmAll(true)}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-colors"
                  title="Excluir todos">
                  <Trash2 size={18} className="text-red-300" />
                </button>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nº, tipo, bairro, rua, CPF/RG..."
              className="w-full bg-white/10 text-white placeholder-blue-300 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none focus:bg-white/20" />
          </div>

          {/* Filtros e Exportar */}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setShowFilters(f => !f)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                showFilters ? 'bg-orange-400 text-white' : 'bg-white/10 text-blue-200 hover:bg-white/20')}>
              <Filter size={13} /> Filtrar por data
              {(dateFrom || dateTo) && <span className="w-2 h-2 bg-orange-300 rounded-full" />}
            </button>
            {ros.length > 0 && (
              <button type="button" onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-blue-200 hover:bg-white/20 transition-colors">
                <Download size={13} /> Exportar CSV
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-blue-300 mb-1">De</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-3 py-2 text-sm border border-white/20 focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-blue-300 mb-1">Até</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-3 py-2 text-sm border border-white/20 focus:outline-none" />
              </div>
              {(dateFrom || dateTo) && (
                <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="self-end mb-0.5 px-3 py-2 rounded-xl bg-red-500/30 text-red-200 text-xs font-bold">
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Painel de Estatísticas */}
      {showStats && ros.length > 0 && (
        <div className={cn('mx-4 mt-4 rounded-2xl border shadow-sm overflow-hidden', statBg)}>
          <div className={cn('flex items-center justify-between px-4 pt-4 pb-3 border-b', dk ? 'border-slate-700' : 'border-gray-100')}>
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-orange-500" />
              <span className={cn('font-bold text-sm', dk ? 'text-slate-200' : 'text-gray-800')}>Estatísticas</span>
            </div>
            <button type="button" onClick={() => setShowStats(false)}>
              <ChevronDown size={18} className={mutedTxt} />
            </button>
          </div>

          <div className="px-4 py-4 space-y-5">
            {/* Totais rápidos */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: ros.length, color: 'text-[#1B3A6B]', bg: dk ? 'bg-slate-700' : 'bg-blue-50' },
                { label: 'Este mês', value: rosThisMonth.length, color: 'text-orange-500', bg: dk ? 'bg-slate-700' : 'bg-orange-50' },
                { label: 'Concluídos', value: completed, color: 'text-green-600', bg: dk ? 'bg-slate-700' : 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className={cn('rounded-2xl p-3 text-center', s.bg)}>
                  <p className={cn('text-3xl font-black', s.color)}>{s.value}</p>
                  <p className={cn('text-[10px] font-semibold mt-0.5', mutedTxt)}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Gráfico — R.O.s por mês */}
            <div>
              <p className={cn('text-[10px] font-black uppercase tracking-wider mb-3', mutedTxt)}>R.O.s por mês (últimos 6 meses)</p>
              <div className="flex items-end gap-1.5 h-20">
                {last6Months.map(m => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                    <span className={cn('text-[9px] font-bold', dk ? 'text-slate-400' : 'text-gray-500')}>{m.count > 0 ? m.count : ''}</span>
                    <div className="w-full rounded-t-lg bg-[#1B3A6B] transition-all"
                      style={{ height: `${Math.max(4, Math.round((m.count / maxMonth) * 56))}px`, opacity: m.count === 0 ? 0.2 : 1 }} />
                    <span className={cn('text-[9px] font-medium capitalize', mutedTxt)}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top tipos */}
            {topTypes.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2', mutedTxt)}>Tipos mais frequentes</p>
                <div className="space-y-2">
                  {topTypes.map(([label, count], i) => (
                    <div key={label}>
                      <div className="flex justify-between mb-0.5">
                        <span className={cn('text-xs truncate flex-1 mr-2', dk ? 'text-slate-300' : 'text-gray-700')}>{label}</span>
                        <span className={cn('text-xs font-black', dk ? 'text-slate-400' : 'text-gray-500')}>{count}</span>
                      </div>
                      <div className={cn('h-2 rounded-full overflow-hidden', dk ? 'bg-slate-700' : 'bg-gray-100')}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((count / ros.length) * 100)}%`,
                            backgroundColor: ['#1B3A6B','#f97316','#22c55e','#8b5cf6','#ef4444'][i] ?? '#1B3A6B',
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top bairros */}
            {topNeighborhoods.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2', mutedTxt)}>Bairros com mais ocorrências</p>
                <div className="space-y-1.5">
                  {topNeighborhoods.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-black w-4 text-center', dk ? 'text-slate-500' : 'text-gray-400')}>{i + 1}</span>
                      <span className={cn('text-xs flex-1 truncate', dk ? 'text-slate-300' : 'text-gray-700')}>{name}</span>
                      <span className={cn('text-xs font-black px-2 py-0.5 rounded-full', dk ? 'bg-slate-700 text-orange-400' : 'bg-orange-100 text-orange-700')}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top agentes */}
            {topAgents.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2', mutedTxt)}>Agentes com mais registros</p>
                <div className="space-y-1.5">
                  {topAgents.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-black w-4 text-center', dk ? 'text-slate-500' : 'text-gray-400')}>{i + 1}</span>
                      <span className={cn('text-xs flex-1 truncate', dk ? 'text-slate-300' : 'text-gray-700')}>{name}</span>
                      <span className={cn('text-xs font-black px-2 py-0.5 rounded-full', dk ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-[#1B3A6B]')}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 p-4 pb-28">
        {ros.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={52} className={cn('mx-auto mb-4', mutedTxt)} />
            <p className={cn('font-semibold', mutedTxt)}>Nenhum R.O. registrado</p>
            <p className={cn('text-sm mt-1', mutedTxt)}>Toque em "+ Novo R.O." para começar</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search size={40} className={cn('mx-auto mb-3', mutedTxt)} />
            <p className={cn('font-semibold', mutedTxt)}>Nenhum resultado</p>
            <p className={cn('text-sm mt-1', mutedTxt)}>Tente outros termos de busca</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={cn('text-[11px] font-bold uppercase tracking-wider', mutedTxt)}>
              {q ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}` : `Registros (${ros.length})`}
            </p>
            {filtered.map(ro => {
              const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);
              const conclusionColors: Record<string, string> = {
                encaminhar: 'bg-blue-100 text-blue-700',
                arquivar: 'bg-green-100 text-green-700',
                monitoramento: 'bg-orange-100 text-orange-700',
              };
              const conclusionLabels: Record<string, string> = {
                encaminhar: 'Encaminhar', arquivar: 'Arquivado', monitoramento: 'Monitoramento',
              };
              return (
                <div key={ro.id} className="relative">
                  <button type="button" onClick={() => onView(ro)}
                    className={cn('w-full rounded-2xl p-4 shadow-sm border text-left flex items-start gap-3 active:opacity-80 pr-14', cardBg)}>
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl', dk ? 'bg-slate-700' : 'bg-blue-50')}>
                      {type?.emoji ?? '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                        <span className={cn('font-bold text-sm', numClr)}>
                          {ro.needsNumber ? '⏳ Aguardando nº' : `R.O. ${ro.roNumber}`}
                        </span>
                        <div className="flex gap-1.5">
                          {ro.conclusionStatus && (
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', conclusionColors[ro.conclusionStatus] ?? '')}>
                              {conclusionLabels[ro.conclusionStatus] ?? ''}
                            </span>
                          )}
                          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold',
                            ro.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                            {ro.status === 'completed' ? 'Concluído' : 'Rascunho'}
                          </span>
                        </div>
                      </div>
                      <p className={cn('text-sm font-medium truncate', cardTxt)}>
                        {ro.occurrenceTypeLabel || 'Tipo não definido'}
                      </p>
                      <div className={cn('flex items-center gap-3 mt-1 text-xs', mutedTxt)}>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {fmtDate(ro.date)} {ro.startTime && `às ${ro.startTime}`}
                        </span>
                        {ro.neighborhood && <span className="truncate">{ro.neighborhood}</span>}
                      </div>
                    </div>
                  </button>
                  <button type="button" onClick={() => setConfirmId(ro.id)}
                    className={cn('absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors', mutedTxt, 'hover:text-red-400')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 left-4 right-4">
        <button type="button" onClick={onNew}
          className="w-full bg-[#1B3A6B] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base active:bg-[#142d52]">
          <Plus size={22} /> Novo R.O.
        </button>
      </div>

      {/* Modal — excluir individual */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className={cn('rounded-2xl p-6 w-full max-w-sm shadow-xl', modalBg)}>
            <p className={cn('font-bold text-base mb-2', modalTxt)}>Excluir este R.O.?</p>
            <p className={cn('text-sm mb-5', modalSub)}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmId(null)}
                className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm', dk ? 'border-slate-600 text-slate-300' : 'border-gray-200 text-gray-600')}>
                Cancelar
              </button>
              <button type="button" onClick={() => { onDelete(confirmId); setConfirmId(null); }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — excluir todos */}
      {confirmAll && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className={cn('rounded-2xl p-6 w-full max-w-sm shadow-xl', modalBg)}>
            <p className={cn('font-bold text-base mb-2', modalTxt)}>Excluir todos os R.O.s?</p>
            <p className={cn('text-sm mb-5', modalSub)}>Todos os {ros.length} registros serão apagados permanentemente.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmAll(false)}
                className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm', dk ? 'border-slate-600 text-slate-300' : 'border-gray-200 text-gray-600')}>
                Cancelar
              </button>
              <button type="button" onClick={() => { onDeleteAll(); setConfirmAll(false); }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">
                Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW R.O.
// ─────────────────────────────────────────────

function ShareModal({ ro, onClose }: { ro: OccurrenceReport; onClose: () => void }) {
  const cleanPhone = (ro.phone ?? '').replace(/\D/g, '');
  const hasWhatsApp = cleanPhone.length >= 10;
  const hasEmail = !!(ro.reporterEmail ?? '').trim();

  const summary = [
    `📋 *R.O. ${ro.roNumber} — Defesa Civil Cajamar*`,
    `📅 Data: ${fmtDate(ro.date)} | ${ro.startTime}${ro.endTime ? ' – ' + ro.endTime : ''}`,
    ro.occurrenceTypeLabel ? `🔖 Tipo: ${ro.occurrenceTypeLabel}` : '',
    ro.address ? `📍 Endereço: ${[ro.address, ro.addressNumber, ro.neighborhood].filter(Boolean).join(', ')}` : '',
    ro.reporterName ? `👤 Solicitante: ${ro.reporterName}` : '',
    ro.conclusionStatus ? `✅ Desfecho: ${{ encaminhar: 'Encaminhar', arquivar: 'Arquivar/Finalizado', monitoramento: 'Monitoramento' }[ro.conclusionStatus] ?? ro.conclusionStatus}` : '',
    ro.conclusion ? `📝 ${ro.conclusion}` : '',
  ].filter(Boolean).join('\n');

  const sendWhatsApp = () => {
    const phone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(summary)}`, '_blank');
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`R.O. ${ro.roNumber} — Defesa Civil Cajamar`);
    const body = encodeURIComponent(summary);
    window.open(`mailto:${ro.reporterEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Share2 size={18} className="text-[#1B3A6B]" /> Compartilhar R.O.
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {hasWhatsApp ? (
            <button type="button" onClick={sendWhatsApp}
              className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-3 active:opacity-80">
              <MessageCircle size={20} /> Enviar por WhatsApp
              <span className="text-xs font-normal opacity-80">{ro.phone}</span>
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 text-sm flex items-center justify-center gap-2">
              <MessageCircle size={18} /> WhatsApp — telefone não informado
            </div>
          )}
          {hasEmail ? (
            <button type="button" onClick={sendEmail}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-3 active:opacity-80">
              <Mail size={20} /> Enviar por E-mail
              <span className="text-xs font-normal opacity-80">{ro.reporterEmail}</span>
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 text-sm flex items-center justify-center gap-2">
              <Mail size={18} /> E-mail — não informado
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-4">
          {hasWhatsApp || hasEmail ? 'Selecione como deseja enviar o resumo do R.O.' : 'Preencha telefone ou e-mail do solicitante para compartilhar.'}
        </p>
      </div>
    </div>
  );
}

function ViewROScreen({ ro, onBack, onPrint, onEdit }: { ro: OccurrenceReport; onBack: () => void; onPrint: () => void; onEdit: () => void }) {
  const [showShare, setShowShare] = useState(false);
  const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);

  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="mb-3">
      <SecTitle>{title}</SecTitle>
      {children}
    </Card>
  );

  const Row = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 gap-2">
        <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
        <span className="text-xs font-semibold text-gray-800 text-right">{value}</span>
      </div>
    ) : null;

  const selectedAgencies = ro.agencies.filter(a => a.selected);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#1B3A6B] text-white sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={onBack} className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-blue-300">R.O. {ro.roNumber}</p>
            <p className="font-bold text-sm truncate">{ro.occurrenceTypeLabel || 'Ocorrência'}</p>
          </div>
          <span className={cn('text-[11px] px-2.5 py-1 rounded-full font-semibold',
            ro.status === 'completed' ? 'bg-green-500/25 text-green-200' : 'bg-yellow-500/25 text-yellow-200')}>
            {ro.status === 'completed' ? 'Concluído' : 'Rascunho'}
          </span>
        </div>
      </div>

      <div className="p-4 pb-10">
        {ro.emergency && (
          <div className="bg-red-500 text-white rounded-2xl p-3 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} />
            <span className="font-bold text-sm">EMERGÊNCIA</span>
          </div>
        )}

        <Sec title="Identificação">
          <Row label="Nº do R.O." value={ro.roNumber} />
          <Row label="Data"        value={fmtDate(ro.date)} />
          <Row label="Hora inicial" value={ro.startTime} />
          <Row label="Hora final"   value={ro.endTime} />
          <Row label="Viatura"      value={ro.vehicle} />
          <Row label="Preenchido Por" value={ro.agent ? `${ro.agent}${ro.re ? ` (RE: ${ro.re})` : ''}` : null} />
          <Row label="Origem"       value={ro.origin} />
        </Sec>

        <Sec title="Solicitante">
          <Row label="Nome"      value={ro.reporterName} />
          <Row label="RG/CPF"   value={ro.rgCpf} />
          <Row label="Telefone" value={ro.phone} />
          <Row label="E-mail"   value={ro.reporterEmail} />
          <Row label="Endereço" value={[ro.address, ro.addressNumber].filter(Boolean).join(', ')} />
          <Row label="Bairro"   value={ro.neighborhood} />
        </Sec>

        <Sec title="Ocorrência">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{type?.emoji ?? '📋'}</span>
            <span className="text-sm font-bold text-gray-800">{ro.occurrenceTypeLabel}</span>
          </div>
          <Row label="Área de risco" value={ro.riskArea} />
          {ro.cobrade?.active && ro.cobrade.code && (
            <Row label="COBRADE" value={`${ro.cobrade.code} — ${ro.cobrade.label}`} />
          )}
        </Sec>

        {selectedAgencies.length > 0 && (
          <Sec title="Apoio Acionado">
            {selectedAgencies.map(a => (
              <Row key={a.id} label={a.label}
                value={[a.vehicles, a.responsible].filter(Boolean).join(' — ') || 'Acionado'} />
            ))}
          </Sec>
        )}

        {ro.observations && (
          <Sec title="Observações">
            <p className="text-sm text-gray-700 leading-relaxed">{ro.observations}</p>
          </Sec>
        )}

        {ro.photos.length > 0 && (
          <Sec title={`Registro Fotográfico (${ro.photos.length} foto${ro.photos.length > 1 ? 's' : ''})`}>
            {ro.photoScenario && (
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">{ro.photoScenario}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {ro.photos.map((photo, idx) => (
                <div key={photo.id}>
                  <img src={photo.dataUrl} alt={`Foto ${idx + 1}`}
                    className="w-full h-36 object-cover rounded-xl" />
                  {photo.caption && (
                    <p className="text-[11px] text-gray-500 mt-1 text-center leading-tight">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </Sec>
        )}

        {(ro.conclusion || ro.conclusionStatus) && (
          <Sec title="Desfecho / Conclusão">
            {ro.conclusionStatus && (() => {
              const map: Record<string, string> = { encaminhar: 'bg-blue-100 text-blue-700', arquivar: 'bg-green-100 text-green-700', pendente: 'bg-yellow-100 text-yellow-700', monitoramento: 'bg-orange-100 text-orange-700' };
              const labels: Record<string, string> = { encaminhar: 'Encaminhar', arquivar: 'Arquivar / Finalizado', pendente: 'Pendente', monitoramento: 'Monitoramento' };
              return (
                <div className="mb-2">
                  <span className={cn('text-xs font-bold px-3 py-1 rounded-full', map[ro.conclusionStatus] ?? '')}>{labels[ro.conclusionStatus] ?? ''}</span>
                  {ro.conclusionStatus === 'encaminhar' && (ro.encaminharDest ?? []).length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">→ {(ro.encaminharDest ?? []).join(', ')}</p>
                  )}
                </div>
              );
            })()}
            {ro.conclusion && <p className="text-sm text-gray-700 leading-relaxed">{ro.conclusion}</p>}
          </Sec>
        )}

        <Sec title="Assinaturas">
          <Row label="Declarante" value={[ro.declarant1, ro.declarant1Role].filter(Boolean).join(' — ')} />
          {(ro.agentParticipants ?? []).length > 0 && (
            <Row label="Agentes Participantes" value={(ro.agentParticipants ?? []).join(', ')} />
          )}
          <Row label="Preenchido por" value={[ro.filledBy, ro.role].filter(Boolean).join(' — ')} />
        </Sec>

        {(ro.editHistory ?? []).length > 0 && (
          <Sec title="Histórico de alterações">
            <div className="space-y-2">
              {[...(ro.editHistory ?? [])].reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <History size={12} className="text-[#1B3A6B]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{h.action}</p>
                    <p className="text-[11px] text-gray-400">
                      {h.by} · {new Date(h.at).toLocaleDateString('pt-BR')} às {new Date(h.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Sec>
        )}

        <div className="flex gap-3 mt-2 mb-4">
          <button type="button" onClick={onEdit}
            className="flex-1 py-4 rounded-2xl bg-[#1B3A6B] text-white font-bold text-sm flex items-center justify-center gap-2 active:opacity-80">
            <Pencil size={18} /> Editar
          </button>
          <button type="button" onClick={() => setShowShare(true)}
            className="flex-1 py-4 rounded-2xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:opacity-80">
            <Share2 size={18} /> Compartilhar
          </button>
          <button type="button" onClick={onPrint}
            className="flex-1 py-4 rounded-2xl border-2 border-[#1B3A6B] text-[#1B3A6B] font-bold text-sm flex items-center justify-center gap-2 active:bg-blue-50">
            <Printer size={18} /> Imprimir
          </button>
        </div>
        {showShare && <ShareModal ro={ro} onClose={() => setShowShare(false)} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRINT SCREEN
// ─────────────────────────────────────────────

function PrintScreen({ ro, onClose }: { ro: OccurrenceReport; onClose: () => void }) {
  const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);
  const selectedAgencies = ro.agencies.filter(a => a.selected);
  const hasLosses = Object.entries(ro.losses)
    .some(([k, v]) => ['furniture','food','clothes','documents','property','others'].includes(k) && v === true);

  // Checkbox indicator for print
  const CB = ({ v, className: cls }: { v: boolean; className?: string }) => (
    <span className={cn('inline-flex items-center justify-center w-3.5 h-3.5 border border-gray-600 text-[9px] leading-none mr-1', cls)}>
      {v ? '✓' : ''}
    </span>
  );

  const TCell = ({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => (
    <td colSpan={colSpan} className={cn('border border-gray-500 px-1.5 py-1 align-top text-[10px]', className)}>{children}</td>
  );

  const TLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={`font-bold text-[9px] uppercase block leading-tight text-gray-600${className ? ' ' + className : ''}`}>{children}</span>
  );

  const TValue = ({ children, className: cls }: { children: React.ReactNode; className?: string }) => (
    <span className={cn('text-[11px] block min-h-[14px]', cls)}>{children}</span>
  );

  const renderDynamic = () => {
    const f = ro.dynamicFields;
    if (!type || type.section === 'generic') return null;

    if (type.section === 'trees') return (
      <tr><TCell colSpan={3}>
        <TLabel>Remoção de Árvores</TLabel>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px]">
          <span><CB v={f.hasRisk === true} /> Há risco — autorizar corte/poda
            <CB v={f.hasRisk === false} /> Não — orientar munícipe</span>
          <span><CB v={f.fallen === 'sim'} /> Já tombada
            {f.fallen === 'sim' && ` (${String(f.fallenCount ?? '—')})`}
            <CB v={f.fallen === 'nao'} className="ml-2" /> Não tombada</span>
          {!!f.hasRisk && <><span><CB v={!!f.detSupressao} /> Det. de Supressão</span>
            <span><CB v={!!f.supressao} /> Supressão realizada</span></>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'structural') return (
      <tr><TCell colSpan={3}>
        <TLabel>Obras Civis — Patologias</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={!!f.fissuras} /> Fissuras</span>
          <span><CB v={!!f.rachaduras} /> Rachaduras</span>
          <span><CB v={!!f.recalque} /> Recalque</span>
          <span><CB v={!!f.hidraulica} /> Hidráulica</span>
          {!!f.outrosPatologias && <span>Outros: {String(f.outrosPatologias)}</span>}
          <span className="ml-2"><CB v={f.hasRisk === true} /> Há risco
            <CB v={f.hasRisk === false} className="ml-2" /> Sem risco</span>
          {!!f.riskExtent && <span>Extensão: {String(f.riskExtent)}</span>}
          {!!f.barragemRompimento && <span>Causa: Rompimento de Barragem</span>}
          {!!f.sistemaDrenagem && <span>Causa: Sistema de Drenagem</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'bees') return (
      <tr><TCell colSpan={3}>
        <TLabel>Remoção de Abelhas / Vespas</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={f.needsRemoval === true} /> Atacando</span>
          <span><CB v={f.needsRemoval === false} /> Em formação</span>
          <span className="ml-2">Espécie:</span>
          {['europa','jataí','marimbondo','vespa'].map(s => (
            <span key={s}><CB v={!!f[s]} /> {s.charAt(0).toUpperCase()+s.slice(1)}</span>
          ))}
        </div>
      </TCell></tr>
    );

    if (type.section === 'animals') return (
      <tr><TCell colSpan={3}>
        <TLabel>Captura de Animais</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={!!f.reptil} /> Réptil</span>
          <span><CB v={!!f.peconhento} /> Peçonhento</span>
          <span><CB v={!!f.naoPecon} /> Não Peçonhento</span>
          {!!f.outros && <span>Outros: {String(f.outros)}</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'geological') return (
      <tr><TCell colSpan={3}>
        <TLabel>Geológico — Deslizamento</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={f.type === 'ameaca'} /> Ameaça</span>
          <span><CB v={f.type === 'ocorrido'} /> Já ocorrido</span>
          {!!f.fichaAvaliacao && <span>Ficha Avaliação nº {String(f.fichaAvaliacao)}</span>}
          {!!f.autoInterdicao && <span>Auto de Interdição nº {String(f.autoInterdicao)}</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'hydrological') return (
      <tr><TCell colSpan={3}>
        <TLabel>Hidrológico</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={!!f.chuva} /> Chuva</span>
          <span><CB v={!!f.assoreamento} /> Assoreamento</span>
          {!!f.outro && <span>Outro: {String(f.outro)}</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'fire') return (
      <tr><TCell colSpan={3}>
        <TLabel>Incêndio</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          {['urbano','florestal','industrial','residencial'].map(t => (
            <span key={t}><CB v={f.type === t} /> {t.charAt(0).toUpperCase()+t.slice(1)}</span>
          ))}
          {!!f.outros && <span>Outros: {String(f.outros)}</span>}
        </div>
      </TCell></tr>
    );

    return null;
  };

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white">
      {/* Controls */}
      <div className="no-print sticky top-0 z-50 bg-[#1B3A6B] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <button type="button" onClick={onClose} className="p-1 -ml-1">
          <ChevronLeft size={24} />
        </button>
        <span className="flex-1 font-bold text-sm">R.O. {ro.roNumber} — Pré-visualização</span>
        <button type="button" onClick={() => window.print()}
          className="bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow active:bg-orange-600">
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>

      {/* ── DOCUMENTO 1: RELATÓRIO DE OCORRÊNCIA ── */}
      <div className="bg-white mx-auto my-4 shadow-md print:shadow-none print:my-0
                      max-w-[210mm] print:max-w-none text-[11px] font-sans leading-tight">
        <table className="w-full border-collapse border-2 border-gray-700 text-[10px]">
          {/* ─ Cabeçalho ─ */}
          <tbody>
            <tr>
              <TCell className="w-20 text-center border-r-2 border-gray-700 py-2">
                <img src="/brasao-cajamar.gif" alt="Brasão Cajamar" className="w-16 h-16 mx-auto object-contain" />
              </TCell>
              <TCell className="text-center border-r-2 border-gray-700 py-1">
                <div className="text-[9px] text-gray-600 leading-tight">Prefeitura do Município de Cajamar</div>
                <div className="text-[9px] text-gray-600 leading-tight">ESTADO DE SÃO PAULO</div>
                <div className="text-[9px] text-gray-600 leading-tight mb-1">Coordenadoria de Proteção e Defesa Civil</div>
                <div className="font-black text-sm text-gray-800 tracking-wide">RELATÓRIO DE OCORRÊNCIA</div>
              </TCell>
              <TCell className="w-24 text-center py-2">
                <img src="/logo-dc-cajamar.jpg" alt="Defesa Civil Cajamar" className="w-16 h-16 mx-auto object-contain" />
              </TCell>
            </tr>

            <tr className="border-t border-gray-500">
              <TCell><TLabel>Número</TLabel><TValue>{ro.roNumber}</TValue></TCell>
              <TCell><TLabel>Data</TLabel><TValue>{fmtDate(ro.date)}</TValue></TCell>
              <TCell>
                <TLabel>Emergência</TLabel>
                <div className="text-[10px] mt-0.5 flex gap-3">
                  <span><CB v={ro.emergency === true} /> Sim</span>
                  <span><CB v={ro.emergency === false} /> Não</span>
                </div>
              </TCell>
            </tr>

            {/* ─ Dados da Ocorrência ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">DADOS DA OCORRÊNCIA *</span></TCell>
            </tr>

            <tr>
              <TCell colSpan={2}>
                <TLabel>Nome</TLabel><TValue>{ro.reporterName}</TValue>
              </TCell>
              <TCell>
                <TLabel>RG/CPF</TLabel><TValue>{ro.rgCpf}</TValue>
              </TCell>
            </tr>

            <tr>
              <TCell colSpan={2}>
                <TLabel>Endereço</TLabel>
                <TValue>{[ro.address, ro.addressNumber].filter(Boolean).join(', ')}</TValue>
              </TCell>
              <TCell>
                <TLabel>Telefone</TLabel><TValue>{ro.phone}</TValue>
              </TCell>
            </tr>

            <tr>
              <TCell>
                <TLabel>Bairro</TLabel><TValue>{ro.neighborhood}</TValue>
              </TCell>
              <TCell>
                <TLabel>Tipo de Ocorrência</TLabel>
                <TValue>{ro.occurrenceTypeLabel}</TValue>
              </TCell>
              <TCell>
                <TLabel>Área de Risco</TLabel>
                <TValue>{ro.riskArea}</TValue>
              </TCell>
            </tr>
            {ro.cobrade?.active && ro.cobrade.code && (
              <tr className="border-t border-gray-400">
                <TCell colSpan={3} className="bg-orange-50">
                  <TLabel>COBRADE — Classificação de Desastre</TLabel>
                  <TValue className="font-mono font-bold">{ro.cobrade.code}</TValue>
                  <TValue>{ro.cobrade.label}</TValue>
                </TCell>
              </tr>
            )}

            <tr>
              <TCell>
                <TLabel>Viatura</TLabel><TValue>{ro.vehicle}</TValue>
              </TCell>
              <TCell>
                <TLabel>Hora Inicial</TLabel><TValue>{ro.startTime}</TValue>
              </TCell>
              <TCell>
                <TLabel>Hora Final</TLabel><TValue>{ro.endTime}</TValue>
              </TCell>
            </tr>

            <tr>
              <TCell colSpan={3}>
                <TLabel>Origem da Solicitação</TLabel>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px]">
                  {ORIGINS.map(o => (
                    <span key={o.id}><CB v={ro.origin === o.id} />
                      {o.label}{o.hasText && ro.origin === o.id && ro.originText ? ` ${ro.originText}` : ''}
                    </span>
                  ))}
                </div>
              </TCell>
            </tr>

            {/* ─ Agente ─ */}
            <tr>
              <TCell colSpan={2}>
                <TLabel>Agente Encarregado</TLabel>
                <TValue>{ro.agent}</TValue>
                {ro.role && <TValue className="text-gray-500 text-[9px]">{ro.role}</TValue>}
              </TCell>
              <TCell>
                <TLabel>Preenchido por / Cargo</TLabel>
                <TValue>{[ro.filledBy, ro.role].filter(Boolean).join(' / ')}</TValue>
              </TCell>
            </tr>

            {/* ─ Seção dinâmica ─ */}
            {renderDynamic()}

            {/* ─ Apoio ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">APOIO E/OU ACIONAMENTO NA OCORRÊNCIA</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {ro.agencies.map(ag => (
                    <span key={ag.id} className="text-[10px]">
                      <CB v={ag.selected} />{ag.label}
                      {ag.selected && ag.vehicles && ` — ${ag.vehicles}`}
                      {ag.selected && ag.responsible && ` (${ag.responsible})`}
                    </span>
                  ))}
                </div>
              </TCell>
            </tr>

            {/* ─ Perdas e Danos ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">PERDAS E DANOS — MATERIAIS</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {[['furniture','Móveis'],['food','Alimentos'],['clothes','Roupas'],
                    ['documents','Documentos'],['property','Imóvel'],['others','Outros']].map(([k,l]) => (
                    <span key={k}><CB v={!!(ro.losses as unknown as Record<string,unknown>)[k]} />{l}</span>
                  ))}
                  {ro.losses.victims && <span className="ml-4">Vítimas: {ro.losses.victims}</span>}
                  {ro.losses.injured && <span>Feridos: {ro.losses.injured}</span>}
                  {ro.losses.deaths && <span>Mortos: {ro.losses.deaths}</span>}
                </div>
              </TCell>
            </tr>

            {/* ─ Observações ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">OBSERVAÇÕES</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}>
                <div className="min-h-[60px] whitespace-pre-wrap text-[10px]">{ro.observations}</div>
              </TCell>
            </tr>

            {/* ─ Assinaturas ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">ASSINATURAS</span></TCell>
            </tr>
            <tr>
              <TCell>
                <TLabel>Declarante</TLabel>
                <TValue>{ro.declarant1}</TValue>
                {ro.declarant1Role && <TValue className="text-gray-500 text-[9px]">{ro.declarant1Role}</TValue>}
                {ro.declarant1Sig
                  ? <img src={ro.declarant1Sig} alt="assinatura" className="mt-2 h-10 object-contain" />
                  : <div className="mt-4 border-t border-gray-400 text-[9px] text-gray-500">Assinatura</div>}
              </TCell>
              <TCell colSpan={2}>
                <TLabel>Agentes Participantes</TLabel>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] mt-0.5">
                  {(ro.agentParticipants ?? []).length > 0
                    ? (ro.agentParticipants ?? []).map(n => <span key={n} className="font-medium">{n}</span>)
                    : <span className="text-gray-400">—</span>}
                </div>
              </TCell>
            </tr>

            {/* ─ Desfecho ─ */}
            <tr className="border-t border-gray-500 bg-gray-50">
              <TCell colSpan={3}>
                <span className="font-black text-[10px]">DESFECHO / CONCLUSÃO</span>
                {ro.conclusionStatus && (() => {
                  const labels: Record<string, string> = { encaminhar: 'ENCAMINHAR', arquivar: 'ARQUIVAR / FINALIZADO', pendente: 'PENDENTE', monitoramento: 'MONITORAMENTO' };
                  return <span className="ml-3 text-[9px] font-bold border border-current px-1 py-0.5 rounded">{labels[ro.conclusionStatus] ?? ''}</span>;
                })()}
                {ro.conclusionStatus === 'encaminhar' && (ro.encaminharDest ?? []).length > 0 && (
                  <div className="text-[9px] mt-1 text-gray-600">→ {(ro.encaminharDest ?? []).join(' / ')}</div>
                )}
              </TCell>
            </tr>
            <tr>
              <TCell colSpan={3}><div className="min-h-[30px] whitespace-pre-wrap text-[10px]">{ro.conclusion}</div></TCell>
            </tr>

            {/* ─ Rodapé ─ */}
            <tr className="border-t-2 border-gray-700">
              <TCell colSpan={4} className="text-center py-2">
                <div className="text-[8px] text-gray-500 leading-relaxed">
                  Av. Tenente Marques, 3861 – CEP 06579-001 – Portais (Polvilho) – Cajamar/SP – Tel. (11) 4446-0199
                  &nbsp;|&nbsp; E-mail: defesacivil@cajamar.sp.gov.br
                </div>
              </TCell>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── DOCUMENTO 2: REGISTRO FOTOGRÁFICO ── */}
      {ro.photos.length > 0 && (
        <div className="bg-white mx-auto my-4 shadow-md print:shadow-none print:my-0 print-page-break
                        max-w-[210mm] print:max-w-none text-[11px] font-sans leading-tight">
          <table className="w-full border-collapse border-2 border-gray-700 text-[10px]">
            <tbody>
              {/* Header com Brasão e Logo */}
              <tr>
                <td colSpan={2} className="border border-gray-500 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <img src="/brasao-cajamar.gif" alt="Brasão Cajamar" className="w-14 h-14 object-contain" />
                    <div className="text-center flex-1 mx-2">
                      <div className="text-[9px] text-gray-600 leading-tight">Prefeitura do Município de Cajamar</div>
                      <div className="text-[9px] text-gray-600 leading-tight">ESTADO DE SÃO PAULO</div>
                      <div className="text-[9px] text-gray-600 leading-tight mb-0.5">Coordenadoria de Proteção e Defesa Civil</div>
                      <div className="font-black text-sm text-gray-800 tracking-wide">REGISTRO FOTOGRÁFICO</div>
                    </div>
                    <img src="/logo-dc-cajamar.jpg" alt="Defesa Civil Cajamar" className="w-14 h-14 object-contain" />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-500 px-2 py-1 text-[10px]">
                  <strong>R.O. nº</strong> {ro.roNumber} &nbsp;|&nbsp;
                  <strong>Data:</strong> {fmtDate(ro.date)} &nbsp;|&nbsp;
                  <strong>Hora:</strong> {ro.startTime}
                </td>
                <td className="border border-gray-500 px-2 py-1 text-[10px]">
                  <strong>Viatura:</strong> {ro.vehicle} &nbsp;|&nbsp;
                  <strong>Equipe:</strong> {(() => {
                    const encarregado = ro.agent ? `${ro.agent}${ro.re ? ` (RE: ${ro.re})` : ''}` : '';
                    const participantes = (ro.agentParticipants ?? []).filter(p => p && p !== ro.agent);
                    return [encarregado, ...participantes].filter(Boolean).join(', ') || '—';
                  })()}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-500 px-2 py-1 text-[10px]">
                  <strong>Local:</strong> {[ro.address, ro.addressNumber, ro.neighborhood].filter(Boolean).join(', ')}
                  &nbsp;&nbsp;<strong>Tipo:</strong> {ro.occurrenceTypeLabel}
                </td>
              </tr>

              {/* Cenário encontrado */}
              <tr>
                <td colSpan={2} className="border border-gray-500 px-2 py-1 bg-gray-50">
                  <div className="font-black text-[10px] mb-1">📋 CENÁRIO ENCONTRADO</div>
                  <div className="text-[10px] whitespace-pre-wrap min-h-[50px]">{ro.photoScenario}</div>
                </td>
              </tr>

              {/* Photos grid — 2 per row */}
              {Array.from({ length: Math.ceil(ro.photos.length / 2) }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {[0, 1].map(col => {
                    const photo = ro.photos[rowIdx * 2 + col];
                    return (
                      <td key={col} className="border border-gray-500 px-2 py-2 w-1/2 align-top">
                        {photo ? (
                          <>
                            <img src={photo.dataUrl} alt={photo.caption}
                              className="w-full object-cover"
                              style={{ maxHeight: '160px' }} />
                            <div className="text-center text-[9px] mt-1 font-medium text-gray-700">
                              {photo.caption}
                              {photo.lat != null && (
                                <span className="block text-gray-400">GPS: {photo.lat.toFixed(5)}, {photo.lng!.toFixed(5)}</span>
                              )}
                            </div>
                          </>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ─ Rodapé ─ */}
              <tr className="border-t-2 border-gray-700">
                <td colSpan={2} className="border border-gray-500 text-center py-2">
                  <div className="text-[8px] text-gray-500 leading-relaxed">
                    Av. Tenente Marques, 3861 – CEP 06579-001 – Portais (Polvilho) – Cajamar/SP – Tel. (11) 4446-0199
                    &nbsp;|&nbsp; E-mail: defesacivil@cajamar.sp.gov.br
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── DOCUMENTO 3: AUTO DE INTERDIÇÃO ── */}
      {ro.interdicao?.active && (() => {
        const interdicao = {
          ...getDefaultInterdicao(ro.roNumber),
          ...(ro.interdicao || {}),
          numero: ro.interdicao?.numero || ro.roNumber || '',
          causas: Array.isArray(ro.interdicao?.causas) ? ro.interdicao.causas : [],
          danos: Array.isArray(ro.interdicao?.danos) ? ro.interdicao.danos : [],
          bensAfetados: Array.isArray(ro.interdicao?.bensAfetados) ? ro.interdicao.bensAfetados : [],
        };

        return (
          <div className="bg-white mx-auto my-4 shadow-md print:shadow-none print:my-0 print-page-break
                          max-w-[210mm] print:max-w-none text-[11px] font-sans leading-tight">
            <table className="w-full border-collapse border-2 border-gray-700 text-[10px]">
              <tbody>
                {/* Cabeçalho institucional com Brasão e Logo */}
                <tr>
                  <TCell className="w-20 text-center border-r-2 border-gray-700 py-2">
                    <img src="/brasao-cajamar.gif" alt="Brasão Cajamar" className="w-16 h-16 mx-auto object-contain" />
                  </TCell>
                  <TCell colSpan={2} className="text-center border-r-2 border-gray-700 py-1">
                    <div className="text-[9px] text-gray-600 leading-tight">Prefeitura do Município de Cajamar</div>
                    <div className="text-[9px] text-gray-600 leading-tight">ESTADO DE SÃO PAULO</div>
                    <div className="text-[9px] text-gray-600 leading-tight mb-1">Coordenadoria de Proteção e Defesa Civil</div>
                    <div className="font-black text-sm text-gray-800 tracking-wide">AUTO DE INTERDIÇÃO</div>
                  </TCell>
                  <TCell className="w-24 text-center py-2">
                    <img src="/logo-dc-cajamar.jpg" alt="Defesa Civil Cajamar" className="w-16 h-16 mx-auto object-contain" />
                  </TCell>
                </tr>

                {/* Identificação */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">IDENTIFICAÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <TLabel>Nº do Auto de Interdição</TLabel>
                    <TValue>{interdicao.numero || ro.roNumber || '___________'}</TValue>
                  </TCell>
                  <TCell>
                    <TLabel>Ficha de Avaliação</TLabel>
                    <TValue>{interdicao.fichaAvaliacao || '___________'}</TValue>
                  </TCell>
                  <TCell>
                    <TLabel>Nº R.O. Vinculado</TLabel>
                    <TValue>{ro.roNumber}</TValue>
                  </TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <TLabel>Endereço da Interdição</TLabel>
                    <TValue>{[ro.address, ro.addressNumber, ro.neighborhood].filter(Boolean).join(', ')}</TValue>
                  </TCell>
                  <TCell colSpan={2}>
                    <TLabel>Data</TLabel>
                    <TValue>{ro.date}</TValue>
                  </TCell>
                </tr>

                {/* 1 — Causa */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">1 — CAUSA DA INTERDIÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
                      {['Inundação','Enchente','Incêndio','Má Construção','Explosão','Desgaste Natural','Deslizamento de Terra','Desbarrancamento','Desabamento','Obras de Terceiros'].map(c => (
                        <span key={c}><CB v={interdicao.causas.includes(c)} />{c}</span>
                      ))}
                      {interdicao.causaOutros && <span><CB v={true} />Outros: {interdicao.causaOutros}</span>}
                    </div>
                  </TCell>
                </tr>

                {/* 2 — Danos */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">2 — DANOS APARENTES</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
                      {['Teto','Parede','Pisos','Estrutura','Fundações'].map(d => (
                        <span key={d}><CB v={interdicao.danos.includes(d)} />{d}</span>
                      ))}
                      {interdicao.danosOutros && <span><CB v={true} />Outros: {interdicao.danosOutros}</span>}
                    </div>
                  </TCell>
                </tr>

                {/* 3 — Bens */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">3 — BENS AFETADOS</span></TCell>
                </tr>
                <tr>
                  <TCell>
                    <span className="text-[10px]"><CB v={interdicao.bensAfetados.includes('particular')} />Particular</span>
                    {interdicao.bensAfetados.includes('particular') && interdicao.valorParticular && (
                      <div className="text-[9px] text-gray-600 ml-4">Valor: {interdicao.valorParticular.trim().startsWith('R$') ? interdicao.valorParticular : `R$ ${interdicao.valorParticular}`}</div>
                    )}
                  </TCell>
                  <TCell>
                    <span className="text-[10px]"><CB v={interdicao.bensAfetados.includes('municipal')} />Municipal</span>
                    {interdicao.bensAfetados.includes('municipal') && interdicao.valorMunicipal && (
                      <div className="text-[9px] text-gray-600 ml-4">Valor: {interdicao.valorMunicipal.trim().startsWith('R$') ? interdicao.valorMunicipal : `R$ ${interdicao.valorMunicipal}`}</div>
                    )}
                  </TCell>
                  <TCell colSpan={2}>
                    <span className="text-[10px]"><CB v={interdicao.bensAfetados.includes('estadual')} />Estadual</span>
                    {interdicao.bensAfetados.includes('estadual') && interdicao.valorEstadual && (
                      <div className="text-[9px] text-gray-600 ml-4">Valor: {interdicao.valorEstadual.trim().startsWith('R$') ? interdicao.valorEstadual : `R$ ${interdicao.valorEstadual}`}</div>
                    )}
                  </TCell>
                </tr>

                {/* 4 — Tipo */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">4 — TIPO DE INTERDIÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <div className="flex gap-4 text-[10px]">
                      <span><CB v={interdicao.tipo === 'parcial'} />Parcial</span>
                      <span><CB v={interdicao.tipo === 'total'} />Total</span>
                    </div>
                  </TCell>
                  <TCell colSpan={2}>
                    <TLabel>Evacuará o imóvel?</TLabel>
                    <div className="flex gap-4 text-[10px] mt-0.5">
                      <span><CB v={interdicao.evacuarImovel === 'sim'} />Sim</span>
                      <span><CB v={interdicao.evacuarImovel === 'nao'} />Não</span>
                    </div>
                    {interdicao.evacuarImovel === 'sim' && (
                      <div className="text-[9px] mt-1 text-gray-700">
                        Prazo: <strong>{interdicao.prazoAbandono || 'Imediatamente'}</strong>
                      </div>
                    )}
                  </TCell>
                </tr>

                {/* 5 — Destino */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">5 — DESTINO DO MORADOR</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <div className="flex gap-4 text-[10px]">
                      <span><CB v={interdicao.destinoMorador === 'parentes'} />Parentes / Vizinhos</span>
                      <span><CB v={interdicao.destinoMorador === 'outros'} />Outros{interdicao.destinoOutros ? `: ${interdicao.destinoOutros}` : ''}</span>
                    </div>
                  </TCell>
                  <TCell>
                    <TLabel>Contato</TLabel>
                    <TValue>{interdicao.destinoContato}</TValue>
                  </TCell>
                  <TCell>
                    <TLabel>Telefone</TLabel>
                    <TValue>{interdicao.destinoTelefone}</TValue>
                  </TCell>
                </tr>
                {interdicao.destinoEndereco && (
                  <tr>
                    <TCell colSpan={4}>
                      <TLabel>Endereço de destino</TLabel>
                      <TValue>{interdicao.destinoEndereco}</TValue>
                    </TCell>
                  </tr>
                )}

                {/* 6 — Observações */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">6 — OBSERVAÇÕES IMPORTANTES</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="min-h-[40px] whitespace-pre-wrap text-[10px]">{interdicao.observacoes}</div>
                  </TCell>
                </tr>

                {/* 7 — Assinatura responsável pela moradia */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">7 — ASSINATURA DO RESPONSÁVEL PELA MORADIA / TESTEMUNHA</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <div className="flex gap-4 text-[10px] mb-1">
                      {[['proprietario','Proprietário'],['morador','Morador'],['locatario','Locatário'],['testemunha','Testemunha']].map(([id, label]) => (
                        <span key={id}><CB v={interdicao.responsavelTipo === id} />{label}</span>
                      ))}
                    </div>
                    <TLabel>Nome</TLabel><TValue>{interdicao.responsavelNome}</TValue>
                    <TLabel className="mt-1">RG</TLabel><TValue>{interdicao.responsavelRG}</TValue>
                    <TLabel className="mt-1">Telefone</TLabel><TValue>{interdicao.responsavelTelefone}</TValue>
                  </TCell>
                  <TCell colSpan={2}>
                    <TLabel>Assinatura — ciente dos termos do presente Auto</TLabel>
                    {interdicao.responsavelAssinatura
                      ? <img src={interdicao.responsavelAssinatura} alt="assinatura" className="mt-2 h-12 object-contain" />
                      : <div className="mt-8 border-t border-gray-400 text-[9px] text-gray-500">Assinatura</div>}
                    <div className="mt-1 text-[9px] text-gray-500">
                      Cajamar, {ro.date ? new Date(ro.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'}
                    </div>
                  </TCell>
                </tr>

                {/* 8 — Assinatura do agente */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">8 — ASSINATURA DO RESPONSÁVEL PELA INTERDIÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <TLabel>Nome</TLabel><TValue>{ro.agent}</TValue>
                    <TLabel className="mt-1">Matrícula (RE)</TLabel><TValue>{ro.re}</TValue>
                    <TLabel className="mt-1">Cargo</TLabel><TValue>{ro.role}</TValue>
                  </TCell>
                  <TCell colSpan={2}>
                    <div className="mt-8 border-t border-gray-400 text-[9px] text-gray-500">Assinatura do Responsável da Defesa Civil</div>
                    <div className="mt-1 text-[9px] text-gray-500">
                      Cajamar, {ro.date ? new Date(ro.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'}
                    </div>
                  </TCell>
                </tr>

                {/* 9 — Notas */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">9 — NOTAS</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="space-y-1 text-[8px] leading-tight text-gray-700 p-1">
                      <p>
                        <strong>1 —</strong> O presente Auto de Interdição é lavrado com base na Lei Federal 12.608/12, Art. 8, Incisos: &ldquo;IV - identificar e mapear, as áreas de risco de desastres; VII - vistoriar edificações e áreas de risco e promover, quando for o caso, a intervenção preventiva e a evacuação da população das áreas de alto risco ou das edificações vulneráveis;&rdquo;.
                      </p>
                      <p>
                        <strong>2 —</strong> O notificado deve evacuar/sair do local/imóvel conforme o Termo de Interdição acima no prazo recomendado.
                      </p>
                      <p>
                        <strong>3 —</strong> Não acatando o presente Auto de Interdição, o morador assume a total responsabilidade por quaisquer eventuais danos materiais ou pessoais, decorrentes de sinistro, que segundo conclusão da Vistoria, pelo local ser considerado de &ldquo;Risco Muito Alto&rdquo;.
                      </p>
                      <p>
                        <strong>4 —</strong> A desinterdição do imóvel poderá ser requerida à Coordenadoria de Proteção e Defesa Civil por meio da apresentação de &ldquo;Laudo Técnico de Segurança e Estabilidade&rdquo;, emitido por profissional habilitado, com sua respectiva ART. As custas deste documento são de responsabilidade do próprio interessado. O modelo deste documento poderá ser obtido na própria Coordenadoria.
                      </p>
                    </div>
                  </TCell>
                </tr>

                {/* Rodapé */}
                <tr className="border-t-2 border-gray-700">
                  <TCell colSpan={4} className="text-center py-2">
                    <div className="text-[8px] text-gray-500 leading-relaxed">
                      Av. Tenente Marques, 3861 – CEP 06579-001 – Portais (Polvilho) – Cajamar/SP – Tel. (11) 4446-0199
                      &nbsp;|&nbsp; E-mail: defesacivil@cajamar.sp.gov.br
                    </div>
                  </TCell>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      <div className="no-print h-8" />
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────

// Email da conta compartilhada legada — mantido para compatibilidade durante a migração.
// Após a migração para contas individuais, este valor não será mais usado no login.
const TEAM_EMAIL = 'defesacivil0199@gmail.com';

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  // Modo legado: o agente deixa o email em branco e usa a conta compartilhada
  const effectiveEmail = email.trim() || TEAM_EMAIL;
  const isLegacyMode = !email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, effectiveEmail, password);
      onLogin();
    } catch {
      setError(
        isLegacyMode
          ? 'Senha incorreta. Verifique e tente novamente.'
          : 'Email ou senha incorretos. Verifique e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1B3A6B] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🔶</p>
          <p className="text-white font-black text-xl tracking-wide">DEFESA CIVIL</p>
          <p className="text-blue-300 text-sm mt-1">Cajamar / SP</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <p className="font-bold text-gray-800 text-base mb-1">Acesso ao Sistema</p>
          <p className="text-xs text-gray-500 mb-5">Registro de Ocorrências</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Email (opcional)</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder={`Deixe em branco para usar ${TEAM_EMAIL}`}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                autoComplete="email"
              />
              {isLegacyMode && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Modo compartilhado — use seu email individual se disponível
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isLegacyMode ? 'Senha da equipe' : 'Sua senha individual'}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-xl">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !password}
              className="w-full py-4 rounded-2xl bg-[#1B3A6B] text-white font-bold text-sm disabled:opacity-50 active:opacity-80">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-400 text-[11px] mt-6">
          Acesso restrito · Defesa Civil Cajamar
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// PIN SCREEN — identificação do agente pelo RE
// ─────────────────────────────────────────────

function PinScreen({
  onConfirm,
  onCancel,
  agentProfile,
}: {
  onConfirm: (agent: Agent) => void;
  onCancel: () => void;
  agentProfile: AgentProfile | null;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Se o agente tem perfil vinculado, pré-confirma automaticamente sem PIN
  // (a identidade já foi verificada pelo Firebase Authentication)
  useEffect(() => {
    if (!agentProfile) return;
    const found = AGENTS.find(a => a.re === agentProfile.re);
    if (found) onConfirm(found);
  }, [agentProfile, onConfirm]);

  const handleConfirm = () => {
    const found = AGENTS.find(a => a.re === pin.trim());
    if (!found || found.name === 'OUTRO') {
      setError('RE não encontrado. Tente novamente.');
      setPin('');
      return;
    }
    onConfirm(found);
  };

  // Com perfil individual: mostra tela de confirmação de identidade (sem campo de PIN)
  if (agentProfile) {
    return (
      <div className="min-h-screen bg-[#1B3A6B] flex flex-col items-center justify-center px-6">
        <div style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} className="w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-5 border border-white/10">
          <div className="text-center">
            <div className="text-3xl mb-1">✅</div>
            <h2 className="text-lg font-black text-[#1B3A6B] dark:text-blue-400">Identidade Confirmada</h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">{agentProfile.display}</p>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">RE {agentProfile.re} · {agentProfile.role}</p>
          </div>
          <p className="text-xs text-center text-green-600">Iniciando R.O....</p>
        </div>
      </div>
    );
  }

  // Sem perfil individual: modo legado — digita RE manualmente
  return (
    <div className="min-h-screen bg-[#1B3A6B] flex flex-col items-center justify-center px-6">
      <div style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} className="w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-5 border border-white/10">
        <div className="text-center">
          <div className="text-3xl mb-1">🔶</div>
          <h2 className="text-lg font-black text-[#1B3A6B] dark:text-blue-400">Identificação</h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">Digite seu número de RE para preencher o R.O.</p>
          <p className="text-xs text-amber-500 mt-1">Conta compartilhada — a identificação individual não está disponível ainda</p>
        </div>

        <div className="space-y-2">
          <label style={{ color: 'var(--text-main)' }} className="block text-xs font-bold uppercase tracking-wide opacity-80">Número de RE</label>
          <input
            type="number"
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder="Ex.: 20236"
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-lg text-center font-mono font-bold tracking-widest focus:outline-none focus:border-[#1B3A6B]"
          />
          {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full bg-[#1B3A6B] text-white font-bold py-3 rounded-xl text-sm active:opacity-80"
        >
          Confirmar
        </button>
        <button
          onClick={onCancel}
          className="w-full text-gray-500 text-sm py-1 active:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [ros, setRos] = useState<OccurrenceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null | 'checking'>('checking');
  const [currentRO, setCurrentRO] = useState<OccurrenceReport | null>(null);
  const editMode = useRef(false);
  const editSnapshot = useRef<OccurrenceReport | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Perfil individual do agente autenticado (null = conta compartilhada legada ou perfil não criado)
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);

  // ── Autenticação — carrega perfil individual ao logar ──
  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        const profile = await loadAgentProfile(u.uid);
        setAgentProfile(profile);
      } else {
        setAgentProfile(null);
      }
    });
  }, []);

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

  useEffect(() => {
    if (!user || user === 'checking') return;
    const q = query(collection(db, 'ros'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => normalizeRO(d.data() as Partial<OccurrenceReport>));
      setRos(list);
      setLoading(false);

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
  }, [user]);

  // ── Offline ──
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on  = () => {
      setIsOnline(true);
      // Ao recuperar conexão, reconcilia R.O.s criados offline que ainda não têm número definitivo
      const fullYear = new Date().getFullYear().toString();
      setRos(prev => {
        const pending = prev.filter(r => r.needsNumber);
        pending.forEach(r => {
          assignRONumber(r.id, fullYear).then(roNumber => {
            if (!roNumber) return;
            const patchRO = (ro: OccurrenceReport): OccurrenceReport => {
              const updated = { ...ro, roNumber, needsNumber: false };
              // Se o auto de interdição ainda usa o número provisório vazio, atualiza também
              if (ro.interdicao && (!ro.interdicao.numero || ro.interdicao.numero === ro.roNumber)) {
                updated.interdicao = { ...ro.interdicao, numero: roNumber };
              }
              return updated;
            };
            setRos(curr => curr.map(x => x.id === r.id ? patchRO(x) : x));
            setCurrentRO(curr => curr?.id === r.id ? patchRO(curr) : curr);
          });
        });
        return prev; // sem mudança imediata; as atualizações chegam pelas promises acima
      });
    };
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

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

  const handlePinConfirm = async (agentData: Agent) => {
    // Verifica se o agente autenticado tem autorização para registrar em nome de agentData.
    // Em modo legado (conta compartilhada / perfil não criado) a operação prossegue com aviso.
    const { authorized } = checkAgentAuthorization(agentProfile, agentData.re);
    if (!authorized) {
      // Não deve chegar aqui normalmente — PinScreen já filtra por AGENTS,
      // mas se o perfil vinculado diverge, bloqueia antes de criar o documento.
      setSyncError(
        'Você não tem autorização para registrar um R.O. em nome deste agente. ' +
        'Entre em contato com o administrador.',
      );
      return;
    }

    const ro = createNewRO('');
    const { roNumber, needsNumber } = await nextRONumber(ro.id);
    const currentUid = (user && user !== 'checking') ? user.uid : undefined;
    const initialRO: OccurrenceReport = {
      ...ro,
      roNumber,
      needsNumber,
      agent: agentData.name,
      re: agentData.re,
      role: agentData.role,
      agentLocked: true,
      authorUid: currentUid,
    };
    setDoc(doc(db, 'ros', initialRO.id), initialRO).catch(() => { /* cache local persiste */ });
    if (currentUid) {
      writeAuditLog({
        at: new Date().toISOString(),
        uid: currentUid,
        agentName: agentData.name,
        action: 'ro_draft_created',
        roId: initialRO.id,
        roNumber: initialRO.roNumber || undefined,
      });
    }
    setCurrentRO(initialRO);
    setScreen('wizard');
  };

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
    const agentName = currentRO.agent
      ? (AGENTS.find(a => a.name === currentRO.agent)?.display ?? currentRO.agent)
      : 'Agente';
    const isEdit = editMode.current;
    const currentUid = (user && user !== 'checking') ? user.uid : undefined;
    // O campo uid no historyEntry permite auditoria: quem (UID Firebase) fez qual operação.
    const historyEntry = { at: now, by: agentName, uid: currentUid, action: isEdit ? 'Editado' : 'Salvo' };
    const saved = {
      ...currentRO,
      endTime: currentRO.endTime || nowHHMM(),
      status: 'completed' as const,
      updatedAt: now,
      // authorUid: preserva o UID de quem CRIOU o R.O.; ao editar, não sobrescreve
      authorUid: currentRO.authorUid ?? currentUid,
      editHistory: [...(currentRO.editHistory ?? []), historyEntry],
    };

    // O cache persistente grava no IndexedDB imediatamente (offline-safe).
    // Não bloqueamos a UI, mas capturamos erros do servidor (regra de segurança, dado inválido, etc.)
    setSyncError(null);
    setDoc(doc(db, 'ros', saved.id), saved).catch(() => {
      setSyncError(
        'Não foi possível confirmar o salvamento no servidor. ' +
        'Os dados foram preservados localmente e serão sincronizados quando a conexão for restabelecida.',
      );
    });
    editSnapshot.current = null;
    editMode.current = false;
    if (currentUid) {
      writeAuditLog({
        at: now,
        uid: currentUid,
        agentName,
        action: isEdit ? 'ro_edited' : 'ro_saved',
        roId: saved.id,
        roNumber: saved.roNumber || undefined,
      });
    }
    setCurrentRO(saved);
    setScreen('view');
  }, [currentRO, user]);

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
    // Novo R.O. — descarta sem gravar rascunho (o agente escolheu cancelar)
    setCurrentRO(null);
    setScreen('home');
  }, [currentRO]);

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
    await deleteDoc(doc(db, 'ros', id));
    if (currentUid && ro) {
      writeAuditLog({
        at: new Date().toISOString(),
        uid: currentUid,
        agentName: ro.agent ?? 'Agente',
        action: 'ro_deleted',
        roId: id,
        roNumber: ro.roNumber || undefined,
      });
    }
  };
  const handleDeleteAll = async () => {
    const batch = writeBatch(db);
    ros.forEach(r => batch.delete(doc(db, 'ros', r.id)));
    await batch.commit();
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
      ⚠️ Sem conexão — R.O.s salvos localmente e sincronizados ao voltar online
    </div>
  );

  const provisorioBanner = currentRO?.needsNumber && (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-xs font-bold text-center py-2 no-print leading-tight">
      📋 Sem conexão — número do R.O. será atribuído ao voltar online
    </div>
  );

  const syncErrorBanner = syncError && (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-xs font-bold text-center py-2 px-4 no-print leading-tight flex items-center justify-between gap-2">
      <span>⚠️ {syncError}</span>
      <button type="button" onClick={() => setSyncError(null)}
        className="shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
        <X size={12} />
      </button>
    </div>
  );

  if (screen === 'pin')
    return <PinScreen onConfirm={handlePinConfirm} onCancel={() => setScreen('home')} agentProfile={agentProfile} />;

  if (screen === 'wizard' && currentRO)
    return <>{offlineBanner}{provisorioBanner}<WizardScreen ro={currentRO} onUpdate={handleUpdate} onSave={handleSave} onCancel={handleCancel} /></>;

  if (screen === 'print' && currentRO)
    return <PrintScreen ro={currentRO} onClose={() => setScreen('view')} />;

  if (screen === 'view' && currentRO)
    return <>{offlineBanner}{syncErrorBanner}<ViewROScreen ro={currentRO} onBack={handleBack} onPrint={() => setScreen('print')} onEdit={handleEdit} /></>;

  return <>{offlineBanner}<HomeScreen ros={ros} onNew={handleNew} onView={handleView} onDelete={handleDelete} onDeleteAll={handleDeleteAll}
    darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} onSignOut={() => signOut(auth)} /></>;
}
