# 003 — W1 Implementação — PRG-PROGRAMS-MODULE

> Wave W1 macro abrangeu **7 sub-fatias** (domínio → persistência → use cases → logo → **borda HTTP**).
> Fatias 1–3b e 5 já commitadas (ver tabela no `000-request.md`). Este REPORT documenta a **fatia 4
> (borda HTTP `/api/v1/programs`)**, último passo do MVP end-to-end, e o estado GREEN final.

## Fatia 4 — Borda HTTP (`/api/v1/programs`)

Arquivos criados:

| Arquivo | Conteúdo |
| --- | --- |
| `src/modules/programs/public-api/permissions.ts` | `PROGRAM_PERMISSION = { read, write, deactivate }` |
| `src/modules/programs/adapters/http/schemas.ts` | Zod request/response + paginação (limit ∈ {5,10,25}) |
| `src/modules/programs/adapters/http/program-dto.ts` | `programToItemDto` / `programToDetailDto` |
| `src/modules/programs/adapters/http/composition.ts` | `buildProgramsHttpDeps({ driver: memory\|mysql, writerUrl?, logo? })` |
| `src/modules/programs/adapters/http/plugin.ts` | `programsHttpPlugin` + 7 rotas |
| `src/modules/programs/public-api/http.ts` | Barrel público da borda HTTP |

Alterações:

- `src/modules/auth/domain/authorization/permission-catalog.ts` — `program:deactivate/read/write` (ordem alfabética) + atualização do teste de regressão de integridade (`permission-catalog.test.ts`, lista fixa).
- `src/server.ts` — registro do `programsHttpPlugin` sob `/api/v1` (ADR-0033) + `readProgramsLogoConfig(env)` (S3/MinIO opcional) + shutdown.
- `tsconfig.json` — incluído `drizzle.config.programs.ts` no `include` (regressão pré-existente da fatia 2b: o config ficou fora, quebrando o `projectService` do eslint).

## Rotas

| Método | Rota | Permissão | Sucesso |
| --- | --- | --- | --- |
| GET | `/programs` | `program:read` | 200 paginado |
| POST | `/programs` | `program:write` | 201 + `Location` + corpo |
| GET | `/programs/:id` | `program:read` | 200 detalhe |
| PUT | `/programs/:id` | `program:write` | 200 + corpo (optimistic-lock via `version`) |
| POST | `/programs/:id/deactivate` | `program:deactivate` | 200 + corpo (guarda de estado) |
| POST | `/programs/:id/reactivate` | `program:deactivate` | 200 + corpo (guarda de estado) |
| POST | `/programs/:id/logo` | `program:write` | 200 `{ logoKey }` |

## Decisões técnicas

- **Logo sem `@fastify/multipart`**: o projeto não usa multipart. Upload binário via `addContentTypeParser('image/png'|'image/jpeg'|'image/webp', { parseAs: 'buffer', bodyLimit: 5 MiB })` — espelha o padrão octet-stream de `contracts`. Tipo não suportado → **415** (ausência de parser); payload > 5 MiB → **413** (bodyLimit). Sem dependência nova (preserva ADR-0011).
- **Escritas retornam o recurso no corpo** (decisão herdada, lição de Parceiros): POST 201, demais 200 — nunca corpo vazio.
- **Body `name`/`sigla` frouxo no Zod** (`z.string()`): a invariante é do domínio (`program-name-required`/`program-sigla-invalid` → 422); shape inválido (Zod) → 400.

## Gate (W3)

- `pnpm run typecheck` ✅
- `pnpm run format:check` ✅
- `pnpm run lint` ✅
- `pnpm test` → **2631 pass / 0 fail / 19 skip** (28 novos testes de rota)
- `pnpm run test:integration:programs` → **8 pass**
