# Quickstart — Geração de remessa CNAB 240 (financial)

## Pré-requisitos

- Documentos em estado `Approved` com forma `TED`/`TransferenciaBancaria` (Fatia 1, já na `dev`).
- ≥1 conta-cedente Bradesco configurada (`fin_cedente_accounts`).

## Fluxo de uso (HTTP)

```bash
# 1. Gerar remessa(s) de uma seleção (agrupa por conta-cedente → 1 lote por conta)
curl -X POST http://localhost:3000/api/v2/financial/remittances \
  -H "authorization: Bearer <token com payable:transmit>" \
  -H "content-type: application/json" \
  -d '{ "documentIds": ["<uuid1>", "<uuid2>"] }'
# 201 → { remittances: [{ id, debitAccountRef, nsa, hash, storageRef, documentIds }] }

# 2. Metadados de um lote
curl http://localhost:3000/api/v2/financial/remittances/<id> -H "authorization: Bearer <payable:read>"

# 3. Baixar o arquivo CNAB
curl -OJ http://localhost:3000/api/v2/financial/remittances/<id>/download -H "authorization: Bearer <payable:read>"
```

## Testes (W0 → W3 por ticket)

```bash
# Unit/borda em memória (sem MySQL)
node --test --experimental-strip-types --no-warnings tests/modules/financial/domain/remittance/*.test.ts
node --test --experimental-strip-types --no-warnings tests/modules/financial/adapters/cnab/*.test.ts
node --test --experimental-strip-types --no-warnings tests/modules/financial/application/use-cases/generate-remittance.test.ts
node --test --experimental-strip-types --no-warnings tests/modules/financial/adapters/http/financial-remittances.http.test.ts

# Integração real (MySQL via Docker) — repos Drizzle + migration 0004
pnpm run test:integration

# Gate W3
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## Verificação manual de integridade (R2)

O `hash` retornado deve coincidir com `sha256` do arquivo baixado:

```bash
shasum -a 256 CB<nsa>.REM   # deve bater com o campo hash do lote
```

## Ordem de implementação (tickets)

1. `FIN-REMITTANCE-DOMAIN` → 2. `FIN-CNAB-ACL` → 3. `FIN-REMITTANCE-PERSIST` (migration 0004) → 4. `FIN-REMITTANCE-USECASE-HTTP`. Cada um W0→W3 verde antes do próximo (uma migration por vez).
