# W2 — REVIEW (read-only) · REPORTS-TEAM-DEMOGRAPHIC-COLUMNS

> Skill: `code-reviewer`. Round 1. Worktree `scratchpad/wt-columns`, commit auditado `cfab3d19`
> ("feat(reports): 3 colunas demográficas na tabela Equipe ABC (W1)").
> **Read-only:** nenhum arquivo de `src/` ou `tests/` foi modificado nesta wave; nenhum commit criado.
> (`git status`: só `STATE.json`/`STATE.md` modificados pelo `wave-start` do orquestrador.)

## Veredito: **APPROVED**

Os 6 CAs do `000-request.md` estão atendidos e verificados **no código**, não só nos testes. Duas
observações **não bloqueantes** ficam registradas ao final (§Observações) — uma delas é um comentário
desatualizado num arquivo tocado pelo ticket, recomendado corrigir antes do merge.

---

## Checklist

### 1. ✓ Os 3 pontos do contrato

| Ponto | Arquivo:linha | `genderIdentity` | `race` | `age` |
| :-- | :-- | :-- | :-- | :-- |
| Projeção (`CollaboratorTeamProjection`) | `partners/public-api/collaborator-projection.ts:47-49` | ✓ `string \| null` | ✓ `string \| null` | ✓ `number \| null` |
| Port (`TeamMember`) | `reports/application/ports/team-report-read.ts:24-26` | ✓ | ✓ | ✓ |
| Schema Zod (`teamMemberSchema`) | `reports/adapters/http/schemas.ts:21-23` | ✓ `z.string().nullable()` | ✓ | ✓ **`z.number().nullable()`** |

`age` é **número**, não string — confirmado no schema (`schemas.ts:23`) e provado na borda
(`reports-team-columns.http.test.ts:175`, `typeof age === 'number'`). `teamToDto` é spread e não
precisou mudar, como o W0 previu.

### 2. ✓ CA3 — `dateOfBirth` não vaza (verificado no código)

`collaborator-projection.ts:77`:

```ts
age: c.dateOfBirth === null ? null : completedYears(PlainDate.fromDate(c.dateOfBirth), today),
```

`c.dateOfBirth` é `Date | null` (`partners/domain/collaborator/types.ts:36`) e **entra apenas como
argumento** — sai `number`. O tipo de saída `CollaboratorTeamProjection` (`:32-50`) **não tem** o
campo, o `TeamMember` também não, e `teamMemberSchema` não o declara (serializer descartaria mesmo se
existisse). Três barreiras independentes. O CA3 não depende de teste para valer.

### 3. ✓ CA2 — regra de idade correta, 29/02 sem ramo especial

`completed-years.ts:22-27`:

```ts
const difference = reference.year - birth.year;
const hadBirthday =
  reference.month > birth.month ||
  (reference.month === birth.month && reference.day >= birth.day);
return hadBirthday ? difference : difference - 1;
```

Anos completos com corte no aniversário: `>=` no dia faz "no dia do aniversário já conta"
(`collaborator-team-projection.test.ts:138`), e `(mês, dia)` de hoje anterior ao nascimento subtrai 1
(`:127`, véspera → 35). **29/02 cai naturalmente**: nascido `2000-02-29`, em `2026-02-28` a
comparação `(2,28) < (2,29)` dá 25; em `2026-03-01`, `3 > 2` dá 26 (`:160-166`). Nenhum `if` de ano
bissexto no código — confirmado lendo as 6 linhas da função inteira.

### 4. ✓ Reuso (opção b) — regra de idade num lugar só, e fora do barrel

- **Definição única:** `grep completedYears` retorna **uma** definição, em `completed-years.ts:22`.
- **Consumidores:** `collaborator-projection.ts:30` (import) / `:77` (uso) e
  `collaborator-demographics.ts:23` / `:96`. A cópia privada anterior
  (`collaborator-demographics.ts`, versão `6671a5e4`) foi **removida**, não duplicada — visível no
  diff como bloco deletado.
- **Comportamento do ticket irmão inalterado:** a antiga função usava `getUTCFullYear/Month/Date`;
  a nova recebe `PlainDate.fromDate(...)`, que extrai exatamente `getUTCFullYear/getUTCMonth()+1/
  getUTCDate` (`shared/kernel/plain-date.ts:60-61`). Mesma aritmética, mesmos campos UTC, mesma
  ordem de comparação → equivalência ponto a ponto. As 7 asserções da suíte demográfica seguem
  verdes sem alteração (rodadas nesta wave).
- **Não está no barrel:** `partners/public-api/index.ts` (63 linhas, lido integralmente) **não**
  exporta `completed-years.ts` nem `completedYears`. Helper interno ✓. `toTeamProjection` também não
  entra no `index.ts` — só `openCollaboratorProjectionReader` e os tipos, como antes.

