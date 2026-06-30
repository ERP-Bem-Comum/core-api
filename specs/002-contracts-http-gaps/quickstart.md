# Quickstart — `002-contracts-http-gaps`

> Como exercitar as capacidades desta feature depois de implementadas. Pré-requisito: MySQL local
> (`pnpm run test:integration` sobe via Docker) e a borda HTTP `/api/v2` ativa.

## 1. Subir e migrar

```bash
pnpm install
pnpm run db:generate         # gera a migration com as 5 colunas novas de ctr_contracts
pnpm run secrets:setup
# subir o server HTTP (ver script real do módulo) na porta configurada
```

## 2. Criar contrato com contratado (US-001)

```bash
curl -sS -X POST http://localhost:<port>/api/v2/contracts \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{ "title": "...", "objective": "...", "originalValue": {"cents": 120000},
        "period": {"start":"2026-01-01","end":"2026-12-31"},
        "contractor": { "type": "supplier", "id": "<uuid-do-parceiro>" } }'
# 201 → criado.  Sem "contractor" → 400.
```

## 3. Ler o detalhe composto (US-001)

```bash
curl -sS http://localhost:<port>/api/v2/contracts/<id> -H 'Authorization: Bearer <token>' -i
# 200 com bloco contractor.snapshot; headers Deprecation + Sunset.
# supplier → snapshot com bankAccount/pixKey; demais tipos → sem.
# contratado inexistente em Parceiros → contractor.snapshot: null (nunca 500).
```

## 4. Editar metadados (US-002)

```bash
curl -sS -X PATCH http://localhost:<port>/api/v2/contracts/<id> \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{ "observations": "revisado", "telephone": "+55 11 99999-0000" }'
# 200 → atualizado.
# { "originalValue": ... } → 400 (campo imutável).   {} → 400 (corpo vazio).
```

## 5. DELETE recusado (US-002)

```bash
curl -sS -X DELETE http://localhost:<port>/api/v2/contracts/<id> -H 'Authorization: Bearer <token>' -i
# 405 → code "contract-delete-forbidden" (imutabilidade).
```

## 6. Testes (W0→W3 por ticket)

```bash
pnpm test                                   # unit/domínio/in-memory (node:test)
pnpm run test:integration                   # constraints MySQL (migration + CHECK)
pnpm run typecheck && pnpm run format:check && pnpm run lint   # gate W3
```

Suítes-chave: `contractor-ref.test.ts`, `contract-metadata.test.ts`,
`create-contract-contractor.http.test.ts`, `contractor-actview.test.ts` (partners),
`contract-detail-composition.http.test.ts`, `patch-contract-metadata.http.test.ts`.
