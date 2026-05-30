/**
 * Helper de teste: PasswordHash descartavel para a dep `dummyPasswordHash` do authenticateUser
 * (BE-REC-002, login anti-timing). Nao e suite (.suite.ts/.contract.ts) — so uma constante importada.
 */

import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';

const built = PasswordHash.fromString('fake-sha256:dummy-anti-timing');
if (!built.ok) throw new Error('dummy-password-hash: setup invalido');

export const DUMMY_PASSWORD_HASH = built.value;
