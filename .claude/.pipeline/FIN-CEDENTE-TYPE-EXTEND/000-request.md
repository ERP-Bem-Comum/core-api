# FIN-CEDENTE-TYPE-EXTEND — Request (#206)

**Size:** S · **Tipo:** feature aditiva · **Issue:** #206 · **Módulo:** financial

## Problema

O tipo da conta-cedente é enum fechado `('corrente','poupanca','investimento')`, travado no domínio
(`AccountType`/`ACCOUNT_TYPES`), no Zod (`accountTypeSchema`) e no CHECK de banco. O cliente paga via
**cartão corporativo** (tem movimentação própria e precisa conciliar como conta), e não há como
representar **cartão** nem um tipo **"outro"** identificável.

## Decisão

Escopo **full** (decisão do humano): relaxar o enum **E** adicionar texto livre `typeLabel`.

- `typeLabel` é **opcional** (free-text nullable), aceito para qualquer tipo (útil p/ `outro`/`cartao`).
  A issue pede "aceitar" texto livre, não exigir → sem invariante "obrigatório p/ outro" (o front guia).
- Conciliação é **type-agnóstica** (import/confirm/manual-entry não ramificam por tipo) → critério 3
  sai de graça, sem tratamento especial.

## Mudanças (6 camadas)

1. **Domínio** `cedente/types.ts`: `AccountType += 'cartao' | 'outro'`; `ACCOUNT_TYPES` idem; `typeLabel?`
   em `CedenteAccount` + `CreateInput`. `cedente-account.ts`: `create` plota `typeLabel`.
2. **Drizzle** `schemas/mysql.ts`: coluna `type_label varchar(120)` nullable; CHECK relaxado p/ incluir
   `'cartao','outro'`. **Migration** via `db:generate:financial` (+ hand-edit do CHECK se preciso).
3. **Mapper** `cedente-account.mapper.ts`: `toRow`/`toDomain` mapeiam `typeLabel`.
4. **Use-cases**: `create-cedente-account` (input + plota); `edit-cedente-account` (`typeLabel`
   **sempre-editável** — não entra no guard de dados bancários FR-008).
5. **Zod** `schemas.ts`: `accountTypeSchema` += `'cartao','outro'`; `typeLabel` opcional no create/edit.
6. **DTO** `cedenteAccountResponseSchema` + mapeamento: expõe `typeLabel`.

## Critérios de aceite

- **CA1**: `create({ type: 'cartao' })` → ok; `create({ type: 'outro', typeLabel })` → ok com `typeLabel`
  refletido (hoje `invalid-account-type`).
- **CA2**: `POST /financial/cedente-accounts` aceita `type: 'cartao'|'outro'` (+ `typeLabel`) e persiste.
- **CA3**: conta `cartao`/`outro` concilia normalmente (import/confirm/manual) — sem tratamento especial.
- **CA4**: `type: 'salario'` (fora do enum) segue `invalid-account-type` (não relaxa demais).
- **CA5**: zero regressão; gate W3 verde + `test:integration:financial` (Docker, CHECK + coluna).

## Não-objetivos

Invariante "typeLabel obrigatório p/ outro" (decisão de produto futura). Dimensão de forma de pagamento
`CartaoCorporativo` do documento (já existe, é outra coisa).
