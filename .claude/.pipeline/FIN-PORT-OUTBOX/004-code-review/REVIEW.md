# Code Review — Ticket FIN-PORT-OUTBOX — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T12:12Z
**Round:** 1 / 3
**Escopo revisado:** 7 arquivos (3 prod novos + 1 prod modificado + 1 test modificado + 2 test novos)

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `src/modules/financial/public-api/events.ts` | 58 | NOVO |
| 2 | `src/modules/financial/application/ports/outbox.ts` | 66 | NOVO |
| 3 | `src/modules/financial/adapters/outbox/outbox.in-memory.ts` | 123 | NOVO |
| 4 | `src/modules/financial/public-api/index.ts` | 15 | MODIFICADO |
| 5 | `tests/modules/financial/public-api/scaffold.test.ts` | 49 | MODIFICADO |
| 6 | `tests/modules/financial/application/ports/outbox.contract.ts` | 162 | NOVO |
| 7 | `tests/modules/financial/adapters/outbox/outbox.in-memory.test.ts` | 105 | NOVO |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — Nome do `describe` do CA-16 pode confundir leitor

**Categoria:** G (naming / clareza)
**Localização:** `tests/modules/financial/adapters/outbox/outbox.in-memory.test.ts:76`

```ts
describe('InMemoryOutbox — duplicate eventId (CA-16)', () => {
  it('dois appends do MESMO event object geram 2 rows com eventIds distintos (UUID por append)', async () => {
```

O label do `describe` sugere validação de **erro de duplicate**, mas o teste valida o oposto: a **ausência** de duplicate quando o caller reusa o event object (UUIDs novos por append). O comentário inline (L78-83) explica perfeitamente, mas o título do `describe` cria expectativa contrária.

**Sugestão (não-bloqueia):**

```ts
// alternativa 1 — explícita
describe('InMemoryOutbox — eventId generation per append (CA-16)', () => {

// alternativa 2 — mantém referência ao CA mas inverte o foco
describe('InMemoryOutbox — append idempotence semantics (CA-16)', () => {
```

Padrão atual ainda é defensável (o CA fala de "duplicate"), mas ler só o título sem o body pode enganar.

#### Sugestão 2 — Header doc do adapter omite `markProcessedSync` na lista de escopo

**Categoria:** G (clareza de docs)
**Localização:** `src/modules/financial/adapters/outbox/outbox.in-memory.ts:7-12`

```ts
 * **Escopo intencionalmente enxuto:** apenas `port.append` + helpers de
 * inspeção/teste. Worker helpers (`findPendingForUpdate`, `markFailed`,
 * `moveToDeadLetter`) ficam para `FIN-WORKER-OUTBOX` junto do schema MySQL e
 * do mapper Drizzle (analogamente, `OutboxRow` "real" virá com o adapter
 * Drizzle).
```

A doc menciona `port.append + helpers de inspeção/teste` genericamente, mas o factory expõe **5 funções concretas** (`port`, `all`, `pending`, `markProcessedSync`, `clear`). A JSDoc específica de `markProcessedSync` (L50-56) cobre, mas leitor que só lê o header doc principal não enxerga.

**Sugestão (não-bloqueia):** adicionar 1 linha no escopo, ex.:

```ts
 * **API do factory:** `port.append` + `all`/`pending` (inspeção) +
 *   `markProcessedSync` (transição manual de pending → processed para a suite
 *   contratual) + `clear` (reset interno). Worker helpers (…) ficam para …
```

#### Sugestão 3 — `scaffold.test.ts` itera com `for/assert.ok` em vez de `assert.deepEqual` superset

**Categoria:** G (clareza dos testes)
**Localização:** `tests/modules/financial/public-api/scaffold.test.ts:41-46`

```ts
for (const expected of ['FINANCIAL_SCHEMA_VERSION', 'isFinancialModuleEvent']) {
  assert.ok(
    keys.includes(expected),
    `public-api/index.ts deve exportar ${expected} (adicionado por FIN-PORT-OUTBOX)`,
  );
}
```

A primeira falha aborta o teste — não acumula. Para um conjunto de 2 exports é irrelevante, mas se o set crescer (tickets futuros adicionarem mais exports), o desenvolvedor vê 1 erro por vez.

**Sugestão (não-bloqueia):**

```ts
const expected = ['FINANCIAL_SCHEMA_VERSION', 'isFinancialModuleEvent'];
const missing = expected.filter((k) => !keys.includes(k));
assert.deepEqual(
  missing,
  [],
  `public-api/index.ts deve exportar todos: ${expected.join(', ')} — faltando: ${missing.join(', ')}`,
);
```

