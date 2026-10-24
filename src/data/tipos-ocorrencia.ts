import { SectionType } from '../types';

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
