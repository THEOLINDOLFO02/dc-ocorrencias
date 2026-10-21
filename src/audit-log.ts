/**
 * Trilha de auditoria em /auditLog/{id} — coleção separada, append-only.
 *
 * Por que separada do editHistory no documento?
 * editHistory é um array dentro do próprio R.O.: qualquer setDoc() com o array
 * reduzido ou vazio o sobrescreve silenciosamente. A coleção /auditLog não pode
 * ser alterada nem deletada por clientes (regra: allow update, delete: if false).
 *
 * O que é registrado:
 *   - Criação de R.O. (novo rascunho inicial)
 *   - Salvamento como concluído
 *   - Edição de R.O. existente
 *   - Atribuição de número definitivo (reconciliação offline)
 *
 * O que NÃO é registrado aqui (faz parte do próprio R.O.):
 *   - Alterações de campo individuais (inviável no modelo atual sem diff)
 */

import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export type AuditAction =
  | 'ro_draft_created'
  | 'ro_saved'
  | 'ro_edited'
  | 'ro_number_assigned'
  | 'ro_deleted';

export interface AuditEntry {
  at: string;          // ISO timestamp
  uid: string;         // UID Firebase do usuário que executou a ação
  agentName: string;   // Nome do agente operacional (campo operacional, não de autoria)
  action: AuditAction;
  roId: string;        // ID do documento /ros/{id}
  roNumber?: string;   // Número do R.O. no momento da ação (vazio se ainda não atribuído)
  detail?: string;     // Informação adicional opcional
}

/**
 * Insere uma entrada de auditoria.
 * Falhas são suprimidas — a auditoria não deve bloquear o fluxo principal.
 * A regra Firestore garante que uid == request.auth.uid, então forjar a entrada é impossível.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await addDoc(collection(db, 'auditLog'), entry);
  } catch {
    // Falha silenciosa — log de auditoria não deve travar a operação principal
  }
}
