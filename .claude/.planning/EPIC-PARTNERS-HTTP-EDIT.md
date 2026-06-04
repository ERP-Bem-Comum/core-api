# EPIC-PARTNERS-HTTP-EDIT — Edição cadastral (`PUT`) com RBAC elevado para campos vitais

> **Status:** Design aprovado (2026-06-04). **Piloto: Financiador.** Depois replica p/ Supplier e Collaborator.
> Gap transversal: o legado tem `PUT /:id` (update) mas o domínio não tem operação `*.edit`.

## Decisões do dono (2026-06-04)

- **Piloto: Financier** (mais simples). Replicar para Supplier/Collaborator em fatias seguintes.
- **Campo vital = identidade natural** (Financier: `cnpj`). Edição de campo vital exige permissão
  **elevada** `<recurso>:edit-sensitive` (role "diretor"); **síncrono** (sem workflow de aprovação).
- Quem tem só `<recurso>:write` edita os campos **não-vitais**; tentar mudar o vital → **403**.
- **Método: `PUT`** — substituição total dos campos cadastrais (fiel ao legado `UpdateFinancier`).

## Arquitetura (regra do vital no use case)

- **Domínio** `Financier.edit(financier, input, at)` → Result<{financier, event:FinancierEdited}, FinancierError>:
  valida os 6 campos + CNPJ; preserva `id` + estado (Active/Inactive + deactivatedAt). Sem RBAC no domínio.
- **Use case** `editFinancier({ financierId, canEditSensitive, ...campos })`:
  findById → `Financier.edit` → se `String(cnpjAtual) !== String(cnpjNovo)` **e** `!canEditSensitive` →
  `edit-financier-sensitive-forbidden`; se CNPJ mudou → re-checa `findByCnpj` (duplicate) → save.
  (Regra do vital no use case evita a inconsistência reader/writer do driver memory.)
- **Auth** (novo, reusável): `makeHasPermission(userReader)(req, permissionName) → Promise<boolean>` —
  checagem **consultável** de permissão (espelha `makeAuthorize`, sem 403). Exposto via `auth/public-api/http.ts`.
- **Borda** `PUT /api/v1/financiers/:id`: `preHandler [requireAuth, authorize('financier:write')]`;
  handler computa `canEditSensitive = hasPermission(req, 'financier:edit-sensitive')` e chama o use case.
  Erros: sensitive-forbidden→403, not-found→404, cnpj-duplicate→409, invalid-id→400, FinancierError→422.

## Endpoint

`PUT /api/v1/financiers/:id` — body = `UpdateFinancier` (name, corporateName, legalRepresentative, cnpj, telephone, address).

## Fatias

- **FINANCIERS-HTTP-EDIT** (piloto) — ✅ closed-green (2026-06-04).
- Depois: `SUPPLIERS-HTTP-EDIT` (vital=cnpj; payment-target editável via write), `COLLABORATORS-HTTP-EDIT` (vital=cpf; campos pessoais + cadastrais).
