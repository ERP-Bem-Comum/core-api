# TDD — Regressão de fix: catálogo de permissões completo (partners)

> **Dimensão:** Consistência da informação (fonte única de verdade).
> **Tipo:** REGRESSÃO DE FIX — asserções do estado CORRETO. **DEVEM REPROVAR** enquanto o bug
> existir; pela política de regressão zero, força a correção do catálogo (ticket
> `AUTH-PERMISSION-CATALOG-PARTNERS`).
>
> **Bug:** `permission-catalog.ts` lista 18 das 28 permissões — faltam as 10 de partners
> (`supplier:*`, `financier:*`, `collaborator:*`, `act:*`, `geography:*`). `authorize()` não
> valida contra o catálogo (por isso o runtime "funciona"), mas `POST /api/v1/roles` valida via
> `Role.setPermissions` → 422; e `GET /api/v1/permissions` devolve catálogo incompleto.
>
> **Fundamento canônico — Sam Newman, _Building Microservices_ (p.194):** "DRY more accurately
> means that we want to avoid duplicating our system behavior and knowledge. […] When you want to
> change behavior, and that behavior is duplicated in many parts of your system, it is easy to
> forget everywhere you need to make a change, which can lead to bugs."

## Pré-condições (seed)

- `adminToken` com `role:read` **e** `role:create` (perfil admin do SEED-CONTRACT).
- Permissões de referência (definidas em `partners/public-api/permissions.ts`):
  `supplier:read|write`, `financier:read|write`, `collaborator:read|write`, `act:read|write`, `geography:read|write` (10).

## CAT-REG-1 — GET /permissions inclui supplier

- **GET** `/api/v1/permissions` (Bearer adminToken)
- Asserções: `status === 200`; `body.items` é array; existe item com `id === 'supplier:read'`; existe item com `id === 'supplier:write'`.
- **Estado atual: REPROVA** (catálogo não inclui supplier:\*).

## CAT-REG-2 — GET /permissions inclui financier/collaborator/act/geography

- **GET** `/api/v1/permissions` (Bearer adminToken)
- Asserções: `status === 200`; `body.items` contém os ids: `financier:read`, `financier:write`, `collaborator:read`, `collaborator:write`, `act:read`, `act:write`, `geography:read`, `geography:write` (8).
- **Estado atual: REPROVA**.

## CAT-REG-3 — catálogo cobre todas as permissões de produção (consistência ↔ rotas)

- **GET** `/api/v1/permissions` (Bearer adminToken)
- Asserções: `status === 200`; o conjunto de `body.items[].id` é **superconjunto** das permissões usadas pelas rotas dos 3 módulos. Mínimo verificável: contém as 18 já existentes **+** as 10 de partners = **28**. `body.items.length >= 28`; sem duplicatas (Set === length).
- **Estado atual: REPROVA** (length 18).

## CAT-REG-4 — POST /roles com permissão de partners → 201

- **POST** `/api/v1/roles` (Bearer adminToken) body `{ "name": "Regressao Partners <rnd>", "permissions": ["supplier:read"] }`
- Asserções: `status === 201`; `body.id` é string não-vazia.
- **Estado atual: REPROVA** — retorna `422` com `role-permission-not-in-catalog` (porque `Role.setPermissions` valida contra o catálogo incompleto).

## CAT-REG-5 — POST /roles com múltiplas permissões de partners → 201

- **POST** `/api/v1/roles` (Bearer adminToken) body `{ "name": "Regressao Multi <rnd>", "permissions": ["supplier:read", "geography:write"] }`
- Asserções: `status === 201`; `body.id` string.
- **Estado atual: REPROVA** — `422`.

## Critério de correção (o que o fix `AUTH-PERMISSION-CATALOG-PARTNERS` deve fazer)

Adicionar as 10 permissões de partners ao `permission-catalog.ts` (ordenadas por recurso, espelhando `partners/public-api/permissions.ts`), de modo que: (1) `GET /permissions` passe a listar 28; (2) `POST /roles` aceite permissões de partners (201). Atualizar a contract suite/teste do catálogo se houver asserção de contagem fixa (18 → 28). Após o fix, **todos os 5 casos acima passam** — é a prova da regressão fechada.
