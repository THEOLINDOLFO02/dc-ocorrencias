import { describe, it, expect } from 'vitest';
import {
  mergeInterdicao,
  buildOfflineRONumber,
  getDefaultInterdicao,
  computeNextNumber,
  shouldUpdateInterdicaoNumber,
  type CounterState,
} from './ro-utils';

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

// ─── buildOfflineRONumber (mantido por compatibilidade) ────────────────────

describe('buildOfflineRONumber (legado)', () => {
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

// ─── computeNextNumber ──────────────────────────────────────────────────────

describe('computeNextNumber — lógica do contador definitivo', () => {
  it('começa em 001 quando não há contador armazenado', () => {
    const { roNumber, newCounter } = computeNextNumber(null, '2026');
    expect(roNumber).toBe('001/2026');
    expect(newCounter).toEqual({ year: '2026', count: 1 });
  });

  it('incrementa corretamente dentro do mesmo ano', () => {
    const stored: CounterState = { year: '2026', count: 10 };
    const { roNumber, newCounter } = computeNextNumber(stored, '2026');
    expect(roNumber).toBe('011/2026');
    expect(newCounter.count).toBe(11);
  });

  it('reinicia para 001 na virada de ano', () => {
    const stored: CounterState = { year: '2025', count: 150 };
    const { roNumber, newCounter } = computeNextNumber(stored, '2026');
    expect(roNumber).toBe('001/2026');
    expect(newCounter).toEqual({ year: '2026', count: 1 });
  });

  it('não aceita ano com 2 dígitos como equivalente (sem ambiguidade)', () => {
    // "26" !== "2026" — comparação deve ser estrita com 4 dígitos
    const stored: CounterState = { year: '26', count: 5 };
    const { roNumber } = computeNextNumber(stored, '2026');
    // Como "26" !== "2026", reinicia para 001
    expect(roNumber).toBe('001/2026');
  });

  it('zero-pad até 3 dígitos', () => {
    const { roNumber } = computeNextNumber({ year: '2026', count: 0 }, '2026');
    expect(roNumber.startsWith('001/')).toBe(true);
  });

  it('usa sempre barra + 4 dígitos de ano no formato', () => {
    const { roNumber } = computeNextNumber(null, '2026');
    expect(roNumber).toMatch(/^\d{3}\/2026$/);
  });

  it('números consecutivos não se repetem em sequência rápida', () => {
    let state: CounterState | null = null;
    const numbers = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const { roNumber, newCounter } = computeNextNumber(state, '2026');
      numbers.add(roNumber);
      state = newCounter;
    }
    expect(numbers.size).toBe(10); // sem duplicatas
  });
});

// ─── shouldUpdateInterdicaoNumber ──────────────────────────────────────────

describe('shouldUpdateInterdicaoNumber — reconciliação do auto de interdição', () => {
  it('atualiza quando o número do auto está vazio (criado offline)', () => {
    expect(shouldUpdateInterdicaoNumber('', '')).toBe(true);
  });

  it('atualiza quando o número do auto é igual ao roNumber vazio anterior', () => {
    expect(shouldUpdateInterdicaoNumber('', '')).toBe(true);
  });

  it('não atualiza quando o auto já tem número próprio diferente do R.O.', () => {
    expect(shouldUpdateInterdicaoNumber('005/2026', '003/2026')).toBe(false);
  });

  it('atualiza quando o número do auto é igual ao roNumber anterior (ambos eram vazios)', () => {
    // Caso normal na reconciliação: oldRoNumber="" e interdicao.numero="" — devem ser substituídos
    expect(shouldUpdateInterdicaoNumber('', '')).toBe(true);
  });

  it('atualiza quando o número do auto era idêntico ao roNumber provisório vazio', () => {
    // O auto de interdição foi criado herdando o roNumber vazio e precisa ser corrigido
    expect(shouldUpdateInterdicaoNumber('', '')).toBe(true);
  });
});
