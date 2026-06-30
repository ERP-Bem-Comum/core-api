# W1 — Implementação · FIN-APPROVER-LIMIT-POLICY

**Skills/agentes:** ts-domain-modeler (domínio) + ports-and-adapters (port) + fastify-server-expert (adapter/composição/borda/teste de rota) + sessão principal (integração no use-case + gates).
**Estado:** **GREEN** (US1/MVP). `escalate`/cascata fica no ticket CASCADE.

## Implementado

### Domínio (puro)
- `src/modules/financial/domain/document/approval-policy.ts`: `checkApprover(netValue, authority): Result<void, ApprovalError>` (early-return α); `type ApproverAuthority { userId, canApprove, limit: Money|null }`; `type ApprovalError = 'approver-not-found' | 'approver-missing-permission' | 'approver-limit-exceeded'`. Tabela-verdade CA1–CA5. FR-008 fail-closed (sem alçada bloqueia). Zero throw/class.

### Port + Adapter (ports & adapters)
- `application/ports/approver-authority-reader.ts`: `ApproverAuthorityReader { get(userId), list() }` + `ApproverAuthorityReadError = 'approver-authority-unavailable'`. `ApproverAuthority` importado do domínio (application → domínio, ok).
- `adapters/read/approver-authority-reader.auth.ts`: adapta o `ApproverAuthorityReadPort` do auth (`ApproverAuthorityView { limitCents }`) → `ApproverAuthorityReader` (`limit: Money`), via `Money.fromCents` (ACL). `auth-user-read-unavailable` / overflow → `approver-authority-unavailable`.

### Integração nos use-cases
- `save-document.ts` (create): dep opt-in `approverAuthorityReader?`; após `Document.create` e antes de persistir, se `approverRef` presente e reader injetado → `reader.get` → `checkApprover(netValue)`. Erros no `SaveDocumentError`.
- `submit-draft.ts` (submit Draft→Open, #91): gate análogo com `netValue` recém-computado + `approverRef` do agregado.

### Composição (wire) + borda
- `adapters/http/composition.ts`: alarga o tipo de `authUserReadPort` para `AuthUserReadPort & ApproverAuthorityReadPort` (a instância de `buildAuthUserReadPort` já expõe ambos em runtime); constrói o adapter e injeta `approverAuthorityReader` nos Deps de `saveDocument`/`submitDraft`.
- `adapters/http/error-mapping.ts`: mensagens PT-BR para os 4 erros `approver-*` (regra → 422; `approver-authority-unavailable` → 503). Slug nunca vaza no body.

## Decisão de design (registrada)
- **Reader opt-in no Deps** (`approverAuthorityReader?`): a composição HTTP sempre injeta; ausência ⇒ gate não roda. Mantém ~14 callers de persistência/outbox intactos (zero edição/regressão). O caminho real é coberto pelo teste de rota (end-to-end) + composição.

## Testes (W0 + complementos do W1)
- `approval-policy.test.ts` (domínio, CA1–CA5): 6/6.
- `save-document-approver-limit.test.ts` (use-case, CA6/CA8): 3/3.
- `submit-draft-approver-limit.test.ts` (use-case, CA7): GREEN.
- `document-approver-limit.http.test.ts` (rota memory, CA6/CA9): 2/2 — alçada < líquido → **422** com message PT, **sem** vazar slug; ≥ → **201**.
- Fake de `reconciliation-executor-name.http.test.ts` alargado (`AuthUserReadPort & ApproverAuthorityReadPort`) — assinatura de `buildHandle` corrigida.

## Gates (W1 — verde, sessão principal)
- `tsc --noEmit`: **0 erros**.
- `prettier --check .`: **OK** (arquivos do sub-agente reformatados na principal — lição `subagent-edits-skip-prettier-lint-hooks`).
- `eslint .`: **exit 0** (corrigido `require-await` nos fakes — `async () =>` → `() => Promise.resolve(...)`).
- `pnpm test` (suíte completa): **3291 tests / 3273 pass / 0 fail / 18 skip** — zero regressão.

## Pendência (W3/DoD)
- `test:integration:financial` no x99 (CA6/CA7 com auth/RBAC reais no MySQL) — opcional, dado que a regra é lógica de domínio/application já coberta em memory; confirmar no gate W3.
