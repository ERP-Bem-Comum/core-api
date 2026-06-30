/**
 * W0 (RED) - contract de RefreshTokenMinter vs fake. Ticket: A5b. ASCII puro.
 */

import { makeFakeRefreshTokenMinter } from '#src/modules/auth/adapters/crypto/refresh-token-minter.fake.ts';
import { runRefreshTokenMinterContract } from '../../application/ports/refresh-token-minter.contract.ts';

runRefreshTokenMinterContract('Fake', { make: () => makeFakeRefreshTokenMinter() });
