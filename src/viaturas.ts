/**
 * Lista de viaturas do formulário do R.O.
 * A fonte da verdade é o painel de gestão, que publica a coleção `viaturas` do Firestore.
 * Enquanto a coleção não chegar (offline sem cache, painel ainda não configurado, erro),
 * vale a lista padrão abaixo, para o formulário nunca ficar sem opções.
 */
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

export const VIATURAS_PADRAO = ['VTR-001', 'VTR-002', 'VTR-003', 'VTR-004', 'VTR-005'];

/** Prefixos válidos de documentos publicados pelo painel, na ordem definida por ele. */
export function prefixosDasViaturas(docs: Array<Record<string, unknown>>): string[] {
  return docs
    .map(d => (typeof d.prefixo === 'string' ? d.prefixo.trim() : ''))
    .filter((p, i, todos) => p !== '' && todos.indexOf(p) === i);
}

/** Monta as opções do seletor, mantendo o valor já salvo no R.O. mesmo que a viatura tenha saído da lista. */
export function opcoesDeViatura(lista: string[], atual: string): string[] {
  return atual && atual !== 'Outros' && !lista.includes(atual) ? [...lista, atual] : lista;
}

export function useViaturas(): string[] {
  const [lista, setLista] = useState<string[]>(VIATURAS_PADRAO);

  useEffect(() => {
    const q = query(collection(db, 'viaturas'), orderBy('ordem', 'asc'));
    return onSnapshot(
      q,
      snap => {
        const prefixos = prefixosDasViaturas(snap.docs.map(d => d.data()));
        setLista(prefixos.length > 0 ? prefixos : VIATURAS_PADRAO);
      },
      () => setLista(VIATURAS_PADRAO),
    );
  }, []);

  return lista;
}
