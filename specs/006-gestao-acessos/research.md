# Research — Gestão de Acessos (Fase 0)

---

## D1. Fronteira de Bounded Context — estender `auth` (compartilhada com a 005)

**Decisão**: Estender o módulo `auth` (domínio `authorization` + `application`). Sem novo módulo.

**Rationale**: O RBAC (`Permission`/`Role`/`User`/`authorize`) já é propriedade do BC `auth` (ADR-0024).
Gestão de papéis/permissões é a faceta administrativa **do mesmo modelo** — separá-la repetiria o
anti-padrão de reuso/bleeding entre contextos que Evans alerta (citação literal em
`../005-gestao-usuarios/research.md` D1, _Domain-Driven Design_, p. 211: _"Code reuse between BOUNDED
CONTEXTS is a hazard to be avoided."_). Mesma fronteira, um único dono do agregado.

---

## D2. Catálogo de permissões — fixo em código (deploy-time)

**Decisão**: O catálogo de `Permission` (`resource:action`) é **definido em código** (`permission-catalog.ts`),
imutável em runtime. Não há CRUD de permissão; a administração cobre apenas papéis. **Reconciliação com o
schema existente**: a tabela `auth_permission` (`mysql.ts:50`) já existe e é o **espelho persistido** do
catálogo — necessária porque `auth_role_permission` referencia `permission_id` por FK. O código é a
**fonte de verdade**; a tabela é **seedada/upserted** a partir dele (o schema já comenta "permissões são
imutáveis após criação" e "mapper resolve name→id"). `list-permissions` lê esse conjunto.

**Rationale** (clarify): uma permissão só tem efeito se houver código que a verifique (`authorize`);
permitir criar permissões em runtime geraria "permissões fantasma" inertes. O `auth` já usa
`Permission.parse('resource:action')` — o catálogo materializa o conjunto válido para validar papéis.

**Alternativa**: permissões gerenciáveis em runtime — rejeitada (risco de fantasmas, complexidade sem ganho).

---

## D3. Ciclo de vida do papel — desativar, nunca excluir; bloquear se em uso

**Decisão**: `Role` ganha um campo de ciclo de vida. **Hoje `auth_role` (`mysql.ts:75`) NÃO tem status** —
só `id, name, description, created_at, updated_at`. A migration adiciona **`status varchar(16)` + CHECK
`IN ('active','archived')`**, espelhando o padrão de `auth_user` (`status` 'active'|'disabled' + CHECK,
`mysql.ts:108`) — **não** um boolean (consistência ADR-0020, sem ENUM nativo). "Remover" = **arquivar**
(não-atribuível). Arquivar papel **ainda atribuído** é **bloqueado** até revogá-lo dos usuários. Sem
exclusão física.

**Rationale** (clarify): preserva auditoria e evita permissões órfãs ou revogação de acesso em massa
silenciosa. Espelha a política de "desativação como remoção" adotada para usuários na 005 (coesão), e o
padrão de status varchar+CHECK já estabelecido no `auth_user`.

**Alternativas**: exclusão com cascata (perde histórico, revoga em massa); exclusão só-se-não-atribuído
(sem conceito de arquivado) — ambas rejeitadas.

---

## D4. "Aprovador em massa" — permissão `contract:mass-approve`

**Decisão**: É uma `Permission` específica do catálogo (`contract:mass-approve`, já citada no ADR-0024),
concedida por qualquer papel que a contenha. A `005` exibe o estado read-only via permissões efetivas.

**Rationale** (clarify): mantém o conceito de capacidade dentro do RBAC, sem flag paralela nem papel
dedicado redundante.

---

## D5. Propagação por referência (sem cópia por usuário)

**Decisão**: Como `User` agrega `Role[]` e `Role` agrega `Permission[]`, alterar as permissões de um papel
propaga automaticamente às permissões efetivas de todos os seus usuários. As permissões efetivas são
**computadas** (união), nunca materializadas por usuário.

**Rationale**: consistência sem sincronização; evita estado duplicado. Persistência via tabelas de junção
(`auth_role_permissions`, `auth_user_roles`), permissões efetivas calculadas em query/serviço.

---

## Itens deferidos ao `/speckit-tasks`

- Conjunto inicial (seed) de papéis default, se houver.
- Nomes exatos das permissions de gestão de acessos (`role:create|update|assign|revoke`).
- Reuso vs novo: confirmar se `list-permissions` existente já serve de "catálogo" ou exige wrapper.
