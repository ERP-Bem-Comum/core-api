# Research — Autorização na listagem de contratos (022 / #202)

Fase 0. MCP `acdg-skills` indisponível → citação via fallback local (`/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/acdg/skills_base/shared-references/`).

---

## D1 — Causa-raiz e mudança mínima

**Decision**: adicionar `hooks.authorize(CONTRACT_PERMISSION.read)` ao `preHandler` de `GET /contracts` (`src/modules/contracts/adapters/http/plugin.ts:180`), tornando-o `[hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)]`.

**Rationale**:

- A rota tem hoje só `requireAuth` (`:180`), enquanto as 3 irmãs de leitura já exigem `contract:read` (`/contracts/:id` `:250`, `/:id/history` `:351`, `/export.csv` `:224`).
- `CONTRACT_PERMISSION.read = 'contract:read'` (`contracts/public-api/permissions.ts:14`) e **já está no `CATALOG_RAW`** do auth → sem o gap do #200. Diferença essencial: #200 era catálogo faltando; #202 é guard faltando na rota.
- `authorize` já é injetado no plugin (`server.ts` passa `authDeps.authorize`) — nenhum novo acoplamento cross-módulo.

**Alternatives considered**:

- _Permissão dedicada `contract:list`_: rejeitado — não há requisito de granularidade diferente; quebraria a paridade com as outras leituras e exigiria entrada nova no catálogo (YAGNI).
- _Manter sem guard ("enxuto", comentário `:246`)_: rejeitado — é exatamente o vazamento relatado.

---

## D2 — Decisão de segurança: exigir a permissão (least privilege / secure-by-default)

**Decision**: a listagem passa a exigir `contract:read`, negando por padrão quem não a tem.

**Citação canônica — Least Privilege / RBAC por propósito** (`shared-references/security/owasp-ai-exchange.md:2457`):

> 2. Apply least privilege: Grant access only to functions or models necessary for each user's role or purpose.
>
> - Implement fine-grained access control: Restrict access to specific AI models, features, or datasets based on their sensitivity and the user's risk profile.
> - Use role-based and purpose-based permissions: Define permissions for different groups (e.g., developers, testers, operators, end users) and grant access only for the tasks they must perform.
>
> 3. Apply defence-in-depth: Access control should be enforced at multiple layers of the AI system (API gateway, application layer, model endpoint) so that a single failure does not expose the model.

→ A listagem é uma "function/dataset" sensível (carteira de contratos, contrapartes, valores). Least privilege exige que só quem tem o propósito de ler contratos a acesse — exatamente `contract:read`, já exigido pelas demais leituras. Defence-in-depth: o gate na borda (preHandler) é a camada que faltava nesta rota.

---

## D3 — Estratégia de teste: authorize REAL + caso negado

**Decision**: novo `tests/modules/contracts/adapters/http/contracts-list-authorize.routes.test.ts` montando `buildAuthHttpDeps` (driver memory, seed RBAC) + o plugin de contracts com o `authorize` real; casos: sem token → 401; autenticado sem `contract:read` → 403 (RED, hoje 200); com `contract:read` → 200.

**Rationale**: o gap passou porque a cobertura existente da listagem (`contracts-list-filters.routes.test.ts`) só semeia um usuário **com** `contract:read` (caminho feliz) — nunca exercita o caso negado. O padrão de `contracts-export-csv.routes.test.ts:90-105` (401/403/200 com `buildAuthHttpDeps`) é reusado.

**Citação canônica — testes auto-verificáveis** (`shared-references/clean-code/refactoring--martin-fowler.md`, _Refactoring and the Wider Software Development Process_):

> The first foundation for refactoring is self-testing code. By this, I mean that there is a suite of automated tests that I can run and be confident that, if I made an error in my programming, some test will fail.

→ Sem o caso negado, a suíte não falha quando o guard some — não é auto-verificável para este risco. O caso 403 restabelece a propriedade (SC-004).

**Nota (≠ #200)**: aqui `contract:read` já está no catálogo, então semear o usuário positivo com `['contract:read']` é fiel (a permissão é concedível e a `authorize` real a reconhece). O RED vem do caso **negado** (usuário sem a permissão recebendo 200 hoje), não da ausência no catálogo.

---

## D4 — Sem migration, evento ou rota nova

**Decision**: nenhuma alteração de schema/outbox/rota. Apenas o `preHandler` da rota existente. Coerente com ADR-0014/0020 (nada a gerar) e ADR-0037 (validação por HTTP).
