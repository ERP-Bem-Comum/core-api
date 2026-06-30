# PAR-ETL-PIX-KEY-TYPE — escopo + CAs

> Corrige a **issue #275**. Size **S**. Módulo `scripts/etl` (+ `partners`). Mudança que afeta a migração legado→prod → **MCP canônico** (DDD/Evans ACL) + **agentes especialistas**.

## Diagnóstico (validado na VM com dump de prod)

ETL: `suppliers read=100, migrated=0, quarantined=83, alreadyExists=17`. **82 dos 83** quarentenam por `EnumUnknown` em **`pix_key_type`** (+1 por `EmailInvalid`, dado sujo separado). Causa: o legado usa nomenclatura própria para o tipo de chave PIX, lida crua em `decode.ts:121` (`pixInfoKeyType: d.nStr('pixInfoKey_type')`) e passada direto a `PaymentTarget.createPixKey`, que só aceita o enum do core. Os 82 suppliers têm chave PIX **válida** — só o *tipo* está em vocabulário legado.

| Legado (real, do dump) | Core (`PixKeyType`, `payment-target.ts:10`) |
|---|---|
| `CNPJ` | `cnpj` |
| `EMAIL` | `email` |
| `CELLPHONE` | `phone` |
| `ALEATORY_KEY` | `random-key` |
| `CPF` (defensivo, não visto nos suppliers) | `cpf` |

## Solução — translator do Anti-Corruption Layer

**Ancoragem (Evans, *DDD*, p.226):** *"One way of organizing the design of the ANTICORRUPTION LAYER is as a combination of FACADES, ADAPTERS, and translators..."*. O ETL é o ACL entre o sistema legado e o core; adicionar um **translator** `pixKeyType (legado) → PixKeyType (core)` é o papel correto do ACL — não relaxar o VO do domínio (que deve seguir estrito).

Adicionar uma função de tradução (Record/Map explícito) que converte os valores legados → enum do core, antes de `createPixKey`. Valores **fora do mapa** continuam quarentenando (estrito — não inventa tipo).

## Decisões

- **Local:** translator no ETL (camada de tradução legado→core), não no VO `PaymentTarget` (que permanece a fonte da verdade do core). O agente W1 escolhe entre `decode.ts` (na leitura) ou `supplier.mapper.ts` (na montagem) — preferir um util reutilizável se o `collaborator` também consumir pix_key_type (ver nota).
- **Case/exatidão:** mapeamento explícito (não só lowercase — `CELLPHONE→phone`, `ALEATORY_KEY→random-key` não são lowercase triviais).
- **Fora de escopo:** o 1 supplier `EmailInvalid` (dado sujo — email malformado no legado; quarentena legítima). Foto/outros enums não tocados.

## Nota (possível follow-up)

O `collaborator` também tem `pix_key_type` (schema `mysql.ts`). Se o `collaborator.mapper` consumir o mesmo vocabulário legado, pode ter o mesmo gap → o translator deve ser **compartilhável**. O W1/W2 confirma; se for outro escopo, registrar via `issue-report`.

## Critérios de aceite

- **CA1** — Dado supplier legado com `pix_key_type = 'CNPJ'` (e chave válida), Quando migrado, Então cria com `pixKey.keyType = 'cnpj'` (não quarentena).
- **CA2** — Idem para `EMAIL→email`, `CELLPHONE→phone`, `ALEATORY_KEY→random-key`, `CPF→cpf`.
- **CA3** — Dado `pix_key_type` fora do mapa (ex.: `'FOO'`), Então continua quarentenando (`EnumUnknown`) — estrito.
- **CA4** — E2E na VM: re-rodar o ETL → `suppliers quarantined` cai de 83 para ~1 (só o EmailInvalid); ~82 passam a migrar.

## DoD (W3)

`typecheck` + `format:check` + `lint` + `test` verdes; teste do translator (unit) cobrindo CA1-CA3; validação E2E na VM (CA4).
