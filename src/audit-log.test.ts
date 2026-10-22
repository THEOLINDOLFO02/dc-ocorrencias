import { describe, expect, it } from 'vitest';
import { createAuditEntry, validateAuditInput } from './audit-log';

describe('audit-log validation', () => {
  const valid = {
    at: '2026-10-21T12:00:00.000Z',
    uid: 'firebase-user-1',
    agentName: 'Agente Teste',
    action: 'ro_saved' as const,
    roId: 'ro-123',
  };

  it('accepts a well-formed event and generates an idempotency key', () => {
    const entry = createAuditEntry(valid);
    expect(entry.id).toBeTruthy();
    expect(entry.action).toBe('ro_saved');
  });

  it('rejects an unknown action at runtime', () => {
    expect(() => validateAuditInput({ ...valid, action: 'admin_override' as never })).toThrow('Ação de auditoria');
  });

  it('rejects incomplete actor and record identity', () => {
    expect(() => validateAuditInput({ ...valid, uid: '' })).toThrow('UID');
    expect(() => validateAuditInput({ ...valid, roId: '' })).toThrow('identificador');
  });

  it('rejects malformed timestamps and optional fields', () => {
    expect(() => validateAuditInput({ ...valid, at: 'not-a-date' })).toThrow('Data inválida');
    expect(() => validateAuditInput({ ...valid, detail: 42 as never })).toThrow('Detalhe inválido');
  });
});
