# CONTRACTS-HTTP-READS (C1) — GET /{id} e GET /{id}/history

## Origem

[`EPIC-CONTRACTS-HTTP`](../../.planning/EPIC-CONTRACTS-HTTP.md) §10 C1.
Segunda fatia da borda HTTP de contratos: expõe as rotas de consulta detalhada protegidas por autenticação (`requireAuth`) e autorização RBAC fina baseada em permissão (`authorize('contract:read')`).

## O que este ticket entrega

1. Atualização do plugin Fastify de contratos (`src/modules/contracts/adapters/http/plugin.ts` e `schemas.ts`):
   - Rota `GET /contracts/:id` — retorna o detalhe de um contrato. Protegida com `requireAuth` + `authorize('contract:read')`.
   - Rota `GET /contracts/:id/history` — retorna a timeline (histórico de eventos) de um contrato. Protegida com `requireAuth` + `authorize('contract:read')`.
2. Extensão do composition root (`src/modules/contracts/adapters/http/composition.ts`):
   - Instanciação de `getContract` e `getContractTimeline` nas dependências HTTP (`ContractsHttpDeps`).
   - Injeção do `timelineRepo` (InMemory temporariamente, dado que não há persistência Drizzle para timeline implementada no momento).
3. Adaptação do wiring do auth para injetar o hook `authorize` (`src/server.ts` e `src/modules/auth/public-api/http.ts`):
   - `buildAuthHttpDeps` deve expor o hook `authorize` pré-configurado com o `userReader` do módulo auth, ou as dependências de auth devem expor uma forma limpa para o `server.ts` instanciar o hook `authorize` do `makeAuthorize`.
   - Plugin de contratos deve passar a receber o hook `authorize` em `ContractsHttpHooks`.

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA1 (GET /contracts/:id — Authn/Authz):**
  - Sem token (`Authorization` ausente ou inválido) → **401 Unauthorized**.
  - Com token válido mas sem permissão `'contract:read'` → **403 Forbidden**.
  - Com token válido e permissão → **200 OK** com os detalhes do contrato, ou **404 Not Found** se o ID não existir.
- **CA2 (GET /contracts/:id/history — Authn/Authz):**
  - Sem token → **401 Unauthorized**.
  - Sem permissão `'contract:read'` → **403 Forbidden**.
  - Com permissão → **200 OK** com a lista da timeline ordenada cronologicamente, ou **404 Not Found** se o contrato não existir.
- **CA3 (RW Split):** Ambas as rotas de leitura consomem o repositório reader (`contractReaderRepo`).
- **CA4 (Zod validation & OpenAPI):**
  - Parâmetro `:id` validado como UUID (formato esperado pelo domínio).
  - OpenAPI docs `/docs/json` contém ambas as rotas (`/api/v2/contracts/{id}` e `/api/v2/contracts/{id}/history`).
- **CA5 (Regressão):** As rotas de auth e a listagem geral (`GET /api/v2/contracts`) continuam protegidas e funcionais.

## Fora de escopo

- Mutações (POST/PUT/DELETE) → C2, C3.
- Exportação para CSV → C4.
- Testes E2E no docker de fumaça → C5.
