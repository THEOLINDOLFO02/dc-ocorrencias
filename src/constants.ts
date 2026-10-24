/**
 * Ponto único de importação dos dados fixos do app. Os dados em si ficam em src/data/*.ts, um assunto por arquivo:
 *   cobrade.ts · tipos-ocorrencia.ts · agencias.ts · origens.ts · servidores.ts · secretarias.ts · viaturas.ts · radios.ts · etapas.ts · identidade.ts
 * Para mudar uma lista, edite o arquivo dela; não é preciso mexer aqui nem nas telas.
 */
export * from './data/cobrade';
export * from './data/tipos-ocorrencia';
export * from './data/agencias';
export * from './data/origens';
export * from './data/servidores';
export * from './data/secretarias';
export * from './data/viaturas';
export * from './data/radios';
export * from './data/etapas';
export * from './data/identidade';
