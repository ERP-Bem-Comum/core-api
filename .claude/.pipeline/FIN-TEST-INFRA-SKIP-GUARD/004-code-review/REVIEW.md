# Code Review — Ticket FIN-TEST-INFRA-SKIP-GUARD — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-25
**Escopo revisado:** `tests/infra/mysql-compose.test.ts` (diff completo W1) + `000-request.md` + `002-tests/REPORT.md` + `003-impl/REPORT.md`

---

## Contexto

Mudança restrita a **um arquivo de teste de infra**. Sem `src/` tocado → categorias A–E (domínio, ports/adapters, modular monolith) **não se aplicam**. Foco: F (TS/ESM moderno), H (tests) e aderência ao escopo do ticket.

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sug-1 — `tests/infra/mysql-compose.test.ts:137,144` — CA-1b/CA-1c perdem o check de existência de `compose.ci.yaml` quando o CLI está ausente

Os `assert.ok(existsSync(COMPOSE_CI_YAML))` são checagens **puras de filesystem**, independentes do Docker. Com `{ skip: skipSyntax }` no `describe`, elas deixam de rodar em máquina sem o plugin `compose`. **Não é regressão:** no código anterior, a linha `if (!dockerAvailable()) assert.fail(...)` vinha logo após o `existsSync` e fazia o teste falhar de qualquer forma sem Docker. Logo a cobertura efetiva era a mesma (nula sem CLI). Registro apenas como nota; se um dia quiser garantir que o arquivo existe mesmo sem Docker, extrair um `describe('compose.ci.yaml presença', ...)` sem skip. Fora do escopo deste ticket.

#### Sug-2 — `tests/infra/mysql-compose.test.ts:70-79` — `dockerCliAvailable()` avaliado 3× no carregamento

`skipSyntax` chama `dockerCliAvailable()`; `skipBootstrap` chama `dockerDaemonAvailable()`, que chama `dockerCliAvailable()` de novo → 2× `docker compose version` + 1× `docker info`. É bem menos que os ~30 `spawnSync` anteriores (o objetivo do ticket) e mantém os helpers puros/legíveis. Micro-otimização não justifica acoplar. **Manter como está.**

## O que está bom

- **Guard de dois níveis correto:** separar `dockerCliAvailable` (sintaxe, não toca daemon) de `dockerDaemonAvailable` (`docker info`) resolve a causa-raiz real — `docker compose version` retornar 0 com daemon parado. O comentário em `:65-69` documenta exatamente esse "porquê" não-óbvio. Comentário justificado.
- **`skip` nativo em vez de `assert.fail`:** uso idiomático do `node:test` (Node 24). Transforma "sem ambiente" em `skipped`, não `failed` — exatamente o contrato do W0.
- **`timeoutMs: 5_000` no `docker info`:** mitiga o Risco 1 do request (latência com daemon parado) sem esperar os 30s default.
- **Remoção limpa:** zero referência órfã a `dockerAvailable` (grep vazio); hooks `before`/`after` mantêm corpo correto (suite skipada não os executa).
- **Idioma consistente:** reasons de skip em PT, alinhadas ao estilo das mensagens pré-existentes do arquivo.
- **YAGNI:** diff cirúrgico, nada além do necessário para GREEN. Cabeçalho atualizado (`npm`→`pnpm`, ADR-0012) de brinde, dentro do arquivo tocado.

## Verificação F (TS/ESM)

- Sem novos imports; sem `require`/`enum`/`namespace`; sem `any`. `{ skip: false | string }` é compatível com `TestOptions.skip?: boolean | string` — confirmação final delegada ao W3 (`tsc --noEmit`).

## Próximo passo

- **APPROVED** → pipeline-maestro avança para W3 (typecheck + format:check + lint + pnpm test).
