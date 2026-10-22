import type { AuditEntry } from './audit-log';

const DATABASE = 'dc-ro-sync-recovery';
const STORE = 'rejected-writes';
const VERSION = 1;

export interface RecoveryStep {
  operation: 'create' | 'update';
  report: Record<string, unknown>;
  audit: AuditEntry;
}

export interface RecoveryRecord {
  roId: string;
  steps: RecoveryStep[];
  reason: string;
  updatedAt: string;
}

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB não está disponível neste navegador.'));
      return;
    }
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'roId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir a cópia de recuperação.'));
  });
}

export async function listRecoveryRecords(): Promise<RecoveryRecord[]> {
  const database = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as RecoveryRecord[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function saveRecoveryRecord(record: RecoveryRecord): Promise<void> {
  const database = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const get = store.get(record.roId);
      get.onsuccess = () => {
        const previous = get.result as RecoveryRecord | undefined;
        const steps = new Map<string, RecoveryStep>();
        const pendingSteps = previous?.steps ?? [];
        for (const step of [...pendingSteps, ...record.steps]) {
          if (!steps.has(step.audit.id)) steps.set(step.audit.id, step);
        }
        store.put({
          ...record,
          steps: [...steps.values()].sort((a, b) => a.audit.at.localeCompare(b.audit.at)),
        } satisfies RecoveryRecord);
      };
      get.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Falha ao guardar cópia de recuperação.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Falha ao guardar cópia de recuperação.'));
    });
  } finally {
    database.close();
  }
}

/** Removes only an acknowledged audit step, preserving concurrent/newer recovery work. */
export async function acknowledgeRecoveryStep(roId: string, auditId: string): Promise<void> {
  await acknowledgeRecoverySteps(roId, [auditId]);
}

/** Acknowledges an ordered set of superseded writes in one IndexedDB transaction. */
export async function acknowledgeRecoverySteps(roId: string, auditIds: readonly string[]): Promise<void> {
  const acknowledged = new Set(auditIds);
  const database = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(roId);
      request.onsuccess = () => {
        const record = request.result as RecoveryRecord | undefined;
        if (!record) return;
        const steps = record.steps.filter(step => !acknowledged.has(step.audit.id));
        if (steps.length === 0) store.delete(roId);
        else store.put({ ...record, steps });
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Falha ao atualizar a cópia de recuperação.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Falha ao atualizar a cópia de recuperação.'));
    });
  } finally {
    database.close();
  }
}

/** A confirmed full-document write supersedes failed earlier snapshots for that R.O. */
export async function acknowledgeRecoveryThrough(roId: string, auditId: string, auditAt: string): Promise<void> {
  const database = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(roId);
      request.onsuccess = () => {
        const record = request.result as RecoveryRecord | undefined;
        if (!record) return;
        const currentIndex = record.steps.findIndex(step => step.audit.id === auditId);
        const superseded = new Set<string>([auditId]);
        for (let index = 0; index < record.steps.length; index++) {
          const step = record.steps[index];
          if (index < currentIndex || (currentIndex < 0 && step.audit.at < auditAt)) superseded.add(step.audit.id);
        }
        const steps = record.steps.filter(step => !superseded.has(step.audit.id));
        if (steps.length === 0) store.delete(roId);
        else store.put({ ...record, steps });
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Falha ao atualizar a cópia de recuperação.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Falha ao atualizar a cópia de recuperação.'));
    });
  } finally {
    database.close();
  }
}
