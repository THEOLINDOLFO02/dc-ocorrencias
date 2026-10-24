/**
 * Lista de servidores da Defesa Civil (quem pode assinar/ser escolhido no R.O.).
 * Esta é a lista de RESERVA: quando o painel de gestão responde (ver ../catalogo.ts), a lista dele
 * substitui esta. Para mudar a reserva, edite só SERVIDORES_PADRAO; para o dia a dia, use o painel.
 */
export interface Agent { name: string; display: string; re: string; role: string; }

export const toTitleCase = (s: string) =>
  s.toLowerCase().replace(/w/g, c => c.toUpperCase());

/** Item fixo "Outro (outra secretaria)": sempre existe, não vem do painel. */
export const AGENTE_OUTRO: Agent = { name: 'OUTRO', display: 'Outro (outra secretaria)', re: '', role: '' };

export const SERVIDORES_PADRAO: Agent[] = [
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
];

/**
 * Lista em uso no app. É atualizada NO LUGAR (mesma referência) quando o catálogo do painel chega,
 * para que todo código que lê AGENTS passe a enxergar a lista nova.
 */
export const AGENTS: Agent[] = [...SERVIDORES_PADRAO, AGENTE_OUTRO];
