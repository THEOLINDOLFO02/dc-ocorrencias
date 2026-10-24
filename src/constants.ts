import { doc, getDoc } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db } from './firebase';
import { type AgentIdentityState } from './ro-utils';
import { SectionType, Agency } from './types';
import { TEAM_EMAIL } from './screens/LoginScreen';

export interface CobradeItem { code: string; label: string; group: string; subgroup: string; }

export const COBRADE_LIST: CobradeItem[] = [
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

export interface OccurrenceType {
  id: string;
  label: string;
  emoji: string;
  category: string;
  section: SectionType;
}

export const OCCURRENCE_TYPES: OccurrenceType[] = [
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

export const DEFAULT_AGENCIES: Agency[] = [
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

export const ORIGINS = [
  { id: '199',         label: '199'                                       },
  { id: 'presencial',  label: 'Presencial na Base'                        },
  { id: 'demandaInt',  label: 'Demanda interna'                           },
  { id: 'PMC',         label: 'PMC (Prefeitura – outras secretarias)'     },
  { id: 'procAdm',     label: 'Proc. Adm. nº'       , hasText: true       },
  { id: 'oficio',      label: 'Ofício nº'            , hasText: true       },
  { id: 'outros',      label: 'Outros'               , hasText: true       },
];

export const toTitleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export interface Agent { name: string; display: string; re: string; role: string; }

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

/** Perfil ausente e falha de rede permanecem estados não verificados. */
export async function loadAgentIdentity(user: User): Promise<AgentIdentityState> {
  if (user.email?.toLowerCase() === TEAM_EMAIL) {
    return { status: 'legacy', email: user.email };
  }
  try {
    const snap = await getDoc(doc(db, 'agentProfiles', user.uid));
    if (!snap.exists()) return { status: 'unverified', reason: 'missing-profile' };
    const raw = snap.data();
    if (typeof raw.re !== 'string' || !raw.re || typeof raw.name !== 'string' || !raw.name) {
      return { status: 'unverified', reason: 'missing-profile' };
    }
    return {
      status: 'individual',
      profile: {
        uid: user.uid,
        re: raw.re,
        name: raw.name,
        display: typeof raw.display === 'string' ? raw.display : raw.name,
        role: typeof raw.role === 'string' ? raw.role : 'Agente',
      },
    };
  } catch {
    return { status: 'unverified', reason: 'profile-unavailable' };
  }
}

export const AGENTS: Agent[] = [
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

export const SECRETARIAS = [
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

export const STEP_LABELS = ['Cabeçalho', 'Solicitante', 'Ocorrência', 'Detalhes', 'Apoio', 'Fotos', 'Concluir'];
export const STORAGE_KEY = 'dc_ros_v1';

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
