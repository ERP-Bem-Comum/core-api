# W2 — REVIEW (round 1) · REPORTS-TEAM-DEMOGRAPHICS

> Skill: `code-reviewer` (+ lente `security-backend-expert` para o item 10). **Audit read-only** —
> nenhum arquivo de `src/` ou `tests/` foi tocado nesta wave. Diff revisado: `abae0be3`
> (W1) + o commit de teste que o antecede (`66057bc9`, remoção do k=5 do W0).

## Veredito: **APPROVED**

Os 10 pontos do checklist passam. As 5 observações da §Não-bloqueantes são registros para o W3 /
tickets futuros, **não** condição de aprovação.

---

## Checklist

### 1. Agregação pura — ✓

- `src/modules/partners/public-api/collaborator-demographics.ts` importa **zero** módulos: não há
  nenhuma linha `import` no arquivo (verificado no arquivo inteiro, 157 linhas). Sem `node:*`, sem
  Drizzle, sem `Date.now()`.
- **Soma == `totalActive` por construção:** `distribute()` (`:114-134`) itera `values` e resolve o id
  em uma expressão **total** — `value === null ? NA : canonicalIds.has(value) ? value : OUTROS`
  (`:121-122`). Não existe `continue`, `filter` nem ramo sem incremento, logo
  `Σ counts == values.length`; e `values` vem sempre de `actives.map(...)` (`:144-155`), cujo tamanho
  é o próprio `totalActive` (`:141-143`). Invariante estrutural, não asserção.
- **`N/A` ≠ `PREFIRO_NAO_RESPONDER`:** `NOT_AVAILABLE_ID = 'NA'` (`:48`) é bucket próprio; a string
  `'PREFIRO_NAO_RESPONDER'` está nas listas canônicas de gênero (`:58`) e raça (`:76`) e é contada
  como resposta. Coberto por `collaborator-demographics.test.ts:141`.
