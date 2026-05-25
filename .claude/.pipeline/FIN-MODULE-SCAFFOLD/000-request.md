# FIN-MODULE-SCAFFOLD — Esqueleto do módulo Financeiro

> **Size:** XS · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessor:** nenhum (primeiro ticket da Fase 2 — módulo Financeiro)
> **Sucessor previsto:** `FIN-CLI-WIRE` (script `cli:financial` no `package.json`)

---

## 1. Contexto

Fase 1 (módulo `contracts`) entregue ALL-GREEN — 23 tickets fechados, série Outbox MySQL + Document storage concluídas.

Iniciamos agora a **Fase 2 — módulo Financeiro**. O handbook descreve 3 Bounded Contexts (`handbook/domain_questions/financeiro/`):

- **Gestão de Documentos Fiscais** (Core ⭐) — fato gerador (NFe, RPA…)
- **Títulos e Liquidação** (Core ⭐) — máquina de estados de obrigações pagáveis
- **Integração Bancária** (Generic / ACL) — CNAB, Bradesco REST + VAN/STCPCLT

Este ticket é o **primeiro passo** da Fase 2: planta o terreno em `src/modules/financial/` sem código de domínio ainda. Tickets subsequentes preenchem agregados, ports, adapters e CLI.

**ADRs ancoradoras:**

- [ADR-0006](../../../handbook/architecture/adr/0006-modular-monolith-core-api.md) — Modular monolith + ports & adapters; cada módulo expõe **apenas** `public-api/`.
- [ADR-0014](../../../handbook/architecture/adr/0014-mysql-database-isolation.md) — Prefixo de tabela `fin_*` reservado ao módulo Financeiro.
- [ADR-0015](../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md) — Outbox local por módulo será reusado quando o BC Documentos existir.

---

## 2. Escopo (o que entra)

Criar **apenas** o arquivo `src/modules/financial/public-api/index.ts` como **placeholder vazio com header doc** — ponto de ancoragem do módulo. Demais pastas (`domain/`, `application/`, `adapters/`, `cli/`, `worker/`) virão nos próximos tickets, conforme cada um trouxer arquivos reais (evita pastas vazias no git).

### 2.1. Arquivo único do ticket

`src/modules/financial/public-api/index.ts`

Conteúdo esperado (estrutura, não literal — implementer decide naming final):

```ts
/**
 * Public API do módulo Financial.
 *
 * Outros módulos importam APENAS daqui. Nunca importar de
 * `../domain/`, `../application/` ou `../adapters/` diretamente.
 *
 * ADR-0006 §"Modular monolith — Public API por módulo".
 *
 * Atualmente vazio — exports virão conforme tickets `FIN-*` adicionarem
 * agregados, eventos, ports e adapters ao módulo.
 */

export {};
```

### 2.2. Espelho da estrutura final (referência, NÃO criar agora)

Para alinhamento do leitor — a forma final do módulo, replicando `src/modules/contracts/`:

```
src/modules/financial/
├── adapters/
│   ├── event-delivery/        # outbox publisher (futuro)
│   ├── outbox/                # outbox repo (futuro)
│   └── persistence/           # Drizzle MySQL — schemas fin_*
├── application/
│   ├── ports/                 # PayableRepository, BankIntegration, …
│   └── use-cases/             # ApprovePayable, ProcessBankOutflow, …
├── cli/                       # `pnpm run cli:financial`
│   ├── commands/
│   ├── drivers/
│   ├── formatters/
│   └── main.ts
├── domain/
│   ├── payable/               # agregado raiz (Título Financeiro)
│   ├── remittance/            # CNAB Remittance (futuro)
│   ├── fiscal-document/       # FiscalDocument (Fatia 6+)
│   └── shared/
├── public-api/
│   ├── events.ts
│   └── index.ts               # ← arquivo deste ticket
└── worker/
    └── outbox-worker.ts
```

---

## 3. Fora de escopo

- Qualquer código de domínio (Payable, FiscalDocument, máquinas de estado).
- Ports, use cases, adapters (Drizzle, InMemory, REST).
- Script `pnpm run cli:financial` em `package.json` (próximo ticket: `FIN-CLI-WIRE`).
- Subpastas vazias com `.gitkeep` — projeto não usa esse padrão.
- README do módulo — `contracts` e `notifications` não têm; manter consistência.
- Schema Drizzle / migrations / outbox.
- Integração Bradesco (ADR-0008).

---

## 4. Critérios de aceitação

| # | Critério | Como verificar |
| :--- | :--- | :--- |
| **CA-1** | Arquivo `src/modules/financial/public-api/index.ts` existe. | `test -f src/modules/financial/public-api/index.ts` |
| **CA-2** | Arquivo possui apenas `export {};` (e header doc) — zero símbolos exportados. | `import * as fin from '#src/modules/financial/public-api/index.ts'; assert.deepEqual(Object.keys(fin), [])` |
| **CA-3** | Import via subpath alias `#src/modules/financial/public-api/index.ts` funciona em runtime + tsc. | Teste em `tests/modules/financial/public-api/scaffold.test.ts` |
| **CA-4** | `pnpm run typecheck` verde. | comando direto |
| **CA-5** | `pnpm run format:check` verde. | comando direto |
| **CA-6** | `pnpm test` inclui o novo teste e fica verde. | comando direto |
| **CA-7** | `pnpm run lint` verde. | comando direto |
| **CA-8** | Header doc cita ADR-0006 e explica regra "outros módulos importam apenas daqui". | code-reviewer confirma em W2 |

