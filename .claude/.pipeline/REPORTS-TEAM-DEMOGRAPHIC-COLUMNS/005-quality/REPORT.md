# W3 — Gate de Qualidade · REPORTS-TEAM-DEMOGRAPHIC-COLUMNS

## Gates (local) — verificados pelo orquestrador

| Gate | Resultado |
| :-- | :-- |
| Typecheck | ✅ verde |
| Format | ✅ verde |
| Lint | ✅ verde |
| Test | ✅ **4248 pass · 0 fail** · 19 skipped |

Trajetória: W0 4231 pass / 17 fail → W1 4248 / 0 → W3 estável.

## OBS-1 do W2 aplicada

Duas docstrings diziam **"9 colunas LGPD-safe"** em arquivos que este ticket muda:
`reports/application/ports/team-report-read.ts:4` e `reports/adapters/http/plugin.ts:6`. Atualizadas
para 13 colunas, citando a decisão da P.O. e registrando que `dateOfBirth` segue barrado. Comentário
que descreve o contrato e o contradiz é pior que comentário nenhum.

## Integração — DEFERIDA AO CI

`pnpm run test:integration:partners` (onde o `collaborator-projection.drizzle-mysql.test.ts` roda com
as 13 chaves + `clock`) **não rodou localmente**: `Access denied for user 'root'` — o volume
`mysql-data` compartilhado tem senha root divergente do secret atual. **Mesma causa de ambiente já
documentada** nas fatias do ETL (`BGP-ETL-LEGACY-ID` §W3), **não** regressão deste diff: o erro atinge
suítes que nada têm a ver com este ticket (`contract-count-backfill`, `par_outbox`).

O CI sobe MySQL efêmero limpo — é lá que a integração roda. O teste gated já está ajustado pelo W0.

## Cobertura que sustenta o merge

- **33 casos** nas suítes relevantes (12 mapper + 9 borda nova + 12 das suítes vizinhas), verdes.
- **CA3 garantido por construção, em 3 barreiras independentes** (verificado no W2): `dateOfBirth` não
  está no tipo de saída, nem no `TeamMember`, nem no `teamMemberSchema`. Não depende de teste.
- **CA2 sem ramo especial para 29/02** — a comparação `(mês, dia)` resolve naturalmente.
- **Regra de idade num lugar só** (`completed-years.ts`), consumida pelos dois tickets irmãos.

## OBS-2 do W2 — registrada como issue, não corrigida aqui

**Assimetria de permissão:** o endpoint **agregado** (`/reports/team/demographics`) exige
`collaborator:read-sensitive`, enquanto o **por-pessoa** (`/reports/team`) — que a partir deste ticket
expõe raça/gênero **nomeados** — segue sob `collaborator:read`. O dado mais identificável ficou sob a
permissão menos restritiva.

**Não corrigido aqui de propósito:** mexer no RBAC violaria o **CA5** deste ticket e seria scope-creep
(anti-padrão #15). Vai para issue própria, endereçada no redesenho do RBAC junto com a #482 e a #496.

## Veredito

**GREEN.** As 3 colunas com dado real; contrato de 10 → 13 campos; `dateOfBirth` barrado; RBAC
intocado; os 10 campos originais idênticos.
