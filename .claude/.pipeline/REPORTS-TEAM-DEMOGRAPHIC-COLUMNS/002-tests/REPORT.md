# W0 — RED · REPORTS-TEAM-DEMOGRAPHIC-COLUMNS

> Skill: `tdd-strategist`. Worktree isolado `scratchpad/wt-columns`, branch
> `feat/reports-team-demographic-columns` (isolado porque o ticket irmão rodava em paralelo no repo
> principal). **Nenhum arquivo de `src/` tocado** — verificado pelo orquestrador.

## Objetivo
Travar o contrato das 3 colunas que a tabela "Equipe ABC" exibe e hoje mostram `—` em todas as
linhas: **Idade**, **Identidade de gênero**, **Raça/cor**. RED nos dois pontos do caminho: o mapper
puro da projeção (`partners/public-api`) e a borda (`GET /api/v2/reports/team`).

## Arquivos

| Arquivo | O quê |
| :-- | :-- |
| `tests/modules/reports/adapters/http/reports-team-columns.http.test.ts` | **novo** — 9 testes de borda (`fastify.inject`, molde #238) |
| `tests/modules/partners/public-api/collaborator-team-projection.test.ts` | **novo** — 12 testes do mapper puro |
| `tests/modules/partners/public-api/collaborator-projection.drizzle-mysql.test.ts` | **editado** — `NINE_KEYS` → `PROJECTION_KEYS` (13). Gated `MYSQL_INTEGRATION=1`: não roda no `pnpm test`, mas ficaria vermelho no `test:integration:partners` depois do W1 se não fosse ajustado agora |

O teste do #238 (`reports-team.http.test.ts`) **não foi tocado** — é a linha de base viva do CA6.

## Mapa CA → asserção (destaques)

- **CA1** — `genderIdentity`/`race`/`age` presentes na borda e no mapper; `typeof age === 'number'`.
- **CA2** — anos completos: aniversário feito (36), **véspera** (35), **no dia** (36), mês anterior
  (35); **29/02/2000** em ano não-bissexto → 28/02 = 25, 01/03 = 26; `dateOfBirth: null` → `age: null`;
  **pureza**: mesmo colaborador com `today` de 2026 vs 2030 → diferença exata de 4.
- **CA3** — `dateOfBirth` (e alias `birthDate`) **ausente** do payload; corpo cru sem `1985-03-12`,
  sem `1985`, sem a substring `birth`.
- **CA4** — pré-cadastro → os 3 campos `null` (nunca `''` nem valor inventado).
- **CA5** — sem `collaborator:read` → 403; com → 200 (**nenhuma permissão nova**).
- **CA6** — os 10 campos do #238 idênticos + payload com **exatamente 13** chaves.

**4 testes já verdes** (CA5 ×2, CA6-identidade, CA3-vazamento): são **guardas de regressão** — por
definição passam hoje e o W1 não pode deixá-los vermelhos. Todo teste que descreve funcionalidade
nova está vermelho.

## Prova do RED (verificada pelo orquestrador)

| | Baseline | Depois |
| :-- | :-- | :-- |
| tests | 4214 | 4235 |
| pass | 4195 | **4199** (+4 guardas) |
| fail | 0 | **17** |

RED pelo motivo certo:
- **Mapper (12/12):** `TypeError: Projection.toTeamProjection is not a function` — import de namespace
  dá RED granular em vez de derrubar o arquivo.
- **Borda:** os campos são devolvidos pelo port stub e **somem na serialização**, porque
  `teamMemberSchema` só declara 10 campos. O diff do CA6 mostra exatamente `age`, `genderIdentity` e
  `race` faltando na lista de chaves.
- **CA4:** `genderIdentity` veio `undefined`, esperado `null`.

`typecheck`: 14 erros `TS2339`, **todos** do mesmo símbolo inexistente (`toTeamProjection`), num único
arquivo. `lint`: 53 erros, todos `no-unsafe-*` derivados do mesmo símbolo. Somem quando o W1 exportar
a função. `format:check` verde nos 3 arquivos.

## Notas para o W1

1. **Assinatura travada pelo RED:** `toTeamProjection(c: Collaborator, today: PlainDate) →
   CollaboratorTeamProjection`, exportada e **pura** (data de referência por parâmetro).
   ⚠️ `openCollaboratorProjectionReader` passa a precisar de um `Clock` — **mudança de assinatura**,
   com call-site em `reports/adapters/http/composition.ts:166`.
2. **Três lugares, nesta ordem:** `CollaboratorTeamProjection` → `TeamMember`
   (`reports/application/ports/team-report-read.ts`) → `teamMemberSchema`
   (`reports/adapters/http/schemas.ts`). Esquecer o **schema** deixa o mapper certo e o payload errado
   — foi exatamente o RED da borda. `teamToDto` é spread, não muda.
3. **`age` é derivado, não armazenado.** O reader traz `date_of_birth`; a idade sai no mapper; a data
   **morre no mapper** (não entra no tipo de saída — CA3).
4. **Valores** são o código do enum (`'PARDO'`, `'MULHER_CIS'`), igual ao `collaborator-csv.ts`.
   Rótulo PT é do front.
5. **Regra:** `age = today.year - birth.year`, menos 1 se `(mês, dia)` de hoje < os do nascimento. O
   caso 29/02 cai naturalmente — sem ramo especial, mas com teste próprio.
   ⚠️ **Se a branch irmã `REPORTS-TEAM-DEMOGRAPHICS` já tiver aterrissado**, existe `completedYears`
   em `partners/public-api/collaborator-demographics.ts` — **reusar em vez de duplicar** (ver
   §Sequenciamento).
6. **Integração já ajustada** (13 chaves): rodar `pnpm run test:integration:partners` antes do GREEN.
7. **Não mexer:** RBAC (segue `collaborator:read`), export CSV (#482), gráficos agregados.

## ⚠️ Sequenciamento — decidir antes do W1

Este worktree saiu da `dev`, que **não** tem o código do ticket irmão (PR #495, fechado e verde, mas
não mergeado). Lá existe `completedYears` — a mesma regra de idade que este ticket precisa.

- **Mergear o #495 primeiro e rebasear** esta branch → o W1 **reusa** a função. Sem duplicação.
- **Seguir agora** → o W1 duplica a regra de idade em dois arquivos, e a segunda cópia vira dívida
  (drift silencioso quando uma for corrigida e a outra não).

Recomendação: mergear o #495 antes do W1.

## Próximo passo
W1 — GREEN (`ports-and-adapters` + par `zod-expert` no schema): os 17 vermelhos passam, as 4 guardas
seguem verdes, `pnpm test` volta a `fail 0`.
