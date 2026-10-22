import { doc, writeBatch, type Firestore } from 'firebase/firestore';
import { addAuditToBatch, createAuditEntry } from './audit-log';

export interface DeletionTarget {
  id: string;
  roNumber?: string;
}

export interface DeletionActor {
  uid: string;
  agentName: string;
}

export class BulkDeleteError extends Error {
  constructor(
    readonly deleted: number,
    readonly total: number,
    cause: unknown,
  ) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Exclusão interrompida: ${deleted} de ${total} R.O.s removidos; o lote atual foi cancelado. ${message}`);
    this.name = 'BulkDeleteError';
  }
}

/**
 * Deletes in bounded atomic batches. Each successful chunk has matching audit
 * records; on failure, throws with the completed count so the UI can disclose
 * the partial progress instead of presenting a false all-or-nothing result.
 */
export async function deleteROsInChunks(
  firestore: Firestore,
  reports: DeletionTarget[],
  actor: DeletionActor,
  // Each RO+audit pair performs 2 rule document lookups; 10 pairs stay within
  // Firestore's 20-document-access-call ceiling for an atomic batch.
  chunkSize = 10,
): Promise<{ deleted: number; total: number }> {
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 10) {
    throw new Error('O tamanho do lote deve estar entre 1 e 10 R.O.s para respeitar as regras de auditoria.');
  }
  let deleted = 0;
  for (let offset = 0; offset < reports.length; offset += chunkSize) {
    const chunk = reports.slice(offset, offset + chunkSize);
    const batch = writeBatch(firestore);
    for (const report of chunk) {
      batch.delete(doc(firestore, 'ros', report.id));
      addAuditToBatch(batch, createAuditEntry({
        at: new Date().toISOString(),
        uid: actor.uid,
        agentName: actor.agentName,
        action: 'ro_deleted',
        roId: report.id,
        roNumber: report.roNumber || undefined,
      }), firestore);
    }
    try {
      await batch.commit();
      deleted += chunk.length;
    } catch (error) {
      throw new BulkDeleteError(deleted, reports.length, error);
    }
  }
  return { deleted, total: reports.length };
}
