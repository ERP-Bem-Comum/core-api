# W1 — GREEN · REPORTS-TEAM-DEMOGRAPHICS

> Skill: `ports-and-adapters` (+ borda Fastify/Zod). As **8 falhas** do W0 → 0. **k-anonimato NÃO
> implementado** (decisão P.O. 2026-07-20 — `grep K_ANONYMITY src/` = 0); balde `OUTROS` mantido só
> para o CA5. Verificado pelo orquestrador: 4 gates verdes, k=5 ausente, reader lê só 4 colunas.

## Arquivos criados

| Arquivo | Papel |
| :-- | :-- |
| `partners/public-api/collaborator-demographics.ts` | `aggregateTeamDemographics` + listas canônicas + `OTHERS_ID`/`NOT_AVAILABLE_ID`. **Zero import de infra.** |
| `partners/public-api/collaborator-demographics-reader.ts` | Reader boot-scoped (pool 1×) — SELECT das 4 colunas cruas, delega à função pura. |
| `reports/application/ports/team-demographics-read.ts` | Port `list()` → `Result<TeamDemographics, 'team-demographics-read-unavailable'>`. |
| `reports/adapters/persistence/team-demographics-read.partners.ts` | ACL: reader do partners → port. |
| `reports/adapters/persistence/team-demographics-read.in-memory.ts` | Driver `memory` (boot sem DB). |

## Arquivos tocados
`partners/public-api/index.ts` (exports) · `partners/public-api/permissions.ts`
(`readSensitive`) · `auth/domain/authorization/permission-catalog.ts` (a string, em ordem alfabética) ·
`reports/adapters/http/{schemas,dto,plugin,composition}.ts` (schema `.strict()`, DTO, rota + gate +
503, wiring com `close()` em todos os caminhos de falha e no `shutdown()`).

**`src/server.ts` NÃO foi tocado** — já injeta `partnersUrl` em `buildReportsHttpDeps`; o reader novo
abre lá dentro (YAGNI).

**Único teste tocado:** `permission-catalog.test.ts` — a lista congelada ("conjunto conhecido do
sistema") ganhou a permission nova. Verificado no diff: **só adição** (comentário + string); nenhuma
asserção do W0 foi editada ou enfraquecida. A guarda existe para ser atualizada deliberadamente.

## Como cada regra foi implementada

1. **CA3** `records.filter(r => r.active)` na entrada da função pura; `totalActive` é o tamanho desse
   filtro. Filtro **em memória**, não em SQL → nenhum teste de integração novo exigido (nota 4 do W0).
2. **CA4 listas canônicas** — gênero 8+`NA`, raça 6 (incl. `INDIGENA`)+`NA`, idade as 6 faixas do
   legado. São `CategoryCount[]` com `count: 0` (template zerado) → todo bucket aparece mesmo sem gente.
3. **CA4 `N/A` ≠ `PREFIRO_NAO_RESPONDER`** — `null` → `NOT_AVAILABLE_ID`; a string é bucket próprio.
4. **CA4 soma = total** — `distribute()` conta toda entrada em **exatamente um** balde (canônico, `NA`
   ou `OUTROS`); não há caminho de descarte. A invariante vale **por construção**, não por asserção.
5. **CA5 `OUTROS`** — valor não-nulo fora da lista cai nele, acrescentado por último e **só com
   `count > 0`**. É o único motivo de o balde existir depois da remoção do k: lixo do legado não some
   em silêncio.
6. **k=5 ausente** — `grep -rn "K_ANONYMITY\|anonym" src/` = 0. A contagem exibida é a real.
7. **Faixa etária** — `completedYears` em UTC; aniversário não feito no ano conta a idade menor
   (1996-12-31 em 2026-07-20 → `ATE_29`). `referenceDate` **injetada** (`ClockReal()` da composição);
   a função pura não conhece `Date.now()`.
8. **Reader boot-scoped** (incidente RDS 0001) — pool 1×, `list`/`close`; composição fecha em todos os
   caminhos de erro e no `shutdown()`.
9. **SELECT cru, sem o mapper do agregado — deliberado.** Lê 4 colunas (`active`, `gender_identity`,
   `race`, `date_of_birth`) direto de `par_collaborators`. O mapper validaria `race`/`genderIdentity`
   contra os VOs e **reprovaria a leitura inteira** ao topar com lixo do legado — exatamente o que o
   CA5 manda contar. Materializa a nota 3 do W0. **Verificado:** nenhum nome/CPF/e-mail sai do banco.
10. **CA9** `CollaboratorTeamProjection` e `TeamReportReadPort` intocados; `/reports/team` segue sob
    `collaborator:read`; os 2 testes-guarda do W0 verdes.
11. **CA2** o port devolve só `{ totalActive, gender, ageRange, race }`; Zod `.strict()` nos dois
    níveis → campo extra vira erro de serialização (fail-loud), não vazamento.
12. **CA7** `authorize(COLLABORATOR_PERMISSION.readSensitive)`. A permission é **distinta** de
    `collaborator:read`, então o gate genérico não abre. O seed RBAC deriva de `PermissionCatalog.all`
    (`syncPermissionCatalog`) → **nenhum seed precisou de edição**.
13. **Erro do port → 503**, espelhando `team-report-read-unavailable`.

## Prova do GREEN (verificada pelo orquestrador)

| | W0 (RED) | W1 |
| :-- | :-- | :-- |
| tests | 4224 | 4246 |
| pass | 4197 | **4227** |
| fail | **8** | **0** |

O delta de `tests` vem das suítes do W0 que antes abortavam no load (`ERR_MODULE_NOT_FOUND`) e agora
executam: 23 casos da função pura + 9 da borda, todos verdes. typecheck (os 7 erros do W0 sumiram),
format e lint verdes. Integração não rodada (é W3).

## Notas para o W2

1. **Item 9 (leitura crua)** — se o revisor achar que fere o ACL, a alternativa (usar
   `collaboratorFromRow`) **quebra o CA5**. Não é troca neutra; discutir com esse trade-off à vista.
2. **`CategoryCount` duplicado** em partners e no port do reports — **intencional**, mesmo motivo de
   `TeamMember` no `team-report-read.ts`: o port descreve o contrato do consumidor e não pode quebrar
   por mudança interna do fornecedor (ADR-0006). O adapter-ponte faz o repasse.
3. **Listas canônicas como `CategoryCount[]` com `count: 0`** — é o formato que os testes do W0
   exercitam. Um tipo `Category { id, label }` separado exigiria mudar o W0 (decisão de contrato).
4. **Driver `memory`** devolve listas vazias (não zeradas-canônicas) — boot sem DB; sem teste que
   exija paridade de forma (YAGNI).
5. **LGPD (para o `security-backend-expert`):** só estatística cruza a fronteira. O vetor de inferência
   restante (bucket 1–2 + `/collaborators/export`) é **decisão consciente da P.O.**, registrada no
   `000-request.md` §Parâmetros — a régua é replicar o legado; segregação vem no redesenho do RBAC.

## Próximo passo
W2 — REVIEW (`code-reviewer` + `security-backend-expert`).
