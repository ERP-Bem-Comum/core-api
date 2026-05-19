# Ticket CTR-DOCS-UPDATE-FOR-ADR-0020

> **Sequência:** 8º e ÚLTIMO ticket da derivação de [ADR-0020](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).
> Antecessores: #1-#7 (todos ✅).

---

## Objetivo

Atualizar **toda a documentação do projeto** (CLAUDE.md, SKILLs, handbook operacional) para refletir o estado pós-ADR-0020:

- SQLite removido como driver vivo.
- `--driver memory | mysql` (sem `sqlite`).
- `drizzle.config.ts` (sem sufixo) — único config Drizzle.
- `pnpm db:generate` (sem sufixo `:mysql`).
- Mappers/repos/schemas canônicos sem sufixo `.mysql.` ou `-mysql`.
- ADR-0018 referenciado APENAS como histórico/evidência; ADR-0020 é a fonte vigente.

**O que entra:**

1. **`CLAUDE.md` (raiz)**: 6 trechos com refs operacionais a SQLite — atualizar.
2. **`handbook/architecture/06-persistence-strategy.md`**: hoje todo escrito em modo "dual-dialect". Reescrever como guia operacional MySQL-único OU adicionar banner ⚠️ + nota de redirecionamento + reescrita seletiva.
3. **`handbook/architecture/README.md` (índice)**: descrição da seção 06 menciona "Dual-dialect Drizzle" — atualizar.
4. **8 SKILLs com refs operacionais a SQLite**: atualizar para o estado vigente.
5. **CLAUDE.md** já tem o banner pnpm `IMPORTANTE` mas não tem referência a ADR-0020 como vigente — adicionar.

**O que NÃO entra:**

- ADR-0018 — já tem banner Superseded (no W1 do ADR-0020). **Sem alteração.**
- ADR-0020 — vigente, não alterar.
- `handbook/CHANGELOG.md` — já documenta corretamente as transições (entry de 2026-05-15 cita ADR-0020 e a ciência dos tickets de cleanup). **Sem alteração.**
- `handbook/architecture/adr/README.md` (índice ADRs) — já lista `0018 Superseded by 0020`. **Sem alteração.**
- `handbook/inquiries/0004-node-version-and-typescript-future.md` — inquiry é deliberativo/histórico. **Sem alteração.**
- Refs HISTÓRICAS a SQLite/ADR-0018 nas SKILLs (citando como evidência de decisão deliberada/comparação de paradigmas) — preservar. Apenas refs OPERACIONAIS (instruções "use SQLite assim") são atualizadas.

---

## Princípio condutor

> **Doc é contrato com o futuro Claude/dev/P.O.** Toda menção a `--driver sqlite`, `db:generate:sqlite`, ou `schemas/{sqlite,mysql}.ts` (operacional, não histórica) que ficar nos docs vai confundir alguém em 30 dias. Cleanup mecânico, sem charme.

Distinção que vai guiar este ticket:

- **Operacional**: "use isto agora", "rode aquilo", "estrutura é assim hoje". → **Atualizar.**
- **Histórica/comparativa**: "ADR-0018 baniu X por razão Y", "decisão dual-dialect foi tomada em 2026-05-14". → **Preservar** como evidência.

---

## Decisões

### D1 — `06-persistence-strategy.md`: banner + reescrita seletiva, não rewrite total

O arquivo tem ~70 linhas estruturadas em seções (decisões, mapeamentos canônicos, geração de migrations, validação contínua). Reescrever do zero perde estrutura útil. Vou:

- Adicionar banner ⚠️ no topo apontando para ADR-0020.
- Atualizar a "Decisão arquitetural fonte" do ADR-0018 → ADR-0020.
- Atualizar tabela de tipos (remover coluna SQLite, deixar só MySQL).
- Atualizar seção "Validação contínua" (remove menção SQLite).
- Atualizar seção "Topologia de testes" (remove linhas SQLite).
- Manter outras seções que continuam válidas.

### D2 — SKILLs: separar refs OPERACIONAIS de HISTÓRICAS

Vou ler cada ref e decidir. Default: se o texto diz "use X" ou descreve o estado atual, atualiza. Se diz "ADR-0018 decidiu Y", preserva como histórico.

Caso especial: `clean-code-theorist/SKILL.md:81` — "Mappers SQLite e MySQL **propositalmente duplicados**" cita ADR-0018 como evidência de princípio (DRY vs WET pragmático). Após CTR-CLEANUP-SQLITE, **não há mais mappers duplicados** — só MySQL. A regra "WET às vezes vence" continua válida; o exemplo precisa ser atualizado (talvez para o caso dos mappers paralelos que existiam durante o desenvolvimento + cleanup posterior, ou substituído por outro exemplo).

### D3 — Não tocar `database-theorist` SE a ref é puramente comparativa

Esse SKILL é "comparações entre escolas, history of ideas". Referências a "dual-dialect adotado então abandonado" são EVIDÊNCIA HISTÓRICA legítima — a posição teórica continua sustentando a decisão. Vou atualizar APENAS as menções a "valor atual operacional" (ex.: schemas em `schemas/{sqlite,mysql}.ts` — esse path não existe mais).

### D4 — Test de regressão estrutural

Criar `tests/cleanup/docs-update.test.ts` com asserções estruturais (grep) confirmando ausência de strings operacionais a SQLite em CLAUDE.md, SKILLs (algumas) e handbook (alvos específicos). Pattern do ticket #5.

