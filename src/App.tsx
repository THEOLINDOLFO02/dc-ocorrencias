/**
 * Defesa Civil Cajamar/SP — Sistema Digital de Registro de Ocorrências
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, ChevronLeft, ChevronRight, Plus, Check,
  Trash2, X, Search, AlertTriangle, FileText, Clock, Printer, Pencil,
  Moon, Sun, BarChart2, ChevronDown, History, Share2, Mail, MessageCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Screen = 'home' | 'wizard' | 'view' | 'print';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type SectionType = 'trees' | 'structural' | 'bees' | 'animals' | 'geological' | 'hydrological' | 'fire' | 'generic';

interface Photo {
  id: string;
  dataUrl: string;
  caption: string;
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
  emergency: boolean | null;
  vehicle: string;
  date: string;
  startTime: string;
  endTime: string;
  origin: string;
  originText: string;
  agent: string;
  re: string;
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
  filledBy: string;
  role: string;
  relatedDocs: string;
  cobrade: { active: boolean; code: string; label: string };
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
const AGENTS: Agent[] = [
  { name: 'AMERICO FERREIRA SOARES',               display: 'Américo Ferreira Soares',               re: '13606', role: 'Agente de Defesa Civil' },
  { name: 'ANDREA DE OLIVEIRA SOUZA',              display: 'Andrea de Oliveira Souza',              re: '20264', role: 'Agente de Defesa Civil' },
  { name: 'ANGELA MARIA MACIEL GONCALVES BARBOSA', display: 'Ângela Maria Maciel G. Barbosa',        re: '11381', role: 'Agente de Defesa Civil' },
  { name: 'ANTONIO CARLOS GALEOTI FREITAS ARRUDA', display: 'Antonio Carlos G. de Freitas Arruda',   re: '8769',  role: 'Coordenador de Defesa Civil' },
  { name: 'ASSUERO LOPES DA SILVA',                display: 'Assuero Lopes da Silva',                re: '13608', role: 'Agente de Defesa Civil' },
  { name: 'CARLOS ROBERTO BARBOSA',                display: 'Carlos Roberto Barbosa',                re: '11332', role: 'Agente de Defesa Civil' },
  { name: 'DAYANE RANGEL RAMOS PEREIRA',           display: 'Dayane Rangel Ramos Pereira',           re: '20607', role: 'Articulador de Políticas Públicas' },
  { name: 'EDUARDO LEMOS',                         display: 'Eduardo Lemos',                         re: '13609', role: 'Agente de Defesa Civil' },
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

function nextRONumber() {
  const yy = new Date().getFullYear().toString().slice(-2);
  const n = parseInt(localStorage.getItem('dc_ro_counter') || '0') + 1;
  localStorage.setItem('dc_ro_counter', String(n));
  return `${n}/${yy}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function createNewRO(): OccurrenceReport {
  return {
    id: genId(), roNumber: nextRONumber(), emergency: null,
    vehicle: '', date: todayISO(), startTime: nowHHMM(), endTime: '',
    origin: '', originText: '', agent: '', re: '',
    reporterName: '', rgCpf: '', phone: '', reporterEmail: '', address: '', addressNumber: '', neighborhood: '',
    occurrenceTypeId: '', occurrenceTypeLabel: '', quadrant: '', riskArea: '',
    dynamicFields: {},
    agencies: DEFAULT_AGENCIES.map(a => ({ ...a })),
    losses: { furniture: false, food: false, clothes: false, documents: false, property: false, others: false, othersDesc: '', victims: '', injured: '', deaths: '' },
    photoScenario: '', photos: [], photoConclusion: '',
    observations: '', declarant1: '', declarant1Role: '', declarant1Sig: '',
    agentParticipants: [], filledBy: '', role: '', relatedDocs: '',
    cobrade: { active: false, code: '', label: '' }, conclusion: '',
    conclusionStatus: '' as const, encaminharDest: [],
    status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    editHistory: [{ at: new Date().toISOString(), by: 'Sistema', action: 'Criado' }],
  };
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
      className={cn('flex-1 py-3 text-sm font-semibold rounded-xl transition-all',
        active ? 'bg-[#1B3A6B] text-white shadow-sm' : 'bg-gray-100 text-gray-600 active:bg-gray-200')}>
      {label}
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
        checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300 bg-white')}>
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-white rounded-2xl p-4 shadow-sm border border-gray-100', className)}>{children}</div>;
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-[#1B3A6B] uppercase tracking-widest mb-3">{children}</p>;
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
            <span className="text-sm text-gray-400">Selecionar agente encarregado...</span>
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
              <p className="font-bold text-base">Agente Encarregado</p>
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
            <Input value={ro.roNumber} onChange={v => onChange({ roNumber: v })} placeholder="Ex: 602/26" />
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
        <SecTitle>Equipe</SecTitle>
        <div className="space-y-3">
          <Field label="Viatura" required>
            <select value={ro.vehicle} onChange={e => onChange({ vehicle: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
              <option value="">Selecione a viatura...</option>
              <option value="VTR-001">VTR-001</option>
              <option value="VTR-002">VTR-002</option>
              <option value="VTR-003">VTR-003</option>
              <option value="VTR-004">VTR-004</option>
              <option value="VTR-005">VTR-005</option>
              <option value="Outros">Outros</option>
            </select>
          </Field>
          <Field label="Agente Encarregado" required>
            <AgentPicker value={ro.agent} onChange={(name, re, role) => onChange({ agent: name, re, role })} />
          </Field>
        </div>
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
            <Input type="email" value={ro.reporterEmail} onChange={v => onChange({ reporterEmail: v })} placeholder="email@exemplo.com" />
          </Field>
        </div>
      </Card>

      <Card>
        <SecTitle>Endereço da Ocorrência</SecTitle>
        <div className="space-y-3">
          <Field label="Logradouro" required>
            <Input value={ro.address} onChange={v => onChange({ address: v })} placeholder="Rua, Av., Estrada..." />
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
    `w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 ${cls}`;

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
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
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
                <span className="text-sm text-gray-800">{ag.label}</span>
              </label>
              {ag.selected && (
                <div className="ml-8 grid grid-cols-2 gap-2 mb-2">
                  <input value={ag.vehicles} onChange={e => updateAgency(ag.id, { vehicles: e.target.value })}
                    placeholder="Viaturas"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  <input value={ag.responsible} onChange={e => updateAgency(ag.id, { responsible: e.target.value })}
                    placeholder="Encarregado"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
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

function StepFotos({ ro, onChange }: StepProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: Photo[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await compressImage(file);
      newPhotos.push({ id: genId(), dataUrl, caption: `Foto ${ro.photos.length + newPhotos.length + 1} – ` });
    }
    onChange({ photos: [...ro.photos, ...newPhotos] });
    if (inputRef.current) inputRef.current.value = '';
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
          onChange={handleFiles} className="hidden" />
        {/* Galeria */}
        <input ref={galleryRef} type="file" accept="image/*" multiple
          onChange={handleFiles} className="hidden" />
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
                className="mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

