[← Voltar para ADRs](./README.md)

# ADR-0024: Identidade & RBAC — Módulo `auth` (identidade própria OIDC-ready, sessão híbrida, permissions granulares)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Decide:** pré-requisito de identidade/RBAC registrado em [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (`:44`, `:72`)
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (modular monolith, módulo extraível), [ADR-0005](./0005-thin-bff-gateway.md) (BFF burro valida token), [ADR-0014](./0014-mysql-database-isolation.md) (isolamento, prefixo por módulo), [ADR-0025](./0025-http-server-fastify-core-api.md) (exposição HTTP), [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (sem JSON/ENUM nativos)

---

## Contexto

O sistema não tem ator autenticado. O domínio de Contratos modela apenas o VO `user-ref` (uma referência opaca), e o [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) deixou o **AuditLog explicitamente diferido até existir identidade/RBAC**:

> **AuditLog (Inquiry-0018): mesmo padrão de projeção, transversal, mas DIFERIDO até identidade/RBAC.** [...] sem ator autenticado, auditoria é de fachada. Reabrir quando RBAC existir. — `0022-read-models-via-projection-over-event-stream.md:44`

> Pré-requisito do AuditLog: inquiry/ADR de **identidade & RBAC**. — `:72`

Com a adoção de HTTP no core-api ([ADR-0025](./0025-http-server-fastify-core-api.md)), o serviço passa a poder autenticar e emitir credencial. Forças em jogo:

- **Infra reduzida** (restrição declarada pela liderança técnica) — rodar um IdP self-hosted (Zitadel) adicionaria um serviço *stateful* com banco próprio; não há orçamento operacional para isso nesta fase.
- O **BFF é burro** ([ADR-0005](./0005-thin-bff-gateway.md)): faz autenticação como *cross-cutting* (validar token), mas tem proibição explícita de acessar banco ou conter regra de negócio (`0005-thin-bff-gateway.md:57-67`). Logo, **emissão** de credencial, registro, troca de senha e autorização são regra de negócio → core-api.

---

## Decisão

Criar o **módulo `auth`** no core-api, seguindo o modular monolith ([ADR-0006](./0006-modular-monolith-core-api.md)), com as escolhas abaixo.

### 1. Identidade própria, OIDC-ready

O core-api é a fonte de identidade: guarda usuários e verifica credencial localmente (hash via port). A **fonte de autenticação é abstraída** por um port `Authenticator` — um `OidcAuthenticator` pode ser plugado depois sem refactor de domínio. Decisão **reversível**: federação não é descartada, é adiada.

### 2. RBAC com permissions granulares

- `Permission` = branded `resource:action` (ex.: `contract:delete`, `contract:mass-approve`).
- `Role` agrega `readonly Permission[]`; `User` agrega `readonly Role[]`.
- Authorization service **puro**: `authorize(user, required): Result<void, 'forbidden'>` — recebe o agregado, nunca acessa repositório.

### 3. Sessão híbrida (JWT curto + refresh stateful)

- **Access token**: JWT de vida curta (~15 min), assinado pelo core-api, **validado stateless pelo BFF** (sem tocar banco — honra ADR-0005).
- **Refresh token**: token **opaco**, persistido como `token_hash` em `auth_refresh_token`. Renovação **rotaciona** (revoga o antigo, emite novo); logout/admin **revoga imediatamente**. Controle de revogação fica server-side.

### 4. Emissão no core-api, validação no BFF

`POST /api/v2/auth/login` → BFF roteia → core-api verifica credencial e emite o par (access + refresh). Nas chamadas seguintes, o BFF valida o access token JWT (cross-cutting). Fronteira do ADR-0005 preservada.

### 5. Destrava o AuditLog do ADR-0022

Os eventos de `auth` (abaixo) passam a carregar o "Quem" confiável, reabrindo a materialização do AuditLog diferido.

### Modelo de dados (`auth_*` dentro do database `core`)

Prefixo `auth_*` (mesma convenção de `ctr_*`/`fin_*`), respeitando [ADR-0014](./0014-mysql-database-isolation.md) (um único escritor por database: `core_app`) e [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (sem JSON/ENUM nativos — papéis e permissões são linhas, não enum).

| Tabela | Colunas-chave |
| :--- | :--- |
| `auth_user` | `id` varchar(36), `email` (unique), `password_hash` (nullable → OIDC-ready), `status`, timestamps |
| `auth_role` | `id`, `name` (unique), `description` |
| `auth_permission` | `id`, `name` (unique, formato `resource:action`) |
| `auth_role_permission` | `role_id`, `permission_id` |
| `auth_user_role` | `user_id`, `role_id` |
| `auth_refresh_token` | `id`, `user_id`, `token_hash`, `issued_at`, `expires_at`, `revoked_at` (null), `replaced_by` (null) |

> `password_hash` nullable já abre espaço para usuário federado sem migration futura. O refresh é guardado **apenas** como hash, nunca em claro.

### Vocabulário do módulo

- **Eventos** (EN passado): `UserRegistered`, `UserAuthenticated`, `AccessTokenRefreshed`, `SessionRevoked`, `PasswordChanged`, `RoleAssigned`.
- **Erros** (kebab EN): `'invalid-credentials'`, `'user-disabled'`, `'email-already-registered'`, `'weak-password'`, `'refresh-token-revoked'`, `'refresh-token-expired'`, `'forbidden'`.

---

## Consequências

### Positivas

- Zero infra nova — reusa o database `core` (MySQL já provisionado).
- Revogação imediata via refresh stateful, sem o BFF tocar banco.
- Destrava o AuditLog do ADR-0022 (o "Quem" passa a ser confiável).
- Caminho de federação preservado (port `Authenticator` + `password_hash` nullable).
- Domínio puro (sem framework), conforme garantia do ADR-0006.

### Negativas

- Superfície de segurança própria: hashing (argon2id), política de senha, reset, lockout — responsabilidade do time, não de um IdP.
- Refresh stateful adiciona leitura/escrita por renovação (mitigado: renovação é esparsa; access token curto evita hit por request).
- RBAC granular adiciona 5 tabelas e o join de autorização.

### Neutras

- O store de refresh é MySQL nesta fase; migrar para Redis é possível se o volume exigir (ver "Quando re-avaliar").

---

## Alternativas Consideradas

### A. OIDC federado agora (Zitadel self-hosted ou SaaS)

**Rejeitada nesta fase porque:** conflita com a restrição de **infra reduzida** — self-hosted é mais um serviço stateful com banco próprio; SaaS adiciona custo recorrente + vendor lock-in. Mantida como evolução (port `Authenticator`).

### B. JWT puro stateless (sem refresh stateful)

**Rejeitada porque:** revogação imediata fica inviável (exige blocklist, que reintroduz estado). Logout não teria efeito real até o token expirar.

### C. Sessão 100% stateful (token opaco a cada request)

**Rejeitada porque:** forçaria o BFF a consultar o banco em toda request, violando o ADR-0005 (BFF não acessa banco).

---

## Quando Re-avaliar

- Se um **IdP corporativo** entrar em cena → ativar o `OidcAuthenticator` (gera ADR de federação).
- Se o **volume de refresh/sessões** pressionar o MySQL → mover o store de sessão para Redis.
- Se surgir requisito de **autorização baseada em atributos** (ABAC) além de RBAC.

---

## Invariantes normativas

- Senha **nunca** trafega ou é persistida em claro; só `password_hash` (argon2id no adapter).
- Refresh token **nunca** é persistido em claro; só `token_hash`.
- Authorization service é **puro** — recebe o agregado, não consulta repositório.
- BFF **valida**, nunca **emite** credencial (ADR-0005).
- Sem JSON/ENUM nativos para papéis/permissões — são linhas relacionais (ADR-0020).

---

## Referências

- [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) — diferimento do AuditLog até identidade/RBAC (`:44`, `:72`).
- [ADR-0006](./0006-modular-monolith-core-api.md) — módulo extraível, domínio sem framework.
- [ADR-0005](./0005-thin-bff-gateway.md) — BFF burro valida token (`:26-27`, `:57-67`).
- [ADR-0014](./0014-mysql-database-isolation.md) — isolamento e regra de ouro (um escritor).
- [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) — sem JSON/ENUM nativos.
- [ADR-0025](./0025-http-server-fastify-core-api.md) — exposição HTTP (par desta decisão).
