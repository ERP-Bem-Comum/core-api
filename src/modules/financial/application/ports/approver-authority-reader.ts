import type { Result } from '../../../../shared/primitives/result.ts';
import type { ApproverAuthority } from '../../domain/document/approval-policy.ts';

// Port de leitura cross-módulo (ADR-0006): o financial lê a autoridade de aprovação do `auth`
// via public-api. O adapter reconstrói `ApproverAuthority.limit` (Money) de `limitCents` (ACL).
export type ApproverAuthorityReadError = 'approver-authority-unavailable';

export type ApproverAuthorityReader = Readonly<{
  get: (userId: string) => Promise<Result<ApproverAuthority | null, ApproverAuthorityReadError>>;
  list: () => Promise<Result<readonly ApproverAuthority[], ApproverAuthorityReadError>>;
}>;
