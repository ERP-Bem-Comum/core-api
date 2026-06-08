# Melhorias de cobertura — testes a adicionar (4 dimensões)

> Análise da rede de segurança (158 casos) cruzada com guidance canônica via MCP `acdg-skills`
> (`skills_buscar`/`skills_citar`, grounding verificado). Cada lacuna aponta **testes novos** a
> incorporar na coleção unificada (US3) — alvo de borda HTTP real. Prioridade: 🔴 alta · 🟡 média · 🟢 baixa.

## Cobertura atual (baseline)

| Tema                                                                             | Arquivos na rede  |
| -------------------------------------------------------------------------------- | ----------------- |
| 401 sem sessão / 403 fail-closed                                                 | 12 / 12           |
| 404 / 409 / 422                                                                  | 3 / 4 / 3         |
| IDOR (RBAC) · passwordHash não-vazado · mass-assignment · lockout · idempotência | 7 · 6 · 2 · 4 · 6 |
| **429 rate-limit**                                                               | **0** ❌          |
| **timing / anti-enumeração explícito**                                           | **0** ❌          |
| injection / SQLi                                                                 | 2 (limitado)      |

---

## 1. 🔒 Segurança da informação

**Fundamento canônico** — OWASP AI Exchange (p.89), _Implementation_ de Access Control:

> "2. Apply least privilege: Grant access only to functions or models necessary for each user's role or purpose. […] 3. Apply defence-in-depth: Access control should be enforced at multiple layers […] so that a single failure does not expose the model. 5. Reduce the risk of multi-account abuse: Attackers may create or use multiple accounts to avoid per-user rate limits."

**Lacunas + testes a adicionar:**

- 🔴 **Rate-limit (429) — zero testes.** Existe `WRITE_RATE_LIMIT` (30/min) nas rotas de escrita, mas nada o exercita. OWASP liga rate-limit a abuso multi-conta.
  - **T+**: burst de >30 POST/PUT/PATCH/DELETE em `/api/v1/users`, `/api/v1/roles`, `/api/v1/users/:id/roles` num minuto → **429** (com header `Retry-After`); reads no teto global permanecem 200.
- 🔴 **Injection/SQLi/XSS — só 2 casos.** Expandir para todos os campos de entrada livre.
  - **T+**: payloads SQLi (`' OR 1=1--`) e XSS (`<script>`) em `search` (users), `name` (users/roles), e campos de contracts/partners → resposta segura (200 sem efeito / 422), sem 500, sem eco do payload executável.
- 🟡 **Anti-enumeração / timing — implícito.** `auth/04-login-wrong-password` e `05-login-unknown-email` existem, mas sem asserção de **resposta uniforme** (mesmo status + shape) entre "senha errada" e "email inexistente".
  - **T+**: asserção explícita de que ambos retornam 401 com corpo idêntico (sem revelar se o email existe).
- 🟡 **Defence-in-depth fail-closed em TODAS as rotas.** Há 12 arquivos com 403, mas confirmar que **cada** rota administrativa rejeita token-sem-permissão (não só amostras). Cruzar com o catálogo de permissões.
  - **T+**: matriz permissão×rota — para cada rota protegida, um caso `bareToken` → 403.
- 🟡 **JWT forjado / adulterado em contracts e partners.** O módulo auth tem (`3-security`); confirmar que contracts/partners também rejeitam token forjado/expirado/assinatura inválida.

---

## 2. ⚙️ Falhas técnicas possíveis

**Fundamento** — TDD (Beck): a rede é uma _characterization suite_; falhas surgem nas bordas não-exercitadas (boundary/erro).

**Lacunas + testes a adicionar:**

- 🔴 **Boundary de paginação.** Há `pageSize` inválido isolado, mas faltam: `page=0`, `page` negativo, `pageSize` acima do máximo, `page` além do total (retorna vazio coerente).
  - **T+**: por listagem (users, roles, e listagens de contracts/partners) → 422 ou clamp documentado, nunca 500.