function StepConcluir({ ro, onChange }: StepProps) {
  const [showSecretarias, setShowSecretarias] = useState(false);

  const toggleAgent = (name: string) => {
    const curr = ro.agentParticipants ?? [];
    onChange({ agentParticipants: curr.includes(name) ? curr.filter(n => n !== name) : [...curr, name] });
  };

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
        <div className="space-y-2">
          {AGENTS.filter(a => a.role !== '').map(a => (
            <button key={a.name} type="button"
              onClick={() => toggleAgent(a.name)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors',
                (ro.agentParticipants ?? []).includes(a.name)
                  ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white'
                  : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50')}>
              <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                (ro.agentParticipants ?? []).includes(a.name) ? 'bg-white border-white' : 'border-gray-300')}>
                {(ro.agentParticipants ?? []).includes(a.name) && <Check size={12} className="text-[#1B3A6B]" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{a.display}</p>
                <p className={cn('text-[11px]', (ro.agentParticipants ?? []).includes(a.name) ? 'text-blue-200' : 'text-gray-400')}>{a.role}</p>
              </div>
            </button>
          ))}
          <button key="outro" type="button"
            onClick={() => toggleAgent('Outro (outra secretaria)')}
            className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors',
              (ro.agentParticipants ?? []).includes('Outro (outra secretaria)')
                ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white'
                : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50')}>
            <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
              (ro.agentParticipants ?? []).includes('Outro (outra secretaria)') ? 'bg-white border-white' : 'border-gray-300')}>
              {(ro.agentParticipants ?? []).includes('Outro (outra secretaria)') && <Check size={12} className="text-[#1B3A6B]" />}
            </div>
            <p className="text-xs font-semibold">Outro (outra secretaria)</p>
          </button>
        </div>
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

