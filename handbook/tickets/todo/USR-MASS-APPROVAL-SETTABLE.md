# Request — USR-MASS-APPROVAL-SETTABLE

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: Gestão de Usuários → **inclusão de usuário** → checkbox **"Aprovador em Massa"** (hoje gated).
> Verificado contra `core-api@dev` em 2026-06-11.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:** `massApprovalPermission` é **derivado / read-only**, computado das roles do usuário (presença da permission `contract:mass-approve` em alguma role) — `src/modules/auth/application/use-cases/get-user.ts:42-47` (constante em `:13`). Exposto no detalhe via `userDetailResponseSchema` (`src/modules/auth/adapters/http/users-schemas.ts:71`). **Confirmado que NÃO é aceito como input:** `createUserBodySchema` (`users-schemas.ts:78-83` → só `name`/`cpf`/`email`/`telephone`) nem `updateUserBodySchema` (`:95-101` → `name`/`email`/`cpf`/`telephone`/`collaboratorId`). Idem nos use-cases: `CreateUserByAdminCommand` (`src/modules/auth/application/use-cases/create-user-by-admin.ts:47-55`) e `UpdateUserProfileCommand` (`src/modules/auth/application/use-cases/update-user-profile.ts:31-38`) não têm o campo.
> - **Escopo real restante (se aprovado):** adicionar `massApprovalPermission: boolean` (opcional no `PUT`) em `createUserBodySchema`/`updateUserBodySchema`; propagar pelos commands dos dois use-cases; e — o ponto não-trivial — **decidir e implementar a fonte da verdade**: hoje não há coluna persistida (`specs/005-gestao-usuarios/data-model.md:31` → "não persistido aqui"), então tornar setável exige OU criar persistência própria do flag (override) OU conceder/revogar a role `contract:mass-approve` a partir da criação/edição (o que invade o escopo do módulo de acessos). Definir também a semântica de leitura no `GET` (override vs. efetivo = manual OU role).
> - **⚠️ Conflito de modelagem:** tornar o campo setável **contraria uma decisão de design já tomada e registrada**, não uma mera limitação de implementação. (1) Handoff do front: `USR-USUARIOS-RESUMO.md:52-53` define o "Aprovador em Massa" como **read-only derivado dos papéis, não setável na criação nem na edição**. (2) Spec 005 fecha o mesmo via clarificação — `specs/005-gestao-usuarios/spec.md:17` ("**Permissão RBAC** — a concessão vive na `006-gestao-acessos`; a 005 apenas **exibe** o estado (read-only), não concede") — e via requisitos: `FR-005` (`spec.md:150`, "a criação **não** define a permissão") e `FR-015` (`spec.md:160`, "a concessão/revogação NÃO pertence a esta feature — é modelada como permissão RBAC na `006`"). Ou seja, a "lever" correta de aprovação em massa é **atribuir ao usuário uma role com `contract:mass-approve`** (módulo de acessos / spec 006), não um campo no cadastro. **Exige decisão de P.O./tech lead ANTES de qualquer implementação** — pode ser caso de fechar como "won't do / por decisão de design" (a alternativa seria o front expor seleção de papel no cadastro, fora do escopo deste ticket).
> - **Veredito:** NÃO FEITO (bloqueado por decisão de design)
> ---

## Título
Permitir **definir manualmente** `massApprovalPermission` no cadastro/edição de usuário (`POST`/`PUT /users`)

## Size
M

## Contexto
No form de **inclusão de usuário**, o checkbox **"Aprovador em Massa"** aparece (paridade com o legado) mas
está **desabilitado**. A área quer que **quem cadastra** o usuário possa **classificar manualmente** se ele
será aprovador em massa ou não — direto no formulário, no momento da criação (e idealmente também na edição).

## Estado atual (verificado)
- `POST /api/v1/users` (`createUserBodySchema`) aceita **apenas** `name`, `cpf`, `email`, `telephone`.
  Não aceita `massApprovalPermission`.
- `PUT /api/v1/users/:id` (`updateUserBodySchema`) aceita só `name`/`email`/`cpf`/`telephone` (parcial).
  Também não aceita `massApprovalPermission`.
- `massApprovalPermission` é **derivado (read-only)** no `GET`: em
  `application/use-cases/get-user.ts` (FR-015) → *"tem a permission `contract:mass-approve` em alguma role?"*.
  Ou seja, hoje a aprovação em massa **só** muda atribuindo ao usuário uma **role/perfil de acesso** que
  contenha `contract:mass-approve`.
- O form de criação do front **não** tem seleção de perfil/role — logo, **não há lever** de aprovação em
  massa na criação hoje.

## Pedido ao backend
1. **Aceitar `massApprovalPermission: boolean`** no `POST /api/v1/users` (criação) e, idealmente, no
   `PUT /api/v1/users/:id` (edição) — persistindo a escolha do operador.
2. **Definir a semântica** em relação à derivação por role (decisão do backend; o front se adapta):
   - **Opção A (override):** o valor manual sobrepõe/define `massApprovalPermission` independente das roles;
   - **Opção B (efetivo = manual OU role):** mantém a derivação por `contract:mass-approve` **e** soma um
     flag manual; o `GET` devolve o efetivo.
   - Avisar qual foi adotada para o front exibir corretamente (e, na edição, mostrar a origem).
3. O `GET /me`/`GET /users/:id` continuam devolvendo `massApprovalPermission` (já devolvem) refletindo a regra.

### Critérios de aceite
1. Criar um usuário marcando "Aprovador em Massa" → `GET /users/:id` retorna `massApprovalPermission: true`.
2. Criar sem marcar → retorna `false` (respeitando a semântica escolhida).
3. (Se edição) alternar o flag no `PUT` reflete no `GET`.

## Impacto no front (hoje)
- Checkbox **"Aprovador em Massa"** segue **gated** (desabilitado, com dica) no form de inclusão.
- Ao liberar: o front **habilita** o checkbox e passa a **enviar** `massApprovalPermission` no `POST`
  (e no `PUT`, se aplicável) — mudança mínima (ligar o campo no controller/mapper). A exibição read-only no
  detalhe permanece, refletindo o valor efetivo.
