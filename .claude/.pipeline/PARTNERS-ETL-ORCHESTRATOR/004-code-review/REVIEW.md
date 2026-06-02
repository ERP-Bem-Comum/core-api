# W2 — REVIEW (read-only) · PARTNERS-ETL-ORCHESTRATOR

> Skill: `code-reviewer`. Round 1/3. Audit read-only do código produzido em W1 — nenhuma
> linha de `src/`/`scripts/` foi editada nesta wave.
> Escopo revisado: `scripts/etl/orchestrate.ts`, `scripts/etl/main.ts`, `package.json`
> (script `test:integration:etl:orchestrate`), `tests/etl/orchestrate.test.ts`,
> `tests/etl/orchestrate.fakes.ts`, `tests/etl/orchestrate.integration.test.ts`.

## Veredito: ✅ APPROVED

Os 10 eixos de auditoria passam. Os gates relevantes ao W2 foram re-rodados de forma
independente e estão **verdes**. Restam 2 observações **não-bloqueantes** (severidade baixa)
registradas para o checkpoint humano — nenhuma exige round de correção em W1.

---

## Provas (gates re-executados nesta wave)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| Lint estrito | `pnpm exec eslint scripts/etl tests/etl` | ✅ exit 0 |
| Unit (orquestrador) | `node --test tests/etl/orchestrate.test.ts` | ✅ **tests 12 / pass 12 / fail 0 / skipped 0** |
| Integração gated | (não executada — fora do escopo do W2; roda em W3/`test:integration:etl:orchestrate`) | n/a |

> Lint e typecheck não fazem parte formal do W2, mas foram rodados para sustentar os eixos 6 e 7
> da auditoria (idioma + estilo estrito de `scripts/`). O gate completo do W3 fica para a
> `ts-quality-checker`.

---

## Auditoria por eixo (cada achado com `path:linha`)

### 1. ADR-0006 — isolamento de módulo (ETL toca auth E partners SÓ via public-api) — ✅

- `scripts/etl/orchestrate.ts:25-26` importa **apenas** `AuthEtlPort` (`#src/modules/auth/public-api/etl.ts`)
  e `PartnersEtlPort` (`#src/modules/partners/public-api/etl.ts`). Zero import de repo/schema/driver interno.
- `scripts/etl/main.ts:28-37` faz o wiring via `buildAuthEtlPort`/`buildPartnersEtlPort` — os builders
  oficiais da public-api. Nenhum `adapters/persistence`, `application/` ou `repos/` nos imports
  (verificado por grep: "NENHUM").
- `orchestrate.ts:28,31-33` importa de `domain/` (Email VO, `UserProfile.rehydrate`, `CollaboratorId`,
  tipos). **Isto é permitido e é a convenção já closed-green** dos mappers do CORE
  (`scripts/etl/mappers/*` importam 18 símbolos de `partners/domain/*`). ADR-0006 proíbe cruzar
  `adapters/`/`application/` de outro módulo; os smart constructors/VOs de `domain/` são a superfície
  de modelagem pública que a ETL consome. **Conforme.**

### 2. ADR-0020 — nenhum UPSERT direto — ✅

- A idempotência é 100% delegada aos ports: `orchestrate.ts:187` (`store.provision`), `:196-204`
  (`already-exists` vs `created` via `findByLegacyId`), `:262` (`authPort.provisionLegacyUser`),
  `:303` (`userProfiles.provision`). Nenhum SQL, `INSERT ... ON DUPLICATE KEY`, nem Drizzle no
  orquestrador. **Conforme** (os ports já fazem SELECT-by-legacy_id → INSERT/skip internamente).

### 3. D10/D12/D13 — quarentena dupla + PII-free + overflow → quarentena — ✅

- **PII-free no resumo versionável:** `main.ts:77-82` grava `summaryLine` com `reason: toSummary(...)`,
  que descarta `attempted` (`scripts/etl/quarantine/reason.ts:21-25`). O `summaryLine` contém só
  `{ legacyId, table, reason:{tag,field}, describe }`. `describeReason` (`reason.ts:28-49`) **não inclui
  o valor tentado** — só nomes de campo. Nenhum CPF/CNPJ/email/nome/hash vaza no arquivo versionável.
