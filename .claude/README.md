# 🎼 `.claude/` — core-api (ERP Bem Comum)

> **Status (2026-05-14):** Phase 1 — Módulo Contratos. Domínio puro TS em construção; Application + CLI logo após; Adapters (MySQL/REST/Storage) depois.
>
> **Stack:** Node.js 24 LTS · **TypeScript 6.0** (com roadmap TS 7 — ver [ADR-0009](../../handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) e [Inquiry-0004](../../handbook/inquiries/0004-node-version-and-typescript-future.md)) · ESM (`"type": "module"`, `NodeNext`) · pnpm (multi-repo — [ADR-0012](../../handbook/architecture/adr/0012-pnpm-package-manager.md)).
>
> **Source of Truth:** `../../handbook/`. Quando houver conflito entre essa pasta `.claude/` e o handbook, **o handbook vence**.

---

## 🧭 Filosofia em uma frase

> **Um orquestrador roteador + skills especializadas profundas + pipeline fail-first.** Zero duplicação: cada skill cita o handbook, nunca redefine.

Adaptação do estilo `/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/acdg/frontend/.claude/` (que reduziu 22 agents → 1 orquestrador + N skills, 72% menos tokens).

---

## 🗺️ Como navegar

| Pasta | Propósito |
| :--- | :--- |
| [`agents/`](./agents/) | **Único orquestrador** ([`contratos-orchestrator.md`](./agents/contratos-orchestrator.md)) — ponto de entrada para qualquer tarefa neste repo |
| [`skills/`](./skills/) | 7 skills especializadas (TS domain, Ports & Adapters, Modular Monolith, CLI builder, Pipeline maestro, Code reviewer, TS quality checker) |
| [`.pipeline/`](./.pipeline/) | Trilha de execução de tickets — pasta por ticket com REPORT.md de cada wave |
| [`hooks/`](./hooks/) | `pre-commit-typecheck.sh` bloqueia commit se `tsc --noEmit` falhar |
| `settings.local.json` | Permissões allow-list (Node, npm/pnpm, tsc, git read-only, find/grep) |

---

## 🎯 Stacks e skills canônicas

| Atividade | Skill canônica | Skills auxiliares |
| :--- | :--- | :--- |
| Modelar agregado/VO/evento de domínio em TS | [`ts-domain-modeler`](./skills/ts-domain-modeler/SKILL.md) | [`modular-monolith`](./skills/modular-monolith/SKILL.md), [`ports-and-adapters`](./skills/ports-and-adapters/SKILL.md) |
| Definir contratos entre módulos (`fin_*` ↔ `ctr_*` via outbox) | [`modular-monolith`](./skills/modular-monolith/SKILL.md) | — |
| Definir ports (Repository, EventBus, Clock) | [`ports-and-adapters`](./skills/ports-and-adapters/SKILL.md) | [`ts-domain-modeler`](./skills/ts-domain-modeler/SKILL.md) |
| Construir CLI para P.O. validar regras de negócio | [`application-cli-builder`](./skills/application-cli-builder/SKILL.md) | [`ts-domain-modeler`](./skills/ts-domain-modeler/SKILL.md) |
| Executar pipeline W0→W3 de um ticket | [`pipeline-maestro`](./skills/pipeline-maestro/SKILL.md) | [`code-reviewer`](./skills/code-reviewer/SKILL.md), [`ts-quality-checker`](./skills/ts-quality-checker/SKILL.md) |
| Revisão read-only de implementação (W2) | [`code-reviewer`](./skills/code-reviewer/SKILL.md) | — |
| Gate de qualidade final (W3) — `tsc`, format, test | [`ts-quality-checker`](./skills/ts-quality-checker/SKILL.md) | — |

---

## 🌊 Pipeline 4-wave (fail-first)

```
W0 — RED         tests-writer        Testes falhando que descrevem o contrato (TDD)
W1 — GREEN       implementer         Implementação mínima até GREEN
W2 — REVIEW      code-reviewer       Audit read-only (max 3 rounds)
W3 — QUALITY     ts-quality-checker  tsc --noEmit + format + tests + build
```

Cada wave consome o REPORT.md da anterior. Estrutura de ticket em `.pipeline/<TICKET>/`:

```
.pipeline/<TICKET>/
├── 000-request.md           # escopo (autor humano escreve)
├── 002-tests/REPORT.md      # W0 output
├── 003-impl/REPORT.md       # W1 output
├── 004-code-review/REVIEW.md  # W2 output
├── 005-quality/REPORT.md    # W3 output
└── STATE.md                 # status acumulado
```

Detalhes em [`pipeline-maestro/SKILL.md`](./skills/pipeline-maestro/SKILL.md) e [`.pipeline/README.md`](./.pipeline/README.md).

---

## 📐 Hierarquia de conflitos

Quando duas fontes discordam, prevalece a de cima:

```
handbook/                              ← Source of Truth (incluindo ADRs)
  > .claude/skills/<skill>/SKILL.md    ← Como aplicar regras do handbook
    > .claude/skills/<skill>/references/  ← Documentação externa (citada, não normativa)
      > Knowledge geral do modelo
```

