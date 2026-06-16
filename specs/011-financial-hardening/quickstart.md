# Phase 1 — Quickstart: validar a Financial Hardening

Como exercitar e validar os 4 slices. Tudo via `pnpm` (nunca `npm` — ADR-0012).

## Pré-requisitos

```bash
pnpm install --frozen-lockfile
```

## Gate de qualidade (W3 — por ticket e no fim)

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## Suítes por slice

```bash
# #52 — envelope de erro 4xx (fastify.inject)
pnpm test -- --test-name-pattern="error-envelope"

# #54 — bounds do response schema da trilha (inspeção de schema)
pnpm test -- --test-name-pattern="timeline-schema-bounds"

# #56a — rename kind→eventType (domínio + gate byte-idêntico CT-014)
pnpm test -- --test-name-pattern="timeline"

# #55 + #56b — optimistic lock no cancel + CHECK/cascade (integração MySQL)
pnpm run test:integration:financial
```

## Migration (#56b)

```bash
# após editar o check() em adapters/persistence/schemas/mysql.ts (remover 'DocumentCancelled')
pnpm run db:generate          # gera 0002_*.sql (ALTER TABLE … DROP CHECK / ADD CONSTRAINT)
# auditar o SQL emitido antes de versionar; aplicar via pipeline de migration de integração
```

## Verificação manual (smoke via fastify.inject ou Bruno — ADR-0034)

1. **#52**: `PATCH /api/v2/financial/documents/:id` com `version` defasada → **409** e body com `code:"conflict"` (não `document-version-conflict`); `message` em PT-BR.
2. **#55**: `DELETE /api/v2/financial/documents/:id` com `{ "version": <atual> }` → **204**; com versão defasada → **409**, documento permanece; sem `version` → **400**.
3. **#54**: gerar o OpenAPI (`app.swagger()`/rota de docs) e conferir `maxLength` em `changes.field` (60) e `changes.before`/`after` (65535); `eventType` sem `DocumentCancelled`.
4. **#56a**: `GET /api/v2/financial/documents/:id/timeline` retorna JSON **idêntico** ao baseline (campo `eventType` presente).

## Critérios de pronto (Definition of Done por ticket)

- W0 RED registrado antes de tocar `src/` (testes falham por inexistência da API/regra).
- W1 GREEN mínimo.
- W2 review read-only (≤3 rounds) + **citação canônica** das decisões-chave (princípio IX).
- W3 verde + `pnpm run test:integration:financial` para #55/#56b.
- Contagem de testes ≥ baseline; resposta `/timeline` byte-idêntica (CT-014).
