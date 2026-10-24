import { beforeEach, describe, expect, it } from 'vitest';
import { aplicarCatalogo, normalizarCatalogo, opcoesDeViatura } from './catalogo';
import { AGENTS, SERVIDORES_PADRAO } from './data/servidores';

const valido = {
  viaturas: [{ prefixo: 'VTR-002' }, { prefixo: ' VTR-001 ' }, { prefixo: '' }, { prefixo: 'VTR-002' }, { placa: 'x' }],
  servidores: [
    { name: 'ZE DA SILVA', display: 'Zé da Silva', re: '123', role: 'Agente' },
    { name: 'ZE DA SILVA', display: 'duplicado', re: '999', role: '' },
    { name: 'SEM RE', display: 'Sem RE', re: '', role: '' },
    { display: 'sem nome', re: '5' },
  ],
  radios: [{ identificacao: 'HT-01', tipo: 'portatil', modelo: 'X', canal: '1' }, { identificacao: '' }],
};

describe('catálogo do painel', () => {
  it('valida e limpa a resposta', () => {
    const c = normalizarCatalogo(valido)!;
    expect(c.viaturas).toEqual(['VTR-002', 'VTR-001']);
    expect(c.servidores).toEqual([{ name: 'ZE DA SILVA', display: 'Zé da Silva', re: '123', role: 'Agente' }]);
    expect(c.radios).toEqual([{ identificacao: 'HT-01', tipo: 'portatil', modelo: 'X', canal: '1' }]);
  });

  it('rejeita o que não é catálogo (ex.: HTML do SPA, erro do painel)', () => {
    expect(normalizarCatalogo(null)).toBeNull();
    expect(normalizarCatalogo('<html>')).toBeNull();
    expect(normalizarCatalogo({ erro: 'catálogo indisponível' })).toBeNull();
    expect(normalizarCatalogo({ viaturas: [] })).toBeNull();
  });

  describe('aplicação', () => {
    beforeEach(() => aplicarCatalogo({ viaturas: [], servidores: [], radios: [] }));

    it('atualiza AGENTS no lugar e mantém o item "Outro"', () => {
      const ref = AGENTS;
      aplicarCatalogo(normalizarCatalogo(valido)!);
      expect(AGENTS).toBe(ref);
      expect(AGENTS.map(a => a.name)).toEqual(['ZE DA SILVA', 'OUTRO']);
    });

    it('lista vazia do painel não apaga a lista de reserva', () => {
      aplicarCatalogo({ viaturas: [], servidores: [], radios: [] });
      expect(AGENTS.length).toBe(SERVIDORES_PADRAO.length + 1);
      expect(AGENTS[AGENTS.length - 1].name).toBe('OUTRO');
    });
  });

  it('mantém no seletor a viatura já salva mesmo fora da lista', () => {
    expect(opcoesDeViatura(['VTR-001'], 'VTR-009')).toEqual(['VTR-001', 'VTR-009']);
    expect(opcoesDeViatura(['VTR-001'], 'VTR-001')).toEqual(['VTR-001']);
    expect(opcoesDeViatura(['VTR-001'], 'Outros')).toEqual(['VTR-001']);
    expect(opcoesDeViatura(['VTR-001'], '')).toEqual(['VTR-001']);
  });
});