ADRs do handbook são **imutáveis** ([ADR](../../handbook/architecture/adr/README.md)). Nunca contradizer um ADR aceito — abrir um novo que o `supersedes`.

---

## ⚡ Regras transversais (herdadas do CLAUDE.md raiz)

Aplicáveis em **todo** código do `core-api`:

### 🌐 Regra invariante de idioma

| Camada | Idioma | Exemplo |
| :--- | :--- | :--- |
| Código (`src/`, `tests/`): tipos, funções, variáveis, pastas, arquivos | **EN (Clean Code)** | `type Contract`, `Money.fromCents`, `terminate(contract)`, `src/modules/contracts/` |
| Strings literais ao humano (mensagens da CLI, erros formatados) | **PT** | "Contrato encerrado", "Aditivo sem documento" (via dicionário) |
| Documentação (`.claude/`, `.pipeline/`, READMEs, handbook, ADRs, inquiries) | **PT** | Este arquivo. Identificadores de código sempre entre backticks. |
| Erros internos (string literal union em código) | **EN kebab-case** | `'contract-terminated'`, `'amendment-without-signature'` |
| Eventos de domínio | **EN passado** | `ContractCreated`, `AmendmentHomologated` |
| IDs de ticket (`.pipeline/`) | **EN** | `CTR-VO-MONEY`, `CTR-AGG-CONTRACT` |
| Commit messages | **PT** | `feat(contracts): adiciona VO Money com smart constructor` |

> ⚠️ **Invariante. Não negociar.** Material legado (handbook) que ainda usa identificadores em PT será migrado conforme cada agregado for codado.

### Regras de modelagem (TS funcional puro)

- **`throw` proibido** no domínio. Operações retornam [`Result<T, E>`](./skills/ts-domain-modeler/references/ts-result-pattern.md). `throw` só em adapters, **convertido para `Result` na borda**.
- **Sem `class`, sem `this`** — operações são funções puras sobre `Readonly<>` types. Smart constructors em vez de constructors.
- **Branded types** para IDs e valores validados (`CPF`, `CNPJ`, `Money`, `ContractId`, `AmendmentId`). Ver [`ts-branded-types.md`](./skills/ts-domain-modeler/references/ts-branded-types.md).
- **Discriminated unions** para Commands e Events, com `switch` exhaustivo (nunca cair em `default` silencioso). Ver [`ts-discriminated-unions.md`](./skills/ts-domain-modeler/references/ts-discriminated-unions.md).
- **Erros são string literal unions**, não classes de erro. `type ContractError = 'contract-terminated' | 'amendment-pending' | ...`
- **Imutabilidade absoluta** — `Readonly<>`, `readonly T[]`, `as const`. Mudança de estado via cópia. Ver [`ts-readonly-immutability.md`](./skills/ts-domain-modeler/references/ts-readonly-immutability.md).
- **`import type`** para imports puramente de tipo (`verbatimModuleSyntax` no `tsconfig`).
- **Extensões `.ts` nos imports** (ESM/NodeNext + `allowImportingTsExtensions`).
- **Subpath imports `#src/*`** para testes referenciarem código (declarado em `package.json` → `"imports"`).

---

## 📚 Referência canônica de TypeScript moderno

**SEMPRE** consultar antes de modelar tipos avançados:

> [`/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/bem_comum/handbook/reference/typescript/`](../../handbook/reference/typescript/)

Tópicos relevantes pro nosso domínio:

| Padrão que vamos usar | Arquivo de referência |
| :--- | :--- |
| Branded types | `Object Types.md` (index signatures), `Type Manipulation/Mapped Types.md` |
| Discriminated unions + exhaustiveness | `Narrowing.md` (control flow, `is`, `never`) |
| `Readonly<>`, imutabilidade | `Object Types.md` §readonly Properties, `Type Manipulation/Mapped Types.md` |
| Smart constructors → `Result<T, E>` | `More on Functions.md`, `Type Manipulation/Generics.md`, `Type Manipulation/Conditional Types.md` |
| `import type`, ESM, NodeNext | `Modules.md` |
| `keyof`, `typeof` no nível de tipo | `Type Manipulation/Keyof Type Operator.md`, `Type Manipulation/Typeof Type Operator.md` |

Skills relacionadas resumem cada um desses em `references/` próprios.

---

## 🚫 Anti-padrões

1. **Carregar múltiplas skills simultaneamente** sem necessidade — orquestrador escolhe **uma**.
2. **Duplicar regras** que já vivem em CLAUDE.md raiz, handbook ou skill — referencie, não copie.
3. **Pular waves** (ir direto pra W1 sem W0 RED) — quebra o fail-first.
4. **Misturar módulos** numa sessão (`ctr_*` e `fin_*` ao mesmo tempo) — ofende [ADR-0014](../../handbook/architecture/adr/0014-mysql-database-isolation.md).
5. **Editar ADR aceito** — cria novo que `supersedes` o anterior.
6. **Editar código sem ticket em `.pipeline/<TICKET>/000-request.md`** — qualquer mudança não-trivial passa pela pipeline.


---

> 🤖 Última atualização: **2026-05-14**.
