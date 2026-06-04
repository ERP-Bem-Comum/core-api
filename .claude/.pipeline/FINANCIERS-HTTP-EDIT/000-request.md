# Ticket FINANCIERS-HTTP-EDIT: edição cadastral (PUT) com RBAC elevado — piloto

> `EPIC-PARTNERS-HTTP-EDIT`. Piloto do mecanismo de edição + campo vital. Toca domínio + application + auth + borda.

## Contexto

Gap: não há operação de edição no agregado Financier. O legado tem `PUT /financiers/:id`. Decisões do
dono: PUT total; campo vital = `cnpj` exige `financier:edit-sensitive` (síncrono); quem só tem
`financier:write` edita os não-vitais (mudar cnpj sem a elevada → 403). Regra do vital no use case.

## Escopo

- **`domain/financier/events.ts`** — `FinancierEdited { type, financierId, occurredAt }` na union.
- **`domain/financier/types.ts`** — `EditFinancierInput` (6 campos cadastrais; cnpj string).
- **`domain/financier/financier.ts`** — `edit(financier, input, at)` → Result<{financier, event}, FinancierError>; valida campos+cnpj; preserva id+estado.
- **`application/use-cases/edit-financier.ts`** — `editFinancier({ financierId, canEditSensitive, ...campos })`; erros `edit-financier-{invalid-id,not-found,cnpj-duplicate,sensitive-forbidden}` + FinancierError + repo.
- **`auth/adapters/http/auth-hook.ts`** — `makeHasPermission(userReader)(req, permissionName) → Promise<boolean>`.
- **`auth/adapters/http/composition.ts`** — `AuthHttpDeps.hasPermission` (wired com userReader).
- **`auth/public-api/http.ts`** — export `makeHasPermission`.
- **`partners/adapters/http/financier-schemas.ts`** — `updateFinancierBodySchema` (= create body).
- **`partners/adapters/http/composition.ts`** — expõe `editFinancier`.
- **`partners/adapters/http/financier-plugin.ts`** — `FinanciersHttpHooks` + `hasPermission`; rota `PUT /financiers/:id`.
- **`src/server.ts`** — passa `authDeps.hasPermission` ao financiersHttpPlugin.

## Fora de escopo

- Edição de Supplier/Collaborator (fatias seguintes); workflow de aprovação assíncrono.

## Critérios de aceite

- [ ] `PUT /financiers/:id` sem token → 401; sem `financier:write` → 403; `:id` não-UUID → 400; inexistente → 404.
- [ ] com `financier:write`, **sem mudar cnpj** (muda name/telephone/etc) → **200**.
- [ ] com `financier:write`, **mudando cnpj** → **403** (`edit-financier-sensitive-forbidden`).
- [ ] com `financier:write` + `financier:edit-sensitive`, mudando cnpj → **200**; cnpj novo já usado por outro → **409**.
- [ ] body inválido (campo vazio) → 422; shape (cnpj≠14) → 400.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- `financier.ts` (register/rehydrate — estilo); `auth-hook.ts` (makeAuthorize — espelhar). ADR-0024/0027/0033.
