# Constituição do core-api

> **Fonte de verdade:** esta constituição **resume** os princípios para guiar o
> fluxo do spec-kit (plan/tasks/implement). Ela **não substitui** o cânone — quando
> houver divergência, vencem, nesta ordem: `handbook/architecture/adr/` (ADRs aceitos,
> imutáveis) → `handbook/` → `AGENTS.md` + `.claude/rules/`. Veja a "Hierarquia de
> regras" no `AGENTS.md`. Não duplique regras aqui; referencie.

## Core Principles

### I. TDD fail-first em pipeline W0→W3 (NÃO-NEGOCIÁVEL)
Toda mudança em código de produção abre ticket em `.claude/.pipeline/<TICKET-ID>/`
(`pnpm run pipeline:state init <ticket> --size <S|M|L>`) e percorre as waves:
**W0** testes RED antes de tocar `src/`; **W1** implementação mínima até GREEN;
**W2** code review read-only (máx. 3 rounds); **W3** quality gate verde
(`typecheck` + `format:check` + `lint` + `test`). Pular wave quebra o fail-first.
Bug trivial (1-3 linhas) ou config pode ir direto. *(AGENTS.md §"Pipeline fail-first")*

### II. Política de regressão zero (NÃO-NEGOCIÁVEL)
Qualquer vermelho — teste, `lint`, `typecheck`, hook, build, gate W3 — é regressão a
corrigir AGORA, tenha ou não sido causado pelo diff atual. "Não é meu erro" / "já estava
quebrado" não fecham wave. Saídas aceitas: consertar a causa; corrigir o gate mal-gateado
**provando** o verde no caminho certo; ou escalar ao humano com causa-raiz. É o anti-padrão
mais grave (#14). *(AGENTS.md §"Política de regressão zero")*

### III. pnpm é o único package manager
Nunca `npm` (ADR-0012; hook `block-npm.sh` bloqueia). Qualquer doc/PR/script com `npm`
deve ser convertido. Supply-chain endurecido: corepack, `only-allow=pnpm`,
`approve-builds` (ADR-0011). *(AGENTS.md §"IMPORTANTE")*

### IV. Modular Monolith com isolamento estrito por Bounded Context
Único processo deployável; módulos isolados por pasta (`src/modules/<bc>/`), tabelas
namespaceadas (`ctr_*`, `fin_*`, `auth_*`, `partners_*` — ADR-0014). Cross-módulo
**apenas** via `<module>/public-api/` — nunca importar `domain/`/`application/` de outro
módulo (ADR-0006). Comunicação cross-BC por eventos via **outbox** (ADR-0015), não por
leitura cruzada de tabelas. Não misturar módulos numa sessão. *(ADR-0006, 0014, 0015)*

### V. Domínio puro — sem classes, sem framework, sem throw
Domain = funções + `Readonly<{...}>` + smart constructors retornando `Result<T, E>`
(nunca `throw`). Branded types para IDs/valores. Erros são string-literal unions EN
kebab-case (`'contract-not-active'`); switch exaustivo com `const _: never = x`, nunca
`throw` no `default`. *(`.claude/rules/domain.md`)*

### VI. MySQL 8 único + Drizzle; migrations geradas
MySQL 8.4 é o único dialeto (ADR-0020). Schema em Drizzle; após alterar `schema.ts`,
gerar migration com `pnpm run db:generate` (nunca SQL à mão). Proibidos: JSON nativo,
triggers, stored procs, ENUM nativo. Cliente de storage único: `@aws-sdk/client-s3`
(ADR-0019). *(ADR-0013, 0015, 0020)*

### VII. CLI-first; HTTP é Fase 2+ (exige ADR)
A UX primária da Fase 1 é a CLI (`pnpm run cli:contracts -- <subcomando>`). Servidor
HTTP (Fastify) é reservado para Fase 2+ e só ativa via novo ADR. Application orquestra;
o domínio ignora o transporte. *(AGENTS.md; ADR-0025 reservado)*

### VIII. TypeScript strict + ESM + idioma por camada
`strict` completo (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, etc.),
`import type` para tipos, extensões `.ts` nos imports relativos (NodeNext), subpath
`#src/*`. Proibidos: `any`, classes no domínio, `axios`/`moment`/`lodash`. Idioma:
código em **EN**, strings ao humano e docs/commits em **PT** (commit `feat(contracts): …`).
*(AGENTS.md §"Idioma" e §"Sintaxe TS")*

### IX. Decisões ancoradas no cânone (consultoria ACDG + citação obrigatória)
A pipeline `core-api-sdd` opera em **máximo rigor**: cada fase consulta a persona-consultora
ACDG correspondente (prompts MCP `/acdg-skills:*` — requirements-engineer, ddd-architect,
software-architect, database-engineer, tdd-strategist, clean-code-reviewer, security-reviewer).
Toda **decisão-chave** — fronteira de Bounded Context/agregado (DDD), ADR, estratégia de teste
(TDD) e achados de review — exige **citação literal ≥4 linhas** de livro canônico, extraída pelas
tools `skills_buscar`/`skills_citar` (Evans, Vernon, Beck, Uncle Bob, Newman, Ramakrishnan,
OWASP…). Sem citação, a decisão não avança o gate. *(MCP `acdg-skills`; ver `.mcp.json`)*

## Ciclo RED → YELLOW → GREEN (mapeia no W0→W3)

- 🔴 **RED** — testes (W0) escritos a partir do BDD e **falhando** por inexistência da API.
- 🟡 **YELLOW** — implementação mínima (W1) faz os **testes passarem**, mas review/qualidade/citações
  ainda **pendentes** (verde funcional ≠ verde de qualidade).
- 🟢 **GREEN** — testes + **review W2** + **gate W3** (`/speckit-verify`) + **citações das
  decisões-chave registradas**. Só então a feature fecha.

## Technology Constraints

Stack fixa: Node.js 24 LTS · TypeScript 6 (roadmap TS 7) · ESM · pnpm · Drizzle + `mysql2`
(MySQL 8) · `node:test` (sem Jest) · ESLint flat config + Prettier · CLI (Fastify reservado).
Mudar qualquer item exige ADR novo que `supersedes` o anterior, registrado em
`handbook/CHANGELOG.md`. Nunca contradizer um ADR aceito. *(AGENTS.md §"ADRs críticos")*

## Development Workflow & Quality Gates

- **Gate W3 (obrigatório antes de fechar ticket/feature):**
  `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`.
- **Integração:** `pnpm run test:integration` (sobe MySQL via Docker) antes de merge.
- **Pipeline state:** `pnpm run pipeline:status` para o dashboard; tickets fechados são
  histórico auditável — não deletar.
- **Roteamento:** entrada única pelo `contratos-orchestrator`; um agente OU uma skill por
  vez. Não duplicar regras que já vivem no handbook / SKILL.md.

## Governance

Esta constituição serve ao fluxo spec-kit e está **subordinada** ao cânone do repositório
(`AGENTS.md`, `handbook/`, ADRs). Em conflito, o cânone vence. Toda feature planejada via
`/speckit-plan` deve passar pelo "Constitution Check" verificando os princípios I–VIII; uma
violação só é aceitável com justificativa explícita na seção "Complexity Tracking" do plano.
O "Constitution Check" do `/speckit-plan` verifica os princípios I–IX.
Alterações de stack ou de princípio exigem ADR novo (com `supersedes`), não edição aqui.

**Version**: 1.1.0 | **Ratified**: 2026-06-05 | **Last Amended**: 2026-06-05