function WizardScreen({ ro, onUpdate, onSave, onCancel }: {
  ro: OccurrenceReport;
  onUpdate: (u: Partial<OccurrenceReport>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const TOTAL = 7;

  const goNext = () => {
    if (step < TOTAL) { setStep((step + 1) as WizardStep); window.scrollTo(0, 0); }
    else onSave();
  };
  const goBack = () => {
    if (step > 1) { setStep((step - 1) as WizardStep); window.scrollTo(0, 0); }
    else setConfirmLeave(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

function HomeScreen({ ros, onNew, onView, onDelete, onDeleteAll, darkMode, onToggleDark }: {
  ros: OccurrenceReport[];
  onNew: () => void;
  onView: (r: OccurrenceReport) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}) {
  const [query, setQuery]           = useState('');
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [showStats, setShowStats]   = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = [...ros].reverse().filter(ro =>
    !q ||
    ro.roNumber.toLowerCase().includes(q) ||
    ro.occurrenceTypeLabel.toLowerCase().includes(q) ||
    ro.neighborhood.toLowerCase().includes(q) ||
    ro.address.toLowerCase().includes(q) ||
    ro.rgCpf.toLowerCase().includes(q) ||
    ro.reporterName.toLowerCase().includes(q)
  );

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
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const byAgent = ros.reduce<Record<string, number>>((acc, r) => {
    if (!r.agent) return acc;
    const ag = AGENTS.find(a => a.name === r.agent);
    const k = ag?.display ?? r.agent;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topAgents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]).slice(0, 3);

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
        </div>
      </div>

      {/* Painel de Estatísticas */}
      {showStats && ros.length > 0 && (
        <div className={cn('mx-4 mt-4 rounded-2xl border p-4 shadow-sm', statBg)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-orange-500" />
              <span className={cn('font-bold text-sm', dk ? 'text-slate-200' : 'text-gray-800')}>Estatísticas</span>
            </div>
            <button type="button" onClick={() => setShowStats(false)}>
              <ChevronDown size={18} className={mutedTxt} />
            </button>
          </div>

          {/* Totais rápidos */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Total', value: ros.length, color: 'text-blue-500' },
              { label: 'Este mês', value: rosThisMonth.length, color: 'text-orange-500' },
              { label: 'Concluídos', value: completed, color: 'text-green-500' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl p-3 text-center', dk ? 'bg-slate-700' : 'bg-gray-50')}>
                <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                <p className={cn('text-[10px] font-medium mt-0.5', mutedTxt)}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top tipos */}
          {topTypes.length > 0 && (
            <div className="mb-3">
              <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', mutedTxt)}>Tipos mais frequentes</p>
              {topTypes.map(([label, count]) => (
                <div key={label} className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className={cn('text-xs truncate', dk ? 'text-slate-300' : 'text-gray-700')}>{label}</span>
                      <span className={cn('text-xs font-bold ml-2', dk ? 'text-slate-400' : 'text-gray-500')}>{count}</span>
                    </div>
                    <div className={cn('h-1.5 rounded-full overflow-hidden', dk ? 'bg-slate-600' : 'bg-gray-200')}>
                      <div className="h-full bg-[#1B3A6B] rounded-full"
                        style={{ width: `${Math.round((count / ros.length) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top agentes */}
          {topAgents.length > 0 && (
            <div>
              <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', mutedTxt)}>Agentes com mais registros</p>
              {topAgents.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between py-1">
                  <span className={cn('text-xs truncate flex-1', dk ? 'text-slate-300' : 'text-gray-700')}>{name}</span>
                  <span className={cn('text-xs font-bold ml-2 px-2 py-0.5 rounded-full', dk ? 'bg-slate-700 text-orange-400' : 'bg-orange-100 text-orange-700')}>{count}</span>
                </div>
              ))}
            </div>
          )}
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
                        <span className={cn('font-bold text-sm', numClr)}>R.O. {ro.roNumber}</span>
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
          <Row label="Agente"       value={ro.agent ? `${ro.agent}${ro.re ? ` (RE: ${ro.re})` : ''}` : null} />
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

  const TLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="font-bold text-[9px] uppercase block leading-tight text-gray-600">{children}</span>
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

            {/* ─ 2A Apoio ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">2.A — APOIO E/OU ACIONAMENTO NA OCORRÊNCIA</span></TCell>
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

            {/* ─ 2B Perdas e Danos ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">2.B — PERDAS E DANOS — MATERIAIS</span></TCell>
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
                <div className="mt-3 border-t border-gray-400 text-[9px] text-gray-500">Assinaturas dos agentes</div>
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
              {/* Header */}
              <tr>
                <td colSpan={2} className="border border-gray-500 px-3 py-2">
                  <div className="font-black text-center text-base text-gray-800 mb-1">REGISTRO FOTOGRÁFICO</div>
                  <div className="font-black text-center text-[11px] text-[#1B3A6B]">
                    🔶 DEFESA CIVIL — RELATÓRIO DE OCORRÊNCIA
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
                  <strong>Equipe:</strong> {ro.agent}{ro.re ? ` (RE: ${ro.re})` : ''}
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
                            </div>
                          </>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      )}

      <div className="no-print h-8" />
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [ros, setRos] = useState<OccurrenceReport[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const [currentRO, setCurrentRO] = useState<OccurrenceReport | null>(null);
  const editMode = useRef(false);

  // ── Tema escuro ──
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('dc_dark') === '1'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('dc_dark', darkMode ? '1' : '0'); } catch { /* noop */ }
  }, [darkMode]);

  const persist = useCallback((updated: OccurrenceReport[]) => {
    setRos(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const handleNew = () => {
    editMode.current = false;
    setCurrentRO(createNewRO());
    setScreen('wizard');
  };

  const handleUpdate = useCallback((updates: Partial<OccurrenceReport>) => {
    setCurrentRO(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null);
  }, []);

  const handleSave = useCallback(() => {
    if (!currentRO) return;
    const now = new Date().toISOString();
    const agentName = currentRO.agent
      ? (AGENTS.find(a => a.name === currentRO.agent)?.display ?? currentRO.agent)
      : 'Agente';
    const isEdit = editMode.current;
    const historyEntry = { at: now, by: agentName, action: isEdit ? 'Editado' : 'Salvo' };
    const saved = {
      ...currentRO,
      endTime: currentRO.endTime || nowHHMM(),
      status: 'completed' as const,
      updatedAt: now,
      editHistory: [...(currentRO.editHistory ?? []), historyEntry],
    };
    const idx = ros.findIndex(r => r.id === saved.id);
    persist(idx >= 0 ? ros.map((r, i) => i === idx ? saved : r) : [...ros, saved]);
    setCurrentRO(saved);
    setScreen('view');
  }, [currentRO, ros, persist]);

  const handleCancel = useCallback(() => {
    if (editMode.current && currentRO) {
      setScreen('view');
      return;
    }
    if (currentRO) {
      const draft = { ...currentRO, status: 'draft' as const };
      const idx = ros.findIndex(r => r.id === draft.id);
      persist(idx >= 0 ? ros.map((r, i) => i === idx ? draft : r) : [...ros, draft]);
    }
    setScreen('home');
    setCurrentRO(null);
  }, [currentRO, ros, persist]);

  const handleView = (ro: OccurrenceReport) => { setCurrentRO(ro); setScreen('view'); };
  const handleBack = () => { setScreen('home'); setCurrentRO(null); };
  const handleEdit = () => { editMode.current = true; setScreen('wizard'); };

  const handleDelete = (id: string) => {
    persist(ros.filter(r => r.id !== id));
  };
  const handleDeleteAll = () => {
    persist([]);
  };

  if (screen === 'wizard' && currentRO)
    return <WizardScreen ro={currentRO} onUpdate={handleUpdate} onSave={handleSave} onCancel={handleCancel} />;

  if (screen === 'print' && currentRO)
    return <PrintScreen ro={currentRO} onClose={() => setScreen('view')} />;

  if (screen === 'view' && currentRO)
    return <ViewROScreen ro={currentRO} onBack={handleBack} onPrint={() => setScreen('print')} onEdit={handleEdit} />;

  return <HomeScreen ros={ros} onNew={handleNew} onView={handleView} onDelete={handleDelete} onDeleteAll={handleDeleteAll}
    darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />;
}
