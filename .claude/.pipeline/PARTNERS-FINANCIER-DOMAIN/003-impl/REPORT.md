# W1 — GREEN · PARTNERS-FINANCIER-DOMAIN

> Agente: ts-domain-modeler · Resultado: **GREEN** (8/8)

## Arquivos (`src/modules/partners/domain/financier/`)

| Arquivo | Conteúdo |
| :--- | :--- |
| `financier-id.ts` | VO `FinancierId` (Padrão D): `generate` (UUID v4) + `rehydrate` |
| `types.ts` | `ActiveFinancier` \| `InactiveFinancier` (refinados por `status`); `cnpj` é o VO `Cnpj` do kernel; `RegisterFinancierInput` |
| `events.ts` | `FinancierRegistered` \| `FinancierDeactivated` \| `FinancierReactivated` (`occurredAt` injetado) |
| `errors.ts` | `FinancierError` (string union kebab) |
| `financier.ts` | `register` / `deactivate` / `reactivate` (smart constructors, `immutable`) |

## Decisões de design

- **Estados refinados** (`Active`/`Inactive`) em vez de flag `active: boolean` — `InactiveFinancier`
  carrega `deactivatedAt` obrigatório (estados eliminam optional, DO C§29). É o padrão soft-delete que
  `supplier`/`collaborator` reusam.
- **ID injetado** no input (caller gera) — pureza/testabilidade, espelha `payable.open`.
- **`occurredAt`/`at` injetados** — sem `new Date()` no domínio (DO B§14).
- **Reuso do VO `Cnpj`** do shared-kernel (bootstrap) — `register` chama `Cnpj.parse`, normaliza, e o
  evento carrega o CNPJ normalizado.
- **`reactivate` descarta `deactivatedAt`** ao voltar para `Active` (estado não carrega o que não faz sentido).
- **Erros kebab string** — consistência com o resto do módulo `partners` (não o tagged-object do `financial`).

## Execução

```
ℹ tests 8 · pass 8 · fail 0
```
