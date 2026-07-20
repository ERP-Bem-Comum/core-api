# AUTH-BYPASS-ME-PERMISSIONS — escopo (bug: `bypass` não chega ao `/me`, front esconde módulos)

> Size **S**. Defeito em produção: `AUTH_RBAC_MODE=bypass` ligado desde 2026-07-17, mas usuários
> seguem sem ver módulos (financeiro em específico) até 2026-07-20.

## Problema

O bypass do [ADR-0052](../../../handbook/architecture/adr/0052-rbac-bypass-flag.md) foi aplicado ao
**enforcement** (`authorize` / `hasPermission`), mas **não** à **lista de permissões** que o front
consome em `GET /me` para montar o menu (`can()`).

| Camada | Com `bypass` |
| :-- | :-- |
| Backend (checagem) | libera tudo — nunca 403 |
| `GET /me` (lista p/ o front) | **devolve as permissões reais do usuário** |

Efeito: o backend deixaria entrar, mas o front pergunta "tem `fiscal-document:read`?", recebe **não**,
e **esconde o módulo**. O usuário nunca chega a fazer a chamada que passaria.

## Causa-raiz

- `application/use-cases/list-user-permissions.ts:17` — recebe só `{ userReader }`; **não conhece o
  `rbacMode`**. Devolve `listPermissions(user)` (permissões reais dos papéis).
- `adapters/http/composition.ts:480` — monta `listUserPermissions({ userReader })` **sem** o
  `rbacMode`, enquanto os 4 use cases de auto-gestão (linhas 492/499/542/549) o recebem.

O ADR-0052 mapeou o "ponto de estrangulamento único" do enforcement e a lista ficou de fora — ela não
bloqueia nada, só informa, então passou despercebida.

## Decisão (P.O., 2026-07-20): opção A

Em `bypass`, o `/me` devolve o **catálogo completo** (`PermissionCatalog.all`) — coerente com "todo
usuário autenticado é super-usuário" (ADR-0052). Conserta todos os módulos de uma vez e desaparece
junto com o bypass quando o RBAC novo entrar.

Descartada a opção B (conceder as permissões reais via papéis): resolve o caso pontual, mas o próximo
módulo esconde de novo.

## Escopo (in)

1. `application/use-cases/list-user-permissions.ts` — aceitar `rbacMode` nas deps; em `bypass`,
   devolver `PermissionCatalog.all`; em `enforced`, comportamento atual.
2. `adapters/http/composition.ts:480` — passar o `rbacMode` (já disponível na função).

## Fora de escopo

- `getUserPermissions` (`GET /users/:id/permissions`, spec 006 US1): é **consulta administrativa**
  sobre as permissões **atribuídas** a um usuário, não o que o solicitante pode fazer. Deve continuar
  mostrando a verdade dos papéis mesmo em bypass — senão a tela de gestão de acessos mente.
- Qualquer mudança no enforcement (o ADR-0052 segue intacto).

## Critérios de aceite

- **CA1** — Com `rbacMode = 'bypass'`, `/me` de um usuário ativo **sem papéis** devolve o catálogo
  completo (44 permissões), não `[]`.
- **CA2** — Com `rbacMode = 'enforced'`, devolve exatamente as permissões dos papéis (inalterado).
- **CA3** — Degradação graciosa preservada em **ambos** os modos: id inválido / usuário inexistente /
  inativo → `[]` (nunca o catálogo — não-autenticado/inativo não é super-usuário).
- **CA4** — `getUserPermissions` (consulta administrativa) **não** muda em bypass.
- **CA5** — Gate W3 verde, sem regressão.

## Pipeline

| Wave | Atividade |
| :-- | :-- |
| W0 | RED — CA1..CA4 no use case |
| W1 | use case + composition |
| W3 | gate |
