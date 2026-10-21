/**
 * Testes de regras Firestore — Defesa Civil Cajamar · Sistema de R.O.
 *
 * Pré-requisito: Firebase Emulator em execução.
 *   firebase emulators:start --only firestore
 *
 * Para rodar os testes:
 *   npm test
 *
 * Os testes cobrem:
 *   - Usuário não autenticado (acesso bloqueado em todas as coleções)
 *   - Agente autenticado com perfil (acesso permitido)
 *   - Admin (acesso completo + exclusões)
 *   - Acesso cruzado (agente lendo perfil de outro)
 *   - Tentativa de alterar campos protegidos (authorUid, createdAt, id)
 *   - Tentativa de reduzir editHistory
 *   - Auditoria imutável (update/delete bloqueados)
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ADMIN_UID = 'heEO6l4moPcnKoOmvgUlDAptSfX2';
const AGENT_UID = 'agent-uid-001';
const OTHER_UID = 'other-uid-002';

const RULES_PATH = resolve(__dirname, '..', 'firestore.rules');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'dc-ocorrencias-test',
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Pré-popula perfil do agente e um R.O. de exemplo
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await db.doc(`agentProfiles/${AGENT_UID}`).set({ name: 'Agente Teste', re: '20236' });
    await db.doc('ros/ro-001').set({
      id: 'ro-001',
      roNumber: '001/2026',
      authorUid: AGENT_UID,
      createdAt: '2026-01-01T00:00:00.000Z',
      editHistory: [],
    });
    await db.doc('meta/counter').set({ year: '2026', count: 1 });
  });
});

// ─── /ros — Leitura ──────────────────────────────────────────────────────────

describe('/ros — leitura', () => {
  it('bloqueia leitura para usuário não autenticado', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc('ros/ro-001').get());
  });

  it('permite leitura para agente com perfil', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.doc('ros/ro-001').get());
  });

  it('permite leitura para admin', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(db.doc('ros/ro-001').get());
  });

  it('bloqueia leitura para autenticado sem perfil', async () => {
    const db = testEnv.authenticatedContext(OTHER_UID).firestore();
    await assertFails(db.doc('ros/ro-001').get());
  });
});

// ─── /ros — Criação ──────────────────────────────────────────────────────────

describe('/ros — criação', () => {
  it('bloqueia criação para não autenticado', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc('ros/ro-new').set({ id: 'ro-new', roNumber: '002/2026' }));
  });

  it('permite criação com authorUid próprio', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.doc('ros/ro-new').set({
      id: 'ro-new', roNumber: '002/2026', authorUid: AGENT_UID,
    }));
  });

  it('permite criação sem authorUid (modo legado)', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.doc('ros/ro-new2').set({
      id: 'ro-new2', roNumber: '003/2026',
    }));
  });

  it('bloqueia criação com authorUid de outro agente', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.doc('ros/ro-bad').set({
      id: 'ro-bad', roNumber: '004/2026', authorUid: ADMIN_UID,
    }));
  });
});

// ─── /ros — Atualização (campos protegidos) ──────────────────────────────────

describe('/ros — campos protegidos na atualização', () => {
  it('bloqueia alteração de authorUid', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.doc('ros/ro-001').update({ authorUid: OTHER_UID, editHistory: [] }));
  });

  it('bloqueia alteração de createdAt', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.doc('ros/ro-001').update({ createdAt: '2020-01-01T00:00:00.000Z', editHistory: [] }));
  });

  it('bloqueia redução de editHistory', async () => {
    // Primeiro adiciona uma entrada ao histórico
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().doc('ros/ro-001').update({
        editHistory: [{ at: '2026-01-02T00:00:00.000Z', by: 'Agente', action: 'Salvo' }],
      });
    });
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    // Tenta sobrescrever com array vazio (redução)
    await assertFails(db.doc('ros/ro-001').update({ editHistory: [] }));
  });

  it('permite atualização de campos normais', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.doc('ros/ro-001').update({
      status: 'completed',
      updatedAt: new Date().toISOString(),
      editHistory: [{ at: new Date().toISOString(), by: 'Agente', action: 'Salvo' }],
    }));
  });
});

// ─── /ros — Exclusão ─────────────────────────────────────────────────────────

describe('/ros — exclusão', () => {
  it('bloqueia exclusão por agente comum', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.doc('ros/ro-001').delete());
  });

  it('permite exclusão por admin', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(db.doc('ros/ro-001').delete());
  });
});

// ─── /agentProfiles — Acesso cruzado ────────────────────────────────────────

describe('/agentProfiles — acesso cruzado', () => {
  it('permite agente ler o próprio perfil', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.doc(`agentProfiles/${AGENT_UID}`).get());
  });

  it('bloqueia agente lendo perfil de outro', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.doc(`agentProfiles/${OTHER_UID}`).get());
  });

  it('permite admin ler qualquer perfil', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(db.doc(`agentProfiles/${AGENT_UID}`).get());
  });

  it('bloqueia agente criando ou alterando perfil', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.doc(`agentProfiles/${AGENT_UID}`).update({ re: '99999' }));
  });

  it('permite admin criar perfil', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(db.doc(`agentProfiles/new-uid`).set({ name: 'Novo Agente', re: '55555' }));
  });
});

// ─── /auditLog — Imutabilidade ───────────────────────────────────────────────

describe('/auditLog — auditoria imutável', () => {
  it('bloqueia leitura por agente comum', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.collection('auditLog').get());
  });

  it('permite leitura por admin', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(db.collection('auditLog').get());
  });

  it('permite agente criar entrada de auditoria com uid próprio', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.collection('auditLog').add({
      at: new Date().toISOString(),
      uid: AGENT_UID,
      agentName: 'Agente Teste',
      action: 'ro_saved',
      roId: 'ro-001',
    }));
  });

  it('bloqueia criação de entrada com uid forjado', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.collection('auditLog').add({
      at: new Date().toISOString(),
      uid: ADMIN_UID, // UID forjado
      agentName: 'Agente Teste',
      action: 'ro_saved',
      roId: 'ro-001',
    }));
  });

  it('bloqueia criação de entrada com campos obrigatórios ausentes', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertFails(db.collection('auditLog').add({
      uid: AGENT_UID,
      action: 'ro_saved',
      // faltam 'at' e 'roId'
    }));
  });

  it('bloqueia update de entrada de auditoria', async () => {
    // Cria uma entrada válida via bypass
    let auditId: string;
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const ref = await ctx.firestore().collection('auditLog').add({
        at: new Date().toISOString(),
        uid: AGENT_UID,
        agentName: 'Agente Teste',
        action: 'ro_saved',
        roId: 'ro-001',
      });
      auditId = ref.id;
    });
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertFails(db.doc(`auditLog/${auditId!}`).update({ detail: 'alterado' }));
  });

  it('bloqueia delete de entrada de auditoria (inclusive admin)', async () => {
    let auditId: string;
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const ref = await ctx.firestore().collection('auditLog').add({
        at: new Date().toISOString(),
        uid: AGENT_UID,
        agentName: 'Agente Teste',
        action: 'ro_saved',
        roId: 'ro-001',
      });
      auditId = ref.id;
    });
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertFails(db.doc(`auditLog/${auditId!}`).delete());
  });
});

// ─── /meta — Contador ────────────────────────────────────────────────────────

describe('/meta — contador de numeração', () => {
  it('bloqueia não autenticado', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc('meta/counter').get());
  });

  it('permite agente ler o contador', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.doc('meta/counter').get());
  });

  it('permite agente escrever o contador (necessário para transação)', async () => {
    const db = testEnv.authenticatedContext(AGENT_UID).firestore();
    await assertSucceeds(db.doc('meta/counter').set({ year: '2026', count: 2 }));
  });
});
