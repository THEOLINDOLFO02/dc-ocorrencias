import { doc, getDoc } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db } from '../firebase';
import { type AgentIdentityState } from '../ro-utils';
import { TEAM_EMAIL } from '../screens/LoginScreen';

/**
 * Perfil armazenado em Firestore: /agentProfiles/{uid}
 * Criado pelo admin; jamais pelo próprio agente.
 * Vincula o UID Firebase (identidade autenticada) ao perfil operacional.
 */
export interface AgentProfile {
  uid: string;
  re: string;
  name: string;
  display: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/** Perfil ausente e falha de rede permanecem estados não verificados. */
export async function loadAgentIdentity(user: User): Promise<AgentIdentityState> {
  if (user.email?.toLowerCase() === TEAM_EMAIL) {
    return { status: 'legacy', email: user.email };
  }
  try {
    const snap = await getDoc(doc(db, 'agentProfiles', user.uid));
    if (!snap.exists()) return { status: 'unverified', reason: 'missing-profile' };
    const raw = snap.data();
    if (typeof raw.re !== 'string' || !raw.re || typeof raw.name !== 'string' || !raw.name) {
      return { status: 'unverified', reason: 'missing-profile' };
    }
    return {
      status: 'individual',
      profile: {
        uid: user.uid,
        re: raw.re,
        name: raw.name,
        display: typeof raw.display === 'string' ? raw.display : raw.name,
        role: typeof raw.role === 'string' ? raw.role : 'Agente',
      },
    };
  } catch {
    return { status: 'unverified', reason: 'profile-unavailable' };
  }
}