- **`OUTROS` só com `count > 0` e por último:** `:130-133` — `others > 0 ? [...canonical, {...}] :
  canonical`. Concatenação no fim, condicional na contagem. Coberto em `:222-241` (incl. "Outros é o
  último bucket").

### 2. Faixa etária — ✓

- `completedYears` (`:91-98`) usa só getters UTC e faz `difference - 1` quando `hadBirthday` é falso;
  `hadBirthday` compara mês e, no mesmo mês, `getUTCDate() >= birth.getUTCDate()` — aniversário no
  próprio dia já conta. Teste `:214` ("aniversario ainda nao feito no ano de referencia conta a idade
  menor") + 11 casos parametrizados em `:207`.
- `referenceDate` é **parâmetro obrigatório** (`options: Readonly<{ referenceDate: Date }>`, `:138`),
  propagado do `ClockReal()` injetado em `composition.ts:122`. Nenhum `new Date()`/`Date.now()` no
  arquivo puro nem no reader (`collaborator-demographics-reader.ts:58` usa `opts.clock.now()`).
- As 6 faixas do legado com labels PT-BR conferem com o `000-request.md:49-50`:
  `ATE_29/'Até 29'`, `DE_30_A_39/'30 a 39'`, `DE_40_A_49/'40 a 49'`, `DE_50_A_59/'50 a 59'`,
  `MAIS_60/'60+'`, `NA/'N/A'` (`:81-88`). Cortes em `ageRangeIdOf` (`:100-108`) fecham nos limites
  certos (29→`ATE_29`, 30→`DE_30_A_39`, 59→`DE_50_A_59`, 60→`MAIS_60`).

### 3. k=5 ausente — ✓

- `grep -rn "K_ANONYMITY\|anonym" src/` → **0 ocorrências** (executado nesta wave).
- O commit `66057bc9` removeu do W0 o `describe` de k-anonimato (4 casos + o teste da constante + o
  import) e **nada mais** — diff conferido linha a linha: as demais asserções (CA3/CA4/CA5/CA2)
  seguem intactas.
- Decisão da P.O. respeitada; **não** proponho reintroduzir. O balde `OUTROS` sobrevive por outro
  motivo (CA5), o que está correto.

### 4. CA2 (nada por pessoa) — ✓

- Port devolve exatamente `{ totalActive, gender, ageRange, race }`
  (`reports/application/ports/team-demographics-read.ts`, tipo `TeamDemographics`).
- Zod `.strict()` nos **dois** níveis: `categoryCountSchema` (`schemas.ts:31-37`) e
  `teamDemographicsResponseSchema` (`schemas.ts:41-48`).
- `teamDemographicsToDto` (`dto.ts:21-27`) faz cópia rasa dos 3 vetores + `totalActive` — não há
  caminho para campo de pessoa. O reader nem lê nome/CPF/e-mail do banco (item 5).
- Teste de fronteira `reports-team-demographics.http.test.ts:171-193`: chaves do body exatamente
  `['ageRange','gender','race','totalActive']`, cada bucket exatamente `{count,id,label}`, corpo cru
  sem `dateOfBirth`/`genderIdentity`/`cpf`/`nome` e **regex `\d{4}-\d{2}-\d{2}` não casa**.

### 5. Reader boot-scoped — ✓

- `openCollaboratorDemographicsReader` (`collaborator-demographics-reader.ts:35-66`) chama
  `openPartnersMysql` **uma vez** e devolve `{ list, close }`; `list` não reabre nada, só usa o `db`
  capturado no closure. Molde `openCollaboratorProjectionReader` respeitado (incidente RDS 0001).
- `close()` em **todos** os caminhos: `composition.ts:124-129` (falha do próprio reader fecha o
  `teamReader` antes do throw) e `:137`, `:150`, `:163`, `:175` (cada falha subsequente fecha o
  demographics), mais `:205` no `shutdown()`. Conferido no diff — nenhum `if (!...Reader.ok)` posterior ficou sem a
  linha `await demographicsReader.close()`.
- **Lê só 4 colunas** (`:49-56`): `active`, `genderIdentity`, `race`, `dateOfBirth` — projeção
  explícita no `db.select({...})`, não `select()` cru. Nome, CPF, e-mail, endereço e telefone **não
  saem do banco**.

### 6. Item 9 do W1 (leitura crua sem o mapper) — ✓ trade-off justificado

O argumento do W1 **procede e foi verificado no código**, não aceito por palavra:

- `collaborator-reader.drizzle.ts:66-70`: no `list()`, o primeiro `collaboratorFromRow` que falha faz
  `return err('collaborator-read-unavailable')` — **aborta a leitura inteira**, não pula a linha.
- `collaborator.mapper.ts:159-164`: `genderIdentity`/`race` passam por `GenderIdentity.parse` /
  `Race.parse`, que rejeitam qualquer valor fora do set canônico
  (`gender-identity.ts:28`, `race.ts`). As colunas são `varchar(30)` livres
  (`schemas/mysql.ts:181-182`, sem `ENUM` — ADR-0020), logo lixo do legado é **possível por
  construção**.
- Consequência: usar o mapper faria **um** registro sujo derrubar o relatório inteiro (503) —
  exatamente o oposto do CA5, que manda contá-lo em `OUTROS`.

**Alternativas avaliadas e por que não são melhores agora:**

| Alternativa | Veredito |
| :-- | :-- |
| Mapper por linha com *skip* do inválido | **Viola o CA5 e o CA4** — a pessoa sumiria e a soma deixaria de bater com `totalActive`. Pior que o atual. |
| Mapper por linha com *fallback* para o valor cru | Preserva o CA5, mas exige mudar `collaborator-reader.drizzle.ts`/mapper, que servem **outros** consumidores (`getById`, `contractor-read`) — mudança de semântica fora do escopo, com risco de regressão em CA9. Se um dia o "read tolerante" for necessário em mais de um lugar, vira ticket próprio. |
| Manter a leitura crua (escolha do W1) | **Correta**. É I/O de 4 colunas sobre a **própria** tabela do módulo, dentro do `partners`. |

Não há violação de ACL: o arquivo vive em `partners/public-api/` e lê `par_collaborators` do próprio
módulo — o mesmo padrão do molde `collaborator-projection.ts:20-21`, que importa driver e repo de
`../adapters/`. O que o ADR-0006 proíbe é o **reports** alcançar `partners/adapters` — e ele não
alcança (item 7).

### 7. ADR-0006 / duplicação de `CategoryCount` — ✓

- `team-demographics-read.partners.ts:10` e `composition.ts:16-19` importam **só**
  `#src/modules/partners/public-api/index.ts`. Nenhum import de `partners/domain` ou
  `partners/adapters` no `reports` (diff inteiro conferido).
- A duplicação do tipo é **o padrão da casa**: `team-report-read.ts` declara `TeamMember` próprio em
  vez de reexportar o do `partners`, e `dto.ts:2` consome o tipo do **port**, não o do fornecedor. O
  adapter-ponte (`team-demographics-read.partners.ts:17-24`) faz o repasse e traduz o erro. Mesma
  forma, mesma justificativa (o port descreve o contrato do consumidor).
- O reader do partners exporta `list` com erro `string` largo; a ponte estreita para o literal
  `'team-demographics-read-unavailable'` — fronteira de erro bem colocada.

### 8. CA9 regressão zero — ✓

- `git show --stat HEAD`: `collaborator-projection.ts`, `team-report-read.ts`,
  `team-report-read.partners.ts` e a rota `/reports/team` **não aparecem no diff**. A rota antiga
  (`plugin.ts:60-75`) segue sob `COLLABORATOR_PERMISSION.read`, inalterada.
- Testes-guarda verdes nesta wave: `CA9: a projecao das 9 colunas segue inalterada sob
  collaborator:read` e `CA9: /reports/team NAO passa a exigir a permissao nova`.

### 9. Teste tocado — ✓

- Único teste no diff: `tests/modules/auth/domain/authorization/permission-catalog.test.ts:129-135`
  — **três linhas adicionadas** (2 de comentário + a string `'collaborator:read-sensitive'` em ordem
  alfabética entre `collaborator:read` e `collaborator:write`). Zero remoção, zero asserção
  reescrita. É a lista congelada sendo atualizada deliberadamente, que é para isso que ela existe.
- Nenhuma asserção do W0 foi enfraquecida: os 2 arquivos do W0 não estão no diff do `HEAD`, e a
  única edição neles (`66057bc9`) é a remoção do k=5 ordenada pela P.O. (item 3).

### 10. LGPD (lente `security-backend-expert`) — ✓ sem risco não-registrado

- **Só estatística cruza a fronteira.** Cadeia auditada ponta a ponta: SELECT de 4 colunas →
  agregação pura → port `TeamDemographics` → DTO raso → Zod `.strict()`. O dado por pessoa morre
  dentro do `partners`, em memória, no escopo da chamada.
- **Gate dedicado.** `authorize(COLLABORATOR_PERMISSION.readSensitive)` (`plugin.ts:82`) com string
  distinta de `collaborator:read` (`permissions.ts:11-13`), registrada em
  `permission-catalog.ts:32-33`. O seed deriva de `PermissionCatalog.all` — nada a editar.
  `collaborator:read` sozinho → 403 (teste verde).
- **Vetor de inferência remanescente (bucket de 1–2 pessoas + `/api/v1/collaborators/export`) está
  registrado** como decisão consciente em `000-request.md:59-73` e no `003-impl/REPORT.md:84-86`.
  **Não reabro** — a régua é replicar o legado e a segregação vem no redesenho do RBAC (ADR-0053
  rejeitado). Registro só para constar que o revisor **verificou a existência do registro**, não que
  discorde.
- Não encontrei risco **não** registrado. Em particular: (a) o endpoint não aceita filtro nem query
  param, logo não há como fatiar a amostra até o indivíduo por parâmetro; (b) não há cruzamento de
  dimensões (só marginais), como o `000-request.md:97` exige; (c) não há trilha de auditoria de
  acesso a dado sensível, mas **isso não é regressão** — nenhuma rota do `reports` tem (grep `audit`
  em `src/modules/reports` = 0). Se virar requisito, é ticket transversal, não deste diff.

---

## Não-bloqueantes (registro; nada aqui impede o W3)

1. **Segundo pool MySQL para o `partners` no boot.** `composition.ts` agora abre `teamReader` **e**
   `demographicsReader`, cada um com seu `openPartnersMysql` — dois pools contra o mesmo banco.
   Ambos são boot-scoped (o incidente RDS 0001 foi sobre pool **por requisição**, não sobre número de
   pools), e o `connectionLimit` de cada um é o default do driver. Não é defeito, mas a pegada de
   conexões do processo cresce a cada reader novo. Se um terceiro reader do `partners` aparecer, vale
   um handle compartilhado. **Sugestão de issue própria**, não fix aqui (anti-padrão #15).
2. **Filtro `active` em memória, não em SQL.** O reader traz **todas** as linhas de
   `par_collaborators` (inclusive inativas) e descarta em `aggregateTeamDemographics:141`. Coerente
   com a nota 4 do W0 (é o que dispensa teste de integração novo) e irrelevante na ordem de grandeza
   atual da tabela. Vira `WHERE active = TRUE` + teste gated `MYSQL_INTEGRATION=1` se a tabela
   crescer.
3. **Colisão teórica com o literal `'NA'`.** Se o legado tiver gravado a string `'NA'` em
   `gender_identity`/`race`, `canonicalIds.has('NA')` é `true`
   (`collaborator-demographics.ts:118`, o template inclui `notAvailable`) e o valor cairia no bucket
   de **ausência** em vez de `OUTROS` — confundindo "não respondeu" com "respondeu lixo". Improvável
   (os literais do legado são os do formulário) e sem impacto na soma. Registro só para não se
   perder.
4. **Driver `memory` devolve listas vazias**, não o template canônico zerado
   (`team-demographics-read.in-memory.ts:11`). O Zod aceita array vazio, então um boot sem DB serve
   `{totalActive: 0, gender: [], ...}` — forma diferente da do driver `mysql`. O W1 assume isso
   como YAGNI (nota 4) e nenhum teste exige paridade; aceito. Se o front usar o modo `memory` para
   desenvolver, ele verá gráfico sem eixo.
5. **`OUTRO` (categoria canônica de gênero) vs `OUTROS` (balde residual)** convivem na mesma lista de
   `gender` quando há lixo — dois rótulos quase idênticos ("Outro" e "Outros") lado a lado no
   gráfico. É consequência direta do contrato acordado no W0; se a P.O. achar confuso na tela, o
   ajuste é de `OTHERS_LABEL` (`:45`), não de estrutura.

---

## Audit log (gate do W2)

```
$ grep -rn "K_ANONYMITY\|anonym" src/
(zero ocorrências)

$ pnpm run lint
$ eslint .
(zero erros, zero warnings)

$ node --test --experimental-strip-types \
    tests/modules/partners/public-api/collaborator-demographics.test.ts \
    tests/modules/reports/adapters/http/reports-team-demographics.http.test.ts \
    tests/modules/reports/adapters/http/reports-team.http.test.ts \
    tests/modules/auth/domain/authorization/permission-catalog.test.ts
ℹ tests 48
ℹ suites 12
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Arquivos relidos integralmente: `collaborator-demographics.ts`, `collaborator-demographics-reader.ts`,
`collaborator-projection.ts` (molde), `collaborator-reader.drizzle.ts` (item 6),
`collaborator.mapper.ts:130-190` (item 6), `schemas/mysql.ts:155-200` (colunas/tipos), diff completo
de `HEAD` e de `66057bc9`. **Nenhum arquivo de `src/`/`tests/` foi modificado nesta wave.**

## Próximo passo

W3 — QUALITY (`ts-quality-checker`): `typecheck` + `format:check` + `lint` + `test` (+ integração
MySQL via OrbStack, prevista no `000-request.md`). Round 1 do W2 fechado como **APPROVED** — não há
retorno ao W1.