Atual está aceitável — só ganha em diagnóstico quando o set crescer.

---

## O que está bom

### Auditoria automática — todas verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/{public-api/events.ts,application/ports/outbox.ts,adapters/outbox/outbox.in-memory.ts}
(nenhum)

$ grep -nE " as " src/modules/financial/adapters/outbox/outbox.in-memory.ts
54:  const candidate = u as { type?: unknown };   ← N/A, este é events.ts (type guard narrow)
106:      (row as { processedAt: Date | null }).processedAt = new Date();
117:    all: () => rows as readonly FinancialOutboxRow[],
118:    pending: () => rows.filter((r) => r.processedAt === null) as readonly FinancialOutboxRow[],
```

3 casts no adapter — todos escopados e legítimos:
- **L106:** narrow `Readonly` → mutable apenas no escopo interno (mutação controlada do adapter InMemory).
- **L117/L118:** narrow `T[]` mutável interno → `readonly T[]` na API pública (mesmo pattern do `InMemoryContractRepository` e do `InMemoryOutbox` do `contracts/`).

**Zero `as Brand`, zero `as any`, zero `as unknown as T`.**

### Posicionamento arquitetural justificado no próprio código

```ts
// outbox.ts:13-15
 * Posicionamento — `application/ports/` (não `domain/`): este port é técnico
 * (transporte async de eventos), sem invariante de agregado. Difere do
 * `PayableRepository` em `domain/payable/repository.ts` que carrega R2 FITID.
```

Header doc explica explicitamente **por que o port está em `application/ports/`** e não em `domain/`. O reviewer não precisa adivinhar — a divergência intencional vs. o ticket anterior está documentada no source. Skill `ports-and-adapters` §"Critério H2" respeitada: invariante de agregado fica em `domain/`, transporte fica em `application/`.

### Tagged errors com payload — Padrão D bem aplicado

```ts
export type OutboxAppendSerializationFailed = Readonly<{
  tag: 'OutboxAppendSerializationFailed';
  eventType: string;
  reason: string;
}>;
export type OutboxAppendDuplicateEventId = Readonly<{
  tag: 'OutboxAppendDuplicateEventId';
  eventId: string;
}>;
```

Justifica a divergência vs `PayableRepositoryError` (string literal union): aqui há **payload semântico relevante** (`eventType`/`reason`/`eventId`) que o caller precisa para debug/log/retry. Constructors completos e tipados (3 funções, uma por variant).

### Type guard `isFinancialModuleEvent` cobre as 4 rejeições corretas

```ts
export const isFinancialModuleEvent = (u: unknown): u is FinancialModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;   // rejeita primitivos + null
  const candidate = u as { type?: unknown };               // narrow controlado
  if (typeof candidate.type !== 'string') return false;    // rejeita type ausente / não-string
  return KNOWN_EVENT_TYPES.has(candidate.type);            // rejeita type desconhecido
};
```

Padrão idêntico a `isContractsModuleEvent` (linha-por-linha — defensável para consistência cross-módulo). `KNOWN_EVENT_TYPES` tem **exatamente os 9 nomes** do `PayableEvent` (verificado em `src/modules/financial/domain/payable/events.ts:8-16`). Quando agregado novo entrar, o header doc (L13-15) já avisa: *"basta estender o type union e atualizar `KNOWN_EVENT_TYPES`"*.

### Suite contratual genérica desde já

```ts
export interface OutboxFactory {
  make: () => Promise<{
    port: OutboxPort;
    helpers: {
      all: () => readonly FinancialOutboxRow[];
      pending: () => readonly FinancialOutboxRow[];
      markProcessed: (eventId: string) => void;
    };
  }>;
}
```

Factory `make()` **async desde o W0** — quando o adapter Drizzle vier com transação + cleanup real (`FIN-ADAPTER-OUTBOX-DRIZZLE`), o tipo já comporta sem mudança. Pattern de DRY arquitetural respeitado.

### Imports `import type` honrando `verbatimModuleSyntax`

```ts
// outbox.ts
import type { Result } from '#src/shared/index.ts';
import type { FinancialModuleEvent } from '../../public-api/events.ts';

