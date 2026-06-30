# Code Review — CTR-AUTO-EXPIRE — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer
**Data:** 2026-06-16
**Escopo:** `contract.ts` (guarda D+1) · `repository.ts` (port `findExpirable`) · `contract-repository.{in-memory,drizzle}.ts` · `schemas/mysql.ts` (índice) + migration 0014 · `src/jobs/contracts/sweeper/{sweeper,config,run,clock-sao-paulo}.ts` · 3 testes.

---

## Veredito: APPROVED — zero issue crítica (🔴)

O código adere às regras absolutas e aos ADRs. Sem `throw`/`class`/`any` no domínio; `Result` em toda transição; tagged error `ContractCannotExpireYet` preservado com evidência (`currentEnd`/`attemptedAt`). Port é `type Readonly<{}>`, adapters convertem exceção em `Result` (`safe(...)`), evento `ContractEnded{Expired}` flui via `repo.save` → **outbox** (ADR-0015), nunca publicado direto. `run.ts` é one-shot íntegro (pool no `finally`, `process.exitCode`, sem handle pendente). Decisão CA5 (SELECT simples; lock/multi-instância = F-Plus do ADR-0041) está correta e **bem documentada no adapter Drizzle**. Regressão zero (2488/0 fail).

## Issues 🟡 Importante (não bloqueiam approval; recomendado corrigir antes do W3)

### 🟡-1 — Comentários mentem sobre a concorrência (`repository.ts` + `config.ts`)
- `src/modules/contracts/domain/contract/repository.ts` (comentário do `findExpirable`) diz *"O adapter Drizzle usa `FOR UPDATE SKIP LOCKED` + `LIMIT` (sweep concorrente sem double-expire)"*.
- `src/jobs/contracts/sweeper/config.ts:12` diz *"O adapter usa `LIMIT` + `FOR UPDATE SKIP LOCKED`"*.
- **Mas** a decisão CA5 (corretamente implementada e documentada em `contract-repository.drizzle.ts:334-338`) é **SELECT simples sem `FOR UPDATE`** — o lock não persistiria entre as 2 tx; multi-instância é F-Plus. Comentário enganoso sobre concorrência em código de **compliance** induz o próximo dev a confiar num lock inexistente.
- **Fix:** alinhar os 2 comentários ao `drizzle.ts` (SELECT + LIMIT; coordenação multi-instância = F-Plus via `GET_LOCK`/`UNIQUE`).

### 🟡-2 — Construção de `PlainDate` por cast fora do smart constructor (`clock-sao-paulo.ts:51`)
- `immutable({ year, month, day }) as PlainDateType` constrói o VO via cast inline no adapter, vazando a construção do `PlainDate` para fora do kernel (§3.B.4 — `as Branded` só no smart constructor).
- O kernel só expõe `PlainDate.from(iso)` (string) e `fromDate(d)` (UTC) — falta um construtor a partir de partes já validadas.
- **Fix:** adicionar `PlainDate.fromParts(year, month, day): PlainDate` ao kernel e usá-lo aqui (encapsula o cast; reusável pelo `fromDate`).

## Issues 🔵 Sugestão

- 🔵-3 — `clock-sao-paulo.ts:28-30`: comentário menciona *"`DD/MM/AAAA` (pt-BR)"*, mas o código usa `en-CA` (`YYYY-MM-DD`). Corrigir o comentário.
- 🔵-4 — `contract-repository.in-memory.ts:94`: typo *"Decidão"* → *"Decisão"*.
- 🔵-5 — `contract-repository.in-memory.ts:117`: `a.id as unknown as string` no `localeCompare` — preferir `String(a.id)` (evita cast duplo, ainda que em adapter).

## O que está bom

- Guarda D+1 cirúrgica e bem-comentada; tagged error intacto.
- `runSweep` declara só `Pick<ContractRepository,'findExpirable'|'save'>` — baixo acoplamento exemplar.
- Decisão de concorrência (CA5) **fundamentada** no adapter Drizzle, alinhada ao ADR-0041.
- `ClockSaoPaulo` resolve o cutoff D+1 com `Intl.DateTimeFormat` (API nativa, sem lib), com `formatToParts` (sem string-split frágil).
- `run.ts` exemplar: exit codes sysexits, defesa em profundidade (`catch` + `finally`), one-shot sem `process.exit()`.
- Transporte trocável (Redis/NATS/RabbitMQ) preservado pelo `EventDelivery` port — exatamente o pedido.

## Próximo passo
APPROVED → avança para W3. **Recomendação:** aplicar 🟡-1 e 🟡-2 (triviais, melhoram honestidade/encapsulamento) antes do gate — não são bloqueantes, mas 🟡-1 é dívida que engana.
