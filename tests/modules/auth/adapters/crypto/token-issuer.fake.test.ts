/**
 * W0 (RED) - contract-suite de TokenIssuer contra o fake. Ticket: X2. ASCII puro.
 */

import { makeFakeTokenIssuer } from '#src/modules/auth/adapters/crypto/token-issuer.fake.ts';
import { runTokenIssuerContract } from '../../application/ports/token-issuer.contract.ts';

runTokenIssuerContract('Fake', { make: () => makeFakeTokenIssuer() });