// outbox.in-memory.ts — runtime vs type separados
import { ok, err } from '#src/shared/index.ts';                                    // runtime
import type { Result } from '#src/shared/index.ts';                                // type
import { newUuid } from '#src/shared/utils/id.ts';                                 // runtime
import type { OutboxPort, OutboxAppendError } from '../../application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '../../application/ports/outbox.ts';  // runtime
import type { FinancialModuleEvent } from '../../public-api/events.ts';
```

100% explícito. `import type` separado de imports runtime, sem mistura. Extensão `.ts` em todos os relativos. Subpath `#src/*` usado consistentemente.

### Atomicidade do `append`: valida tudo antes de mutar nada

```ts
// outbox.in-memory.ts:85-94
for (const insert of inserts) {
  if (seenIds.has(insert.eventId)) {
    return err(outboxAppendDuplicateEventId(insert.eventId));
  }
}
for (const insert of inserts) {
  seenIds.add(insert.eventId);
  rows.push(insert);
}
```

**Dois loops separados** — primeiro valida invariante (sem mutação), depois insere. Se o segundo INSERT da lista for duplicate, NENHUM é persistido. Replica semântica de transação batch que o adapter Drizzle terá. Boa antecipação.

### Defesa em profundidade documentada no source

```ts
// L83-84
// Defesa em profundidade — não ocorre com UUIDs gerados aqui, mas alinha
// com semântica da PK no adapter Drizzle futuro.
```

O reviewer não precisa adivinhar por que existe o branch `seenIds.has(...)` se ele nunca dispara com UUIDs gerados internamente. Comentário explica a intenção arquitetural (alinhar com PK do banco).

### Scaffold test atualizado com cuidado

```ts
// scaffold.test.ts:1-15
 * Ticket original: FIN-MODULE-SCAFFOLD (placeholder vazio).
 * Atualizado por: FIN-PORT-OUTBOX — primeiro ticket a popular a public-api
 * com `FinancialModuleEvent` + `FINANCIAL_SCHEMA_VERSION` + `isFinancialModuleEvent`.
```

A transição **CA-2 (zero exports) → validação incremental** é explicada no header com data e ticket origem. CA-1 (arquivo existe) e CA-3 (subpath alias) preservados literalmente. Mudança mínima e justificada.

### Fixtures sem `new Date()` global (DO B§14)

```ts
// outbox.contract.ts:32
const mkDate = () => new Date('2026-01-15T10:00:00.000Z');
```

Datas literais ISO. `mkDate()` helper retorna sempre a mesma data — determinístico. Para CA-12 (ordem preservada), `makePayableMarkedOverdueEvent` usa data **distinta** (`2026-01-16`), garantindo que os 2 events tenham timestamps diferentes sem ambiguidade.

### Pattern espelha `contracts/` linha-por-linha

| Item | `contracts/` | `financial/` (este ticket) |
| :--- | :--- | :--- |
| Header doc do port | cita ADR-0015 + decisão D2 | ✅ idem |
| Tagged errors com 3 variants | ✅ | ✅ |
| `isXxxModuleEvent` 4 branches | ✅ | ✅ |
| Suite contract async `make()` | ✅ | ✅ |
| Adapter expõe `port` + helpers | ✅ | ✅ |
| 2 loops em `append` (validate-then-insert) | ✅ | ✅ |
| `seenIds` Set defesa | ✅ | ✅ |
| `markProcessedSync` síncrono na suite | ✅ | ✅ |

