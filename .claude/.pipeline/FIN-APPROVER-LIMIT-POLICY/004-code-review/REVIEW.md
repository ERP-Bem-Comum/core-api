# Code Review — Ticket FIN-APPROVER-LIMIT-POLICY — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-30T21:07Z
**Escopo revisado:**

- `src/modules/financial/domain/document/approval-policy.ts` (domínio puro)
- `src/modules/financial/application/ports/approver-authority-reader.ts` (port)
- `src/modules/financial/adapters/read/approver-authority-reader.auth.ts` (adapter ACL)
- `src/modules/financial/application/use-cases/save-document.ts` (gate create)
- `src/modules/financial/application/use-cases/submit-draft.ts` (gate submit)
- `src/modules/financial/adapters/http/composition.ts` (wire)
- `src/modules/financial/adapters/http/error-mapping.ts` (4xx PT)
- testes: `approval-policy.test.ts`, `save-document-approver-limit.test.ts`, `submit-draft-approver-limit.test.ts`, `document-approver-limit.http.test.ts`, fake de `reconciliation-executor-name.http.test.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `save-document.ts` / `submit-draft.ts` (dep `approverAuthorityReader?`)

**Categoria:** D (ports & adapters)
**Observação:** o reader é **opcional** no Deps — o gate só roda quando injetado. Avaliado quanto a
"buraco esquecível": a composição constrói `buildAuthUserReadPort` por padrão no driver `mysql`
(`composition.ts:442` — se `authUserReadPort === null`, constrói), logo o reader é **sempre** injetado
em produção; no `memory` sem injeção o gate não roda (intencional — testes de persistência sem
aprovador). O caminho real é coberto end-to-end pelo teste de rota. **Aceitável e documentado**; a
alternativa (dep obrigatório) forçaria editar ~14 callers de persistência/outbox sem ganho de
segurança real. Manter como está.

---

## O que está bom

- **Domínio puro impecável.** `checkApprover` (`approval-policy.ts`) é early-return α, zero
  `throw`/`class`/`this`/`any`, `Result<void, ApprovalError>`, erro string-literal EN kebab,
  retorno explícito. Tabela-verdade CA1–CA5 fiel ao 000-request; FR-008 fail-closed comentado.
- **ACL correto (Vernon).** O adapter (`approver-authority-reader.auth.ts`) traduz
  `ApproverAuthorityView { limitCents } → ApproverAuthority { limit: Money }` na fronteira, e o
  financial nunca toca `User`/`Role` do auth. Consumo só via `auth/public-api/read.ts` (ADR-0006).
- **Tradução de erro defensiva.** `auth-user-read-unavailable` e overflow de `Money.fromCents`
  (coluna BIGINT não deveria gerar centavos inválidos, mas blindado) → `approver-authority-unavailable`.
  `list()` propaga o primeiro erro de mapeamento. `push` no `out` é legítimo (adapter, não domínio).
- **Gate posicionado certo.** Em `save-document`/`submit-draft` o gate roda após o `netValue` existir
  (pós-create/submit) e **antes de persistir** — falha não deixa efeito colateral (nada persistido).
  `submit-draft` usa o `approverRef` do agregado lido; `save-document` o do comando. Simétrico.
- **Borda sem vazamento.** `error-mapping`: 3 erros de regra caem no default 422; o de infra entra em
  `UNAVAILABLE_CODES` → 503. Mensagens PT-BR acentuadas; o slug nunca chega ao body
  (`toPublicMessage` usa `SLUG_MESSAGES`/fallback por code).
- **Wire correto.** `composition.ts` alarga o tipo para `AuthUserReadPort & ApproverAuthorityReadPort`
  (a instância de `buildAuthUserReadPort` já expõe ambos), constrói o adapter quando o port existe e
  injeta via spread condicional (`exactOptionalPropertyTypes` respeitado).
- **Testes proporcionais.** AAA, UUIDs reais, **fakes injetados (não mocks)**. Domínio cobre a
  tabela-verdade; use-case cobre CA6/CA8 (save) e CA7 (submit); **rota HTTP prova CA6/CA9 end-to-end**:
  `422` + `message` casa `/alçada/i` + `res.body.includes('approver-limit-exceeded') === false`
  (slug não vaza); `≥` → `201`.

---

## Próximo passo

- **APPROVED** → pipeline avança para **W3** (gate `typecheck` + `format:check` + `lint` + `test`).
  Gates já confirmados verdes na sessão principal ao fechar o W1 (3273 pass / 0 fail); o W3 reconfirma.
- Sugestão 1 é observação, não pendência.
