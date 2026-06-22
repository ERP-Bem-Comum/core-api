# Contrato — Autorização da listagem de contratos (022 / #202)

> A rota **já existe**. Este contrato documenta apenas o comportamento de **autorização** que a 022 corrige. Sem rota nova; request/response (filtros, paginação, campos) inalterados.

## Permissão exigida

`contract:read` (`CONTRACT_PERMISSION.read`). Já presente no catálogo central — apenas passa a ser exigida na listagem, em paridade com as demais leituras.

## Endpoint

| Método | Rota                | preHandler (depois)                         |
| ------ | ------------------- | ------------------------------------------- |
| GET    | `/api/v2/contracts` | `[requireAuth, authorize('contract:read')]` |

## Matriz de autorização (contrato testável)

| Ator                                 | Token            | `contract:read`? | Resultado                                    |
| ------------------------------------ | ---------------- | ---------------- | -------------------------------------------- |
| Não autenticado                      | ausente/inválido | —                | **401** `unauthorized`                       |
| Autenticado, **com** `contract:read` | válido           | sim              | **200** + listagem (formato inalterado)      |
| Autenticado, **sem** `contract:read` | válido           | não              | **403** `forbidden` (antes: 200 — vazamento) |

Envelope de erro padrão (`shared/http/errors.ts`); sem vazar código interno no 4xx.

## Consistência (SC-005)

A listagem passa a exigir a **mesma** permissão que `/contracts/:id`, `/contracts/:id/history` e `/contracts/export.csv`.

## Observação de teste (anti-regressão)

Verificar contra o `authorize` **real** (`buildAuthHttpDeps` + seed RBAC), cobrindo o caso **negado** (sem `contract:read` → 403). A cobertura atual da listagem só exercita o caminho com permissão e por isso não pegou a ausência do guard (FR-006/SC-004).
