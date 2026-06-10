# W3 — Quality Gate (global)

Estratégia vertical única: gate global exigido **no fechamento** (ver `000-request.md`).

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm run lint` | ✅ clean (eslint .) |
| `pnpm test` | ✅ 2585 pass · 0 fail · 17 skipped (integração opt-in) · 2602 total |

## Migration

`pnpm run db:generate:partners` → "No schema changes, nothing to migrate" — schema, snapshot
0008 e SQL `0008_act_acordo_rewrite.sql` 100% consistentes.

## Critérios de aceitação

- **CA1** registrar Acordo sem campos de pessoa-física — ✅ `act.test.ts`.
- **CA2** repasse condicional (true sem target → `act-payment-target-required`; false opcional)
  — ✅ domínio + schema CHECK + rota 422.
- **CA3** cnpj inválido / vigência invertida → erro — ✅ domínio + rotas 422.
- **CA4** `actNumber` único → `*-act-number-duplicate` (409) — ✅ repo in-memory + rota.
- **CA5** `POST/PUT /api/v1/acts`; list item com actNumber/corporateName; filtros — ✅
  `acts.routes.test.ts` (25 testes).
- **CA6** ACT como contratado expõe CNPJ (não CPF) — ✅ `contractor-view.mapper.test.ts` +
  `partner-aggregate-query` + suíte contracts verde.
- **CA7** export CSV do acordo + anti-CSV-injection — ✅ `act-csv.test.ts`.
- **CA8** migration `par_acts` recriada (D3) + seed reescrito — ✅ `0008` + `seed-partners.ts`.

## Handoff core-api → front

Registrado em `006-handoff/HANDOFF.md` (vigência meses→período, role→legalRepresentative,
cpf→cnpj/corporateName/fantasyName, novos campos).