- **Detalhe com PII isolado:** `main.ts:83-89` grava `detailLine` (com `reason` completo, inclui
  `attempted`) em `DETAIL_PATH = .tmp/etl-quarantine/quarantine.detail.jsonl`. `git check-ignore`
  confirma que **ambos** os `.jsonl` em `.tmp/etl-quarantine/` estão gitignored.
- **stdout/log PII-free:** `main.ts:159-171` (`formatReport`) emite só contadores numéricos; `:186`
  loga `JSON.stringify(result.error)` que é uma tagged union de `kind` (sem PII de linha).
- **D10 (inativos):** `orchestrate.ts:204,259,315` propagam `inactive: row.active === 0`; o orquestrador
  soma em `inactiveLegacyMarked` (`:350,369,391,400`) e reporta (`:408`). **Conforme.**
- **D13 (overflow):** delegado ao mapper (`Overflow` tag em `reason.ts:16`); o orquestrador não trunca —
  linha inválida do mapper cai em `:173-176` → quarentena. **Conforme** (nunca trunca).

### 4. Ordem de migração + map `legacyCollaboratorId → CollaboratorId` — ✅

- `orchestrate.ts:63-68` define `MIGRATION_ORDER` e a execução em `:334-401` segue exatamente
  suppliers → financiers → collaborators → users.
- Map montado em `:392` (`acc.collaboratorRefs.set(row.id, outcome.ref)` só quando `ref !== null`).
- Resolução em `:212-219` (`resolveCollaboratorRef`): `null → ok(null)` (migra), `ausente no map → err('orphan')`.
- Órfão → quarentena sem abortar: `:236-244` registra quarentena e retorna `countQuarantined`, o loop
  `:397-401` continua. **Conforme** (coberto pelos testes `orchestrate.test.ts:222-241`).

### 5. Borda de conversão `UserId→UserRef` e `email:string→Email.parse` — ✅

- `email`: `orchestrate.ts:247-255` faz `Email.parse(validated.email)`; falha → quarentena
  (`EmailInvalid`), **não** throw.
- `UserId → UserRef`: `:276-283` faz `UserRefVo.rehydrate(provisionedUser.value.userRef)`; falha →
  quarentena (`RequiredFieldMissing/user_ref`), **não** throw.
- `UserProfile.rehydrate` falho (`:294-300`) e persistência falha (`:304-310`) também viram quarentena.
  **Conforme** — nenhum caminho de erro de linha lança exceção.

### 6. Idioma — ✅

- Código EN (tipos/funções/vars/pastas). Erros internos EN kebab-case: `'orphan'` (`:218`),
  `'orchestrate-aborted'` (`:90`), `kind: 'restore'|'auth-port'|'partners-port'|'orchestrate'`
  (`main.ts:63-67`). Reasons de quarentena são tagged union PascalCase EN (herdada do CORE).
- Strings ao humano em PT: `main.ts:163` ("reconciliacao"), `:169` ("inativos"), `:186` ("ETL falhou").
  REPORT/REVIEW em PT-BR. **Conforme.**

### 7. Lint estrito `scripts/` + estilo TS — ✅

- `import type` para tipos puros: `orchestrate.ts:25-26,30,31,33,35-47`; `main.ts:31,36`. **Conforme** `verbatimModuleSyntax`.
- Extensão `.ts` em todos os relativos/subpath. **Conforme** `NodeNext`.
- Exhaustive switch com `const _: never`: `reason.ts:44-46` (`_exhaustive: never`). O orquestrador não tem
  switch sobre union — N/A, sem `throw` no default.
- `child_process` com `{ }`: `orchestrate.integration.test.ts:33-34` (`execFileSync('docker', [...], { ... })`)
  — em `tests/`, lint relaxado, mas mesmo assim com chaves.
- Sem `any`: grep não encontrou nenhum `any` no escopo.
- `max-params:4` respeitado via bundle `MigrateArgs` (`orchestrate.ts:158-164`). `Acc` como `interface`
  (`:104`). `eslint scripts/etl tests/etl` → exit 0. **Conforme.**

### 8. Cleanup/SIGTERM (CTR-NODE-LAST-RESORT-HANDLERS) — ✅

- `runEtl` garante `close()` dos **dois** ports via `try/finally` (`main.ts:115,126-129`): `partnersPort.close()`
  + `authPort.close()` rodam mesmo em erro/exceção dentro de `withLegacyMysql`.
