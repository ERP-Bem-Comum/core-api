/**
 * W0 (RED) - contract-suite de PasswordHasher contra o fake (sha256). Ticket: X1. ASCII puro.
 */

import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { runPasswordHasherContract } from '../../application/ports/password-hasher.contract.ts';

runPasswordHasherContract('Fake (sha256)', { make: () => makeFakePasswordHasher() });
