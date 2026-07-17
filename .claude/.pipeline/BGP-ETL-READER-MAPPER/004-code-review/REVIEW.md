# W2 — REVIEW (read-only) · BGP-ETL-READER-MAPPER (fatia 3/3 do ETL de Orçamento)

> Skill: `code-reviewer`. Round 1. Audit **read-only** — nenhum `src/`/`scripts/`/teste tocado.
> Diff auditado: `git show HEAD` (5914a058) — `scripts/etl/budget-plans/{reader,mapper,main}.ts`,
> `scripts/etl/quarantine/reason.ts`, extensão `updatedBy` da fatia 2 (port + store + teste).
> Fontes: mapa `ETL-BUDGET-PLANS/000-request.md`, dbml legado `handbook/legacy_docs/database.dbml`,
> molde `scripts/etl/financial/`.

## Veredito: **REJECTED** (1 bloqueante + notas não-bloqueantes)

A lógica do mapper (as 17 regras + as 4 quarentenas) está **correta e pura**; a extensão da fatia 2
está limpa e idempotente. O que barra o round é **um defeito concreto no SQL do reader**: uma coluna
inexistente no legado (contradiz o dbml, não é mera suposição não-validável) que quebra o W3 ponta a
ponta na leitura dos `budgets`.

---

## Checklist de revisão

### 1. Mapper puro — as 6 funções e as 17 regras ✓

- ✓ **Pureza**: as 6 funções (`mapBudgetPlanRow`…`mapBudgetResultRow`) não fazem I/O; recebem linha
  pré-juntada + refs como `ReadonlyMap` e devolvem `Result<Mapped*, readonly QuarantineReason[]>`
  (`mapper.ts:155,195,225,237,248,266`). Refs de UUID/de-para/2ª passada ficam no `main` (correto).
- ✓ **version float→major/minor** (`mapper.ts:144-153`): via `String(version)` — `1`→(1,0),
  `1.1`→(1,1), `2`→(2,0); `>1` casa decimal → `null` → `PrecisionUnsupported` field `version`, **sem
  arredondar** (CA6). A indistinguibilidade `1.10`/`1.1` no float está reconhecida no comentário.
- ✓ **model DERIVADO** da `releaseType` da subcategoria (`mapper.ts:272-275`); ausente →
  `RequiredFieldMissing` field `model` (CA4). Nunca inventa.
