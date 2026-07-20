# REPORTS-TEAM-DEMOGRAPHICS — escopo (REP-1 · Equipe ABC · gráficos demográficos)

> Expõe as 3 distribuições demográficas do relatório "Equipe ABC" (Gênero, Idade, Raça/Cor) que hoje
> não trafegam. Size **M**. Estende `REPORTS-TEAM-ABC` (#238) sem reformulá-lo — a projeção das 9
> colunas LGPD-safe fica **intacta**.

## Contexto

Os 3 gráficos **já existem no front** (replicam o legado) e estão órfãos: o endpoint
`GET /api/v2/reports/team` devolve só as 9 colunas LGPD-safe de
[`collaborator-projection.ts`](../../../src/modules/partners/public-api/collaborator-projection.ts), e
`race`/`gender_identity`/`date_of_birth` **nunca cruzam a public-api** por decisão do
`REPORTS-TEAM-ABC`. O dado existe em `par_collaborators`
([`mysql.ts:180`](../../../src/modules/partners/adapters/persistence/schemas/mysql.ts)).

Raça e identidade de gênero são **dado sensível na acepção do Art. 5º II da LGPD** (categoria
especial). A liberação é sob permissão dedicada (`collaborator:read-sensitive`, CA7) — ver
§Decisão sobre o bypass.

## Decisão de desenho: **o backend agrega** (Opção A — P.O., 2026-07-16)

A API devolve **contagem por categoria** (`CategoryCount`), não linha por pessoa. Dado sensível
**nunca sai como linha**. Alternativa descartada (Opção B: front agrega a partir de linhas):

1. **Suprimir contagem pequena no cliente é teatro** — se o browser recebeu a linha de cada pessoa, o
   k-anonimato não existe (basta o DevTools). O CA6 só é implementável agregando no servidor.
2. **Elimina uma classe de bug, não uma instância.** O front mantém hoje a lista canônica de
   categorias e **descarta em silêncio** o que não conhece (`countByOrder`) — `INDIGENA` some do
   gráfico, e 5 das 8 identidades de gênero somem. Com as contagens prontas não há lista no front
   para dessincronizar quando o formulário ganhar um valor novo.
3. **Torna verdadeiro o invariante "soma das fatias = total"**, hoje afirmado no front e não
   garantido por ninguém.
4. **Preserva a barreira do #238** — só a estatística atravessa a fronteira.

Custo aceito: retrabalho no front (as agregações `byGenero`/`byRacaCor`/`byFaixaEtaria` saem; a tela
renderiza o que recebe). Issue no repo do front — **não** neste ticket.

## Parâmetros (P.O., fundamentados no formulário de cadastro + legado)

**Universo:** só colaboradores **`active`** (soft-delete fora).

**Gênero → campo `gender_identity`** (NÃO `sex`; o legado usa "Cis", que não existe em `F`/`M`).
8 categorias + N/A: `PREFIRO_NAO_RESPONDER`, `HOMEM_CIS`, `HOMEM_TRANS`, `MULHER_CIS`,
`MULHER_TRANS`, `TRAVESTI`, `NAO_BINARIO`, `OUTRO`.

**Raça/Cor → campo `race`.** 6 categorias + N/A: `AMARELO`, `BRANCO`, `PARDO`, `INDIGENA`, `PRETO`,
`PREFIRO_NAO_RESPONDER`. (O front hoje **omite `INDIGENA`** — defeito do front; o contrato manda as 6.)

**Idade → faixas do legado**, calculadas **no servidor** a partir de `date_of_birth`:
`Até 29` · `30 a 39` · `40 a 49` · `50 a 59` · `60+` · `N/A`.

**Nulo é categoria própria (`N/A`)** nos 3 — **distinto** de `PREFIRO_NAO_RESPONDER`, que é resposta,
não ausência. Fundir os dois falsifica a coleta.

**`date_of_birth` NUNCA sai da API** (nem a idade exata) — só a faixa. Inverte o
[FR-012](../../../src/modules/partners/adapters/http/schemas.ts) ("idade é derivável de birthDate no
client") **apenas neste relatório**; o FR-012 segue válido onde está.

**k-anonimato: k=5.** Bucket com `0 < count < 5` agrupa em `Outros` (não some — o total continua
batendo). Motivo: a tela **já tem filtro** por programa/função (catálogo i18n
`reports.equipe.filters.*`), então a fatia pequena não é hipotética (`TRAVESTI: 1` num programa de 4
identifica a pessoa).

## Contrato — ponto aberto para W1

`CategoryCount = { id, label, count }`. **Recomendação:** o backend manda `label` (PT-BR) junto do
`id` canônico. Se mandar só `id`, o front precisa de um mapa `id→label` — que é a lista canônica de
volta, e com ela o bug de drift do item 2 acima. Alinhar com o front antes do W1.

## Escopo (in)

1. **`partners/public-api`:** novo reader agregado (molde: `openCollaboratorProjectionReader`,
   boot-scoped — pool aberto uma vez, ver incidente RDS 0001). Agrega **dentro** do `partners` e
   expõe só `CategoryCount[]` por dimensão. Filtra `active`. Aplica faixa etária e k=5.
   `CollaboratorTeamProjection` **não muda**.
2. **`reports`:** port + rota `GET /api/v2/reports/team/demographics`, gate na permissão nova, Zod
   response, adapter ponte + wiring no `server.ts`.
3. **`auth`:** permissão `collaborator:read-sensitive` no catálogo + seed.

## Fora de escopo

- Corrigir as agregações do front → issue no repo do front.
- `GET /api/v1/collaborators`, que hoje devolve `cpf`/`rg`/`race`/`allergies`/`completeAddress` e
  **filtra** por `genderIdentities`/`breeds` sob a permissão genérica `collaborator:read` — mesmo
  achado, escopo maior → **issue própria** (anti-padrão #15).
- Cruzar dimensões (gênero × raça) — invariante: distribuições **marginais** apenas.

## Critérios de aceite

- **CA1** `GET /api/v2/reports/team/demographics` devolve as 3 distribuições como `CategoryCount[]`.
- **CA2** Nenhum campo por pessoa no payload — sem `race`, `genderIdentity`, `dateOfBirth`, `idade`.
- **CA3** Universo = só `active`.
- **CA4** As 8 de gênero + as 6 de raça (incl. `INDIGENA`) + as 6 faixas aparecem; `N/A` é bucket
  próprio, distinto de `PREFIRO_NAO_RESPONDER`; **soma das fatias = total de ativos** (as 3 dimensões).
- **CA5** Valor fora da lista canônica **não é descartado em silêncio** — cai em `Outros` e continua
  somando ao total.
- **CA6** k=5: bucket com `0 < count < 5` vira `Outros`; total preservado.
- **CA7** RBAC: sem `collaborator:read-sensitive` → 403; com → 200. `collaborator:read` sozinho **não**
  abre.
- **CA8** ~~carve-out no bypass~~ — **REMOVIDO** (ver §Decisão sobre o bypass).
- **CA9** Regressão zero: `GET /reports/team` (#238) inalterado.

## Decisão sobre o bypass — CA8 removido (P.O., 2026-07-20)

O **ADR-0053 foi REJEITADO** (mergeado como `Rejected`). Não haverá carve-out: durante a aceitação do
sistema recém-entregue, `AUTH_RBAC_MODE=bypass` libera **tudo**, inclusive estes gráficos. Razões
registradas no ADR: paridade com o legado (que já era aberto), necessidade de o cliente testar todos
os módulos, o RBAC será refeito por inteiro com critérios de LGPD + regras do cliente, e o cliente
está ciente.

**Consequência para este ticket:**
- O **CA7 continua valendo** — a rota exige `collaborator:read-sensitive` no modo `enforced`. É o que
  o redesenho do RBAC vai usar quando o bypass for desligado.
- Em `bypass` a permissão não barra (como toda permissão hoje). Isso é **esperado**, não defeito —
  não escrever teste exigindo o contrário.
- **Nada mais bloqueia o W1.**

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — agregação + k=5 + N/A vs PREFIRO_NAO_RESPONDER + RBAC (CA7) |
| W1 | `ports-and-adapters` + `fastify-server-expert` (par `zod-expert`) | reader agregado + rota + permissão + wiring |
| W2 | `code-reviewer` + `security-backend-expert` (LGPD) | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL (OrbStack) |

## DoD

Gate W3 verde + rota no `/api/v2` com a permissão dedicada + os 3 gráficos com dado real,
`INDIGENA` incluso e soma batendo com o total de ativos. (O ADR-0053 foi rejeitado — não é DoD.)