### 5. ✓ §Conflito do W1 — a mudança do CA9 é legítima e não enfraqueceu nada

**É legítima.** O contrato de `GET /api/v2/reports/team` mudou por decisão registrada da P.O.
(`000-request.md:28-48`, 2026-07-20). Dois testes no repo não podem congelar contagens diferentes da
**mesma rota** — ou o CA9 acompanha, ou o ticket é inexequível. A alternativa ("o teste é dono da
contagem") só faria sentido se o CA9 guardasse *ausência* de campos demográficos; ele guarda
**presença dos 10 do #238 sob a mesma permissão** (título e corpo), e isso foi preservado.

Diff dos 3 testes ajustados, lido linha a linha:

| Teste | O que mudou | Asserção enfraquecida? |
| :-- | :-- | :-- |
| `reports-team.http.test.ts` | **só** a fixture `member()` (+3 campos, `:53-58`) | **Não** — nenhuma linha de `assert` no diff. O CA3 (`:115-121`) continua varrendo o corpo cru por `cpf/rg/salary/salario/address/endereco/saude` e passa. |
| `reports-team-demographics.http.test.ts` | fixture (`:99-104`) + lista de chaves do CA9 `10 → 13` (`:227-241`) | **Não** — é `deepEqual` de lista **exata**: os 10 originais continuam **todos** presentes; foram **adicionados** `age`, `genderIdentity`, `race`. Um `deepEqual` exato de 13 é tão estrito quanto o de 10; nenhum campo saiu. O 2º teste do bloco ("`/reports/team` NÃO passa a exigir a permissão nova", `:245-248`) **não foi tocado**. |
| `collaborator-projection.drizzle-mysql.test.ts` | call-site ganha `clock` (`:78`) | **Não** — mudança de assinatura, `ClockFixed` já existia no arquivo. |

Nenhum `assert` removido, nenhum `skip`/`todo` introduzido, nenhum `deepEqual` virou `ok`.

### 6. ✓ CA5 — RBAC intocado

`git show HEAD --stat` **não lista** `reports/adapters/http/plugin.ts` nem nenhum arquivo de
permissões. A rota segue `preHandler: [requireAuth, authorize(COLLABORATOR_PERMISSION.read)]`
(`plugin.ts:60-64`). Nenhuma permissão nova criada — `grep` de `COLLABORATOR_PERMISSION` no diff: 0
ocorrências.

### 7. ✓ CA6 — regressão zero nos 10 campos

`toTeamProjection` (`collaborator-projection.ts:61-79`) preserva as 10 linhas do mapper anterior
**byte a byte** (o diff mostra apenas 3 linhas adicionadas ao literal e a troca de assinatura). Mesma
origem (`Collaborator`), mesma expressão, mesma ordem. Provado também em
`collaborator-team-projection.test.ts:220-235` (valores) e `:238-246` (13 chaves = 10 + 3).

Observação de tipo, **sem defeito**: o parâmetro passou de `CollaboratorReadRecord['collaborator']`
para `Collaborator` — são o **mesmo tipo** (`collaborator-reader.ts:17-18`: `collaborator:
Collaborator`), agora importado direto. Nada muda em runtime.

### 8. ✓ Mudança de assinatura — os 2 call-sites, e não há terceiro

`grep -rn openCollaboratorProjectionReader src tests`:

- `reports/adapters/http/composition.ts:111-114` — ✓ recebe `clock: ClockReal()` (`ClockReal`
  importado em `:14`, já usado no arquivo para os outros 2 readers).
- `tests/.../collaborator-projection.drizzle-mysql.test.ts:78` — ✓ recebe `clock`.
- `partners/public-api/index.ts:37` — reexport, não é call-site.
- As outras 3 ocorrências (`financial/.../suppliers-without-contract-projection.ts:17`,
  `collaborator-demographics-reader.ts:9`, `team-report-read.partners.ts:5`) são **menções em
  comentário** ("molde:"), não chamadas.

**Não há terceiro consumidor.** `pnpm run typecheck` verde confirma mecanicamente (o parâmetro é
obrigatório — omissão seria erro de compilação).

### 9. ✓ `today` por `list()`, não por linha

`collaborator-projection.ts:93-97`:

```ts
const today = opts.clock.today();
return ok(listed.value.map(({ collaborator }) => toTeamProjection(collaborator, today)));
```

Resolvido **uma vez antes do `map`**. Virada de dia no meio da listagem não produz duas idades para a
mesma data de referência. O mapper é puro (data por parâmetro) — sem `Date.now()`/`new Date()` no
caminho, verificado por leitura do arquivo inteiro.

### 10. ✓ LGPD — a inversão está registrada; `dateOfBirth` segue barrado

A inversão do #238 ("raça/gênero nunca cruzam a public-api") está registrada como **decisão da P.O.
de 2026-07-20** em `000-request.md:28-48`, com os 4 fatos que a sustentam (legado exibia; CSV do
legado; `/api/v1/collaborators/export` já entrega sob `collaborator:read`; ADR-0053 rejeitado).
`dateOfBirth` continua barrado (item 2 acima). Um risco **não** registrado segue em §Observações.

---

## Regras transversais (AGENTS.md / `.claude/rules/`)

| Regra | Status |
| :-- | :-- |
| Sem `class`/`throw`/`this` no domínio e na public-api | ✓ tudo função pura + arrow; `Result` na borda do reader (`err(listed.error)`) |
| `Readonly<>` nos tipos de saída | ✓ `CollaboratorTeamProjection`, `TeamMember` |
| `import type` sob `verbatimModuleSyntax` | ✓ `collaborator-projection.ts:26-29`, `completed-years.ts:20` |
| Extensão `.ts` nos imports + `#src/*` | ✓ em todos os imports novos |
| Idioma: código EN, comentário/doc PT | ✓ |
| Zod só na borda (ADR-0027) | ✓ só `adapters/http/schemas.ts` |
| Cross-módulo via `public-api/` (ADR-0006) | ✓ `reports` continua importando só de `partners/public-api/` |
| Sem clock ambiente em função pura | ✓ `Clock` injetado na composição |

## Audit log (gates rodados nesta wave, read-only)

```
$ pnpm run typecheck        → tsc --noEmit          (sem saída, 0 erros)
$ pnpm run lint             → eslint .              (sem saída, 0 erros)
$ pnpm run format:check     → prettier --check .    All matched files use Prettier code style!

$ node --test tests/.../collaborator-team-projection.test.ts \
              tests/.../reports-team-columns.http.test.ts \
              tests/.../reports-team.http.test.ts \
              tests/.../reports-team-demographics.http.test.ts
ℹ tests 33
ℹ suites 5
ℹ pass 33
ℹ fail 0
ℹ cancelled 0 · skipped 0 · todo 0
```

(A suíte completa e a integração MySQL são do W3.)

---

## Observações (não bloqueantes)

**OBS-1 · Docstring desatualizada em arquivo tocado pelo ticket — `team-report-read.ts:4`.**
O cabeçalho do próprio port que ganhou os 3 campos ainda diz *"9 colunas LGPD-safe"*. O
`schemas.ts:4` e o `collaborator-projection.ts:11-18` foram atualizados; este e o
`reports/adapters/http/plugin.ts:6` (*"projeção Equipe ABC (9 colunas LGPD-safe…)"*) não.
Comentário que descreve o contrato e contradiz o contrato é pior que comentário nenhum.
**Não rejeito por isso** (zero impacto em comportamento, 2 linhas), mas **recomendo corrigir antes do
merge** — é edição de comentário, cabe no W3 sem reabrir W1.

**OBS-2 · Risco NÃO registrado: assimetria de permissão entre o agregado e o por-pessoa.**
`GET /reports/team/demographics` — que expõe raça/gênero **apenas em contagem** — exige
`COLLABORATOR_PERMISSION.readSensitive` (`plugin.ts:82`). A partir deste ticket,
`GET /reports/team` expõe raça/gênero **por pessoa, nomeada** sob `COLLABORATOR_PERMISSION.read`
(`plugin.ts:64`). O dado **mais** identificável ficou sob a permissão **menos** restritiva, dentro do
mesmo módulo e criado pelos dois tickets irmãos em conjunto.

O `000-request.md` registra a inversão do #238 de forma geral e adia a segregação para o redesenho do
RBAC (`:83-84`) — mas **não registra esta assimetria específica**, que não existia antes (foi o
ticket irmão que introduziu `read-sensitive`). É achado **fora do escopo** deste ticket: o caminho
correto é a skill `issue-report` (GitHub Issue com critérios de aceite, referenciando o redesenho do
RBAC e a #482), **não** corrigir aqui (anti-padrão #15 — scope-creep, e mexer em RBAC violaria o CA5).

---

## Próximo passo

W3 — QUALITY (`ts-quality-checker`): `typecheck` + `format:check` + `lint` + `pnpm test` completo +
`pnpm run test:integration:partners` (`MYSQL_INTEGRATION=1`), que é onde o
`collaborator-projection.drizzle-mysql.test.ts` (13 chaves + `clock`) roda de fato.
Opcionalmente aplicar OBS-1 (2 comentários) e abrir a issue da OBS-2.
