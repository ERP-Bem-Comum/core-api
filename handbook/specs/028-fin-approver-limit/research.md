# Research — feature 028 (alçada do aprovador)

Phase 0. Resolve as incertezas técnicas e ancora as decisões-chave no cânone (Princípio IX).

## D1 — Onde mora a alçada: papel no `auth` (RBAC), delta mínimo

- **Decisão:** a alçada é atributo do agregado `Role` (`auth/domain/authorization/role.ts`), persistida como `auth_role.approval_limit_cents BIGINT NULL`. O agregado já existe com `{ id, name, permissions, status }`; adiciona-se **um** campo `approvalLimit: Money | null`.
- **Rationale:** alçada de aprovação é, no negócio, função do **cargo/papel** ("Gerente aprova até X"). Reusa o RBAC existente sem reformá-lo — atende FR-007/FR-007a (autocontido). `Money` é shared kernel (`src/shared/kernel/money.ts`), usável por ambos os módulos sem violar isolamento.
- **Alternativas rejeitadas:** (a) alçada por **usuário** — mais granular, mas dispersa a política e não é o pedido; (b) **entidade/tabela nova** de alçada ou acoplar a `mass-approver-role` (#45)/spec 005 — abriria a "recursão de tickets" proibida.

## D2 — Fronteira de contexto: dado no `auth`, regra no `financial`, leitura via `public-api` (ACL / estado mínimo)

- **Decisão:** o `financial` **não** conhece o RBAC. Ele lê uma **projeção mínima de autoridade** do aprovador — `{ canApprove: boolean, limitCents: number | null }` — por `auth/public-api/read.ts` (estende o precedente `AuthUserReadPort`, #207). A **regra** `alçada ≥ líquido` e a **cascata** ficam no domínio do `financial`. Zero acesso a `auth_*` cru (ADR-0006/0014).
- **Rationale (citação canônica — Princípio IX):**

  > The synchronized state is the limited, minimal attributes of the remote models that are needed by the local model. It's not only to limit our need to synchronize data, it's also a matter of modeling concepts properly.
  >
  > It pays to limit our use of remote state, even when considering the design of the local modeling elements themselves. We don't want, for example, a ProductOwner and a TeamMember to in reality reflect a UserOwner and a UserMember because they take on so many characteristics of the remote User object that a hybridization happens unwittingly.
  >
  > — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 158 ("Think Minimalistic"), linha 2494 — extraído via `acdg-skills` (grounding 5/5).

  O `financial` consome **só** `{ canApprove, limitCents }` — não o `User`/`Role` inteiro — evitando a "hibridização" que Vernon adverte. A `public-api` do `auth` é a Published Language (Evans, _Open Host Service → Published Language_) pela qual a autoridade é exposta.

- **Alternativas rejeitadas:** duplicar a alçada no `financial` (fere fonte única) ou ler `auth_*` direto (fere ADR-0006).

## D3 — Alçada efetiva de um usuário com múltiplos papéis

- **Decisão:** `limitCents` efetivo = **MAX** dos `approval_limit_cents` entre os papéis do usuário que concedem `payable:approve`. `canApprove` = existe ≥1 papel com `payable:approve`. Se `canApprove` mas todos os limites são NULL → `limitCents = null` → trata como **sem alçada** (bloqueia, FR-008).
- **Rationale:** um usuário acumula o maior teto entre seus papéis aprovadores (comportamento menos surpreendente). A query vive no `user-read.drizzle.ts` (JOIN `auth_user_role`→`auth_role`→`auth_role_permission`), indexada.
- **Alternativas rejeitadas:** MIN (excessivamente restritivo) ou somar limites (sem sentido de negócio).

## D4 — Aprovador sem alçada → fail-closed (FR-008)

- **Decisão:** `limitCents === null` (papel sem alçada) ⇒ não aprova nenhum valor positivo. Erro `approver-limit-exceeded` (ou `approver-missing-permission` quando `canApprove === false`).
- **Rationale:** controle financeiro é fail-closed por padrão; ausência de teto não é "ilimitado". Clarify 2026-06-30.

## D5 — Cascata derivada da lista de aprovadores ordenada por alçada (FR-009)

- **Decisão:** quando o aprovador indicado é insuficiente, escolhe-se entre `listApproversWithAuthority()` (aprovadores com `payable:approve` + seus `limitCents`) o **de menor limite que ainda seja ≥ líquido**. Nenhum suficiente ⇒ `no-approver-with-sufficient-limit`. Função **pura** no domínio do `financial` (`approval-policy.ts`).
- **Rationale:** a "hierarquia" é emergente da ordenação por alçada — **não** uma estrutura nova (FR-007a). Escolher o menor teto suficiente respeita o princípio do menor privilégio de aprovação.
- **Em aberto p/ ticket da cascata:** se o encaminhamento **persiste** o novo `approverRef` no documento (provável) e se emite evento. Default: persiste o approverRef escolhido; sem evento de outbox nesta fatia.

## D6 — Momento da validação (FR-011)

- **Decisão:** valida na **criação** (`save-document.ts`) e na **submissão** Draft→Open (`save-draft.ts`/submit, #91), sempre que há `approverRef` + `netValue` conhecido. Draft sem líquido (`netValue === null`, `query.ts:34`) não valida.
- **Rationale:** cobre os dois caminhos sem brecha; respeita o estado Draft sem líquido.

## D7 — Comparação monetária

- **Decisão:** comparação `>=` em centavos inteiros via VO `Money` (shared kernel), mesma moeda (BRL). Sem float.
- **Rationale:** Princípio V/VI; evita erro de arredondamento.
