# W1 — Implementação (GREEN)

## Arquivos

- **Novo:** `src/shared/kernel/plain-date.ts` — VO namespace. Backend `{year,month,day}` puro (sem `Date` interno, sem timezone). `from` (regex + round-trip UTC para data real + ano ≥ 2000), `fromDate`, `compare` (livre, espelha `Temporal.PlainDate.compare`), `isBefore`/`isAfter`/`equals`, `toISOString`.
- **Editado:** `src/shared/ports/clock.ts` — `today: () => PlainDate`.
- **Editado:** `src/shared/adapters/clock-real.ts` + `clock-fixed.ts` — `today` via `PlainDate.fromDate`.

## Decisões

- **Backend `{y,m,d}` puro** (refina a Opção C da inquiry 0020): compara por inteiros → elimina o bug de timezone **agora**, não só "isola para depois".
- **Shape = subconjunto estrutural de `Temporal.PlainDate`** (`.year/.month/.day`) → leitura direta de campos é estável ao swap.
- **Só 2 implementadores de `Clock`** (ClockReal/ClockFixed) — confirmado por grep; demais `now:` são parâmetros, não literais. Estensão do port não quebrou ninguém.

## GREEN

11/11 dos novos testes; suíte completa verde (1170 pass) — `ClockFixed`/`ClockReal` ganharam `today` automaticamente, sem regressão.