- Falha ao abrir o 2º port fecha o 1º antes de retornar erro (`main.ts:109-112`) — sem leak.
- `installLastResortHandlers(...)` + `process.on('SIGTERM', ...)` no guard de entrypoint (`:197-200`).
  Em SIGTERM sai com 143. **Conforme** — sem leak de connection. (Ver Obs. 2 abaixo para nuance.)

### 9. `--dry-run` não chama `provision` — ✅

- `orchestrate.ts:178-185` (aggregates) e `:257-260` (users) ramificam **antes** de qualquer `provision`/
  `provisionLegacyUser`. Conta como `migrated` hipotético sem tocar os ports.
- Provado por `orchestrate.test.ts:355-372` (asserta `provision === 0` nos 4 stores + `auth.provisionCalls() === 0`).
  **Conforme.**

### 10. Reconciliação `read = migrated + quarantined + alreadyExists` (`isBalanced`) — ✅

- Cada caminho incrementa exatamente um terminal sobre `countRead`: quarentena (`countQuarantined`),
  created (`countMigrated`), already-exists (`countAlreadyExists`), decode-failure
  (`drainDecodeFailures:138-141` conta read+quarantined). Nenhum caminho conta dois terminais nem nenhum.
- `isBalanced` (`reconcile.ts:33-34`) verde nos testes (`orchestrate.test.ts:186-187,270,293,310,330`).
  **Conforme.**

---

## Observações não-bloqueantes (registrar — NÃO corrigir agora)

### Obs. 1 — `as never` / `as Ref | null` em `migrateAggregateRow` · severidade BAIXA

`scripts/etl/orchestrate.ts:187` (`mapped.value.aggregate as never`), `:198` e `:203`
(`found.value as Ref | null`).

- **Por quê surge:** `migrateAggregateRow` unifica os 3 stores sob `AggregateStore`
  (`:153-156`, união de `suppliers|financiers|collaborators`) e é chamado com `A=unknown, Ref=unknown`
  nos call sites (`:342,361,380`). A união de `provision` força o argumento a `never`; o retorno de
  `findByLegacyId` é alargado para `as Ref`.
- **Risco real:** baixo. Cada call site casa o `map` (mapper concreto) com o `store` correto, então o
  agregado realmente tem o tipo que o store espera — a perda de soundness é local e o teste happy-path
  (`:165-188`) cobre os 3 stores. Não há caminho onde um agregado errado chegue a um store errado.
- **Fix sugerido (futuro, opcional):** parametrizar `migrateAggregateRow` por entidade com um pequeno
  registro tipado (discriminated record `{ supplier: ..., financier: ... }`) para eliminar os 3 casts,
  ou aceitar o custo de erasure documentado. **Não bloqueia** — é dívida de tipo cosmética.

### Obs. 2 — fidelidade do `reason` em erros de persistência/auth/rehydrate · severidade BAIXA

`scripts/etl/orchestrate.ts:189-192,268-272,278-282,295-299,305-308`.

- Os caminhos de erro de `provision`/`provisionLegacyUser`/`rehydrate` sintetizam um reason genérico
  `{ tag: 'RequiredFieldMissing', field: 'persistence' | 'auth_user' | 'user_ref' | 'user_profile' | 'user_profile_persistence' }`,
  **descartando** o erro real do port (ex.: `PartnersEtlStoreError = 'partners-etl-store-unavailable'`,
  `ProvisionLegacyUserError`).
- **Impacto:** a quarentena registra QUE a linha falhou e em qual etapa (via `field`), mas não o
  **motivo técnico** (store indisponível vs. CHECK-violation vs. dup-entry). Para uma ETL one-shot com
  análise manual da DLQ, o `field` distinto por etapa é suficiente para triagem; a perda é de
  observabilidade fina, não de correção. PII-free preservado (o erro do port não carrega PII).
- **Fix sugerido (futuro, opcional):** estender `QuarantineReason` com um variante
  `{ tag: 'PortError'; field; portError: string }` carregando o código kebab-case do port (EN, sem PII),
  para a DLQ versionável distinguir as causas. **Não bloqueia** o slice.

