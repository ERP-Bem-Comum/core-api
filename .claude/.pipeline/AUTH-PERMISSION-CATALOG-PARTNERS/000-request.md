# AUTH-PERMISSION-CATALOG-PARTNERS — catálogo de permissões incompleto (partners)

> **Origem:** achado durante a investigação do auth de partners (spec 007, US3). Bug de
> **produção**, independente da 007. Os testes de regressão já existem em
> `specs/007-integration-test-suite/safety-net/{bdd,tdd}/regression/catalog-partners-permissions.*`.

## Problema

`src/modules/auth/domain/authorization/permission-catalog.ts` declara-se "FONTE ÚNICA de verdade
das permissions" mas lista **18 das 28** permissões reais. Faltam as **10 do módulo partners**:
`supplier:read|write`, `financier:read|write`, `collaborator:read|write`, `act:read|write`,
`geography:read|write` — definidas em `src/modules/partners/public-api/permissions.ts` e exigidas
pelas rotas de partners via `authorize(...)`.

**Por que passou despercebido:** `authorize()` (DD-USER-02) só checa `user.roles.some(hasPermission)`
— não valida contra o catálogo. E o seed (`applyRbacSeed`) usa `Role.create`, que **não** valida
catálogo. Então o runtime "funciona". Mas:

- `GET /api/v1/permissions` (spec 006) retorna catálogo **incompleto** (18, não 28).
- `POST /api/v1/roles` usa `Role.setPermissions`, que **valida** → permissão de partners dá **422**
  (`role-permission-not-in-catalog`). **Um admin não consegue criar role de partners pela API.**

## Fundamento canônico

Sam Newman, *Building Microservices* (p.194): "DRY more accurately means that we want to avoid
duplicating our system behavior and knowledge. […] it is easy to forget everywhere you need to make
a change, which can lead to bugs." — o conhecimento das permissões está duplicado (partners/public-api
+ catálogo) e divergente.

## Escopo

- Adicionar as 10 permissões de partners ao `permission-catalog.ts` (ordenadas por recurso,
  espelhando `partners/public-api/permissions.ts`).
- Verificar/atualizar testes do catálogo que asseguram contagem/conteúdo (ex.: a suíte do catálogo
  e o teste de `list-permission-catalog`) — de 18 para 28.
- Manter a fonte de verdade: idealmente o catálogo passa a **derivar/incluir** as permissões dos
  módulos (evitar nova divergência) — avaliar no W1.

## Critério de aceitação (testes de regressão já escritos)

CAT-REG-1..5 (em `safety-net/.../regression/`): `GET /permissions` lista as 10 de partners (28 total);
`POST /roles` com permissão de partners → 201. Hoje **reprovam**; após o fix, **passam**. Gate W3 verde.

## Disciplina

W0 RED (os CAT-REG viram testes `fastify.inject` + `.bru` na coleção unificada) → W1 mínimo
(adicionar ao catálogo) → W2 review → W3 gate. Política de regressão zero: o vermelho dos CAT-REG
**obriga** o fix.
