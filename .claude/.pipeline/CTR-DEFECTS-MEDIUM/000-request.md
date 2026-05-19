# Ticket CTR-DEFECTS-MEDIUM: 4 fixes médios do QA-REPORT

> Documentação PT, identificadores EN.
> **Pré-requisito:** [`CTR-DEFECTS-CRITICAL`](../CTR-DEFECTS-CRITICAL/STATE.md) fechado (afeta `Money` e `Period`).

## Defeitos cobertos

| # | Severidade | Origem | O que tem hoje | Esperado |
| :-: | :-- | :-- | :-- | :-- |
| **#7** | 🟡 Média | A3 | Aceita período de 0 dias (start === end), aceita ano < 2000 | Rejeitar 0 dias; rejeitar ano < 2000 (ou outro limite a definir) |
| **#9** | 🟡 Média | A4 | Aceita contrato com `originalValue: R$ 0,00` | Rejeitar com `contract-original-value-zero` |
| **#10** | 🟡 Média | A4 | `formatMoney(1e25)` cospe `R$ 1.0.000.000.000.000.001e+23,64` (corrupto) | Usar `Intl.NumberFormat('pt-BR', ...)` — robusto e padrão |
| **#11** | 🟢 Baixa | A8 | `TermChange` com `newEndDate` retroativa só detectada na homologação | Detectar na criação (fail-fast) |

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | **#7** — `Period.create` rejeita `end === start` e `start.getFullYear() < 2000` | Período de 0 instantes é noop conceitual. Ano < 2000 (ou < hoje - 100 anos) protege contra typo (`0001-01-01`). Limite "ano 2000" alinha com escopo do ERP (Bem Comum começou em 200x). |
| D2 | **#9** — `Contract.create` rejeita `originalValue.cents === 0` | Contrato de R$ 0 é regra de negócio obviamente inválida. Permanece OK ter `currentValue=0` após supressão (caminho diferente). |
| D3 | **#10** — `formatMoney` usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` | Padrão da indústria, robusto, suporta tudo até `MAX_SAFE_INTEGER`. Trade-off pequeno: `Intl` faz arredondamento de ponto flutuante, mas como já garantimos inteiros via `Money.fromCents`, é seguro. |
| D4 | **#11** — `createAmendment` use case carrega `Contract` quando `kind === 'TermChange'` e valida cedo | Já carregamos o Contract no use case para validar `contract-not-found`; basta adicionar check `newEndDate > currentPeriod.end` aqui. Erro novo: `'create-amendment-term-change-not-extending'`. Mantém Indefinite-period check tardio (acionado em homologação). |

## Critérios de aceite

### Defeito #7 — períodos exotéricos

- [ ] `Period.create(d, d)` (mesma data) → `Err('period-zero-duration')` (NOVO erro).
- [ ] `Period.create(new Date('0001-01-01'), new Date('0005-01-01'))` → `Err('period-year-out-of-range')`.
- [ ] `Period.create(new Date('2026-01-01'), new Date('2026-12-31'))` → `Ok` (continua passando).
- [ ] `Period.createIndefinite(new Date('0001-01-01'))` → `Err('period-year-out-of-range')`.

### Defeito #9 — contrato R$ 0,00

- [ ] `Contract.create` com `originalValue.cents === 0` → `Err('contract-original-value-zero')`.
- [ ] Valor positivo qualquer continua passando.

### Defeito #10 — formatter robusto

- [ ] `formatMoney(money(0))` → `'R$ 0,00'` (mantém output atual).
- [ ] `formatMoney(money(15050))` → `'R$ 150,50'`.
- [ ] `formatMoney(money(10000000))` → `'R$ 100.000,00'`.
- [ ] `formatMoney(money(123456789))` → `'R$ 1.234.567,89'`.
- [ ] **Defesa:** Como #8 já bloqueia overflow, formatter não precisa lidar com `1e25` em prod. Mas o `Intl` é robusto contra esse cenário também.

### Defeito #11 — TermChange retroativo cedo

- [ ] `createAmendment(kind: 'TermChange', newEndDate: <= currentPeriod.end>)` → `Err('create-amendment-term-change-not-extending')` na criação.
- [ ] `createAmendment(kind: 'TermChange', newEndDate: > currentPeriod.end>)` → `Ok` (criação) → continua passando homologação.
- [ ] `createAmendment(kind: 'TermChange')` em contrato com `currentPeriod.kind === 'Indefinite'` → `Err('create-amendment-cannot-extend-indefinite')` na criação (NOVO, fail-fast).

## Fora de escopo

- Limite superior de ano (rejeitar `2100`?) — pode ficar pra ticket de tuning depois.
- Format de moeda em outras locales — só pt-BR.
- Período máximo (ex.: 100 anos) — não está nos critérios do QA.

## Estimativa

~80 linhas de produção + ~100 linhas de teste novo.