### D5 — Skill bases

Algumas SKILLs herdam de `skill-base/SKILL.md`. Não tocar nas base (são contratos genéricos sem refs a SQLite — verificado).

### D6 — Idempotência

Múltiplas execuções do ticket não devem causar diff. Strings target específicas, não regex amplas.

---

## Critérios de Aceitação

### Estruturais — CLAUDE.md (4 CAs)

- **CA-1**: `CLAUDE.md` NÃO contém `--driver sqlite`, `--in-memory` (flag), `db:generate:sqlite`, `db:generate:mysql` (script sem sufixo agora), `schemas/sqlite.ts`, `drivers/sqlite.ts`.
- **CA-2**: `CLAUDE.md` cita ADR-0020 entre os ADRs críticos (junto/em vez de ADR-0018).
- **CA-3**: `CLAUDE.md` stack diz `mysql2` (sem "better-sqlite3 dev").
- **CA-4**: `CLAUDE.md` topologia por driver lista `memory` e `mysql` apenas (não `sqlite`).

### Estruturais — handbook (2 CAs)

- **CA-5**: `handbook/architecture/06-persistence-strategy.md` tem banner ⚠️ apontando ADR-0020 + remove refs operacionais a SQLite/`better-sqlite3` do conteúdo principal.
- **CA-6**: `handbook/architecture/README.md` descrição da seção 06 NÃO menciona "Dual-dialect" — atualizada para refletir MySQL único.

### Estruturais — SKILLs (4 CAs)

- **CA-7**: `database-engineer/SKILL.md` refs operacionais atualizadas: tabela "Decisões adotadas" reflete MySQL único; nenhuma menção a `db:generate:sqlite` ou `schemas/sqlite.ts` como caminho ativo.
- **CA-8**: `application-cli-builder/SKILL.md` lista de drivers da CLI é `memory | mysql` (sem sqlite); estrutura de pastas atualizada (sem `drivers/sqlite.ts`).
- **CA-9**: `tdd-strategist/SKILL.md` + `tdd-tutor/SKILL.md` removem referências a `contracts.cli.sqlite.test.ts` e `drizzle-sqlite.test.ts` (deletados em #5). Substituem por `contracts.cli.mysql.test.ts` (entregue em #7) onde fizer sentido.
- **CA-10**: `database-tutor/SKILL.md`, `ports-and-adapters/SKILL.md`, `clean-code-theorist/SKILL.md` atualizam refs operacionais (mantendo refs históricas/comparativas).

### Sanidade (1 CA)

- **CA-11**: `pnpm test` + `pnpm test:integration` continuam GREEN — docs não afetam runtime.

Total: 11 CAs.

---

## Riscos & mitigações

- **R1: Eliminar contexto histórico útil.** Mitigação: D2 — refs operacionais (atualizar) vs históricas (preservar). Quando ambíguo, atualizar mas adicionar nota explicativa.
- **R2: Quebrar links internos a SKILLs/ADRs com renames de seção.** Mitigação: sem renames de arquivos neste ticket — só edição de conteúdo dentro.
- **R3: `06-persistence-strategy.md` ficar inconsistente após edição parcial.** Mitigação: ler o arquivo inteiro antes de editar; banner explícito; revisar fluxo de leitura no W2.
- **R4: SKILLs ficarem incoerentes (Mistura de "use X" + "X foi removido em Y").** Mitigação: padrão claro — atualizar "use X" para o estado atual; mover "X foi removido em Y" para refs históricas demarcadas (ex.: §"Decisões revisadas").

---

## Plano de Waves

| Wave | Skill / Foco | Output |
| :--- | :--- | :--- |
| **W0 RED** | `pipeline-maestro` + assertions estruturais | `tests/cleanup/docs-update.test.ts` com 11 CAs. RED esperado: CLAUDE.md + handbook + SKILLs ainda têm strings SQLite operacionais. |
| **W1 GREEN** | edição direta (sem skill especializada — pure prose update) | Editar 1 CLAUDE.md + 2 handbook files + 8 SKILLs. Tests W0 viram GREEN incrementalmente. |
| **W2 REVIEW** | self-review (padrão #4-#7) | Audit: nada operacional a SQLite sobrou; refs históricas preservadas onde fazem sentido; banner em 06-persistence-strategy claro. |
| **W3 QUALITY** | `pnpm test` + `pnpm test:integration` | Não há quality gates específicos pra docs além de "sem regressão". Garante que test:integration continua 57/57. |

---

## Pós-condições — sequência ADR-0020 encerrada

| # | Ticket | Status |
| :-: | :--- | :--: |
| 1 | CTR-DB-COMPOSE-MYSQL | ✅ |
| 2 | CTR-DB-SCHEMA-MYSQL-CTR-PREFIX | ✅ |
| 3 | CTR-DB-MIGRATION-MYSQL | ✅ |
| 4 | CTR-DB-DRIVER-MYSQL | ✅ |
| 5 | CTR-CLEANUP-SQLITE | ✅ |
| 6 | CTR-DOCKERFILE-MYSQL | ✅ |
| 7 | CTR-CLI-MYSQL-SMOKE | ✅ |
| 8 | CTR-DOCS-UPDATE-FOR-ADR-0020 | 🎯 este ticket |

Após este ticket, o módulo Contratos do `core-api` está **100% MySQL** em código, testes, infra, e docs.