- 🟡 **Content-type / corpo malformado.** Enviar JSON malformado, `Content-Type` errado, body vazio onde exige body.
  - **T+**: → 400/415, nunca 500 com stack.
- 🟡 **Payload acima do limite (413).** Foto/upload já tem limite; testar body gigante em POST/PUT JSON.
- 🟡 **Método não permitido (405) e rota inexistente (404).** Smoke por módulo.
- 🟢 **5xx genérico não vaza detalhe.** Há F3-hardening no auth; estender a asserção "erro 5xx não revela stack/componente" a contracts/partners.

---

## 3. ⚡ Performance

**Fundamento** — MySQL 8.4 Reference Manual (range optimizer / full table scan): consultas sem índice degradam para _full table scan_. As listagens da borda devem usar índice + `LIMIT`.

**Lacunas + testes a adicionar:** (E2E mede comportamento, não micro-bench — focar em coerência sob volume)

- 🟡 **Paginação sob volume.** Seed com N≫pageSize registros; asserir que a listagem retorna só `pageSize` itens e `meta.totalItems` correto (prova LIMIT/OFFSET efetivo, não carrega tudo).
  - **T+**: listar users/suppliers com seed de ~50 → página 1 tem `pageSize`, `meta.totalItems`=50, navegação de páginas coerente.
- 🟡 **Busca por índice.** `search` por nome usa `auth_user_name_idx`; asserir resultado correto e estável (smoke de que a rota responde sob filtro).
- 🟢 **Resposta dentro de orçamento.** Opcional: asserir que cada request do runner completa < limite informal (o runner já mede duração total).

---

## 4. 🧮 Consistência da informação

**Fundamento canônico** — Ramakrishnan & Gehrke, _Sistemas de Gerenciamento de Banco de Dados_ (3ª ed., p.443), §16.1 Propriedades ACID:

> "1. Os usuários devem ser capazes de enxergar a execução de cada transação como atômica: ou todas as ações são executadas ou nenhuma delas é executada. […] 2. Cada transação, executada sozinha, […] deve preservar a consistência do banco de dados."

**Lacunas + testes a adicionar:**

- 🔴 **Propagação referencial end-to-end (FR-007).** Editar um role deve refletir nas permissões efetivas de quem o tem. Há teste de unidade, mas falta o E2E encadeado.
  - **T+**: criar role → atribuir a user → `GET /users/:id/permissions` (baseline) → `PUT /roles/:id` muda permissões → `GET /users/:id/permissions` **reflete** a mudança (consistência por referência).
- 🔴 **Atomicidade de edição (FR-009).** Edição que falha (ex.: email duplicado no meio do patch) **não** deixa estado parcial.
  - **T+**: `PUT /users/:id` com email já usado → 409 **e** `GET /users/:id` confirma que NENHUM campo do patch foi aplicado (all-or-nothing).
- 🟡 **Round-trip de leitura.** Recurso criado → lido → todos os campos batem (sem perda/transformação silenciosa). Cobrir create→detail em cada módulo.
- 🟡 **Idempotência reverificada por leitura.** Os testes de idempotência (6) checam o status; adicionar a asserção de que o **estado final** é igual após a 2ª chamada (não só o status 200).
- 🟢 **Unicidade observável.** Após criar com nome/email único, recriar → 409 **e** a listagem não tem duplicata.

---

## Plano de incorporação

Estes testes entram na **coleção unificada (US3)** como novos requests `.bru` (e seus pares BDD/TDD na rede), priorizando 🔴 primeiro:

1. 🔴 Rate-limit 429 (segurança) · Injection expandida · Propagação referencial E2E · Atomicidade de edição.
2. 🟡 Boundary de paginação · Anti-enumeração explícita · Matriz permissão×rota · Round-trip.
3. 🟢 5xx genérico cross-módulo · Unicidade observável · Orçamento de tempo.

> Estimativa: ~25-35 novos casos. Cada um deve ter par BDD/TDD na rede antes de virar `.bru` (mesma disciplina da US1). Fundamentação canônica via `acdg-skills` registrada por dimensão acima.
