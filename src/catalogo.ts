/**
 * Catálogo vindo do painel de gestão (PHP + MySQL): viaturas, servidores e rádios ativos.
 *
 * Fluxo: o app abre com a última lista guardada no aparelho (ou a de reserva em src/data/*) e,
 * havendo internet, busca a lista nova em <painel>/api/catalogo.php. Se o painel estiver fora do ar,
 * ou responder algo inválido, nada quebra: continua valendo o que já se tem.
 *
 * Endereço do painel: variável VITE_PAINEL_URL; sem ela, o mesmo site em /dc-painel
 * (em desenvolvimento o vite.config.ts repassa /dc-painel para o Apache local).
 */
import { useSyncExternalStore } from 'react';
import { AGENTS, AGENTE_OUTRO, SERVIDORES_PADRAO, type Agent } from './data/servidores';
import { VIATURAS_PADRAO } from './data/viaturas';
import { RADIOS_PADRAO, type Radio } from './data/radios';

export interface Catalogo {
  viaturas: string[];
  servidores: Agent[];
  radios: Radio[];
}

const CHAVE_CACHE = 'dc_catalogo_v1';
const PAINEL = ((import.meta.env.VITE_PAINEL_URL as string | undefined) ?? '/dc-painel').replace(/\/$/, '');

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Valida a resposta do painel. Devolve null se não for um catálogo utilizável. */
export function normalizarCatalogo(bruto: unknown): Catalogo | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const b = bruto as Record<string, unknown>;
  if (!Array.isArray(b.viaturas) || !Array.isArray(b.servidores)) return null;

  const viaturas = [...new Set(
    b.viaturas.map(v => texto((v as Record<string, unknown>)?.prefixo)).filter(Boolean),
  )];

  const servidores: Agent[] = [];
  for (const s of b.servidores as Array<Record<string, unknown>>) {
    const name = texto(s?.name);
    const re = texto(s?.re);
    if (!name || !re || servidores.some(x => x.name === name)) continue;
    servidores.push({ name, display: texto(s.display) || name, re, role: texto(s.role) });
  }

  const radios: Radio[] = Array.isArray(b.radios)
    ? (b.radios as Array<Record<string, unknown>>)
        .map(r => ({ identificacao: texto(r?.identificacao), tipo: texto(r?.tipo), modelo: texto(r?.modelo), canal: texto(r?.canal) }))
        .filter(r => r.identificacao)
    : [];

  return { viaturas, servidores, radios };
}

/** Monta as opções do seletor, mantendo o valor já salvo no R.O. mesmo que a viatura tenha saído da lista. */
export function opcoesDeViatura(lista: string[], atual: string): string[] {
  return atual && atual !== 'Outros' && !lista.includes(atual) ? [...lista, atual] : lista;
}

// ── Estado compartilhado ─────────────────────────────────────
let atual: Catalogo = { viaturas: VIATURAS_PADRAO, servidores: SERVIDORES_PADRAO, radios: RADIOS_PADRAO };
const ouvintes = new Set<() => void>();

/** Aplica um catálogo válido: listas vazias mantêm a de reserva; AGENTS é atualizado no lugar. */
export function aplicarCatalogo(c: Catalogo): void {
  atual = {
    viaturas: c.viaturas.length ? c.viaturas : VIATURAS_PADRAO,
    servidores: c.servidores.length ? c.servidores : SERVIDORES_PADRAO,
    radios: c.radios,
  };
  AGENTS.splice(0, AGENTS.length, ...atual.servidores, AGENTE_OUTRO);
  ouvintes.forEach(f => f());
}

function lerCache(): Catalogo | null {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE);
    return bruto ? normalizarCatalogo(JSON.parse(bruto)) : null;
  } catch { return null; }
}

/** Busca a lista nova no painel; falhas são silenciosas (continua valendo a lista atual). */
export async function atualizarCatalogo(): Promise<boolean> {
  try {
    const resp = await fetch(`${PAINEL}/api/catalogo.php`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!resp.ok || !(resp.headers.get('content-type') ?? '').includes('json')) return false;
    const json = await resp.json();
    const c = normalizarCatalogo(json);
    if (!c) return false;
    aplicarCatalogo(c);
    try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(json)); } catch { /* sem espaço: tudo bem */ }
    return true;
  } catch { return false; }
}

let iniciado = false;
/** Chamar uma vez ao abrir o app. */
export function iniciarCatalogo(): void {
  if (iniciado) return;
  iniciado = true;
  const guardado = lerCache();
  if (guardado) aplicarCatalogo(guardado);
  void atualizarCatalogo();
  window.addEventListener('online', () => { void atualizarCatalogo(); });
}

function assinar(f: () => void) { ouvintes.add(f); return () => { ouvintes.delete(f); }; }

/** Hook: devolve o catálogo atual e re-renderiza quando ele muda. */
export function useCatalogo(): Catalogo {
  return useSyncExternalStore(assinar, () => atual);
}
