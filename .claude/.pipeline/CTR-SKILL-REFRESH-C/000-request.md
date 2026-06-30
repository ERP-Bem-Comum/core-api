# 000 — Request CTR-SKILL-REFRESH-C

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Bloco C — Documental.** Consolida Discriminated Unions & Exhaustive Switch em nova seção `§3.C` da skill `ts-domain-modeler/SKILL.md`. **Ticket documental** — não toca `src/` nem `tests/`.
> **Resolve issue pré-existente W2 do SKILL-REFRESH-D** (`SKILL.md:99` — `throw new Error(...)` no exhaustive default — contradiz a própria §3.D que entrou).
> Depende de `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX` ✅ + `CTR-SKILL-REFRESH-D` ✅ (este último para `§3.D` existir e cross-ref).
> 10º ticket consecutivo do protocolo **Opção B** (pipeline adaptada para doc, igual SKILL-REFRESH-D).

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco C** (FECHADO).
- **Tabela de tickets** (L971):
  > `CTR-SKILL-REFRESH-C` — Bloco C — `.claude/skills/ts-domain-modeler/SKILL.md §3.C — Discriminated Unions & Exhaustive Switch` (**6 DO + 6 DON'T + 2 CONSIDER** + template `Amendment` em aninhamento `status × kind`). **Dep: EXHAUSTIVE-SWITCH-FIX.**

### 📌 Discrepância de contagem documentada

A tabela L971 declara **6 DO + 6 DON'T + 2 CONSIDER**. Contagem real na entrevista (linhas 880-884 + 919-923 + 943-944) usando o marcador literal `(C)`:

| Tipo | Quantos `(C)` na entrevista | L971 declara |
| :--- | :---: | :---: |
| DO | **5** (§28-§32) | 6 |
| DON'T | **5** (§26-§30) | 6 |
| CONSIDER | **2** (§11-§12 do bloco CONSIDER) | 2 |

**Decisão:** usar **5 + 5 + 2** literais da entrevista — não inventar regras para chegar a 6 + 6. Documentar a divergência no REPORT W1.

Alternativa rejeitada: contar a §28 (aninhamento) e §29 (estados eliminam null) duas vezes (uma em §3.D e outra em §3.C). **Rejeitada** porque §3.D já as carrega como DO §29 e parte do tópico State Machine; duplicar na §3.C cria drift entre seções.

---

## Estado atual

### `.claude/skills/ts-domain-modeler/SKILL.md`

- Após `CTR-SKILL-REFRESH-D` ✅, tem **§3.D** populada (Tagged Errors + State Machine + Invariantes Contextuais + Aninhamento).
- **Não tem §3.C** ainda.
- **Linha 99** (na seção "Obrigações" pré-existente) tem `throw new Error(...)` no exhaustive default — **contradiz DON'T D§19 da própria §3.D** (e DON'T C§29 que entrará nesta §3.C):
  ```ts
  default: { const _exhaustive: never = amendment; throw new Error(`unreachable: ${_exhaustive}`); }
  ```
- A "Obrigações" também lista erro como string literal (`type ContractError = 'contract-terminated' | ...`) — **stale** pós-TAGGED-ERRORS — mas correção disso é escopo de `CTR-SKILL-REFRESH-B`/outro, **não deste ticket**.

### Aprendizados do Bloco C já vivos no `src/`

| Sub-tema do Bloco C | Onde está vivo | Ticket-fonte |
| :--- | :--- | :--- |
| Aninhamento status × kind (DO §28) | `src/modules/contracts/domain/amendment/types.ts:55-103` | `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` ✅ (já citado em §3.D) |
| Dupla taxonomia (DO §30) | `Amendment` vs `ContractAdjustment` em `domain/contract/types.ts:117-122` | já vive desde `CTR-AGG-CONTRACT` |
| `toAdjustments` retorna array (DO §31) | `homologate-amendment.ts:57-73 (toContractAdjustment)` | `CTR-USECASE-HOMOLOGATE-AMENDMENT` |
| Exhaustive sem `throw` (DO §32) | `formatPeriod`, `toContractAdjustment` (corrigidos) | `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX` ✅ |

---

## Estado-alvo (Padrão D consolidado para Bloco C)

### Inserir nova seção `## §3.C — Discriminated Unions & Exhaustive Switch`

