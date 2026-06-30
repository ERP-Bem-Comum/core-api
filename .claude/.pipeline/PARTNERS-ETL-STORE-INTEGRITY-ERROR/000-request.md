# Ticket PARTNERS-ETL-STORE-INTEGRITY-ERROR: Distinguir violação de integridade (dado) de indisponibilidade (infra) no store ETL do partners

## Contexto

Corrige o **"Achado 2"** de uma auditoria de 4 especialistas sobre o adapter de persistência da ETL de Parceiros.

Arquivo: `src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts`.

Dois defeitos confirmados (path:linha lidos):

1. **Mascaramento de erro de DADO como erro de INFRA.** `runProvision` (≈linhas 71-83)
   só reconhece `ER_DUP_ENTRY` (`errno === 1062`) quando o `sqlMessage` cita o índice
   **de `legacy_id`** daquela entidade — `dupIndex` hardcoded por entidade
   (ex.: `'par_suppliers_legacy_id_idx'` ≈linha 110), via `isLegacyDupEntry` (≈linhas
   41-57). Isso é a idempotência correta (re-run da ETL → `'already-exists'`). Mas um
   `1062` numa **UNIQUE secundária** — `par_suppliers_cnpj_idx`,
   `par_financiers_cnpj_idx`, `par_collaborators_cpf_idx`,
   `par_collaborators_email_idx`, `par_user_profiles_cpf_idx` — **não** casa o
   `dupIndex`, cai no catch genérico e vira `err('partners-etl-store-unavailable')`.
   Ou seja: uma **violação de integridade do legado** (dois registros distintos com o
   mesmo CNPJ/CPF/email) é reportada como **indisponibilidade de infraestrutura**.
   Diagnóstico errado, retry inútil, e o orquestrador da ETL não consegue
   quarentenar a linha problemática.

2. **`log()` (≈linhas 36-38) faz `String(cause)`**, que descarta o `.cause`. O
   `DrizzleQueryError` embrulha o erro original do `mysql2`; o `code`/`errno`/
   `sqlMessage` reais ficam no `.cause`. Com `String(cause)` o errno some do
   diagnóstico — foi por isso que o defeito 1 passou despercebido.

## Escopo (W1 implementa; W0 só escreve os testes RED)

1. **Novo variante de erro** em `PartnersEtlStoreError` (declarado em
   `src/modules/partners/application/ports/legacy-entity-store.ts:12`, re-exportado por
   `src/modules/partners/public-api/etl.ts:27-31`):
   adicionar `'partners-etl-store-integrity-violation'`, distinto de
   `'partners-etl-store-unavailable'`. Idioma: EN kebab-case.

2. **Classificador de erro testável.** Extrair a lógica de classificação do `catch`
   de `runProvision` para uma função **pura e exportável** (ex.: `classifyDupEntry` /
   `classifyProvisionError`), sem dependência de MySQL real, de modo que possa ser
   exercida por teste unitário com um erro-fake espelhando a forma do
   `DrizzleQueryError`/mysql2 (`errno: 1062`, `sqlMessage` citando o índice, possivelmente
   aninhado em `.cause`). Regras:
   - `1062` em `*_legacy_id_idx` → `'already-exists'` (idempotência — **comportamento
     atual preservado**).
   - `1062` em **qualquer outra UNIQUE** → `'partners-etl-store-integrity-violation'`.
   - demais erros → `'partners-etl-store-unavailable'`.
   A distinção exige inspecionar o **nome do índice** no `sqlMessage` (não basta o
   `errno`).

3. **`log()` preserva o `.cause`** ao serializar (ex.: anexar `String(cause.cause)`
   quando presente), para o errno/sqlMessage real aparecer no stderr de diagnóstico.

4. **PII (invariante crítica):** o `sqlMessage` de `ER_DUP_ENTRY` **inclui o valor
   duplicado** (ex.: o CNPJ/CPF). O stderr de diagnóstico pode conter o sqlMessage
   bruto (efêmero, não versionável), mas o **reason `integrity-violation` que cruza a
   public-api** para o orquestrador/summary versionável **DEVE ser PII-free**: apenas
   o código do erro (e, no máximo, o nome do índice), **NUNCA** o valor duplicado.

## Fora de escopo

- Não mudar o comportamento de `'already-exists'` (idempotência por legacy_id) —
  apenas **adicionar** a distinção do índice secundário.
- Não introduzir `ON DUPLICATE KEY UPDATE`/UPSERT (ADR-0020): o SELECT-then-INSERT
  atual permanece.
- Não tocar o orquestrador da ETL (`tests/etl/...`, fora de `src/`) — só o store e seu
  contrato (port + public-api). A reação do orquestrador ao novo reason é trabalho de
  outro ticket.
- Não alterar `findByLegacyId`.

## Critérios de aceite

- [ ] CA1 — `PartnersEtlStoreError` inclui `'partners-etl-store-integrity-violation'`,
      re-exportado pela public-api (`public-api/etl.ts`).
- [ ] CA2 — Um erro `1062` cujo `sqlMessage` cita uma UNIQUE **secundária**
      (cnpj/cpf/email) é classificado como `'partners-etl-store-integrity-violation'`
      (não `'unavailable'` nem `'already-exists'`). **Testável sem MySQL** via
      classificador puro exportado.
- [ ] CA3 — Um erro `1062` cujo `sqlMessage` cita o `*_legacy_id_idx` continua
      classificado como `'already-exists'` (idempotência preservada).
- [ ] CA4 — Um erro não-1062 (ou 1062 sem índice reconhecível) continua
      `'partners-etl-store-unavailable'`.
- [ ] CA5 — O classificador reconhece o `1062` mesmo quando aninhado em `.cause`
      (forma `DrizzleQueryError`).
- [ ] CA6 — (integração, gated `MYSQL_INTEGRATION=1`) inserir 2 entidades distintas
      com o MESMO cnpj/cpf via `provision` (legacy_id diferentes) → a 2ª retorna
      `Result` `err('partners-etl-store-integrity-violation')`.
- [ ] CA7 — O reason `integrity-violation` que cruza a public-api é PII-free (não
      contém o valor duplicado).
- [ ] CA8 — `log()` preserva o `.cause` na serialização do stderr.

## Referências

- `src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts`
- `src/modules/partners/application/ports/legacy-entity-store.ts`
- `src/modules/partners/public-api/etl.ts`
- `src/modules/partners/adapters/persistence/schemas/mysql.ts` (nomes dos índices UNIQUE)
- `tests/modules/partners/public-api/partners-etl-port.integration.test.ts` (espelho do gate)
- ADR-0006 (consumo só via public-api; o tipo de erro é parte do contrato),
  ADR-0020 (sem UPSERT), ADR-0014 (só `par_*`).
- `.claude/rules/adapters.md` (`try/catch` convertido em `Result` na borda; nunca vazar `Error`).
