# FIN-CEDENTE-ACCOUNT — escopo

**Feature:** 016 (remessa CNAB 240) — modelagem **D-CEDENTE** · **Branch:** `016-fin-remessa-cnab240`
**Size:** M · **Épico:** Financeiro #64

> **Por que agora:** a conciliação (017) precisa de `fin_cedente_accounts` para destravar a
> persistência (#120/#123) e o guard de **conta encerrada** (FR-015). Esta é a **fundação conta-cedente**
> — a fatia de modelagem que tanto a remessa (016) quanto a conciliação (017) consomem. Implementada
> primeiro (decisão do humano). Esta fatia é **domínio puro**; o schema `fin_cedente_accounts` +
> migration `0004` + `fin_documents.debit_account_ref` + adapter Drizzle vêm na fatia
> `FIN-CEDENTE-ACCOUNT-PERSIST` seguinte (cuidado com `db:generate` — ver memória `repos-dir-moved-incident`).

## Objetivo

Modelar, em **domínio puro** (`src/modules/financial/domain/cedente/`), a **conta-cedente** (conta-débito
Bradesco da organização) + o port `CedenteAccountStore` com adapter **in-memory**.

## Em escopo

1. **VO `CedenteAccountId`** (branded, module-as-namespace).
2. **Entidade `CedenteAccount`** + `create(input): Result<CedenteAccount, CedenteAccountError>`:
   - Campos: `bankCode`, `agency`, `accountNumber`, `accountDigit`, `convenio`, `document` (CNPJ),
     `status: 'Active' | 'Closed'` (default `Active`), `nextNsa` (contador NSA; default `1`).
   - Validações: `agency`/`accountNumber`/`document` não-vazios; `bankCode` não-vazio; `nextNsa >= 1`.
   - Helpers: `isActive(acc)`, `isClosed(acc)`, `close(acc)` (Active→Closed).
3. **Port `CedenteAccountStore`** (`application/ports/cedente-account-store.ts`): `findById(id)`, `save(acc)`.
4. **Adapter in-memory** (`adapters/persistence/repos/cedente-account-store.in-memory.ts`).

Valores/enums em **EN** (C1). `status` casa o padrão dos demais enums (`Active`/`Closed`).

## Fora de escopo (próxima fatia `*-PERSIST`)

`fin_cedente_accounts` schema + migration `0004` + `fin_documents.debit_account_ref` + adapter Drizzle.
Alocação de NSA (lógica de remessa — 016). Geração CNAB/ACL/storage (016).

## Critérios de aceite

- **CA1**: `create` com campos válidos → `ok`; `status` default `Active`, `nextNsa` default `1`.
- **CA2**: `create` com `agency` vazia → `err('agency-required')`.
- **CA3**: `create` com `accountNumber` vazio → `err('account-number-required')`.
- **CA4**: `create` com `document` (CNPJ) vazio → `err('document-required')`.
- **CA5**: `isClosed` / `isActive` refletem o status; `close(active)` → `Closed`; `close(closed)` →
  `err('cedente-account-already-closed')`.
- **CA6**: in-memory `save` + `findById` retorna a conta; `findById` de id inexistente → `ok(null)`.

## Definition of Done

W0 RED → W1 GREEN (`ts-domain-modeler` + `ports-and-adapters`) → W2 review → W3 gate verde. Domínio
puro: `Result<T,E>`, sem `throw`/`class`, branded, erros string-literal-union EN. **Sem** DB/Docker nesta
fatia (adapter in-memory). Citação IX: D-CEDENTE (Evans/Vernon — anexar via MCP acdg, que está ON).