Posicionamento: **logo após §3.D** (para manter ordem lógica: C depende de D para cross-references) e antes de "Workflow".

### Conteúdo mínimo da §3.C

#### 1. Aninhamento como Padrão de 2 Eixos Discriminantes (DO §28; DON'T §26)

> Cross-ref com §3.D.4 (já cobre este tema do ângulo "State Machine"). Aqui foco é o **idioma TS** do aninhamento.

- Quando 2 eixos discriminantes coexistem (e.g., `status × kind`), modelar como **aninhamento**: union por um eixo + variant interno do outro.
- Exemplo canônico (Amendment):
  ```ts
  type AmendmentVariant = Readonly<                         // eixo kind — independente de status
    | { kind: 'Addition'; impactValue: NonZeroMoney }
    | { kind: 'Suppression'; impactValue: NonZeroMoney }
    | { kind: 'TermChange'; newEndDate: Date }
    | { kind: 'Misc' }
  >;
  type AmendmentCore = Readonly<{ id, ... }> & AmendmentVariant;

  type PendingWithoutDocumentAmendment = AmendmentCore & Readonly<{ status: 'Pending'; ... }>;
  // ... 3 estados, NÃO 12 tipos.
  ```
- **Por que evitar cross-product?** 3 estados × 4 kinds = 12 tipos com **kind sincronizado por estado** — duplica máquina de estado. Aninhamento preserva ortogonalidade: kind permanece fixo durante transições de status.

#### 2. Dupla Taxonomia Legítima (DO §30; DON'T §28)

- **Dupla taxonomia** entre agregados é legítima quando os conceitos são categoricamente distintos:
  - `Amendment` = ato administrativo (4 kinds: Addition/Suppression/TermChange/Misc).
  - `ContractAdjustment` = efeito matemático no Contract (4 kinds: ValueIncrease/ValueDecrease/PeriodExtension/Acknowledgment).
- Mantém Ports & Adapters interno: o domínio do Contract não conhece `Amendment`; só recebe `ContractAdjustment`.
- **NÃO eliminar** `ContractAdjustment` em nome de DRY mecânico. A evolução assimétrica (1:N e 0:1 entre Amendment e Adjustment) prova que não são equivalentes.

#### 3. Função-Ponte Retorna Array (DO §31)

- `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]` retorna **array**, não escalar único.
- Suporta 3 cardinalidades:
  - **1:1** — Addition → ValueIncrease (caso atual).
  - **1:N** — futuro Renewal+Reajuste no mesmo Amendment.
  - **0:1** — futuro ContractAdjustment puramente derivado (sem Amendment correspondente — promoção de status passivo).
- JSDoc da função deve documentar os 3 casos.

#### 4. Exhaustive Switch — Sem `throw` (DO §32; DON'T §29; DON'T §30)

> **Esta é a regra que resolve a issue pré-existente SKILL.md:99.**

Dois padrões aceitos para exhaustive switch:

- **Padrão A — `default` omitido** (preferível quando o `switch` está dentro de uma função que retorna em todos os casos):
  ```ts
  switch (adjustment.kind) {
    case 'ValueIncrease': return /* ... */;
    case 'ValueDecrease': return /* ... */;
    case 'PeriodExtension': return /* ... */;
    case 'Acknowledgment': return /* ... */;
  }
  // tsconfig.noFallthroughCasesInSwitch + exhaustivity enforce em compile.
  ```

- **Padrão B — `default` com `const _: never`** (quando há código pós-switch):
  ```ts
  switch (adjustment.kind) {
    case 'ValueIncrease': /* ... */ break;
    case 'ValueDecrease': /* ... */ break;
    case 'PeriodExtension': /* ... */ break;
    case 'Acknowledgment': /* ... */ break;
    default: { const _exhaustive: never = adjustment; return _exhaustive; }
  }
  ```

**Proibido:**
- `default: throw new Error(...)` — viola "zero throw" do domínio.
- `assertNever(x: never): never` como helper — exige `throw` internamente (TS rejeita função `never` sem corpo); banido.

#### 5. Tabela canônica — 5 DO + 5 DON'T + 2 CONSIDER

> Strings literais para verificador grep.

