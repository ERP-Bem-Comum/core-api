# W0 — RED — CTR-DB-MIGRATION-MYSQL

**Wave:** W0 (RED)
**Owner:** test-writer (Gabriel + Claude)
**Data:** 2026-05-15
**Status:** ✅ COMPLETED — RED válido

---

## Arquivo entregue

- `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts` (300 linhas)

Suite organizada em 4 `describe` blocks, cobrindo 14 CAs do `000-request.md`:

| Bloco | CAs cobertos | Camada | Depende de Docker |
| :--- | :--- | :--- | :---: |
| `CA-1/2: config files` | CA-1, CA-2 | Estrutural (filesystem read) | ❌ |
| `CA-3..9: SQL gerado` | CA-3, CA-4, CA-5, CA-6, CA-7, CA-8, CA-9 | Estrutural (regex sobre SQL gerado) | ❌ |
| `CA-10..14: aplicação E2E` | CA-10, CA-11, CA-12, CA-13, CA-14 | Funcional (docker exec mysql) | ✅ |

Todos os CAs do `000-request.md` têm pelo menos 1 test associado. Nenhum CA órfão; nenhum test sem CA.

---

## Confirmação RED

`pnpm exec node --experimental-strip-types --no-warnings --test --test-skip-pattern='CA-1[0-4]' tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts`

Resultado:

```
✖ CA-1: drizzle.mysql.config.ts existe e tem dialect:mysql + schema/out corretos
✖ CA-2: package.json#scripts.db:generate:mysql aponta para drizzle.mysql.config.ts
✖ CA-3: migrations/mysql/0000_*.sql existe
✖ CA-4: SQL cria 3 tabelas com prefix ctr_*
✖ CA-5: SQL cria os 3 índices declarados
✖ CA-6: SQL cria os 7 CHECKs (5 herdados com prefix + F-L1 + F-L2)
✖ CA-7: SQL cria FK ctr_amendments.contract_id -> ctr_contracts(id)
✖ CA-8: SQL cria UNIQUE em ctr_contracts.sequential_number
✖ CA-9: SQL cria PK composta (contract_id, amendment_id) em ctr_contract_homologated_amendments
```

9 testes falhando, 0 passando. RED disciplinado:

- **CA-1/2** falham porque `drizzle.mysql.config.ts` ainda não existe e `package.json#scripts.db:generate:mysql` não está declarado.
- **CA-3..9** falham porque `src/modules/contracts/adapters/persistence/migrations/mysql/` é diretório vazio (sem migration gerada).
- **CA-10..14** skipados na execução local (exigem `docker compose up -d mysql` healthy). São re-habilitados na execução do W3.

**Por que RED é a forma esperada de saída do W0:** se algum CA passasse agora, ou (a) o test não testa o que deveria, ou (b) o artefato já existe (não há trabalho de W1). Os 9 falharem indica que toda a verticalização do ticket — config Drizzle + script pnpm + migration gerada — está realmente pendente.

---

## Decisões de implementação dos testes

### D-T1: Regex sobre SQL gerado vs parsing AST

Optei por **substring grep via regex** (`/\bctr_amendments_contract_id_idx\b/`) em vez de parser SQL. Razões:

- Drizzle-kit gera SQL com formatação razoavelmente estável (testes não dependem de whitespace específico — uso `[\s\S]*?` para tolerar quebras de linha).
- Parser SQL real (ex.: `node-sql-parser`) introduziria dependência só para testes.
- Os CAs querem garantir que "os identificadores e palavras-chave esperados aparecem", não validação estrutural (essa parte fica para `INFORMATION_SCHEMA` em CA-10..14).

### D-T2: Aplicação E2E via `cat | docker exec -i mysql` em vez de `docker compose cp + exec`

`docker compose cp` exige Compose 2.20+; `cat | docker exec -i` é Compose 1.x+ compatível e portável. Trade-off: stdin redirection precisa de shell, então uso `sh('cat … | docker exec -i …')` via `spawnSync('bash')` — já é o padrão no `mysql-compose.test.ts`.

### D-T3: Geração de UUIDs literais nos INSERTs E2E

Os INSERTs de CA-13/CA-14 usam UUIDs hardcoded (`00000000-0000-4000-8000-00000000000X`) em vez de `UUID()` da função MySQL. Razão: determinismo nos testes — se o teste falhar, o estado pós-falha tem id previsível para inspeção manual. UUIDs v4-formato-válido (octets 4 e 8 setados conforme RFC 4122).

### D-T4: `before/after` montam e desmontam o MySQL

`composeUp() → waitHealthy() → DROP/CREATE DATABASE → applyMigration` no `before`, `composeDown() → cleanupSecrets()` no `after`. Garante que CA-10..14 são reprodutíveis em CI sem estado vazado. Trade-off: ~30s de overhead por execução do bloco — aceitável para suite de integração (não roda em todo `pnpm test` por padrão; é alvo do W3).

