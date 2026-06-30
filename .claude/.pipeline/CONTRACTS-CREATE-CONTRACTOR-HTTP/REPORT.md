# CONTRACTS-CREATE-CONTRACTOR-HTTP — fechamento (impl absorvida no #1)

**Size**: S · **Feature**: `specs/002-contracts-http-gaps/` (ticket #2) · **Data**: 2026-06-06

## Contexto

O escopo deste ticket (POST `/api/v2/contracts` aceita `contractor` obrigatório + `create-contract`/
`create-pending` vinculam o contratado) foi **absorvido no ticket #1** (`CONTRACTS-CONTRACTOR-METADATA-DOMAIN`)
por decisão de escopo registrada com o humano (tornar `contractor` obrigatório no agregado cascateou o
create-path inteiro). Confirmado por verificação:

- `schemas.ts` — `contractWriteShape.contractor: z.object({ type: enum, id: uuid })` **obrigatório** (POST sem contractor → 400 Zod).
- `plugin.ts` — POST mapeia `body.contractor.{type,id}` → command (Pending e Active).
- `create-contract.ts` / `create-pending-contract.ts` — parse via `ContractorRef.make`, vinculam ao agregado.

## O que faltava (adicionado neste ticket)

Cobertura negativa explícita da FR-001 (US1-2 da spec), antes ausente — testes de trava em
`tests/modules/contracts/adapters/http/contracts-writes.routes.test.ts`:

- `POST sem contractor → 400 (Zod)`.
- `POST com contractor.id não-UUID → 400 (Zod)`.

Ambos verdes (lock de comportamento já existente). Sem código de produção novo.

## Gate

`typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `test` (writes route 31/0; suíte default verde).

## Veredito

**Closed-green** — funcionalidade entregue no #1; cobertura completada aqui. Ticket #2 do plano fica
documentado como absorvido (não há mais trabalho de produção pendente para o POST/create com contractor).
