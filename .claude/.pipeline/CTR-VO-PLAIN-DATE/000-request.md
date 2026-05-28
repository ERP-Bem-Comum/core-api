# CTR-VO-PLAIN-DATE — VO `PlainDate` (base do Temporal) + `Clock.today()`

## Origem

Inquiry [0020](../../../handbook/inquiries/0020-temporal-api-adoption.md) — adoção do Temporal API. **Fase 1** da Opção C (refinada): criar a *base* semântica de data-calendário agora, com backend `{year, month, day}` puro (sem `Date`, sem timezone), trocável por `Temporal.PlainDate` quando o Node 26 entrar em Active LTS (2026-10-28).

Decisão de design (sessão 2026-05-26): uma data é **value object**, não porta DI. A interface estável é o VO + suas funções no shared kernel; o "adapter" do Temporal é a troca do backend interno de UM arquivo. O único pedaço que é porta de verdade é o **"hoje"** → entra no `Clock` port.

## Escopo (Fase 1 — adição pura, zero ripple)

1. `src/shared/kernel/plain-date.ts` — VO namespace (`import * as PlainDate`):
   - `PlainDate = Brand<Readonly<{ year; month; day }>, 'PlainDate'>` (shape = subconjunto estrutural de `Temporal.PlainDate`).
   - `from(iso): Result<PlainDate, PlainDateError>` — `YYYY-MM-DD`, valida data real (round-trip UTC rejeita `2026-02-30`), ano ≥ 2000.
   - `fromDate(d: Date): PlainDate` — extrai campos UTC de um instante.
   - `compare(a, b): -1 | 0 | 1` (função livre — espelha o `Temporal.PlainDate.compare` estático).
   - `isBefore`, `isAfter`, `equals`, `toISOString`.
2. `src/shared/ports/clock.ts` — adicionar `today: () => PlainDate`.
3. `src/shared/adapters/clock-real.ts` + `clock-fixed.ts` — implementar `today` via `PlainDate.fromDate`.

## Critérios de aceitação

- CA1: `from('2026-05-26')` → ok `{2026,5,26}`; `toISOString` round-trip idêntico (zero-padded).
- CA2: `from` rejeita malformado (`'2026/05/26'`, `'x'`), data impossível (`'2026-02-30'`, `'2026-13-01'`) e ano < 2000, cada um com erro específico.
- CA3: `compare`/`isBefore`/`isAfter`/`equals` corretos por (ano, mês, dia); sem dependência de timezone.
- CA4: VO imutável (`immutable`); leitura de `.year/.month/.day` direta é estável ao swap (Temporal expõe os mesmos campos).
- CA5: `ClockReal().today()` e `ClockFixed(at).today()` retornam `PlainDate` coerente (UTC); demais implementadores de `Clock` inexistentes (só os 2 adapters).

## Fora de escopo → Fase 2 (`CTR-PERIOD-PLAIN-DATE`)

Migrar `Period`, `contract.ts` (expiração/ajuste), mappers, **schema** (`datetime` → `date` + migration) e **eventos da public-api** (`ContractCreated` carrega período — contrato cross-módulo versionado, ADR-0006) e dedupe dos 2 formatters de data. Ticket próprio: toca persistência + versionamento de evento.

## Gatilho de Fase 3 (futuro, não-ticket)

Quando Node 26 Active LTS (2026-10-28): trocar backend de `PlainDate` para `Temporal.PlainDate` (um arquivo) + abrir ADR que supersedes ADR-0009.