> Ambas as observações são melhorias de robustez/observabilidade, não defeitos. O contrato testado
> (12 testes unit + integração gated) está correto e completo para o escopo do 3b-ii. Decisão de
> endereçá-las (ou abrir ticket follow-up) cabe ao dono no checkpoint.

---

## Conformidade com os Critérios de Aceite (000-request.md §CA)

Todos os CAs testáveis estão cobertos por teste verde:

- [x] Ordem suppliers→financiers→collaborators→users (`:153-158`)
- [x] Map montado e usado (`:196-208`)
- [x] `collaboratorId=null` → ref null, migra (`:210-220`)
- [x] órfão → quarentena sem abortar (`:222-241`)
- [x] idempotência already-exists (`:248-272`)
- [x] quarentena 3 fontes + PII-free (`:278-347`)
- [x] reconciliação balanceada (`isBalanced` em múltiplos testes)
- [x] `--dry-run` não persiste (`:355-372`)
- [x] inativos D10 contabilizados (`:379-393`)
- [x] integração 2-DB gated `PARTNERS_ETL_INTEGRATION=1` + skip-guard (`orchestrate.integration.test.ts:22,31-44`)
- [ ] W3 verde — **pendente** (gate formal do W3; typecheck+lint já verdes nesta wave)

---

## Próximo passo

Checkpoint humano (autorizar W3). Em W3, a `ts-quality-checker` roda o gate final completo
(`typecheck` + `format:check` + `lint` + `pnpm test`) e, se Docker disponível,
`pnpm run test:integration:etl:orchestrate` para a prova end-to-end 2-DB.

---
---

# Code Review — PARTNERS-ETL-ORCHESTRATOR — Round 2 (W2-delta)

**Veredito:** ✅ APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-02
**Escopo do delta:** correção das 2 observações não-bloqueantes do round 1 (decisão do dono
no checkpoint pós-W2: corrigir Obs.1 + Obs.2 antes do W3). Arquivos revisados (somente o diff):
`scripts/etl/orchestrate.ts`, `scripts/etl/quarantine/reason.ts`, `tests/etl/orchestrate.test.ts`,
`tests/etl/orchestrate.fakes.ts`.

> Round 1 acima permanece intacto (histórico). Esta seção revisa **apenas** o que mudou.

---

## Provas (gates re-executados nesta wave — independente)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Unit (orquestrador) | `node --test tests/etl/orchestrate.test.ts` | ✅ **tests 15 / pass 15 / fail 0 / skipped 0** (12 antigos + 3 novos da Obs.2) |
| Suite inteira | `pnpm test` | ✅ **tests 1926 / pass 1910 / fail 0 / skipped 16** (integração ETL skipa — Docker OFF; era 1923/1907 no round 1, +3 da Obs.2) |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| Lint estrito | `pnpm run lint` (`eslint .`) | ✅ exit 0 |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |

---

## Obs.1 — eliminar `as never` / `as Ref | null` em `migrateAggregateRow` — ✅ RESOLVIDO

- **Antes (round 1):** `orchestrate.ts:187` (`as never`), `:198`, `:203` (`as Ref | null`). Causa: o
  parâmetro `store` era a **união** dos 3 stores (`AggregateStore`), forçando `provision(arg)` a `never`
  e `findByLegacyId` a alargar para `Ref`.
- **Agora:** `MigrateArgs<Row, A, Ref>` (`:152-158`) tipa `store: LegacyEntityStore<A, Ref>` — o **mesmo**
  par `<A, Ref>` do `map`. Em `:181` `store.provision(mapped.value.aggregate, row.id)` é nativamente
  tipado; `:195,:200` `found.value` (sem cast). Os 3 call sites (`:355,:374,:393`) deixam `A`/`Ref`
  serem **inferidos** do store concreto — type-safe por construção.
- **Verificação:** `grep "as never\|as Ref"` em `orchestrate.ts` → só ocorre **dentro do comentário**
  (`:148-151`) que documenta a remoção. Zero cast remanescente no código. **Sem mudança de
  comportamento** — os 12 testes happy-path do round 1 seguem verdes.

## Obs.2 — `reason` fiel ao erro real de port/auth/rehydrate — ✅ RESOLVIDO (via TDD)