---

## 5. Padronizações invariantes (lembrete — vale para TODOS os tickets `FIN-*`)

**Idioma — CLAUDE.md §Idioma:**

| Camada | Idioma | Exemplo |
| :--- | :--- | :--- |
| Pastas, arquivos, identifiers TS | **EN** | `payable/`, `Payable`, `BankOutflow` |
| Strings ao humano na CLI | **PT-BR** via `cli/formatters/` | `"listar-titulos"`, `"Título aprovado com sucesso."` |
| Tipos/eventos/erros internos | **EN** | `PayableApproved`, `'payable-not-approved'` |
| Status (string literal) | **PascalCase EN** | `'Open' \| 'Approved' \| 'Transmitted' \| 'Rejected' \| 'Overdue' \| 'Paid' \| 'Settled'` |
| Docs, REPORTs, REVIEWs, este 000-request.md | **PT-BR** com acentuação | tudo dentro de `.claude/.pipeline/` |
| Commit | **PT-BR** com escopo do módulo | `feat(financial): adiciona esqueleto do módulo` |

**Tradução PT → EN de termos chave do domínio:**

| Domínio PT (handbook) | Código EN |
| :--- | :--- |
| Título Financeiro | `Payable` |
| Título Principal / Título Imposto | `kind: 'Principal' \| 'Tax'` |
| Remessa CNAB | `Remittance` |
| Saída Bancária | `BankOutflow` |
| FITID | `FITID` (branded, mantém sigla bancária) |
| Beneficiário / Dados Bancários | `Beneficiary` / `BeneficiaryBankData` |
| Documento Fiscal | `FiscalDocument` |
| Lote Comunicação | `CommunicationBatch` |
| Transação Bancária | `BankTransaction` |

**Sintaxe TS — invariantes globais (CLAUDE.md §Sintaxe TS):**

- `import type { X }` ou `import { type X }` (verbatimModuleSyntax).
- Extensão `.ts` em todos os imports relativos.
- Subpath alias `#src/*` (declarado em `package.json#imports`).
- `tsconfig` strict completo já está ativo — basta seguir.

**Anti-padrões proibidos:**

- ❌ Qualquer arquivo `.md` fora de `.claude/.pipeline/FIN-MODULE-SCAFFOLD/` ou handbook.
- ❌ Importar de `src/modules/contracts/domain/` ou `application/` — usar `contracts/public-api/` apenas (ADR-0006). Vale o inverso também: futuros `contracts/*` que precisem de `financial/*` passam por `financial/public-api/`.
- ❌ `throw new Error(...)`, `class`, `this`, `any` — regras de camada de `.claude/rules/` valem desde já.
- ❌ Comentários no estilo "adicionado para o ticket FIN-X" — comentários só explicam **por que** algo não-óbvio.

---

## 6. Pipeline previsto

| Wave | Skill / agent | Outcome esperado | REPORT |
| :--- | :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — teste em `tests/modules/financial/public-api/scaffold.test.ts` falha porque o arquivo `src/modules/financial/public-api/index.ts` não existe. | `002-tests/REPORT.md` |
| **W1** | `main-session` (ts-domain-modeler não se aplica — não há domínio) | GREEN — cria o arquivo com header doc + `export {};`. | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | APPROVED — header cita ADR-0006, sem exports prematuros, sem subpastas vazias. | `004-code-review/REVIEW.md` |
| **W3** | `ts-quality-checker` | ALL-GREEN — `typecheck` + `format:check` + `test` + `lint`. | `005-quality/REPORT.md` |

---

## 7. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Ticket parece "vazio demais" para gerar valor. | Escopo XS deliberado — separar **ancoragem do módulo** de **wiring da CLI** (`FIN-CLI-WIRE`) reduz superfície de revisão e protege contra acoplamento entre decisões. |
| Header doc dispersar regras já vivas no handbook. | Header **referencia** ADR-0006, não duplica conteúdo. Source of truth permanece no handbook. |
| `export {}` ser sinalizado como redundante por lint. | Necessário em arquivo ESM puramente declarativo para garantir module shape. Se eslint reclamar, code-reviewer aceita comentário de 1 linha justificando. |

---

## 8. Próximos tickets da fatia

```
FIN-MODULE-SCAFFOLD     (XS) ← este
  └─ FIN-CLI-WIRE        (XS) — script cli:financial + main.ts entrypoint vazio
      └─ FIN-VO-FITID    (XS) — branded type FITID com anti-duplicidade
      └─ FIN-IDS-PAYABLE (XS) — PayableId, RemittanceId (UUID v4 branded)
          └─ FIN-VO-BENEFICIARY-BANK-DATA (S)
              └─ FIN-AGG-PAYABLE-CORE (M) — Open + Approved + Approve
                  └─ ... resto da máquina de estados
```

Histórico de planejamento completo neste 000-request.md serve como contrato — alterações na sequência exigem novo `.claude/.planning/` ou edição negociada.
