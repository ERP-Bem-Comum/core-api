# Quickstart — Validar a feature 027 (paymentDetail)

## Pré-requisitos

```bash
pnpm install
```

## W0 (RED) — testes que falham antes da implementação

```bash
pnpm test                       # unit (domínio + borda) — devem falhar por campo inexistente
pnpm run test:integration       # round-trip Drizzle-MySQL (Docker) — coluna inexistente
```

Suites RED esperadas:
- `tests/modules/financial/domain/...` — `Document.create` com/sem `paymentDetail`.
- `tests/modules/financial/adapters/http/...` — `fastify.inject` no create/patch/detail + rejeições 400 + ausência na listagem.
- `tests/modules/financial/adapters/persistence/...` — insert→select preserva; linha legada lê `null`.

## W1 → W3

```bash
# após editar schemas/mysql.ts:
pnpm run db:generate            # gera migrations/mysql/0026_*.sql — auditar: ALTER ADD payment_detail varchar(255)

# gate W3:
pnpm run typecheck
pnpm run format:check
pnpm run lint
pnpm test
pnpm run test:integration
```

## Smoke manual (HTTP)

```bash
node src/server.ts &            # sobe a borda (env CONTRACTS_DATABASE_URL etc.)

# create com complemento
curl -sX POST localhost:3100/api/v1/financial/documents \
  -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" \
  -d '{ "...campos obrigatórios...", "paymentMethod": "Boleto", "paymentDetail": "23793.38003 12345.678901 ..." }'

# detalhe deve retornar paymentDetail idêntico
curl -s localhost:3100/api/v1/financial/documents/$ID -H "authorization: Bearer $TOKEN" | jq .paymentDetail

# rejeição (control char) → 400
curl -sX POST .../documents -d '{ ..., "paymentDetail": "linha\ncom\nquebra" }'

# patch apaga
curl -sX PATCH .../documents/$ID -d '{ "paymentDetail": null }'

# listagem NÃO traz o campo
curl -s localhost:3100/api/v1/financial/documents -H "authorization: Bearer $TOKEN" | jq '.items[0] | has("paymentDetail")'   # false
```

(E2E equivalente via coleção Bruno — ADR-0034.)