**DO (5)**
- §28 — Modelar 2 eixos discriminantes como **aninhamento** (union por status, kind interno). Não cross-product.
- §29 — Estados eliminam `null` — campos optional-as-state viram propriedade obrigatória do tipo refinado. *(cross-ref §3.D — comentado nesta posição para referenciar de C também)*
- §30 — Dupla taxonomia legítima entre agregados quando os conceitos são categoricamente distintos. Mantém Ports & Adapters interno.
- §31 — `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]` (**array**) — evolução assimétrica permite 1:N e 0:1.
- §32 — Exhaustive switch: **omitir `default`** (preferível) ou `default: { const _: never = x; return _; }`. Nunca `throw`.

**DON'T (5)**
- §26 — Cross-product de 2 eixos discriminantes (`4 kinds × 3 status = 12 tipos`) — duplica máquina de estado.
- §27 — Transição de estado retornando tipo direto sem `Result` — não há como sinalizar falha sem `throw`.
- §28 — Eliminar `ContractAdjustment` em nome de DRY mecânico — a evolução assimétrica (1:N + 0:1) prova que não é 1:1.
- §29 — `default: throw new Error(...)` no exhaustive switch — viola "zero throw". Contradição admitida do PhD.
- §30 — `assertNever(x: never): never` como helper — exige `throw` (TS rejeita função `never` sem corpo).

**CONSIDER (2)**
- §11 — `Extract<Amendment, { status: 'X' }>` como type helper se o aninhamento ficar verboso em consumidores.
- §12 — JSDoc do `Amendment.toAdjustments` documentando os 3 casos: 1:1 (Addition→ValueIncrease), 1:N (Renewal+Reajuste futuro), 0:1 (ContractAdjustment sem Amendment).

#### 6. Tickets vivos como referência

| Conceito da §3.C | Ticket vivo |
| :--- | :--- |
| Aninhamento status × kind | `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` |
| Dupla taxonomia (`Amendment` ↔ `ContractAdjustment`) | `CTR-AGG-CONTRACT` + `CTR-AGG-AMENDMENT` |
| `toAdjustments` retorna array | `CTR-USECASE-HOMOLOGATE-AMENDMENT` |
| Exhaustive sem throw | `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX` |

### Correção da issue pré-existente — `SKILL.md:99`

Substituir o exhaustive default da seção "Obrigações":

**De:**
```ts
default: { const _exhaustive: never = amendment; throw new Error(`unreachable: ${_exhaustive}`); }
```

**Para** (Padrão B do §3.C.4):
```ts
default: { const _exhaustive: never = amendment; return _exhaustive; }
```

Ou (preferível — Padrão A — se o `switch` puder ficar em função return-only):
- Omitir o `default:` inteiramente. Manter um comentário explicativo: `// Exhaustive: tsconfig.noFallthroughCasesInSwitch enforce.`

> **Crítica do W2 do SKILL-REFRESH-D atendida.**

---

## Critérios de aceitação

### CA1 — Seção §3.C existe

- `## §3.C — Discriminated Unions & Exhaustive Switch` em `SKILL.md`.
- Posicionada **logo após §3.D**.

### CA2 — 5 sub-seções

A §3.C contém 5 sub-seções com títulos identificáveis (use H3/H4):
1. Aninhamento como Padrão de 2 Eixos.
2. Dupla Taxonomia Legítima.
3. Função-Ponte Retorna Array.
4. Exhaustive Switch — Sem `throw`.
5. Tabela canônica DO/DON'T/CONSIDER + 6. Tickets vivos.

### CA3 — Contagem exata: **5 DO + 5 DON'T + 2 CONSIDER**

- Marcadores literais: `**DO (5)**`, `**DON'T (5)**`, `**CONSIDER (2)**`.
- Cada lista tem o número exato de itens.

### CA4 — Padrão A + Padrão B do exhaustive switch ambos presentes

- Trecho de código mostrando **Padrão A** (omitir `default`).
- Trecho de código mostrando **Padrão B** (`const _: never = x; return _;`).
- Strings literais identificáveis pelo verificador: `Padrão A` e `Padrão B`.

### CA5 — Issue pré-existente `SKILL.md:99` corrigida