### D-T5: Defesa contra ambiente sem Docker

Cada CA-10..14 começa com `if (!dockerAvailable()) assert.fail('docker compose não disponível')`. Decisão consciente: **não silenciar** quando Docker está ausente — o teste deve gritar para sinalizar que a camada funcional não foi exercitada. Quem rodar localmente sem Docker e quiser pular essa camada usa `--test-skip-pattern='CA-1[0-4]'` (mesma técnica desta execução do W0).

---

## CAs do `000-request.md` × testes

| CA | Test | Cobertura |
| :--- | :--- | :--- |
| CA-1 (drizzle.mysql.config.ts) | CA-1 estrutural | Existência + `dialect:'mysql'` + paths corretos |
| CA-2 (package.json script) | CA-2 estrutural | `db:generate:mysql` invoca `drizzle-kit generate` com config certa |
| CA-3 (migration file `0000_*.sql`) | CA-3 estrutural | Glob match em `migrations/mysql/0000_*.sql` |
| CA-4 (3 tables ctr_*) | CA-4 estrutural | Regex `CREATE TABLE.*ctr_<nome>` para cada |
| CA-5 (3 índices) | CA-5 estrutural | Substring de cada nome de índice |
| CA-6 (7 CHECKs) | CA-6 estrutural | Substring de cada nome de CHECK |
| CA-7 (FK contract_id) | CA-7 estrutural | Regex `FOREIGN KEY ... contract_id ... REFERENCES ... ctr_contracts` |
| CA-8 (UNIQUE sequential_number) | CA-8 estrutural | Regex `UNIQUE ... sequential_number` |
| CA-9 (PK composta) | CA-9 estrutural | Regex `PRIMARY KEY (contract_id, amendment_id)` |
| CA-10 (apply exit 0) | CA-10 funcional | Verifica `appliedOk` setado no `before` |
| CA-11 (3 tabelas no IS) | CA-11 funcional | Query `INFORMATION_SCHEMA.tables` |
| CA-12 (7 CHECKs no IS) | CA-12 funcional | Query `INFORMATION_SCHEMA.check_constraints` |
| CA-13 (violar F-L1) | CA-13 funcional | INSERT com `status='Active'`+`endedAt`≠NULL rejeitado |
| CA-14 (violar F-L2) | CA-14 funcional | INSERT amendment `status='Homologated'` sem `homologated_at` rejeitado |

---

## Suggestion #1 do W2 do ticket #2 — absorção

A `Suggestion #1` do `004-code-review/REVIEW.md` do ticket `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` pedia: *"assert substring no SQL do CHECK — `getTableConfig` expõe `c.value` (objeto `SQL`); poderia assertar palavras-chave no SQL gerado para garantir que rename futuro não esvazie a semântica."*

**Forma como este ticket #3 absorve a sugestão:**

- **CA-6 (estrutural)** valida que os 7 CHECKs (por nome) aparecem no SQL emitido pelo `drizzle-kit generate` — substituindo o teste de "nome aparece em `getTableConfig`" do ticket #2 por um teste mais forte ("nome aparece no SQL que vai pro MySQL").
- **CA-12 (funcional)** valida que os 7 CHECKs aparecem em `INFORMATION_SCHEMA.check_constraints` após `apply migration` — substituindo o teste de existência no schema TypeScript por verificação contra DB ao vivo.
- **CA-13/14 (funcional)** validam **a semântica** dos CHECKs F-L1/F-L2, não só a existência. Esta é a forma mais forte possível de garantia: MySQL roda o CHECK, retorna erro 3819 (`ER_CHECK_CONSTRAINT_VIOLATED`), teste captura.

Resultado: a Suggestion #1 fica totalmente endereçada pela execução deste ticket, sem necessidade de polish retroativo no test do ticket #2.

---

## Pré-condições para W1

- Drizzle-kit instalado (já está em `devDependencies` — `pnpm view drizzle-kit` retorna 0.28+).
- `src/.../schemas/mysql.ts` está commitado e exporta `contracts`, `amendments`, `contractHomologatedAmendments` (deliverable do ticket #2 — já verificado).
- O W1 vai criar:
  1. `drizzle.mysql.config.ts` na raiz (apontando para `mysql.ts` schema, `migrations/mysql` out).
  2. Entry `"db:generate:mysql": "drizzle-kit generate --config=drizzle.mysql.config.ts"` em `package.json#scripts`.
  3. Rodar `pnpm db:generate:mysql` para gerar `src/.../migrations/mysql/0000_*.sql`.
  4. Commitar a migration gerada.

Após isso, CA-1..9 viram verde. CA-10..14 são habilitados no W3 (`pnpm test` integração com Docker subindo).

---

## Próximos passos

- Avançar para **W1 — GREEN**: criar `drizzle.mysql.config.ts`, adicionar script `db:generate:mysql`, rodar a geração, commitar.
- Confirmação aguardada do usuário.
