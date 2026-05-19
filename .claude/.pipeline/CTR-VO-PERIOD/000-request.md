# Ticket CTR-VO-PERIOD: Value Object `Period` (vigência fixa ou indefinida)

> **Idioma:** documentação em PT. Identificadores em EN (regra invariante).

## Contexto

`Contract` precisa expressar **vigência** (`originalPeriod`, `currentPeriod`). Atualmente o legado modela isso com 3 colunas: `contractPeriodStart`, `contractPeriodEnd`, `contractPeriodIsIndefinite` ([handbook §schema legado](../../../../../handbook/domain/10-mapeamento-legado-schema.md)).

No novo modelo, `Period` é um Value Object com **duas variantes**:

- **`Fixed`** — vigência com `start` e `end` definidos.
- **`Indefinite`** — vigência aberta, só com `start`.

Discriminated union representa a regra **estruturalmente** em vez de via flag boolean.

## Escopo

- `src/modules/contracts/domain/shared/period.ts` — branded VO + 5 funções.
- `tests/modules/contracts/domain/shared/period.test.ts` — testes.

## Fora de escopo

- `Period.extend(p, newEnd)` — quando agregado `Amendment.TermChange` precisar.
- `Period.overlaps(a, b)`, `Period.duration(p)` — YAGNI até regra real exigir.
- Timezone-aware date math (`Temporal`) — `Date` UTC é suficiente para vigências de contrato em dias/meses/anos.
- Persistência `Period` → `(start TIMESTAMP, end TIMESTAMP NULL, is_indefinite BOOLEAN)` no MySQL — ticket de adapter.
- Localização do display (`'01/01/2026 até 31/12/2026'`) — `cli/format.ts`.

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | **Discriminated union** `Fixed` \| `Indefinite` (não `end: Date \| null`) | Regra varia por variante (`contains` calcula diferente). Skill `ts-discriminated-unions` reforça: "campos opcionais são proibidos quando a regra é variante-dependente". Espelha estruturalmente `contractPeriodIsIndefinite` do legado. |
| D2 | `Date` como representação interna; tratar como imutável por política | Idiomático TS. CLAUDE.md raiz já estabelece "trate `Date` como imutável" — não chamar `set*`. Aceitável. |
| D3 | 5 funções no namespace: `create`, `createIndefinite`, `contains`, `equals`, `isIndefinite` | API mínima suficiente. Demais (`extend`, `overlaps`, `duration`) virão sob demanda. |
| D4 | `contains(p, instant)` retorna `false` para `instant` inválido (NaN) | Defensivo — caller que passou Date corrompida não deve causar crash; resposta `false` é correta semanticamente (instante "fora" de qualquer período válido). |
| D5 | Erros separados para start/end inválido (`'period-invalid-start-date'` vs. `'period-invalid-end-date'`) | UI sabe qual campo errou. |
| D6 | `start === end` é período válido (vigência de 1 instante) | Caller decide significado. Modelagem mínima — vigência "diária" é responsabilidade do caller (ex.: `[2026-01-01T00:00, 2026-01-01T23:59]`). |
| D7 | Exhaustive switch em `contains` com `never` + `throw` no default | Única exceção a "no throw" — branch inalcançável em código bem tipado. Conforme `ts-exhaustive-switch.md`. |

## Critérios de aceite

### `Period.create(start, end): Result<Period, PeriodError>`
- [ ] Datas válidas → `Ok({ kind: 'Fixed', start, end })`.
- [ ] `start === end` (mesmo timestamp) → `Ok` (vigência de 1 instante).
- [ ] `end < start` → `Err('period-end-before-start')`.
- [ ] `start` inválido (`new Date('foo')`) → `Err('period-invalid-start-date')`.
- [ ] `end` inválido → `Err('period-invalid-end-date')`.

### `Period.createIndefinite(start): Result<Period, PeriodError>`
- [ ] `start` válido → `Ok({ kind: 'Indefinite', start })`.
- [ ] `start` inválido → `Err('period-invalid-start-date')`.

### `Period.contains(p, instant): boolean`
- [ ] **Fixed**: instante dentro de `[start, end]` → `true` (inclusive nas bordas).
- [ ] **Fixed**: instante antes de `start` → `false`.
- [ ] **Fixed**: instante depois de `end` → `false`.
- [ ] **Indefinite**: instante `>= start` → `true`.
- [ ] **Indefinite**: instante antes de `start` → `false`.
- [ ] Instante inválido (NaN) → `false`.

### `Period.equals(a, b): boolean`
- [ ] Dois `Fixed` com mesmos `start` e `end` → `true`.
- [ ] Dois `Fixed` com `start` ou `end` diferentes → `false`.
- [ ] Dois `Indefinite` com mesmo `start` → `true`.
- [ ] `Fixed` vs `Indefinite` → `false`.

### `Period.isIndefinite(p): boolean`
- [ ] `Fixed` → `false`.
- [ ] `Indefinite` → `true`.

### Tipagem (compile-time)
- [ ] `string as Period` falha.
- [ ] `{ kind: 'Fixed', start, end } as Period` sem brand falha.
- [ ] `Period` produzido só via `Period.create` ou `Period.createIndefinite` em ramo `Ok`.

## Referências

- [`handbook/domain/contratos/03-gestao-contratos-context.md`](../../../../../handbook/domain/contratos/03-gestao-contratos-context.md) §4 (VOs — Período).
- [`handbook/domain/10-mapeamento-legado-schema.md`](../../../../../handbook/domain/10-mapeamento-legado-schema.md) §3.5 (`contractPeriodStart`, `contractPeriodEnd`, `contractPeriodIsIndefinite`).
- [`.claude/skills/ts-domain-modeler/references/ts-discriminated-unions.md`](../../skills/ts-domain-modeler/references/ts-discriminated-unions.md).
- [`.claude/skills/ts-domain-modeler/references/ts-exhaustive-switch.md`](../../skills/ts-domain-modeler/references/ts-exhaustive-switch.md).
- [Tickets anteriores — CTR-VO-MONEY, CTR-VO-IDS](../) — padrão de smart constructor estabelecido.
