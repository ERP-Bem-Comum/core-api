/**
 * Helper de teste: deps de account lockout (BE-REC-001) para o authenticateUser.
 * Não é suite — só fábrica + política padrão importadas pelos testes de use case.
 */

import { makeInMemoryLoginLockoutStore } from '#src/modules/auth/adapters/persistence/repos/login-lockout-store.in-memory.ts';
import type { LockoutPolicy } from '#src/modules/auth/domain/session/account-lockout.ts';

export { makeInMemoryLoginLockoutStore };

export const TEST_LOCKOUT_POLICY: LockoutPolicy = { threshold: 5, stepsMinutes: [1, 5, 15, 60] };
