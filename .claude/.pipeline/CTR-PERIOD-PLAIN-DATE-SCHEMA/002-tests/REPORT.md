# W0 — Estratégia de verificação

> Outcome: **GREEN (baseline)** — ver nota sobre fail-first abaixo.

## Natureza do ticket

Mudança de **tipo de coluna SQL** (`datetime(3)` → `date`) em 5 colunas de
data-calendário. Não há nova API de domínio a implementar: a borda `PlainDate ↔ Date`
já existe desde a Fase 2 (`CTR-PERIOD-PLAIN-DATE`). Logo, **não há W0 RED clássico** —
os testes que exercitam essas colunas já existiam e já passavam contra `datetime(3)`.

## Rede de segurança herdada (Fase 2)

Os testes de round-trip de persistência cobrem exatamente as colunas migradas:

- `AmendmentRepository contract — Drizzle/MySQL`:
  - `round-trip TermChange preserva newEndDate (sem impactValue)` → coluna `new_end_date`.
- `ContractRepository contract — Drizzle/MySQL`:
  - `save + findById preserva todos os campos (round-trip Fixed period)` → `*_period_start/end`.
  - `save + findById preserva Indefinite period (period_end nullable)` → `*_period_end` nullable.

## Critério de aceitação da migração (o que este ticket adiciona)

1. A migration `0005` aplica sem erro contra MySQL 8.4 real (`test:integration`).
2. Após `MODIFY … date`, os round-trips acima continuam **verdes** — prova de que
   o `timezone: 'Z'` do pool + `PlainDate.fromDate` preservam a data-calendário com
   a coluna entregando `Date` à meia-noite UTC.

Verificação executada em W3.
