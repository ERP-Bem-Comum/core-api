# W0 — RED — PARTNERS-HTTP-V1-BOOTSTRAP

> Skill: `tdd-strategist` (testes consomem a API pública-alvo da borda HTTP).

## Objetivo da wave

Descrever, por testes que **falham por inexistência**, o contrato esperado da fatia P0: bootstrap do
`/api/v1` (união retrocompatível em `buildApp`, ADR-0033), composition root de partners (RW split,
ADR-0026), catálogo de permissions e a 1ª rota `GET /api/v1/collaborators` protegida por RBAC.

## Arquivos criados

- `tests/modules/partners/adapters/http/collaborators-bootstrap.routes.test.ts`

## Testes (intenção)

**`GET /api/v1/collaborators`:**
1. sem `Authorization` → **401**.
2. `Bearer` inválido → **401**.
3. autenticado sem `collaborator:read` → **403** (usuário registrado pelo fluxo, sem seed).
4. com `collaborator:read` (seed RBAC) → **200** e corpo `{ items, meta }` (vazio em memory é válido).
5. resposta de `/api/v1` traz `cache-control: no-store` (hardening cobre v1 — ADR-0033).
6. `/docs/json` contém o path `/api/v1/collaborators` (OpenAPI 3.1.1).

**Retrocompat (`buildApp`):**
7. `register` + `login` em `/api/v2/auth` via **plugin direto** seguem funcionando (forma legada → default v2).

**Composition root (`buildPartnersHttpDeps`):**
8. driver `memory` resolve e expõe `listCollaborators` + `shutdown`.
9. driver `mysql` sem `writerUrl` → rejeita.
10. driver `mysql` com `writerUrl` inválido → rejeita no `openMysql` (valida wiring sem conectar).

**Permissions:**
11. `COLLABORATOR_PERMISSION` expõe `read`/`write` (`collaborator:read` / `collaborator:write`).

## Saída literal do gate (`pnpm test`)

Arquivo isolado (razão do RED):

```
code: 'ERR_MODULE_NOT_FOUND',
url: '.../src/modules/partners/public-api/http.ts'
```

Suite completa:

```
ℹ tests 1995
ℹ suites 642
ℹ pass 1977
ℹ fail 1
ℹ skipped 17
ℹ duration_ms 27864
✖ failing tests:
test at tests/modules/partners/adapters/http/collaborators-bootstrap.routes.test.ts:1:1
```

→ **RED correto:** o único vermelho é o teste novo, falhando porque `partners/public-api/http.ts`,
`partners/public-api/permissions.ts` e o shape `{plugin, prefix}` de `buildApp` ainda não existem.
**Zero regressão** nos 1977 testes existentes; os 17 skipped são pré-existentes (gates de integração opt-in).

## Próximo passo

W1 (GREEN) — skill `ports-and-adapters`: implementar, na ordem,
`partners/public-api/permissions.ts` → `partners/adapters/http/{schemas,collaborator-dto,composition,plugin}.ts`
→ `partners/public-api/http.ts` → união `{plugin, prefix}` em `src/shared/http/app.ts` (+ `onSend` cobrindo
`/api/v1`) → registro em `src/server.ts`. Mínimo para os 11 testes ficarem verdes (YAGNI).
