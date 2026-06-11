# Quickstart — Expiração automática de contratos

## Como funciona (operação)

O **worker de outbox** passa a rodar, além da entrega de eventos, um **sweep de expiração** periódico. A
cada `CONTRACTS_EXPIRE_SWEEP_MS` (default 1 h), ele finaliza ("Em Andamento" → "Finalizado") todo contrato
cuja vigência efetiva (`current_period_end`) já passou, no fuso de **Brasília (UTC-3)** com borda **D+1**.

```bash
# Worker (mesmo binário de hoje) — agora também expira contratos vencidos:
CONTRACTS_DATABASE_URL="mysql://core_app:<pass>@127.0.0.1:3306/core" \
CONTRACTS_EXPIRE_SWEEP_MS=3600000 \
pnpm run worker:outbox
# stderr loga por ciclo: [expire-sweep] scanned=N expired=M failures=K
```

Nada muda no `server.ts` / na borda HTTP. O front não muda — `GET /contracts` e `/contracts/:id` passam a
devolver `Finalizado` assim que o sweep roda.

## Como validar (aceitação)

1. **Caso CT 0776/2026** (`current_period_end = 2026-06-10`): em 2026-06-11 (BRT) o sweep o finaliza →
   `GET /api/v2/contracts/<id>` retorna `status: "Expired"`.
2. **Borda D+1**: um contrato com `end = hoje (BRT)` permanece `Active` hoje; finaliza amanhã.
3. **Não-elegíveis**: contratos `Pending`/`Terminated`/`Cancelled` e os de vigência `Indefinite` não mudam.
4. **Evento**: a finalização automática insere `ContractExpired` no outbox (entregue como no encerramento
   manual).
5. **Idempotência**: rodar o sweep 2× seguidas não re-expira nem duplica eventos.

## Testes

```bash
# Unit (use case + cutoff BRT + repo in-memory)
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/application/use-cases/expire-due-contracts.test.ts \
  tests/modules/contracts/domain/shared/plain-date-saopaulo.test.ts

# Gate W3 completo (ao fim da implementação — /speckit-verify)
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test

# Integração real (findExpirable no MySQL)
pnpm run test:integration
```
