import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import { computeNextNumber } from './ro-utils';
import { createAuditEntry } from './audit-log';

export interface NumberingActor {
  uid: string;
  agentName: string;
}

export interface NumberAssignment {
  roNumber: string;
  auditId: string;
}

/**
 * Assigns a definitive number only to a document already committed to Firestore.
 * The counter, R.O. and audit event commit atomically; retrying the same id is safe.
 */
export async function assignRONumber(
  firestore: Firestore,
  roId: string,
  fullYear: string,
  actor: NumberingActor,
): Promise<NumberAssignment | null> {
  const counterRef = doc(firestore, 'meta', 'counter');
  const roRef = doc(firestore, 'ros', roId);
  const audit = createAuditEntry({
    at: new Date().toISOString(),
    uid: actor.uid,
    agentName: actor.agentName,
    action: 'ro_number_assigned',
    roId,
  });

  for (let conflictRetry = 0; ; conflictRetry++) {
    try {
      return await runTransaction(firestore, async transaction => {
        const [counterSnap, roSnap] = await Promise.all([
          transaction.get(counterRef),
          transaction.get(roRef),
        ]);
        if (!roSnap.exists()) return null;

        const ro = roSnap.data();
        if (ro.needsNumber !== true) {
          return typeof ro.roNumber === 'string' && ro.roNumber
            ? { roNumber: ro.roNumber, auditId: typeof ro.lastAuditId === 'string' ? ro.lastAuditId : '' }
            : null;
        }

        const counter = counterSnap.exists()
          ? { year: String(counterSnap.data().year ?? ''), count: Number(counterSnap.data().count ?? 0) }
          : null;
        const { roNumber, newCounter } = computeNextNumber(counter, fullYear);
        const auditData = { ...audit, roNumber };
        const { id: auditId, ...auditFields } = auditData;

        transaction.set(counterRef, {
          ...newCounter,
          lastRoId: roId,
          lastRoNumber: roNumber,
        });
        transaction.update(roRef, {
          roNumber,
          needsNumber: false,
          lastAuditId: auditId,
        });
        transaction.set(doc(firestore, 'auditLog', auditId), auditFields);
        return { roNumber, auditId };
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== 'permission-denied' || conflictRetry >= 2) throw error;
      // Rules can reject a stale concurrent counter write before the SDK treats
      // it as a retryable transaction conflict. Retry from fresh server reads.
      await new Promise(resolve => setTimeout(resolve, 40 * (conflictRetry + 1)));
    }
  }
}
