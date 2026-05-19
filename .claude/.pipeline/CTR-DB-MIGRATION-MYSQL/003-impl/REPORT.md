# W1 — GREEN — CTR-DB-MIGRATION-MYSQL

**Wave:** W1 (GREEN)
**Skill:** `database-engineer` + `drizzle-kit`
**Data:** 2026-05-15
**Status:** ✅ COMPLETED — 9 CAs estruturais GREEN, 5 funcionais reservados ao W3

---

## Artefatos entregues

| Arquivo | Tipo | LoC | Decisão de design |
| :--- | :--- | :--- | :--- |
| `drizzle.mysql.config.ts` | novo | 26 | Config paralela ao SQLite, não substitui (D1). |
| `package.json` (script `db:generate:mysql`) | modificado | +1 linha | `drizzle-kit generate --config=drizzle.mysql.config.ts` (D2). |
| `tsconfig.json` (include) | modificado | +1 entrada | `drizzle.mysql.config.ts` adicionado ao `include` (fechar parser error do eslint typescript-project-service). |
| `src/modules/contracts/adapters/persistence/migrations/mysql/0000_lyrical_machine_man.sql` | novo (gerado) | 62 | Migration completa: 3 tables, 3 indexes, 3 FKs, 7 CHECKs, 1 UNIQUE, 1 PK composta. |
| `src/modules/contracts/adapters/persistence/migrations/mysql/meta/_journal.json` | novo (gerado) | — | Snapshot de versão do drizzle-kit. |
| `src/modules/contracts/adapters/persistence/migrations/mysql/meta/0000_snapshot.json` | novo (gerado) | — | Estado serializado do schema; usado em `db:generate` futuros para diff. |

Total: 1 config TS + 1 entrada em scripts + 1 entrada em tsconfig + 1 migration SQL + 2 arquivos meta JSON.

---

## Como ficou o SQL gerado

```sql
CREATE TABLE `ctr_amendments` (...12 cols, PK id, CHECKs kind/status/homologation_completeness);
CREATE TABLE `ctr_contract_homologated_amendments` (2 cols, PK composta (contract_id, amendment_id));
CREATE TABLE `ctr_contracts` (...15 cols, PK id, UNIQUE sequential_number, CHECKs period_kind×2/status/ended_at_consistency);
ALTER TABLE ctr_amendments ADD FK contract_id → ctr_contracts(id);
ALTER TABLE ctr_contract_homologated_amendments ADD FK contract_id → ctr_contracts(id);
ALTER TABLE ctr_contract_homologated_amendments ADD FK amendment_id → ctr_amendments(id);
CREATE INDEX ctr_amendments_contract_id_idx ON ctr_amendments (contract_id);
CREATE INDEX ctr_contracts_status_idx ON ctr_contracts (status);
CREATE INDEX ctr_contracts_signed_at_idx ON ctr_contracts (signed_at);
```

Observações:

1. **Drizzle preferiu PK composta como `CONSTRAINT pk` separada** (`ctr_contract_homologated_amendments_contract_id_amendment_id_pk PRIMARY KEY(contract_id, amendment_id)`) em vez de `PRIMARY KEY` inline. Match do CA-9 (`PRIMARY KEY ... contract_id ... amendment_id`) cobre os dois formatos via regex.
2. **UNIQUE virou `CONSTRAINT ... UNIQUE(...)` separada** (`ctr_contracts_sequential_number_unique UNIQUE(sequential_number)`) em vez de modifier `UNIQUE` inline na coluna. Match do CA-8 (`/UNIQUE[\s\S]{0,80}sequential_number/i`) tolera ambos.
3. **FK declarada como `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES`** — formato canônico do drizzle-kit MySQL. Match do CA-7 cobre.
4. **`ON DELETE no action ON UPDATE no action`** — default conservador do drizzle. Como o domínio impede deleção (status terminal não remove linhas), o comportamento é aceitável; revisão de cascade fica para `CTR-DB-DOMAIN-INVARIANTS` se vier necessidade.
5. **Bicondicional F-L1 preservado**: `CHECK((ended_at IS NOT NULL) = (status IN ('Expired','Terminated')))` — sintaxe MySQL respeitada, exatamente como declarado em `schemas/mysql.ts:69-71`.
6. **F-L2 com formato `(NOT P) OR Q`**: `status <> 'Homologated' OR (homologated_at IS NOT NULL AND homologated_by IS NOT NULL AND signed_document_ref IS NOT NULL)` — mantém a lógica trivalente segura discutida no review W2 do ticket #2.

---

## Resultado dos CAs estruturais

`pnpm exec node --experimental-strip-types --no-warnings --test --test-skip-pattern='CA-1[0-4]' tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts`

