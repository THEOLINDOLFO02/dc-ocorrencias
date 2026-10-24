import { describe, expect, it } from 'vitest';
import { opcoesDeViatura, prefixosDasViaturas, VIATURAS_PADRAO } from './viaturas';

describe('viaturas publicadas pelo painel', () => {
  it('extrai os prefixos na ordem recebida, sem vazios nem repetidos', () => {
    expect(prefixosDasViaturas([
      { prefixo: 'VTR-002' }, { prefixo: ' VTR-001 ' }, { prefixo: '' }, { prefixo: 'VTR-002' }, { placa: 'sem prefixo' }, { prefixo: 7 },
    ])).toEqual(['VTR-002', 'VTR-001']);
  });

  it('mantém no seletor a viatura já salva no R.O. mesmo fora da lista', () => {
    expect(opcoesDeViatura(['VTR-001'], 'VTR-009')).toEqual(['VTR-001', 'VTR-009']);
  });

  it('não duplica nem acrescenta "Outros" ou vazio', () => {
    expect(opcoesDeViatura(['VTR-001'], 'VTR-001')).toEqual(['VTR-001']);
    expect(opcoesDeViatura(['VTR-001'], 'Outros')).toEqual(['VTR-001']);
    expect(opcoesDeViatura(['VTR-001'], '')).toEqual(['VTR-001']);
  });

  it('a lista padrão cobre as viaturas históricas', () => {
    expect(VIATURAS_PADRAO).toEqual(['VTR-001', 'VTR-002', 'VTR-003', 'VTR-004', 'VTR-005']);
  });
});
