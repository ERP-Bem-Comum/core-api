# W0 — RED · REPORTS-TEAM-DEMOGRAPHICS

> Skill: `tdd-strategist`. Escopo: `GET /api/v2/reports/team/demographics` — 3 distribuições como
> contagem agregada (`CategoryCount = { id, label, count }`). CA1..CA7 e CA9 (**CA8 removido** —
> ADR-0053 rejeitado; nenhum teste de carve-out no bypass foi escrito).
> Verificado pelo orquestrador: `src/` intocado, 8 falhas só nos 2 arquivos novos, zero regressão.

## Arquivos criados

| Arquivo | Camada |
| :-- | :-- |
| `tests/modules/partners/public-api/collaborator-demographics.test.ts` | unit — lógica pura (faixa etária, buckets, N/A, `Outros`, k=5) |
| `tests/modules/reports/adapters/http/reports-team-demographics.http.test.ts` | borda HTTP via `fastify.inject` (molde #238) |

Nenhuma suíte de integração adicionada (a função pura recebe todas as linhas e filtra `active` ela
mesma) → nada a registrar em `scripts/ci/test-integration.ts`. Se o W1 filtrar/agregar em SQL, aí
passa a exigir teste gated `MYSQL_INTEGRATION=1`.

## Contrato que o W1 deve implementar

```ts
// partners/public-api/collaborator-demographics.ts (PURO — sem infra)
CategoryCount = { id: string; label: string; count: number }
CollaboratorDemographicsRecord = { active; genderIdentity: string|null; race: string|null; dateOfBirth: Date|null }
TeamDemographicsSummary = { totalActive; gender[]; ageRange[]; race[] }
K_ANONYMITY_MIN = 5 · OTHERS_ID = 'OUTROS' · NOT_AVAILABLE_ID = 'NA'
aggregateTeamDemographics(records, { referenceDate }) -> TeamDemographicsSummary

// reports/application/ports/team-demographics-read.ts
TeamDemographicsReadPort = { list: () => Promise<Result<TeamDemographics, 'team-demographics-read-unavailable'>> }
// ReportsHttpDeps += listTeamDemographics · COLLABORATOR_PERMISSION += readSensitive · PermissionCatalog += a string
```

### Decisões de contrato tomadas no W0

1. **`label` PT-BR viaja junto do `id`** (era o §Contrato aberto do request — "alinhar com o front").
   Evita o mapa `id→label` no front, que é a lista canônica de volta (o bug de drift que a Opção A
   existia para matar). **Sinalizado à P.O.**
2. Payload flat `{ totalActive, gender, ageRange, race }` — `totalActive` é o denominador que torna
   "soma = total" verificável pelo cliente.
3. `N/A` é bucket canônico das 3 → gênero **9** (8+NA), raça **7** (6+NA), idade **6** (o NA já é uma
   das 6 faixas do legado).
4. **Bucket suprimido continua na lista com `count: 0`**; só a contagem migra para `Outros`. É o que
   faz CA4 ("as 8/6/6 aparecem") e CA6 (k=5) serem verdadeiros ao mesmo tempo.
5. **`Outros` é isento do k** — re-suprimi-lo faria a soma deixar de bater (perderia pessoa). Vem por
   último e só quando `count > 0`.
6. Desconhecido (CA5) e suprimido (CA6) caem no **mesmo** `Outros` — balde residual único.
7. **k=5 vale também para o `N/A`** — ausência de resposta em grupo pequeno também identifica.
8. Idade = anos completos na `referenceDate` **injetada** (sem `Date.now()` na função pura);
   `dateOfBirth: null` → `N/A`. Limites: 29→`ATE_29`, 30→`DE_30_A_39`, 59→`DE_50_A_59`, 60→`MAIS_60`.

## Mapa CA → asserção (resumo)

- **CA1** 200; `gender` 9, `race` 7, `ageRange` 6; itens `{id,label,count}` válidos.
- **CA2** chaves do body exatamente `['ageRange','gender','race','totalActive']`; corpo cru sem
  `dateOfBirth`/`genderIdentity`/`cpf`/`nome`; **regex de data `\d{4}-\d{2}-\d{2}` não casa**.
- **CA3** 6 ativos + 9 inativos → `totalActive 6`, bucket dos inativos 0; universo vazio → zeros sem `Outros`.
- **CA4** listas canônicas em ordem (incl. `INDIGENA`); nulo→`NA` e resposta→`PREFIRO_NAO_RESPONDER`
  em **dois buckets de 5**; soma = total nas 3; faixa etária em 11 casos (incl. aniversário não feito).
- **CA5** `AGENERO`/`XPTO` → `OUTROS`, soma preservada; `Outros` é o último.
- **CA6** 6/3/1 → `BRANCO 6, PRETO 0, NA 0, OUTROS 4`, soma 10; **exatamente 5 NÃO é suprimido**.
- **CA7** `reconciliation:read`→403; **`collaborator:read` sozinho→403**; `read-sensitive`→200; a
  string existe em `COLLABORATOR_PERMISSION` e em `PermissionCatalog.all`.
- **CA9** `GET /reports/team` segue 200 com as 9 colunas — **estes 2 já passam** (guarda, não RED).

## Prova do RED (verificada pelo orquestrador)

| | Baseline | Com os 2 arquivos |
| :-- | :-- | :-- |
| tests | 4214 | 4224 |
| pass | 4195 | **4197** (+2 = os CA9, que devem passar) |
| fail | 0 | **8** |

RED **pelo motivo certo**: o arquivo puro quebra no load (`ERR_MODULE_NOT_FOUND` de
`collaborator-demographics.ts`) e a borda devolve **404** (rota inexistente), não 500 — inclusive o
`CA7 sem permissao -> 403` falha com 404, provando que não há RBAC acidentalmente correto.

`typecheck`: 7 erros, **todos** dos arquivos novos (2 `TS2307` de módulo ausente + 4 `TS7006`
consequentes + 1 `readSensitive` inexistente). Voltam a zero no W1; nada foi anotado para maquiar.

## Notas para o W1

1. Função pura **sem import de infra**; o reader boot-scoped (molde `openCollaboratorProjectionReader`
   — pool 1×, incidente RDS 0001) fica em arquivo separado e **usa** a função pura.
2. `CollaboratorTeamProjection` **não muda** (CA9 + decisão da P.O.).
3. `race`/`genderIdentity` entram como `string | null` **de propósito** — o CA5 exige que lixo do
   legado caia em `Outros`; usar os VOs do domínio rejeitaria antes de contar.
4. Se o reader filtrar/agregar em SQL → adicionar teste gated e registrar no runner de CI.
5. `referenceDate` do `ClockReal()` na composição; nunca `new Date()` na função pura.
6. Zod da resposta com `.strict()` (padrão REP-2/REP-4) — o CA2 exige que campo extra não vaze.
7. Erro do port → **503** (`team-demographics-read-unavailable`), igual ao `team-report-read-unavailable`.
8. Catálogo: `'collaborator:read-sensitive'` em ordem alfabética no bloco `collaborator:*`, **e** em
   `COLLABORATOR_PERMISSION` (partners), **e** no seed RBAC dev/test.

## Próximo passo
W1 — GREEN (`ports-and-adapters` + `fastify-server-expert`): função pura → reader → port + rota + Zod
+ permissão + wiring, até as 8 falhas virarem verde sem quebrar as 4195.
