# W1 — GREEN · REPORTS-TEAM-DEMOGRAPHIC-COLUMNS

> Skill: `ports-and-adapters`. Worktree `wt-columns`, rebaseado na `dev` **com** o ticket irmão
> `REPORTS-TEAM-DEMOGRAPHICS` já mergeado (cenário recomendado no §Sequenciamento do W0).
> Verificado pelo orquestrador: 17 → 0 falhas, 4 gates verdes, regra de idade num lugar só.

## Arquivos tocados — produção

| Arquivo | O quê |
| :-- | :-- |
| `partners/public-api/completed-years.ts` | **novo** — regra única de idade, pura, sobre `PlainDate` |
| `partners/public-api/collaborator-demographics.ts` | remove a cópia privada; usa o helper via `PlainDate.fromDate` |
| `partners/public-api/collaborator-projection.ts` | projeção += `genderIdentity`/`race`/`age`; `toProjection` → **`toTeamProjection` exportado e puro**; o reader passa a exigir `clock: Clock` |
| `reports/application/ports/team-report-read.ts` | `TeamMember` += os 3 campos |
| `reports/adapters/http/schemas.ts` | `teamMemberSchema` += os 3 (`nullable`; `age` é `z.number()`) |
| `reports/adapters/http/composition.ts` | call-site do reader ganha `clock: ClockReal()` |

`teamToDto` é spread — não mudou, como o W0 previu.

## Testes pré-existentes ajustados
`reports-team.http.test.ts` (só a **fixture** `member()`, nenhuma asserção) ·
`reports-team-demographics.http.test.ts` (fixture + o CA9 — ver §Conflito) ·
`collaborator-projection.drizzle-mysql.test.ts` (call-site ganha o `clock`; o `ClockFixed` já existia).

## Decisão de reuso: **opção (b)** — helper compartilhado

O W0 ofereceu (a) exportar `completedYears` da demografia ou (b) extrair um helper. Escolhida a **(b)**:

1. **Direção de dependência** — em (a), a projeção da tabela importaria do módulo de *agregação
   demográfica*: dois consumidores irmãos, sem relação de cliente/servidor. O helper neutro não cria
   hierarquia falsa.
2. **Tipo honesto** — idade é conta de **calendário**, não de instante. O helper opera sobre
   `PlainDate` (ano/mês/dia, sem hora e sem fuso), que é o que `Clock.today()` devolve e o que a
   assinatura travada pelo W0 exige. Em (a) haveria round-trip por `Date` só para caber numa
   assinatura com `getUTC*`.
3. **Reexportar não é de graça** — `public-api/` é a superfície do módulo. O helper **não** entra no
   `index.ts`: segue interno.

**A regra vive num lugar só** (verificado: `completed-years.ts:22`, consumido por
`collaborator-projection.ts:30` e `collaborator-demographics.ts:23`). O caso 29/02 é corrigível uma vez.
Comportamento idêntico ao anterior — a suíte do ticket irmão seguiu verde sem alteração.

## Como cada CA foi atendido

- **CA1** os 3 campos nos **três** pontos (projeção → port → schema). Esquecer o schema deixaria o
  mapper certo e o payload errado — foi exatamente o RED da borda. `age` viaja como número.
- **CA2** `completedYears`: `reference.year - birth.year`, menos 1 quando `(mês, dia)` de hoje é
  anterior ao nascimento. **Sem ramo especial para 29/02** — em ano não-bissexto, 28/02 ainda não
  completou e 01/03 completou. `dateOfBirth === null` → `age: null`.
- **CA3** `dateOfBirth` **morre no mapper**: entra `Date`, sai `number`. Não existe no tipo de saída,
  logo não existe no payload. O teste do corpo cru (sem `1985`, sem `birth`) passa.
- **CA4** `genderIdentity`/`race` copiados do agregado, onde já são `T | null`. Nenhum `?? ''`.
- **CA5** `plugin.ts`/RBAC **intocados** — a rota segue sob `COLLABORATOR_PERMISSION.read`. Nenhuma
  permissão nova.
- **CA6** os 10 campos anteriores idênticos; o delta é só a **adição** de 3 (payload = 13).

## ⚠️ Conflito não previsto no W0 — e como foi resolvido

Ao estender o schema, um teste do **ticket irmão** ficou vermelho:

```
reports-team-demographics.http.test.ts:218
✖ CA9: a projecao das 9 colunas segue inalterada sob collaborator:read
  + 'age' + 'genderIdentity' + 'race'   (esperava exatamente 10 chaves)
```

**Não é regressão:** é asserção do contrato **antigo**, que este ticket substitui deliberadamente por
decisão da P.O. (2026-07-20 — replicar o legado). Dois testes no repo não podem congelar contagens
diferentes da mesma rota.

**Resolução:** a lista do CA9 passou a ser a de 13 chaves, com comentário explicando. **O que o CA9
guarda foi preservado** — os 10 campos do #238 continuam lá, sob a mesma permissão, e o segundo teste
do bloco ("`/reports/team` NÃO passa a exigir a permissão nova") não foi tocado.

## Prova do GREEN (baseline medido no próprio worktree, com o W1 em stash)

| | W0 (RED) | W1 |
| :-- | :-- | :-- |
| tests | 4267 | 4267 |
| pass | 4231 | **4248** (+17) |
| fail | **17** | **0** |

Nenhum teste novo no W1 — o total não mudou; os 17 vermelhos viraram verdes. As 2 suítes do ticket:
21/21. typecheck (os 14 `TS2339` sumiram; 3 erros derivados da mudança de contrato apareceram e foram
corrigidos), format e lint verdes. Integração **não** rodada (é W3; o teste gated já está ajustado:
13 chaves + `clock`).

## Notas para o W2

1. **Ver primeiro o §Conflito** — é a única mudança de asserção do ticket. Se discordar, o caminho não
   é reverter o schema: é decidir qual teste é dono da contagem de chaves da rota.
2. **Opção (b)** — confirmar que `completed-years.ts` **não** entrou no `public-api/index.ts` e que a
   conversão `PlainDate.fromDate` na demografia não mudou comportamento.
3. **Mudança de assinatura pública:** `openCollaboratorProjectionReader` agora exige `clock`. Dois
   call-sites, ambos ajustados. Não há terceiro consumidor.
4. **`today` resolvido uma vez por `list()`**, não por linha — numa virada de dia no meio da listagem
   ninguém aparece com idade inconsistente.
5. **LGPD/#238:** a inversão de "raça/gênero nunca cruzam a public-api" é decisão registrada da P.O.
   no `000-request.md` §Conflito, não descuido. `dateOfBirth` continua barrado.

## Próximo passo
W2 — REVIEW (`code-reviewer`), read-only sobre o diff de `src/` + os 3 testes ajustados.
