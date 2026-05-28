# 000 — Request CTR-SKILL-REFRESH-D

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Bloco D — Documental.** Ticket de **consolidação documental** — não modifica `src/` nem `tests/`.
> Depende de **todos os tickets do Bloco D fechados** ✅: `CTR-DOMAIN-TAGGED-ERRORS`, `CTR-DOMAIN-STATE-MACHINE-CONTRACT`, `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`, `CTR-DOMAIN-INVARIANT-CONTEXTUAL`.
> 9º ticket consecutivo do protocolo **Opção B**.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco D** (FECHADO).
- **Tabela de tickets** (L969):
  > `CTR-SKILL-REFRESH-D` — Bloco D — `.claude/skills/ts-domain-modeler/SKILL.md §3.D — Tagged Errors & Invariantes em Tipos` (**10 DO + 7 DON'T + 2 CONSIDER + nomenclatura semântica VO/Agregado/Caso de Uso**). **Dep: todos os anteriores de D.**

---

## Estado atual

### `.claude/skills/ts-domain-modeler/SKILL.md`

- 319 linhas, criada 2026-05-14.
- **Não tem** seções `§3.A/B/C/D/H/I/L` — estrutura ainda é a original do flutter-expert adaptada.
- "Templates rápidos" (linhas 222-255) mostra Money no **Padrão A** (`export const Money = { ... }`) — desatualizado para Padrão D, mas isso é escopo de `CTR-SKILL-REFRESH-B` (não deste ticket).
- "Checklist de auto-revisão" (linhas 274-285) tem regras gerais; sem regras específicas do Bloco D.
- "Anti-patterns específicos do domínio" (tabela linhas 288-298) sem itens novos do Bloco D.

### Aprendizados do Bloco D já vivos no `src/` (a citar como exemplos)

| Sub-tema do Bloco D | Onde está vivo | Ticket-fonte |
| :--- | :--- | :--- |
| Tagged Errors (`{ tag, payload? }`) | `src/modules/contracts/domain/contract/errors.ts`, `amendment/errors.ts` | `CTR-DOMAIN-TAGGED-ERRORS` ✅ |
| State Machine — `parseActive` + tipos refinados | `src/modules/contracts/domain/contract/{types,contract}.ts` | `CTR-DOMAIN-STATE-MACHINE-CONTRACT` ✅ |
| State Machine — `parsePending*` + aninhamento status × kind | `src/modules/contracts/domain/amendment/{types,amendment}.ts` | `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` ✅ |
| Invariante Contextual — `NonZeroMoney` (rota α + γ) | `src/modules/contracts/domain/shared/non-zero-money.ts` + `application/use-cases/create-amendment.ts` | `CTR-DOMAIN-INVARIANT-CONTEXTUAL` ✅ |
| Mapper rehidratação com tagged error | `src/modules/contracts/adapters/persistence/mappers/{contract,amendment}.mapper.ts` | os 3 tickets acima |

---

## Estado-alvo (Padrão D consolidado)

### Inserir nova seção em `SKILL.md`: `## §3.D — Tagged Errors & Invariantes em Tipos`

Posicionamento sugerido: **após "Templates rápidos" e antes de "Workflow"** (linha ~258).

### Conteúdo mínimo da §3.D

#### 1. Tagged Errors (DO D§22, §23, §24)

- Shape canônico: `Readonly<{ tag: 'PascalCaseTag'; ...payload? }>`.
- Case constructors como **free functions** em `errors.ts` por agregado.
- Consumo via `import * as XError from './errors.ts'` (Padrão D — module-as-namespace).
- Payload **só em erros de invariante**: carrega **as duas peças de evidência que colidiram** (estado atual + tentativa). Validações simples (`*Required`, `*Zero`) ficam nulárias.
- Naming: **PascalCase adjetival/factual** (`ContractNotActive`, `AmendmentDocumentAlreadyAttached`). Eventos em PascalCase passado (`ContractCreated`).
- **Subtipo exato** declarado no return type de cada case constructor — preserva narrowing nos callers.

→ Ratio legis: erro como valor estruturado, não exceção opaca. Cada erro contém o que o caller precisa pra reagir (mensagem PT, retry, telemetria).

#### 2. State Machine em Tipos (DO D§20, §21; DO C§29)

- **Um tipo refinado por estado** do agregado. Exemplo canônico:
  ```ts
  type ActiveContract     = ContractCore & { status: 'Active' };
  type ExpiredContract    = ContractCore & { status: 'Expired'; endedAt: Date };
  type TerminatedContract = ContractCore & { status: 'Terminated'; endedAt: Date };
  type Contract = ActiveContract | ExpiredContract | TerminatedContract;
  ```
- **Transições são funções totais** sobre o tipo refinado:
  ```ts
  expire(c: ActiveContract, at: Date): Result<{ contract: ExpiredContract; event }, ContractError>
  ```
- **Refinement constructors** via `parseActive`/`parsePending` (**não** `assertActive` — DON'T D§19, §23).
- **Estados ELIMINAM `null`** — campos `T | null` que codificam estado viram propriedade obrigatória do tipo refinado (DO C§29). Ex.: `endedAt` ausente em Active, `Date` obrigatório em Expired/Terminated.
- **Discriminador composto** quando necessário: para Amendment, `status` ('Pending' vs 'Homologated') + presença de `signedDocumentRef` (null vs `DocumentId`) discriminam os 3 estados refinados sem novo campo `state`.

→ Ratio legis: "Parse, don't validate" (Wlaschin). O tipo carrega a invariante; o compilador rejeita combinações inválidas; runtime checks somem ou viram refinement constructors na borda.

#### 3. Invariantes Contextuais — 3 Rotas Canônicas (DO D§25-§27)

| Rota | Nome semântico | Quando usar | Exemplo vivo |
| :--- | :--- | :--- | :--- |
| **α** | **VO como Prova** | Invariante **atemporal e reusável** (vale fora deste BC ou em múltiplos contextos) | `NonZeroMoney` brandado em `domain/shared/non-zero-money.ts` |
| **β** | **Agregado como Guardião** | Invariante **contextual e mutável**, dependente do estado interno do agregado | Regras de transição dentro de `Contract.applyHomologatedAdjustment` (cents > currentValue → err) |
| **γ** | **Caso de Uso como Orquestrador** | Invariante **contextual + específico do caso de uso**, exigindo VO brandado no construtor | `createAmendment` chama `NonZeroMoney.from(money)` antes de `Amendment.create` |

- **Heurística de escolha:** quando a invariante for **estrutural e reusável** → α (subtype). Quando for **mutável de estado interno** → β (agregado). Quando for **específica do caso** → γ (use case orquestra + VO brandado na borda).
- **Combinação α + γ** é canônica: VO brandado em `domain/shared/` + use case refina na borda (exemplo: `NonZeroMoney` em Amendment Addition/Suppression).
- **Nomeação semântica explícita** (proposta do host, sustentada Wlaschin/Evans): use os 3 nomes no comentário do código quando aplicar uma rota.

→ Ratio legis: cada rota tem custo distinto. α produz proliferação de VOs (`PositiveMoney`, `MoneyGT100`, …) se usado mal; β mantém runtime check; γ exige passo extra no caso de uso. Escolha guiada pelo **escopo da invariante**, não preferência estilística.

#### 4. Aninhamento de Eixos Discriminantes (DO C§28; DON'T C§26)

- **2 eixos discriminantes** (ex.: `status × kind`) → modelar como **aninhamento**: union por status, kind como mixin/variant **dentro** do tipo Core.
- **NUNCA cross-product** (3 status × 4 kinds = 12 tipos) — duplica máquina de estado.
- Exemplo canônico:
  ```ts
  type AmendmentVariant = Readonly<       // eixo kind — INDEPENDENTE do status
    | { kind: 'Addition'; impactValue: NonZeroMoney }
    | { kind: 'Suppression'; impactValue: NonZeroMoney }
    | { kind: 'TermChange'; newEndDate: Date }
    | { kind: 'Misc' }
  >;
  type AmendmentCore = Readonly<{ id, ... }> & AmendmentVariant;

  type PendingWithoutDocumentAmendment = AmendmentCore & Readonly<{ status: 'Pending'; ... }>;
  // etc — 3 estados × kind aninhado, NÃO 12 tipos
  ```
- **`Extract<Union, { status: 'X' }>`** como type helper se consumidores precisarem narrowar para um estado específico.

→ Ratio legis: 3 estados × 4 kinds são **independentes** — kind não muda durante transição de estado. Aninhamento preserva ortogonalidade; cross-product força sincronização redundante.

#### 5. Tabela canônica — 10 DO + 7 DON'T + 2 CONSIDER

> Citações literais da entrevista (linhas 872-925, 941-942). Cada item linka para o ticket vivo que o aplicou.

**DO (10)**
- §20 — Um tipo refinado por estado de agregado. Transições totais.
- §21 — Refinement via `parseActive`/`parsePending`. Não `assertActive`.
- §22 — Tagged error shape **flat** (`{ tag, …payload }`). Case constructors free functions.
- §23 — Payload de invariante carrega **duas peças de evidência** (estado + tentativa).
- §24 — Erros PascalCase adjetival/factual. Eventos PascalCase passado.
- §25 — Rota α (VO como Prova) — invariante atemporal e reusável.
- §26 — Rota γ (Caso de Uso como Orquestrador) — VO brandado na borda.
- §27 — Rota β (Agregado como Guardião) — invariante contextual de estado interno.
- §28 — Aninhamento 2 eixos discriminantes (status × kind). Não cross-product.
- §29 — Estados eliminam `null` — optional-as-state vira propriedade obrigatória.

**DON'T (7)**
- §19 — `assertActive` que devolve `Contract` cru — fere refinement.
- §20 — `if (status !== 'X')` espalhado em business code — shotgun parsing.
- §21 — `export const ContractError = { … } as const` ao lado de `export type ContractError` — declaration merging informal.
- §22 — Erro de invariante carregando primitivo cru sem ser evidência.
- §23 — Naming imperativo (`assertActive`, `validateActive`).
- §24 — Codificar invariante reusável como `if` no agregado — promover para VO.
- §25 — Espalhar o **mesmo** `if` em múltiplos pontos — declarar uma vez como tipo.

**CONSIDER (2)**
- `rehydrate<Aggregate>(row)` único dispatcher lendo `row.status` e despachando para tipo refinado correto.
- Case constructor declarar o **subtipo exato** que produz (`ContractNotActive`, não `ContractError`) — preserva narrowing nos callers.

#### 6. Tickets vivos como referência

| Conceito da §3.D | Ticket vivo |
| :--- | :--- |
| Tagged Errors | `CTR-DOMAIN-TAGGED-ERRORS` |
| State Machine Contract (`Active`/`Expired`/`Terminated`) | `CTR-DOMAIN-STATE-MACHINE-CONTRACT` |
| State Machine Amendment (3 estados × 4 kinds aninhado) | `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` |
| Invariante α + γ (NonZeroMoney) | `CTR-DOMAIN-INVARIANT-CONTEXTUAL` |

### Atualizações secundárias no SKILL.md

1. **Checklist de auto-revisão** (linha 274) — adicionar 3 itens:
   - [ ] Erros são tagged records, não string literals (`{ tag: 'X', ...payload? }`).
   - [ ] Cada estado do agregado é um tipo refinado distinto — sem `T | null` codificando estado.
   - [ ] Transições têm assinatura refinada (`expire(c: ActiveContract): …`).

2. **Anti-patterns** (tabela linha 290) — adicionar 2 linhas:
   - `assertPending(a): Amendment` — usar `parsePending(a): Result<PendingAmendment, AmendmentNotPending>`.
   - 3 status × 4 kinds = 12 tipos — usar aninhamento status × kind.

3. **Changelog** — adicionar entrada `2026-05-20: §3.D criada (Tagged Errors + State Machine + Invariantes Contextuais + Aninhamento)`.

---

## Critérios de aceitação

### CA1 — Seção §3.D existe

- Arquivo `.claude/skills/ts-domain-modeler/SKILL.md` tem `## §3.D — Tagged Errors & Invariantes em Tipos`.
- Posicionada após "Templates rápidos" e antes de "Workflow".

### CA2 — Estrutura completa

A §3.D contém 6 sub-seções com títulos identificáveis:
1. Tagged Errors.
2. State Machine em Tipos.
3. Invariantes Contextuais — 3 Rotas Canônicas.
4. Aninhamento de Eixos Discriminantes.
5. Tabela canônica DO/DON'T/CONSIDER.
6. Tickets vivos como referência.

### CA3 — Contagem exata: 10 DO + 7 DON'T + 2 CONSIDER

- A tabela canônica tem **exatamente** 10 entradas DO, 7 DON'T, 2 CONSIDER.
- Verificável via grep: `grep "^- §" SKILL.md | grep "^- §[0-9]"` conta esses números nos blocos da tabela.

### CA4 — Nomenclatura semântica explícita

- A §3.D menciona literalmente os 3 nomes: **"VO como Prova"** (α), **"Agregado como Guardião"** (β), **"Caso de Uso como Orquestrador"** (γ).
- Para cada rota, há descrição "quando usar" + exemplo vivo do código.

### CA5 — Aninhamento ≠ cross-product explicitado

- A §3.D contém exemplo canônico do Amendment com aninhamento.
- A §3.D contém aviso explícito de "NUNCA cross-product (3×4=12)".

### CA6 — Tickets vivos referenciados

- A §3.D tem tabela "Tickets vivos como referência" com **4 tickets** (TAGGED-ERRORS, STATE-MACHINE-CONTRACT, STATE-MACHINE-AMENDMENT, INVARIANT-CONTEXTUAL).
- Cada link aponta para `.claude/.pipeline/<TICKET>/` ou similar (não pra arquivo inexistente).

### CA7 — Checklist e antipatterns atualizados

- Checklist de auto-revisão (linha ~274) tem 3 novos itens (tagged records, tipos refinados, transições refinadas).
- Tabela de antipatterns (linha ~290) tem 2 novas linhas (assertPending → parsePending; cross-product → aninhamento).

### CA8 — `src/` e `tests/` intocados

- `git status --porcelain src/ tests/` retorna **zero** linhas modificadas pelo ticket.
- Gates de código (typecheck/test/lint) continuam verdes — não regredir nada.

### CA9 — Doc consistente com código vivo

- Trechos de código TS na §3.D devem ser **compilable** se isolados (ou pelo menos faithful a `src/`).
- Exemplo do Contract reflete o que está em `src/modules/contracts/domain/contract/types.ts`.
- Exemplo do Amendment reflete o que está em `src/modules/contracts/domain/amendment/types.ts`.

---

## Arquivos previstos

```
.claude/skills/ts-domain-modeler/SKILL.md   (insert §3.D ≈ 200-300 LOC + 2 ajustes secundários)
```

### `src/` e `tests/` — **NÃO TOCAR**

---

## Pipeline adaptada (ticket de documentação)

| Wave | Adaptação |
| :--- | :--- |
| **W0 RED** | Definir critérios verificáveis (greps específicos, contagens DO/DON'T/CONSIDER, presença de termos canônicos). Sem testes Node — usar shell script ou checklist do REPORT que o W2 valida. |
| **W1 GREEN** | `ts-domain-modeler` escreve a §3.D + ajustes secundários. |
| **W2 REVIEW** | `code-reviewer` audita qualitativamente: cobertura dos critérios W0, ratio legis em cada DO/DON'T, links válidos, fidelidade ao código vivo. |
| **W3 QUALITY** | Rodar typecheck/test/lint para confirmar **zero regressão** em código (deveria estar verde porque nada de `src/` foi tocado). `format:check` na SKILL.md específica via `prettier --check .claude/skills/ts-domain-modeler/SKILL.md`. |

---

## Não-objetivos

- **Refatorar o Padrão A no template do Money** (linha 244-254) — escopo de `CTR-SKILL-REFRESH-B` (separadamente).
- **Criar §3.A/B/C/H/I/L** — cada um é seu próprio ticket.
- **Adicionar diagramas Mermaid** — opcional; pode entrar em `CTR-SKILL-REFRESH-C` (state machine) ou `CTR-SKILL-REFRESH-H` (layout).
- **Reescrever a SKILL.md inteira** — só inserir §3.D + ajustar 2 seções existentes (checklist + antipatterns).

---

## Risco / pontos de atenção

1. **Tamanho da §3.D.** Estimativa: 200-300 LOC. Se passar de 400, considerar quebrar em arquivos `references/3.D.tagged-errors.md`, `3.D.state-machine.md`, etc. — mas isso pode esperar W2 review.
2. **Trechos de código embutidos.** Devem ser fiéis ao `src/` vivo. Se o `src/` evoluir, a §3.D pode ficar stale — mitigação: cada trecho cita o arquivo-fonte como `// src/modules/contracts/domain/contract/types.ts` no header do bloco.
3. **Sub-agent bloqueio de Write.** Padrão emergente nos últimos tickets: `ts-domain-modeler` skill pode alegar bloqueio de Write em arquivo de doc fora de `src/`. Workaround: fallback admin (main session escreve a SKILL.md). Documentado em [`.claude/.planning/SUBAGENT-INTERRUPTION-FIX.md`](../../../.planning/SUBAGENT-INTERRUPTION-FIX.md).

---

## Próximos tickets (cadeia documental)

```
[ESTE] SKILL-REFRESH-D
    ↘ [LATER] SKILL-REFRESH-C (Discriminated Unions + Exhaustive Switch — 6+6+2)
    ↘ [LATER] SKILL-REFRESH-B (Smart Constructor canônico — 9+9+4)
    ↘ [LATER] SKILL-REFRESH-I (Composição Funcional — 7+6+3)
    ↘ [LATER] SKILL-REFRESH-H (Organização de Módulo — 10+6+2)
    ↘ [LATER] SKILL-REFRESH-A (Bloco A simples)
    ↘ [LATER] SKILL-REFRESH-L (Síntese Canônica — 40+16+5+44)
```

Cada um consolida seu bloco respectivo na SKILL.md como seção §3.X.
