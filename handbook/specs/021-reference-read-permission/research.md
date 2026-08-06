# Research — Permissão `reference:read` no catálogo central (021)

Fase 0. Resolve as decisões-chave com citação canônica (Princípio IX). Base ACDG consultada via **fallback local** (`/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/acdg/skills_base/shared-references/`) — MCP `acdg-skills` indisponível na sessão interativa.

---

## D1 — Causa-raiz e mudança mínima de produção

**Decision**: adicionar exatamente uma string canônica — `'reference:read'` — ao `CATALOG_RAW` em `src/modules/auth/domain/authorization/permission-catalog.ts`, na posição alfabética por resource (entre o bloco `program:*` e `reconciliation:*`, pois `refe…` < `reco…`).

**Rationale**:

- `FINANCIAL_PERMISSION.referenceRead = 'reference:read'` já existe (`src/modules/financial/public-api/permissions.ts`) e é exigida pelas 3 rotas (`src/modules/financial/adapters/http/plugin.ts:878,893,908`).
- `permission.ts` valida apenas o formato `resource:action` (kebab, dois segmentos) — **não há whitelist de `resource`**, então `reference:read` passa em `Permission.parse` sem registro adicional.
- `PermissionCatalog.all = [...new Set(build(CATALOG_RAW))]` deriva 100% do `CATALOG_RAW`. Como `adminDevPermissions = PermissionCatalog.all.map(String)` (`auth/adapters/http/dev-seed.ts`), o admin passa a recebê-la **automaticamente** (FR-002) — nenhum código de grant adicional.
- `Role.setPermissions` valida cada permissão ⊆ catálogo; hoje conceder `reference:read` a qualquer role é **rejeitado** (não pertence ao catálogo) — é a trava raiz do #200.

**Alternatives considered**:

- _Relaxar o `authorize` das 3 rotas (remover o guard)_: rejeitado — abriria leitura para qualquer autenticado, violando o gate e o menor privilégio.
- _Criar um `resource` "reference" em alguma estrutura nova_: rejeitado — não existe whitelist de resource; é over-engineering (YAGNI).

---

## D2 — Escopo do grant: só catálogo + admin (decisão de clarify)

**Decision**: a feature só torna `reference:read` **concedível** (catálogo) e concedida ao perfil completo (admin, via `.all`). **Nenhuma role de negócio é pré-criada/pré-concedida em código** (FR-008). Demais roles recebem a permissão sob demanda no gerenciamento de acessos em runtime.

**Rationale** — menor privilégio + YAGNI. Não há, no código atual, role de negócio seedada além do admin; criar uma "role leitora financeira" agora seria estrutura especulativa sem consumidor concreto.

**Citação canônica — Least Privilege / RBAC** (`shared-references/security/owasp-ai-exchange.md:2457`):

> 2. Apply least privilege: Grant access only to functions or models necessary for each user's role or purpose.
>
> - Implement fine-grained access control: Restrict access to specific AI models, features, or datasets based on their sensitivity and the user's risk profile.
> - Use role-based and purpose-based permissions: Define permissions for different groups (e.g., developers, testers, operators, end users) and grant access only for the tasks they must perform.
>
> 3. Apply defence-in-depth: Access control should be enforced at multiple layers of the AI system ... so that a single failure does not expose the model.

**Citação canônica — YAGNI / flexibilidade especulativa** (`shared-references/clean-code/refactoring--martin-fowler.md:2323,2325`):

> One way of dealing with future changes is to put flexibility mechanisms into the software. ... Adding all those parameters complicates the function for the one case it's used right now. If I miss a parameter, all the parameterization I have added makes it harder for me to add more. ... most of the time my flexibility mechanisms actually slow down my ability to react to change.
>
> This approach to design goes under various names: simple design, incremental design, or yagni (originally an acronym for "you aren't going to need it"). ... it's easier to change a simple system than one that has lots of speculative flexibility included.

**Alternatives considered**: seedar role de negócio dedicada / agrupar `reference:read` num preset com as demais leituras financeiras — ambos rejeitados (sobre-concessão + estrutura especulativa). Registrado em `spec.md#Clarifications` (Session 2026-06-22).

---

## D3 — Estratégia de teste: exercitar o `authorize` REAL

**Decision**: cobertura RED em duas camadas:

1. **Unidade — integridade do catálogo** (`permission-catalog.test.ts`): âncora `#200` exigindo `reference:read` em `PermissionCatalog.all`, e inclusão no teste de "conjunto exato conhecido do sistema" (hoje em ~L112). É o teste que **deveria** ter pego o gap.
2. **Integração HTTP — `authorize` real** (novo arquivo): monta `makeRequireAuth`/`makeAuthorize` (públicos em `auth/public-api/http.ts`) sobre um `UserReader` in-memory com dois usuários (A com role contendo `reference:read`, B sem) e atinge os 3 endpoints. Prova a cadeia **catálogo → role → rota** ponta-a-ponta.

**Rationale**: o gap passou despercebido porque os testes HTTP existentes (`tests/modules/financial/adapters/http/categories.http.test.ts:31-38`) definem um `authorize` **fake** que lê a permissão do header — nunca tocam o catálogo. Cobertura com o `authorize` real é o que impede a regressão reaparecer (FR-006/SC-004).

**Citação canônica — testes auto-verificáveis como fundamento** (`shared-references/clean-code/refactoring--martin-fowler.md`, seção _Refactoring and the Wider Software Development Process_):

> The first foundation for refactoring is self-testing code. By this, I mean that there is a suite of automated tests that I can run and be confident that, if I made an error in my programming, some test will fail.

→ Um teste que usa `authorize` fake **não falha** quando o catálogo quebra: não é auto-verificável para este risco. O teste de integração com `authorize` real restabelece essa propriedade.

**Alternatives considered**: confiar só no teste de catálogo (unidade) — insuficiente, não cobre o wiring rota↔authorize que o usuário final percorre; manter o fake — é exatamente o que mascarou o defeito.

---

## D4 — Sem migration, sem evento, sem rota

**Decision**: nenhuma alteração de `schema.ts`, nenhum evento de outbox, nenhuma rota nova.

**Rationale**: o catálogo é dado in-code (deploy-time). O seed `auth_permission` deriva de `PermissionCatalog.all` e absorve a entrada automaticamente. As rotas já existem (020). Coerente com ADR-0014/0020 (nada a gerar) e ADR-0037 (validação por HTTP, sem CLI).