- A linha 99 (ou linha equivalente após o insert da §3.C) **NÃO** tem mais `throw new Error(`.
- `grep "throw new Error" .claude/skills/ts-domain-modeler/SKILL.md` retorna **zero** (não pode mais existir).
- Ou foi convertido para Padrão B (`return _exhaustive`), ou foi omitido (Padrão A) com comentário explicativo.

### CA6 — Aninhamento (anti cross-product) explicitado

- A §3.C menciona "cross-product" e "3 estados × 4 kinds = 12 tipos" como anti-padrão.
- Exemplo `AmendmentVariant` mostrado fiel ao `src/modules/contracts/domain/amendment/types.ts`.

### CA7 — Dupla taxonomia explicitada

- A §3.C menciona explicitamente `Amendment` (administrativo) **vs** `ContractAdjustment` (matemático) como exemplo canônico.
- DON'T `Eliminar ContractAdjustment` presente.

### CA8 — 4 tickets vivos referenciados

- Tabela "Tickets vivos" com `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`, `CTR-AGG-CONTRACT`, `CTR-USECASE-HOMOLOGATE-AMENDMENT`, `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX`.

### CA9 — `src/` e `tests/` intocados; zero regressão

- `git diff --cached --name-only -- src/ tests/` zero linhas.
- `pnpm run typecheck` ✅, `pnpm test` `fail 0`, `pnpm run lint` ✅.

### CA10 — Doc fiel ao código vivo

- Snippets de Amendment aninhado correspondem a `src/modules/contracts/domain/amendment/types.ts`.
- Snippets de exhaustive switch correspondem a algum `switch` real do `src/` (`contract.ts` em `applyHomologatedAdjustment` é canônico).

---

## Arquivos previstos

```
.claude/skills/ts-domain-modeler/SKILL.md   (insert §3.C ≈ 150-250 LOC + fix linha 99)
```

`src/` e `tests/` — **NÃO TOCAR**.

---

## Pipeline adaptada (idêntica a SKILL-REFRESH-D)

| Wave | Adaptação |
| :--- | :--- |
| **W0 RED** | Shell script verificador em `002-tests/verify-skill-refresh-c.sh` com 10 critérios. |
| **W1 GREEN** | `ts-domain-modeler` escreve §3.C + corrige `SKILL.md:99`. |
| **W2 REVIEW** | `code-reviewer` audit qualitativo + verifica que o fix do default não introduziu nada estranho. |
| **W3 QUALITY** | Verificador W0 + typecheck/test/lint + format:check SKILL.md isolado. |

---

## Não-objetivos

- **Refatorar erros stale (`type ContractError = 'X' | ...`) na seção "Obrigações"** — escopo de `CTR-SKILL-REFRESH-B` (não toca neste ticket).
- **Criar §3.A/B/H/I/L** — cada um é seu ticket.
- **Refatorar Money no template** — escopo `CTR-SKILL-REFRESH-B`.

---

## Risco / pontos de atenção

1. **Cross-reference com §3.D.** §3.C menciona `Aninhamento` que já está em §3.D.4. Decisão: §3.D foca no **porquê** (State Machine necessária); §3.C foca no **como** (idioma TS dos discriminators). Cross-refs explícitas evitam drift.
2. **Discrepância 6+6 vs 5+5.** Documentar no REPORT que a contagem da L971 não bate com a entrevista canônica; usar 5+5+2 reais.
3. **Fix da linha 99.** Atenção pra não introduzir regressão no exemplo. O contexto desse switch é fictício (não código de produção), então qualquer um dos 2 padrões (A ou B) funciona.
4. **Sub-agent bloqueio de Write.** Mesmo padrão dos últimos tickets — fallback admin pode ser necessário em W3.

---

## Próximos tickets (cadeia documental)

```
[FECHADO] SKILL-REFRESH-D → [ESTE] SKILL-REFRESH-C
    ↘ [LATER] SKILL-REFRESH-B (Smart Constructor canônico — 9+9+4, resolve `Money` Padrão A → D)
    ↘ [LATER] SKILL-REFRESH-I (Composição Funcional — 7+6+3)
    ↘ [LATER] SKILL-REFRESH-H (Organização de Módulo — 10+6+2)
    ↘ [LATER] SKILL-REFRESH-A (Bloco A simples)
    ↘ [LATER] SKILL-REFRESH-L (Síntese Canônica — 40+16+5+44)
```