Consistência cross-módulo total. Custo de manutenção futura cai — quem entende contracts entende financial.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | N/A — este ticket não toca `domain/` (port + adapter + public-api) |
| B. Smart constructors / Branded | N/A — port é type contract, public-api é union |
| C. Discriminated unions | ✅ `OutboxAppendError` tem `tag`; `FinancialModuleEvent` herda `type` discriminador do `PayableEvent` |
| D. Ports & Adapters | ✅ Port é `type Readonly<{...}>`; adapter é factory function; conversão `throw → Result` desnecessária (zero `throw`); par InMemory presente |
| E. Modular Monolith | ✅ Public-API barrel reexporta `events.ts`; outros módulos consumem só daí; adapter importa apenas do próprio módulo |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts` em todos; `import type` separado de runtime; sem require/namespace/enum; sem `as any` |
| G. Naming, EN/PT, clareza | ✅ identifiers EN; tags PascalCase; constructors camelCase; sem `Impl` suffix. Sugestão 1 é cosmética. |
| H. Tests | ✅ AAA implícito; fixtures determinísticas; UUIDs reais via `PayableId.generate()`; sem `expect.any`; sem mocks; `.contract.ts` exporta função |

---

## Verificações específicas do prompt da review

| Ponto | Resultado |
| :--- | :--- |
| A.1 application.md (port `type`, factory) | ✅ `outbox.ts:63` e `outbox.in-memory.ts:46` |
| A.2 adapters.md (sem vazar exceção) | ✅ Zero `throw` no adapter (verificado por grep) |
| A.3 testing.md (`.contract.ts` exporta função) | ✅ `outbox.contract.ts:61` `export const runOutboxContract` |
| A.4 ADR-0006 (public-api único entry-point) | ✅ `index.ts:14` `export * from './events.ts'` |
| B.1 OutboxPort em `application/ports/` justificado | ✅ Header doc L13-15 explica vs `PayableRepository` |
| B.2 `FinancialOutboxRow` no adapter (não no port) | ✅ Defensável — port é técnico, row é detalhe de implementação |
| C.1 Tagged vs string literal | ✅ Justifica payloads (eventType/reason/eventId) |
| C.2 Constructors corretos | ✅ 3 funções, uma por variant, tipos retornados explícitos |
| D.1 9 nomes em `KNOWN_EVENT_TYPES` | ✅ Match exato com `PayableEvent` (verificado em `events.ts:8-16` do domínio) |
| D.2 Type guard rejeita 4 casos | ✅ null, primitivos, objeto sem `type`, `type` não-string |
| D.3 Comentário sobre novo agregado | ✅ Header L13-15 |
| E.1 `seenIds` defesa em profundidade | ✅ Comentário L83-84 documenta intenção |
| E.2 Cast L106 escopado | ✅ Single-line, intra-adapter, comentário explica |
| E.3 Cast `as readonly` em all/pending | ✅ Pattern idêntico ao `InMemoryContractRepository` |
| E.4 `eslint-disable require-await` | ✅ Único, localizado, justificado por conflito conhecido (FIN-CLI-WIRE W3) |
| E.5 `markProcessedSync` alinhado com factory contract | ✅ Suite exige `(id) => void` (L54), adapter expõe síncrono direto |
| F.1 CA-1 preservado (arquivo existe) | ✅ scaffold.test.ts L28-33 |
| F.2 CA-3 preservado (subpath alias) | ✅ scaffold.test.ts L35-47 |
| F.3 Comentário explica transição | ✅ Header L1-15 |
| F.4 Validação incremental | ✅ `keys.includes(expected)` por export, suporta crescimento |
| G.1 `OutboxFactory` async compatível | ✅ `make()` retorna Promise — Drizzle plug-and-play |
| G.2 6 cenários cobrem CA-10..14 + shape | ✅ Verificado linha a linha |
| G.3 Fixtures sem `new Date()` global | ✅ `mkDate()` retorna literal ISO |
| G.4 Datas distintas em CA-12 | ✅ 15/16 de janeiro |
| H. Anti-padrões absolutos | ✅ Zero ocorrência (verificado por grep) |

---

## Marco — primeiro outbox do módulo Financial

Padrões adquiridos neste ticket:

- **Public-API estável** com `FINANCIAL_SCHEMA_VERSION` versionada.
- **Type guard externo** para borda HTTP/webhook (consistente com contracts).
- **Tagged errors com payload** quando necessário (diferente do string literal do PayableRepository).
- **Suite contratual genérica** desde W0 — adapter Drizzle futuro plug-and-play.
- **Posicionamento `application/ports/` justificado** no próprio source — não precisa abrir handbook pra entender.

Tudo casa com a fundação de `contracts/` mas com a divergência apropriada (`PayableRepository` em `domain/` vs `OutboxPort` em `application/ports/`).

---

## Próximo passo

- **APPROVED** → main-session avança para W3.
- 3 sugestões 🔵 listadas — não bloqueiam W3. Recomendação: usuário decide aplicar antes do W3 (pattern do projeto consolidado em FIN-AGG-PAYABLE-CORE/TRANSMISSION/PAYMENT e FIN-PORT-PAYABLE-REPO).
- Expectativa W3: **ALL-GREEN round 1** — 6º ticket FIN-* seguido sem rejection seria recorde do módulo.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-PORT-OUTBOX` (34º ticket fechado).
- **Próximo ticket sugerido:** `FIN-USECASE-APPROVE-PAYABLE` (S-M) — primeiro use case real consumindo `PayableRepository` + `OutboxPort` + `Clock`. Antes, decidir se `Clock` ganha port próprio em `application/ports/` ou se reusa `src/shared/adapters/clock-fixed.ts`.
