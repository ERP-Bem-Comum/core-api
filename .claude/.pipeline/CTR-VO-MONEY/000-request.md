# Ticket CTR-VO-MONEY: Value Object `Money` com precisão em centavos

> **Idioma:** este documento é documentação (PT). Identificadores de código (`Money`, `cents`, `fromCents`, etc.) estão em EN conforme a regra invariante do projeto.

## Contexto

O domínio `contracts` modela valor monetário em vários pontos: `originalValue`, `currentValue`, `impactValue` de `Amendment`. A regra do projeto exige **DECIMAL** para valor financeiro ([`handbook/architecture/03-data-architecture.md`](../../../../../handbook/architecture/03-data-architecture.md) §9), nunca `float`/`double`. No domínio TS puro, representamos como **inteiro em centavos** dentro de um branded type.

Precedente no legado a EVITAR: a coluna `contracts.totalValue float` ([`handbook/domain/10-mapeamento-legado-schema.md`](../../../../../handbook/domain/10-mapeamento-legado-schema.md) §5 gap 5.1) — bug fiscal latente.

Este ticket cria a fundação que destrava `Contract` e `Amendment`.

## Escopo

- `src/modules/contracts/domain/shared/money.ts` — VO `Money` (branded type + smart constructor + operações).
- `tests/modules/contracts/domain/shared/money.test.ts` — testes da regra.

## Fora de escopo

- Persistência `Money` → `DECIMAL(15,2)` no MySQL (próximo ticket, na camada adapter).
- Formatação para humano (`R$ 1.000,00`) — fica em `cli/format.ts`.
- Câmbio de moeda — todo valor é BRL implícito por enquanto.
- Valor negativo "lógico" (débito) — modelado pelo tipo do aditivo (`Suppression`), não pela `Money`. `Money` **nunca** carrega sinal.

## Critérios de aceite

### Construção (smart constructor `Money.fromCents`)
- [ ] `Money.fromCents(0)` retorna `Ok({ cents: 0 })`.
- [ ] `Money.fromCents(15050)` retorna `Ok({ cents: 15050 })`.
- [ ] `Money.fromCents(-1)` retorna `Err('money-negative-value')`.
- [ ] `Money.fromCents(1.5)` retorna `Err('money-non-integer-value')`.
- [ ] `Money.fromCents(NaN)` retorna `Err('money-non-integer-value')`.
- [ ] `Money.fromCents(Number.POSITIVE_INFINITY)` retorna `Err('money-non-integer-value')`.

### Constante zero
- [ ] `Money.zero()` retorna `Money` com `cents: 0`.

### Operação `add`
- [ ] `Money.add(a, b)` é pura — não muta argumentos.
- [ ] `Money.add(100, 50) = 150` (em cents).
- [ ] Associativa: `add(a, add(b, c))` ≡ `add(add(a, b), c)` para qualquer trio.
- [ ] Identidade com zero: `add(a, zero()) = a`.

### Operação `subtract`
- [ ] `Money.subtract(a, b)` quando `b ≤ a` retorna `Ok(a - b)`.
- [ ] `Money.subtract(a, b)` quando `b > a` retorna `Err('money-negative-result')`.
- [ ] `Money.subtract(a, zero()) = Ok(a)`.

### Comparação
- [ ] `Money.equals(a, b)` retorna `true` para valores iguais.
- [ ] `Money.greaterThan(a, b)` retorna `true` quando `a > b`.

### Tipagem (compile-time)
- [ ] `string as Money` falha em compile-time.
- [ ] `{ cents: 100 } as Money` falha em compile-time (sem o brand).
- [ ] `Money` produzido apenas via `Money.fromCents` ou `Money.zero`.

## Referências

- [`handbook/domain/contratos/03-gestao-contratos-context.md`](../../../../../handbook/domain/contratos/03-gestao-contratos-context.md) §4 (VOs). **Nota:** handbook ainda usa `Moeda` em snippets — a regra invariante de idioma (código EN) sobrescreve. Migrar identificadores ao codar.
- [`handbook/domain/contratos/04-aditivos-context.md`](../../../../../handbook/domain/contratos/04-aditivos-context.md) §3 (`Amendment` usa `impactValue: Money`).
- [`handbook/architecture/03-data-architecture.md`](../../../../../handbook/architecture/03-data-architecture.md) §9 (Money/Decimal nunca `FLOAT`/`DOUBLE`).
- [`.claude/skills/ts-domain-modeler/references/ts-branded-types.md`](../../skills/ts-domain-modeler/references/ts-branded-types.md).
- [`.claude/skills/ts-domain-modeler/references/ts-smart-constructors.md`](../../skills/ts-domain-modeler/references/ts-smart-constructors.md).
- [`.claude/skills/ts-domain-modeler/references/ts-result-pattern.md`](../../skills/ts-domain-modeler/references/ts-result-pattern.md).

## Justificativa de prioridade

Primeiro ticket da Fase 1. **Bloqueia** todos os agregados subsequentes (`Contract.originalValue: Money`, `Amendment.impactValue: Money`). É pequeno o suficiente para validar a pipeline 4-wave ponta-a-ponta sem distrações.
