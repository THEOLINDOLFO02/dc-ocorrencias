import { describe, it, expect } from 'vitest';
import { mergeInterdicao, buildOfflineRONumber, getDefaultInterdicao } from './ro-utils';

// ─── mergeInterdicao ────────────────────────────────────────────────────────

describe('mergeInterdicao', () => {
  it('usa o roNumber como numero quando rawInterdicao está vazio', () => {
    const result = mergeInterdicao({}, '042/2026');
    expect(result.numero).toBe('042/2026');
    expect(result.active).toBe(false);
  });

  it('preserva o numero quando rawInterdicao já tem um', () => {
    const result = mergeInterdicao({ numero: '007/2026' }, '042/2026');
    expect(result.numero).toBe('007/2026');
  });

  it('garante arrays mesmo se raw tem undefined', () => {
    const result = mergeInterdicao({ causas: undefined, danos: undefined }, '001/2026');
    expect(Array.isArray(result.causas)).toBe(true);
    expect(Array.isArray(result.danos)).toBe(true);
    expect(Array.isArray(result.bensAfetados)).toBe(true);
  });

  it('preserva arrays de causas e danos quando fornecidos', () => {
    const result = mergeInterdicao({ causas: ['erosão', 'chuva'], danos: ['telhado'] }, '001/2026');
    expect(result.causas).toEqual(['erosão', 'chuva']);
    expect(result.danos).toEqual(['telhado']);
  });

  it('converte active para boolean', () => {
    // @ts-expect-error testando coerção de tipo truthy
    const r1 = mergeInterdicao({ active: 1 }, '');
    expect(r1.active).toBe(true);
    // @ts-expect-error testando coerção de tipo falsy
    const r2 = mergeInterdicao({ active: 0 }, '');
    expect(r2.active).toBe(false);
  });
});

// ─── buildOfflineRONumber ───────────────────────────────────────────────────

describe('buildOfflineRONumber', () => {
  it('começa em 001P quando não há contador local', () => {
    const { number, nextCount } = buildOfflineRONumber(null, null, '2026');
    expect(number).toBe('001P/2026');
    expect(nextCount).toBe(1);
  });

  it('incrementa corretamente dentro do mesmo ano', () => {
    const { number, nextCount } = buildOfflineRONumber('2026', 5, '2026');
    expect(number).toBe('006P/2026');
    expect(nextCount).toBe(6);
  });

  it('reinicia para 001P em novo ano', () => {
    const { number, nextCount } = buildOfflineRONumber('2025', 99, '2026');
    expect(number).toBe('001P/2026');
    expect(nextCount).toBe(1);
  });

  it('inclui o sufixo P para indicar número provisório', () => {
    const { number } = buildOfflineRONumber('2026', 3, '2026');
    expect(number).toContain('P/');
  });

  it('zero-pad até 3 dígitos', () => {
    const { number } = buildOfflineRONumber('2026', 0, '2026');
    expect(number.startsWith('001P')).toBe(true);
  });
});

// ─── getDefaultInterdicao ───────────────────────────────────────────────────

describe('getDefaultInterdicao', () => {
  it('todos os campos de array são arrays vazios por padrão', () => {
    const def = getDefaultInterdicao();
    expect(def.causas).toEqual([]);
    expect(def.danos).toEqual([]);
    expect(def.bensAfetados).toEqual([]);
  });

  it('active é false por padrão', () => {
    expect(getDefaultInterdicao().active).toBe(false);
  });
});