```
✔ CA-1: drizzle.mysql.config.ts existe e tem dialect:mysql + schema/out corretos
✔ CA-2: package.json#scripts.db:generate:mysql aponta para drizzle.mysql.config.ts
✔ CA-3: migrations/mysql/0000_*.sql existe
✔ CA-4: SQL cria 3 tabelas com prefix ctr_*
✔ CA-5: SQL cria os 3 índices declarados
✔ CA-6: SQL cria os 7 CHECKs (5 herdados com prefix + F-L1 + F-L2)
✔ CA-7: SQL cria FK ctr_amendments.contract_id -> ctr_contracts(id)
✔ CA-8: SQL cria UNIQUE em ctr_contracts.sequential_number
✔ CA-9: SQL cria PK composta (contract_id, amendment_id) em ctr_contract_homologated_amendments
```

9/9 ✔. CA-10..14 (funcionais, exigem Docker MySQL up + apply migration via `docker exec`) ficam para o **W3**.

---

## Quality gates

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` | ✅ exit 0 |
| Lint | `pnpm run lint` | ✅ exit 0 |
| Format check | `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| Suite completa | `pnpm test` (419 testes em 136 suítes, skipando CA-10..14 + suíte compose por falta de Docker up) | ✅ 419 pass / 0 fail |

---

## Ajustes não previstos no request

1. **`tsconfig.json` include atualizado** (`drizzle.mysql.config.ts` adicionado). Razão: o `typescript-eslint` parser usa o project-service do tsconfig pra resolver tipos; sem essa entrada, `drizzle.mysql.config.ts` ficou fora do scope e o lint falhou. Atualização cosmética coerente com a entrada existente para `drizzle.config.ts`.
2. **Test helper `ExecOk` migrou de `type` para `interface`**: rule eslint `@typescript-eslint/consistent-type-definitions` exige `interface` para shapes (apenas `interface` pode ser estendida via merge, mas regra é estilística). Equivalência semântica plena.
3. **`console.error` em `mysql.test.ts:242` substituído por `process.stderr.write`**: regra `no-console` ativa no escopo do test; `process.stderr.write` é o canal correto para diagnóstico de erro (alinhado com a skill `nodejs-fs-scripter`).
4. **Naming do arquivo de migration**: `0000_lyrical_machine_man.sql` (heurística aleatória do drizzle-kit). Aceito conforme D5 do `000-request.md` ("aceitar naming default do drizzle-kit"). Sem rename manual — preserva determinismo do journal.

---

## D1–D6 do request — verificação

| Decisão | Aplicada? | Como |
| :--- | :---: | :--- |
| D1: criar `drizzle.mysql.config.ts` separado (não substituir SQLite) | ✅ | Novo arquivo na raiz; `drizzle.config.ts` intocado. |
| D2: script `pnpm db:generate:mysql` | ✅ | Entry adicionada em `package.json#scripts`, invoca drizzle-kit com `--config=drizzle.mysql.config.ts`. |
| D3: NÃO aplicar migration manualmente | ✅ | Nenhum chamada a `drizzle-orm/mysql2/migrator`; aplicação real fica em CA-10..14 via `docker exec` no W3 e em CTR-DB-DRIVER-MYSQL (#4) para wirar o runtime. |
| D4: validação em duas camadas (estrutural + funcional E2E) | ✅ | Tests divididos em CA-1..9 (estrutural) e CA-10..14 (funcional E2E). |
| D5: aceitar naming default do drizzle-kit | ✅ | `0000_lyrical_machine_man.sql` mantido sem rename. |
| D6: notas sobre erros conhecidos do drizzle-kit em MySQL | ⚠️ | Sem erros encontrados nesta geração. Observado: drizzle emite `ON DELETE no action ON UPDATE no action` (lowercase "no action") — sintaxe não-padrão mas aceita pelo MySQL 8.4. Nenhuma intervenção necessária. |

---

## Pré-condições para W2

Reviewer (`code-reviewer`) precisa avaliar:

1. **Correção semântica do SQL gerado** — bicondicional F-L1 e implicação F-L2 estão preservados? Comparar `0000_lyrical_machine_man.sql` linha por linha com o que está em `schemas/mysql.ts`.
2. **Sustentação do ON DELETE no action** — é o default conservador correto? Existe risco de FK orphan?
3. **Decisão de PK composta como `CONSTRAINT` em vez de inline** — impacto nenhum no runtime, mas merece nota.
4. **Cobertura de teste** — CA-10..14 ficam reservados pro W3; OK pro reviewer ou deveriam estar exercitados no W2?
5. **Coexistência SQLite/MySQL nos arquivos de config** — está claro como invocar cada um? Algum risco de chamar `db:generate:sqlite` por engano e sobrescrever schema?

---

## Próximo passo

Avançar para **W2 — REVIEW** com `code-reviewer` (skill local + Maestro agent). Aguardando confirmação do usuário.
