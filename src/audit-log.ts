import { doc, type Firestore, type WriteBatch } from 'firebase/firestore';
import { db } from './firebase';

export const AUDIT_ACTIONS = [
  'ro_draft_created',
  'ro_draft_updated',
  'ro_saved',
  'ro_edited',
  'ro_number_assigned',
  'ro_deleted',
] as const;

export type AuditAction = typeof AUDIT_ACTIONS[number];

export interface AuditEntry {
  id: string;
  at: string;
  uid: string;
  agentName: string;
  action: AuditAction;
  roId: string;
  roNumber?: string;
  detail?: string;
}

type AuditInput = Omit<AuditEntry, 'id'>;

const ACTION_SET = new Set<string>(AUDIT_ACTIONS);

export function validateAuditInput(input: AuditInput): void {
  if (!input.uid.trim()) throw new Error('Auditoria sem UID autenticado.');
  if (!input.agentName.trim()) throw new Error('Auditoria sem identificação do agente.');
  if (!input.roId.trim()) throw new Error('Auditoria sem identificador do R.O.');
  if (!Number.isFinite(Date.parse(input.at))) throw new Error('Data inválida na auditoria.');
  if (!ACTION_SET.has(input.action)) throw new Error('Ação de auditoria não permitida.');
  if (input.roNumber !== undefined && typeof input.roNumber !== 'string') {
    throw new Error('Número de R.O. inválido na auditoria.');
  }
  if (input.detail !== undefined && typeof input.detail !== 'string') {
    throw new Error('Detalhe inválido na auditoria.');
  }
}

export function createAuditEntry(input: AuditInput): AuditEntry {
  validateAuditInput(input);
  const id = globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, ...input };
}

export function addAuditToBatch(batch: WriteBatch, entry: AuditEntry, firestore: Firestore = db): void {
  const { id, ...data } = entry;
  validateAuditInput(data);
  batch.set(doc(firestore, 'auditLog', id), data);
}