- **W0-delta (RED provado):** 3 testes novos em `orchestrate.test.ts:405-476` falharam antes da impl
  (esperavam `PortError`, recebiam `RequiredFieldMissing`). Stats RED: 15/12/**3 fails**.
- **Novo variante** em `reason.ts:21`: `{ tag: 'PortError'; field: string; portError: string }`.
  `portError` carrega o código kebab-case EN do erro **real** do port.
- **`describeReason` exhaustive switch atualizado** (`reason.ts:48-49`) com o case `PortError`;
  `_exhaustive: never` (`:51`) intacto → exaustividade ainda enforced pelo compilador.
  **Único** switch sobre `QuarantineReason` no codebase (grep confirmou); mappers só **constroem**
  reasons, não fazem switch — nenhum outro consumidor ficou sem o case.
- **`toSummary` PII-free preservado** (`reason.ts:26-29`): lê só `tag`+`field`, **descarta** `portError`.
  Asserção dedicada (`orchestrate.test.ts:470-474`) prova `Object.keys(summary) === ['field','tag']`.
  Ainda assim o `portError` é um código EN (`'partners-etl-store-unavailable'`,
  `'provisioned-user-store-unavailable'`, `'user-ref-invalid'`, `UserProfileError`), nunca dado de
  linha — verificado contra as unions de erro dos ports (todas string-union kebab EN).
- **5 sites trocados** em `orchestrate.ts`: `:185-188` (partners-store provision), `:268-270` (auth),
  `:280-282` (`UserRefVo.rehydrate`), `:299-301` (`UserProfile.rehydrate`), `:311-313` (userProfiles
  store). Cada um passa o `.error` real do `Result`.
- **Corretamente NÃO convertidos** (não são erro de port): `firstReason` fallback
  (`:109`, lista vazia) e o **órfão** `collaborator_id` (`:237`, referência não resolvida) seguem
  `RequiredFieldMissing` — fiel à natureza do erro. Bom julgamento de escopo.

---

## Regressão nos 10 eixos do round 1 — ✅ sem regressão

- **ADR-0006 (isolamento):** delta importa só `LegacyEntityStore` (já re-exportado da public-api) e tipos
  de erro via public-api; zero novo import de `adapters/`/`application/` interno. **Mantido.**
- **ADR-0020 (sem UPSERT):** delta não toca SQL/persistência; idempotência segue nos ports. **Mantido.**
- **D12 PII-free:** reforçado pela Obs.2 (novo variante + asserção de `toSummary`). **Mantido.**
- **Idioma:** `tag` PascalCase EN, `field` snake_case EN (`persistence`/`auth_user`/`user_ref`/
  `user_profile`/`user_profile_persistence`), `portError` código EN. **Conforme.**
- **Lint estrito `scripts/`:** `import type` para `LegacyEntityStore` (`orchestrate.ts:26`);
  imports `Legacy*Row` não-usados removidos; `eslint .` exit 0. **Conforme.**
- Demais eixos (ordem de migração, dry-run, reconciliação, inativos, cleanup) intocados pelo delta.

### Notas menores (🔵 sugestão, não-bloqueante)

- `tests/etl/orchestrate.test.ts`: o cast `as Auth` no helper genérico `run<Auth>` (linha ~134) e os
  `as FakeEntityStore` (pré-existentes do round 1) vivem em `tests/` (lint relaxado) e são sound — o
  ramo default produz `FakeAuthPort extends AuthEtlPort`. Aceitável; não é código de produção.

---

## O que está bom

- Obs.1 resolvido pela via **certa** (parametrização de tipo casando store↔mapper), não por
  `eslint-disable` nem `as unknown` — a soundness voltou de verdade.
- Obs.2 seguiu **TDD honesto**: RED provado (3 fails) antes do GREEN; o teste de PII-free do
  `toSummary` blinda a invariante inegociável contra futuras regressões.
- Fidelidade sem vazar PII: a distinção store-indisponível vs auth-falhou vs rehydrate-inválido agora
  chega à DLQ via código EN, melhorando triagem sem comprometer o resumo versionável.

## Próximo passo

Checkpoint humano (parar antes do W3, conforme instrução do dono). Quando autorizado, W3 roda o gate
final completo via `ts-quality-checker` + integração 2-DB gated (`PARTNERS_ETL_INTEGRATION=1`) se Docker
disponível.
