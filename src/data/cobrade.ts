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