- ✓ **Rede** (`mapper.ts:195-221`): município preenchido → `('municipality', cod)`; senão →
  `('state', abbreviation)`; `municipalityUf !== stateAbbreviation` → `CrossFieldMismatch` field
  `partner_uf`. Lógica de mapeamento correta (o defeito está na origem do `municipalityUf` — Issue #1).
- ✓ **sigla órfã** (`mapper.ts:166-170`): `programRefBySigla.get(sigla)` undefined →
  `RequiredFieldMissing` field `program_ref` (CA7). Nunca inventa programa.
- ✓ **INSTITUCIONAL** (`mapper.ts:253-255`): `type !== 'REDE'` → `EnumUnknown` field
  `sub_category_type` (CA8). Defensivo (qualquer valor ≠ REDE cai na quarentena).
- ✓ **updatedBy** (`mapper.ts:174-176`): via `auth.legacy_id`; miss/null → `null` (nullable, não
  quarentena). Coerente com o mapa.
- ✓ **status/direction/launchType diretos** (`mapper.ts:232,254-261,178-190`).
- ✓ **descartes não entram no input**: `MappedBudgetResult.input = { month, model, valueCents }`
  (`mapper.ts:130-135,281`); `data`/`totalInCents`/`mpath`/`costCenterCategoryId`/`valueInCents` não
  atravessam — e o reader **sequer os seleciona** (`reader.ts:87-89`). CA7/CA9 satisfeitos na origem.

### 2. Nenhuma regra descarta em silêncio ✓

- ✓ version/uf/sigla/INSTITUCIONAL → todos quarentena com `field` correto (ver item 1).
- ✓ As 2 tags novas têm ramo no switch exaustivo de `describeReason` (`reason.ts:59-62`) e o
  `_exhaustive: never` fecha (`reason.ts:67-70`).
- ✓ **PII-free**: `PrecisionUnsupported.attempted` = número em string; `CrossFieldMismatch.attempted`
  = `'SP!=CE'` (referências geográficas, não PII). `toSummary` descarta `attempted` (`reason.ts:37`).

### 3. ADR-0006 (fronteira de módulo) ✓ (com nota)

- ✓ `scripts/etl/budget-plans/*` importa de `#src` apenas `budget-plans/public-api/etl.ts`
  (Inputs plain rows) + `shared/primitives` + `shared/runtime` (`main.ts:26-36`). **Nenhum** import de
  `domain/` ou `application/` de qualquer módulo. Mapper não importa nada de `#src` além de `Result`.
- ⚠️ **Nota não-bloqueante (N1)**: o `main` lê `prg_programs` e `auth_user` por **SQL direto**
  (`main.ts:152-163`). Para `prg_programs` é a ponte sancionada pelo mapa (o módulo não tem ETL/port;
  chave natural `sigla`). Para `auth_user`, o módulo `auth` **tem** public-api de ETL, mas ela só expõe
  `provisionLegacyUser` (escrita) — **não há resolver read-by-legacy-id**. Logo o SELECT direto é a
  ponte disponível, não uma violação de import; mas é acoplamento a tabela de outro módulo. Registrar
  issue para um resolver na public-api do `auth` quando conveniente (não bloqueia esta fatia).

### 4. Extensão da fatia 2 (updatedBy) ✓

- ✓ **Nullable coerente**: `BudgetPlanEtlInput.updatedBy: string | null`
  (`legacy-entity-store.ts:47`), documentado (decisão P.O. Opção A / #373 fase B).
- ✓ **Idempotência preservada (skip-never-update)**: o `updatedBy` é gravado **apenas** no ramo de
  INSERT do `provision`, após `findByLegacyId … FOR UPDATE` confirmar inexistência
  (`budget-plans-etl-store.drizzle.ts:159-185`). Se o `legacy_id` já existe → `already-exists` no-op:
  re-run **não** sobrescreve autoria. Correto.
- ✓ **Sem migration**: coluna `updated_by varchar(36)` já existe no schema
  (`schemas/mysql.ts:53`, verificado). Diff não adiciona migration.
- ✓ **Teste da fatia 2 segue válido**: `aPlan()` ganhou `updatedBy: null`
  (`budget-plans-etl-port.integration.test.ts`), coerente com nullable; a suíte não exercita autoria.

### 5. main.ts — ordem, 2ª passada, idempotência, reuso ✓

- ✓ **Ordem FK-segura**: plano → cost center → categoria → subcategoria → budget → lançamento
  (`main.ts:299-491`).
- ✓ **parentId na 2ª passada**: gera UUID de todos os planos (1ª passada), depois `topoSortPlans`
  (pai-antes-de-filho) provisiona resolvendo `parentId` de `planUuidByLegacyId` (`main.ts:299-335`).
  No re-run, a entrada do pai é atualizada para o UUID canônico antes do filho (ordem topológica) —
  `parentId` resolve certo (`main.ts:321-334`).
- ✓ **Idempotência**: `resolveOrProvision` faz `findByLegacyId` antes de `provision`; corrida
  (`provision` → `'already-exists'`) re-resolve o UUID canônico (`main.ts:187-217`). CA3.
- ✓ **Reuso**: `reconcile.ts` (`emptyTally`/`countRead`/…) e `quarantine/reason.ts` reaproveitados;
  nada reescrito (`main.ts:52-64`).
- ⚠️ **Nota não-bloqueante (N2)**: se um plano-pai for quarentenado, o filho cujo `parentLegacyId`
  aponta para ele resolve `parentId` para **`null`** silenciosamente (`main.ts:323-324`, `?? null`) —
  provisiona com hierarquia perdida em vez de sinalizar. Inócuo no dado medido (5 planos, versões
  1/1.1/2, zero quarentena esperada), mas contraria o princípio "nada silencioso" do ticket. Sugestão:
  quarentenar o filho (`RequiredFieldMissing` field `parent_ref`) quando o pai não resolveu.

### 6. CA5/CA8 — env ausente ✓

- ✓ Env legada ausente → `connectReadonly` lança `'etl-legacy-connection-string-missing'`
  (`connect.ts:44-48`), **capturado** por `readLegacyData` (`main.ts:133-139`) → `Result err`
  `{ kind: 'legacy-read' }`. Kebab EN preservado no `detail`. **Sem default de lab** para a string
  **legada** (o default de `main.ts:522-523` é a conexão **core**, mesmo padrão do molde financial).
- ✓ **Sem throw cruzando borda**: `connectReadonly`/`loadCoreRefs` encapsulados em try/catch → Result;
  `buildBudgetPlansEtlPort` já devolve Result; top-level `main().then(_, onRejected)` (`main.ts:573`).

### 7. SQL do reader vs dbml — ✗ **BLOQUEANTE (Issue #1)**

Confronto coluna a coluna contra `handbook/legacy_docs/database.dbml`:

| SELECT | Colunas | dbml | OK? |
| :-- | :-- | :-- | :-- |
| `plans` | `id,year,scenarioName,version,status,pg.abbreviation,updatedById,parentId,createdAt,updatedAt` | budget_plans + programs.abbreviation | ✓ |
| `budgets` | `s.abbreviation, pm.cod, **ms.abbreviation via pm.partnerStateId**, valueInCents` | **partner_municipalities NÃO tem `partnerStateId`** — tem `uf`! (dbml:187) | ✗ |
| `costCenters` | `id,budgetPlanId,name,type,active` | cost_centers | ✓ |
| `categories` | `id,costCenterId,name,active` | cost_centers_categories | ✓ |
| `subcategories` | `id,costCenterCategoryId,name,releaseType,type,active` | cost_centers_sub_categories | ✓ |
| `budgetResults` | `id,budgetId,costCenterSubCategoryId,month,valueInCents` | budget_results (data/totalInCents/mpath/costCenterCategoryId **não** selecionados) | ✓ |

**Issue #1 (BLOQUEANTE)** — `reader.ts:75-77`:

```sql
LEFT JOIN partner_states ms ON ms.id = pm.partnerStateId
```

`partner_municipalities` **não possui** a coluna `partnerStateId` (dbml:184-196). A UF do município já
está **direta** na própria tabela, na coluna `uf varchar(2)` (dbml:187). O JOIN atual referencia uma
coluna inexistente → `ER_BAD_FIELD_ERROR` no W3 contra o banco de referência, quebrando a leitura de
`budgets` (e portanto CA1/CA2/CA5/CA10). Não é uma "suposição não-validável" — o dbml a **contradiz**.

**Correção** (o dbml a torna mais simples): selecionar `pm.uf AS municipalityUf` e **remover** o 3º
JOIN:

```sql
SELECT b.id, b.budgetPlanId,
       s.abbreviation AS stateAbbreviation,
       pm.cod         AS municipalityCod,
       pm.uf          AS municipalityUf,
       b.valueInCents AS valueInCents
FROM budgets b
LEFT JOIN partner_states s          ON s.id = b.partnerStateId
LEFT JOIN partner_municipalities pm ON pm.id = b.partnerMunicipalityId
```

Com Fortaleza (`pm.uf='CE'`) e o estado `s.abbreviation='CE'`, o guard `CrossFieldMismatch` do mapper
passa a comparar os valores certos (medido: `m.uf = s.abbreviation`). Atualizar também o comentário de
cabeçalho do reader (`reader.ts:9-10`), que descreve a ponte inexistente `municipalityId → partner_states`.

### 8. YAGNI / idioma ✓ (nit trivial)

- ✓ Nada além do necessário: `portCode` (`main.ts:130`) é a versão enxuta correta — os erros do port
  `budget-plans` são union de **string**, então `typeof e === 'string'` basta (não copiou o
  tag-handling do financial, que ali era necessário). `ModelKind`/`ModelTally` justificados por CA4.
- ✓ Código EN; comentários PT-BR.
- ◦ **Nit (não-bloqueante, N3)**: os cabeçalhos afirmam "ASCII puro", mas os comentários usam
  box-drawing `──` e em-dash `—` (não-ASCII). É a convenção da casa (idêntico ao molde
  `scripts/etl/financial/mapper.ts`) e passa lint/prettier — só a afirmação literal é imprecisa.
  Manter o estilo; opcionalmente ajustar a frase.

---

## Issues priorizadas

| # | Sev | Arquivo:linha | Problema | Ação |
| :-- | :-- | :-- | :-- | :-- |
| 1 | **BLOQUEANTE** | `reader.ts:75-77` (+ `:9-10`) | JOIN em `pm.partnerStateId` — coluna inexistente; UF está em `pm.uf` (dbml:187). Quebra W3 na leitura de `budgets`. | Trocar por `pm.uf AS municipalityUf`, remover o 3º JOIN, corrigir o comentário de cabeçalho. |
| N1 | não-bloq. | `main.ts:152-163` | SELECT direto em `auth_user` (módulo com public-api de ETL, mas sem resolver read-by-legacy-id). | Registrar issue: resolver read-by-legacy-id na public-api do `auth`. Não bloqueia. |
| N2 | não-bloq. | `main.ts:323-324` | `parentId` de filho cai a `null` em silêncio se o pai foi quarentenado. | Considerar quarentenar o filho (`parent_ref`) em vez de nulificar. Inócuo no dado medido. |
| N3 | nit | `reader.ts/mapper.ts/main.ts` (cabeçalhos) | "ASCII puro" vs box-drawing/em-dash nos comentários (convenção da casa). | Opcional: ajustar a frase; manter o estilo. |

## Próximo passo

Voltar ao **W1** (round 1 → fix) para endereçar a **Issue #1** (única bloqueante). N1/N2 podem virar
follow-up (skill `issue-report`) a critério do maestro; N3 é cosmético. Após o fix, re-review (W2 R2)
antes do W3 (gate + ponta a ponta contra o banco de referência: CA1 5/5/4679/36/38/390, CA5 diff 0).
</content>
</invoke>

---

## Round 2 — APPROVED

**Issue #1 (bloqueante) corrigida** em `reader.ts`: o `JOIN partner_states ms ON ms.id = pm.partnerStateId`
(coluna inexistente — confirmado no dbml:187, que dá `uf` direto) foi removido; o SELECT de `budgets`
agora usa `pm.uf AS municipalityUf` e o comentário de cabeçalho foi corrigido. Verificado pelo
orquestrador contra `handbook/legacy_docs/database.dbml`: `partner_municipalities` tem `uf varchar(2)`
e NÃO tem `partnerStateId`.

Reverificado: typecheck ✅, lint ✅, format ✅, `pnpm test` pass 4191 / fail 0 (o SQL não é exercitado
em pnpm test — a validação real é o W3 contra o banco de referência; o fix alinha o SQL ao dbml).

**Notas não-bloqueantes registradas como issue** (anti-padrão #15, não perder o achado):
- N1 → issue #486 (resolver read-by-legacy-id na public-api do auth).
- N2 → issue #487 (parentId nulo em silêncio quando o pai é quarentenado).
- N3 (nit "ASCII puro" vs box-drawing) — cosmético, convenção da casa, sem ação.

**Veredito final: APPROVED.** Mapper (17 regras + 4 quarentenas), extensão `updatedBy` (idempotente,
sem migration), ADR-0006 e o SQL do reader (agora alinhado ao dbml) — todos OK.
