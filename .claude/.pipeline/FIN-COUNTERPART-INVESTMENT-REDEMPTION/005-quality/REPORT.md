# W3 — GREEN · FIN-COUNTERPART-INVESTMENT-REDEMPTION (#428)

> Skill: `ts-quality-checker`. Gate final + validação MySQL real (migration 0036 + CA5).
> Worktree: `.claude/worktrees/428-counterpart-invest-redeem`.

## Resultado

**GREEN em todos os gates + CA5 validado em MySQL 8.4.10 real (migration 0036 aplicada do zero).**

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` | ✅ verde |
| `pnpm test` (unit) | ✅ **4017 tests · 3998 pass · 0 fail · 19 skipped** |
| Integração `financial` (completa) | ✅ **83 tests · 83 pass · 0 fail** |
| **CA5 — migration 0036 + round-trip Investment/Redemption** | ✅ em MySQL 8.4.10 |

## 🔴 Bug de teste encontrado e corrigido nesta wave

O teste de integração do W0 (`expected-counterpart-store.drizzle-mysql.test.ts`) lançava
`TypeError: Do not know how to serialize a BigInt` na primeira execução real do CA5. Causa: as
mensagens de assert usavam `JSON.stringify(byId)` sobre o agregado relido, que contém
`valueCents: bigint` — `JSON.stringify` cru não serializa BigInt, e o argumento é avaliado **antes** do
`assert` (independente de o assert passar).

Não é falha da migration nem do código de produção — a migration já tinha aplicado (o erro é no
`JSON.stringify`, não na conexão/SQL). Corrigido com um helper `j()` que serializa bigint como string
(`(_k, val) => typeof val === 'bigint' ? val.toString() : val`), aplicado às 6 ocorrências do arquivo.
Também alinhado o lint (`val: unknown` no replacer, evita `no-unsafe-return`).

## CA5 — validação em MySQL real

A migration `0036_powerful_marrow.sql` faz `DROP CONSTRAINT` + `ADD COLUMN product_label` +
`ADD CONSTRAINT` (CHECK ampliado). Aplicada **do zero** (banco recriado) na suíte `financial` completa,
sem erro de ALTER (a preocupação do MySQL 8.4). Prova direta no schema do banco pós-migration:

```
CHECK_CLAUSE de fin_expected_counterpart_type_chk:
  (`type` in ('Transfer','Investment','Redemption'))
COLUMN product_label:  varchar(120)  NULLABLE=YES
```

Round-trip validado (CA5, na suíte):

```
✔ CA5(#428): round-trip Investment — save + findById sem invalid-expected-counterpart-type
✔ CA5(#428): round-trip Redemption — origem Credit → movement Debit; sem rejeição de tipo
```

Cobre: (i) CHECK ampliado aceita Investment/Redemption no INSERT; (ii) `mapper.toType` aceita os 3 →
`toDomain` reidrata sem `invalid-expected-counterpart-type`; (iii) movimento `opposite` correto;
(iv) a contrapartida aparece na fila de pendentes do destino.

## Ambiente de validação — exceção OrbStack (x99 offline)

x99 offline; OrbStack autorizado. Caminho **não-destrutivo** (ver
[[test-integration-destroys-dev-infra]]): `docker stop core-api-mysql` (nunca `down -v`) → MySQL 8.4.10
avulso na 3306 → suíte → `docker rm -f` + `docker start core-api-mysql`. **Pós-condições verificadas:**
`core-api-mysql` Up (healthy); volume `core-api-mysql-data` presente; nenhum container `cp428-*`
remanescente.

## Saída REAL dos gates

```
$ pnpm run typecheck
$ tsc --noEmit
(sem saída = verde)

$ pnpm run lint
$ eslint .
(sem saída = verde)

$ pnpm run format:check
All matched files use Prettier code style!

$ pnpm test
ℹ tests 4017 · suites 1143 · pass 3998 · fail 0 · cancelled 0 · skipped 19 · todo 0
```

## CA1–CA5 — fechamento

| CA | Prova |
| :-- | :-- |
| **CA1** — Investment cria contrapartida `Pending`, movimento oposto | unit `record-manual-entry-counterpart` + integração `expected-counterpart-store` |
| **CA2** — Redemption idem (origem Credit → movimento Debit) | unit + integração |
| **CA3** — não-regressão: Transfer mantém; Payment/Receipt/FeePenaltyInterest/sem-destino não criam | unit `record-manual-entry-counterpart` (GREEN preservado) |
| **CA4** — perna espelho B com tipo real + `productLabel` real (não placeholder) | unit `confirm-counterpart-match` (`type='Investment'` + `productLabel='CDB Banco X'`) |
| **CA5** — migration + round-trip em MySQL real | **este relatório** — CHECK ampliado + coluna verificados no schema; 83/83 |

## Follow-ups (Minor do W2, não bloqueiam)

1. `expected-counterpart.ts:28,57` — `type?` opcional com default `'Transfer'` (default latente). W1
   justificou como YAGNI; único caller de produção passa `type` explícito.
2. `0036_powerful_marrow.sql:2` — `ADD COLUMN` sem `AFTER` (cosmético; Drizzle mapeia por nome).

## DoD

✅ Gate W3 verde · ✅ CA1–CA5 provados · ✅ migration 0036 validada em MySQL 8.4.10 real ·
✅ Transfer sem regressão · ✅ infra dev restaurada sem perda. **Pronto para commit + PR.** Fecha #428.
