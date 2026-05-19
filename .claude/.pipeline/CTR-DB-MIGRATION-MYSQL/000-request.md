# Ticket CTR-DB-MIGRATION-MYSQL: Migration MySQL via drizzle-kit + aplicação real no compose

> Documentação PT, identificadores EN (regra invariante).
> Terceiro de 8 tickets derivados de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

## Contexto

[CTR-DB-SCHEMA-MYSQL-CTR-PREFIX](../CTR-DB-SCHEMA-MYSQL-CTR-PREFIX/) (#2) entregou o `schemas/mysql.ts` final — 3 tabelas com prefix `ctr_*`, 3 índices, 7 CHECKs. **O schema está declarativo mas ainda não tem migration SQL aplicável.**

Hoje:
- `drizzle.config.ts` aponta APENAS para SQLite (dialect: 'sqlite', schema: 'sqlite.ts', out: 'migrations/sqlite').
- `pnpm db:generate:sqlite` gera migration SQLite.
- **Não há `db:generate:mysql` nem migration MySQL.**

Sem migration MySQL aplicável:
- Não dá pra subir `ctr_contracts` etc. no MySQL real do compose (#1 entregou o servidor, não os schemas).
- Não dá pra wirar o driver `mysql2` (#4 depende deste).
- O cleanup do SQLite (#5) precisa que o caminho MySQL esteja funcional antes de mudar mappers.

Este ticket é o **gerador** + **validador funcional** da migration MySQL. Absorve naturalmente a **Suggestion S-1 do W2 review do #2** (CA-6/CA-7 só checavam existência por nome — aqui validamos o SQL emitido em runtime contra MySQL real).

## Princípio condutor

> **Migration é a tradução autoritativa de `schemas/mysql.ts` para DDL.** A correção do schema TS não vale nada se o SQL gerado não bate. Validamos em duas camadas: (1) o arquivo `.sql` contém as estruturas declaradas; (2) aplicar contra MySQL real do compose sucede e a estrutura observada via `INFORMATION_SCHEMA` confirma o esperado.

## Escopo

```
drizzle.mysql.config.ts                             # CRIAR — config drizzle-kit para dialect 'mysql'

src/modules/contracts/adapters/persistence/migrations/
└── mysql/                                          # CRIAR (via drizzle-kit generate)
    ├── 0000_<nome-gerado>.sql                      # CRIAR — migration inicial
    └── meta/                                       # CRIAR — snapshot/journal do drizzle-kit

package.json                                        # Atualizar — adicionar "db:generate:mysql"

tests/modules/contracts/adapters/persistence/migrations/
└── mysql.test.ts                                   # CRIAR — 14 CAs (estruturais + funcional via MySQL real)
```

## Fora de escopo

- **Driver `mysql2` wired no app** (`cli/drivers/mysql.ts`) — `CTR-DB-DRIVER-MYSQL` (#4).
- **Remover `drizzle.config.ts` (SQLite)** — `CTR-CLEANUP-SQLITE` (#5). Convivência temporária: dois configs, dois comandos `db:generate:*`.
- **Refatorar mappers/repos** para importar `schemas/mysql.ts` em vez de `sqlite.ts` — `CTR-CLEANUP-SQLITE` (#5).
- **CHECK `value_cents >= 0`** (S-4 do W2 do ticket #2) — ticket separado `CTR-DB-DOMAIN-INVARIANTS` (futuro).
- **Atualizar refs a ADR-0018 nos comentários** — `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8).

## Decisões de design

### D1. Config separado: `drizzle.mysql.config.ts` (não substitui o SQLite ainda)

**Trade-off:**

| Opção A — substituir `drizzle.config.ts` agora | Opção B — config separado, conviver até #5 |
| :--- | :--- |
| Mais alinhado com ADR-0020 (MySQL único) imediato | Mantém `db:generate:sqlite` funcional até o cleanup |
| Quebra script `db:generate:sqlite` (ainda em uso pelos mappers/repos atuais) | Migration sqlite/ continua congelada como está |
| Cleanup #5 precisa renomear arquivo | Cleanup #5 substitui ambos por um único |

**Decisão:** **Opção B** — cria `drizzle.mysql.config.ts` separado. Razão: minimiza superfície de mudança neste ticket; o ticket #5 (cleanup) é dedicado a essa transição. Não introduz dívida nova; apenas defere uma decisão para o ticket que tem essa responsabilidade explícita.

```ts
// drizzle.mysql.config.ts
import type { Config } from 'drizzle-kit';

export default {
  dialect: 'mysql',
  schema: './src/modules/contracts/adapters/persistence/schemas/mysql.ts',
  out: './src/modules/contracts/adapters/persistence/migrations/mysql',
} satisfies Config;
```

### D2. Script `pnpm db:generate:mysql`

```json
{
  "scripts": {
    "db:generate:mysql": "drizzle-kit generate --config=drizzle.mysql.config.ts"
  }
}
```

### D3. Não aplicar migration manualmente — só `drizzle-kit generate`

`drizzle-kit migrate` e `drizzle-orm/mysql2/migrator` exigem driver wired (`mysql2`) — fica para #4. Este ticket SÓ **gera** o `.sql`; a aplicação de teste é feita via `docker exec mysql < arquivo.sql`, que é cross-platform sem dep nova.

### D4. Validação em DUAS camadas

| Camada | O que testa | Quando roda |
| :--- | :--- | :--- |
| **Estrutural** (CA-1 a CA-9) | Arquivo `.sql` existe e contém substrings esperadas (tabelas, índices, CHECKs, FKs, UNIQUE, PK composta) | Sempre (não precisa de Docker) |
| **Funcional E2E** (CA-10 a CA-14) | Aplica migration via `docker exec`, valida estrutura observada e tenta violar CHECKs (insert que viola F-L1 / F-L2 é REJEITADO pelo MySQL) | Apenas quando Docker daemon disponível (mesmo pattern de `mysql-compose.test.ts`) |

A camada funcional **absorve a S-1 do W2 do ticket #2** — em vez de só checar que o CHECK tem o nome certo no schema TS, aqui provamos que o MySQL rejeita uma row inválida em runtime.

### D5. Decisão de naming da migration

`drizzle-kit generate` gera nome aleatório (`0000_fearless_spyke.sql` no SQLite, por exemplo). Aceitamos o naming default — não há valor em renomear, e qualquer rename quebra o `meta/` do drizzle-kit. Os testes não dependem do nome específico (usam `glob` no diretório).

### D6. Erros conhecidos do `drizzle-kit` em MySQL

- **CHECKs**: drizzle-kit suporta CHECKs em MySQL desde v0.31. Versão atual `^0.31.10` — ok.
- **Bicondicional `(A) = (B)`**: literal SQL passado pelo `sql\`...\`` template do Drizzle não é interpretado pelo gerador — vai direto pro `.sql`. Funciona.
- **Foreign keys com `ON DELETE`/`ON UPDATE` default**: Drizzle 0.45 emite `ON DELETE no action ON UPDATE no action` por default. Aceitável; podemos refinar em ticket futuro se cascade for necessário.

## Critérios de aceite

### Estruturais (CA-1 a CA-9) — sempre rodam

- [ ] **CA-1** `drizzle.mysql.config.ts` existe na raiz, exporta config Drizzle com `dialect: 'mysql'`, `schema` apontando para `schemas/mysql.ts`, `out` apontando para `migrations/mysql`
- [ ] **CA-2** `package.json#scripts` contém `db:generate:mysql` com config correto
- [ ] **CA-3** Após `pnpm db:generate:mysql`, existe pelo menos um arquivo `migrations/mysql/0000_*.sql`
- [ ] **CA-4** A migration cria as 3 tabelas com prefix `ctr_*` (`CREATE TABLE ctr_contracts`, `CREATE TABLE ctr_amendments`, `CREATE TABLE ctr_contract_homologated_amendments`)
- [ ] **CA-5** A migration cria os 3 índices declarados (`ctr_amendments_contract_id_idx`, `ctr_contracts_status_idx`, `ctr_contracts_signed_at_idx`)
- [ ] **CA-6** A migration cria os 7 CHECKs (5 herdados com prefix + F-L1 + F-L2) — buscar por substring do nome de cada
- [ ] **CA-7** A migration cria a FK `ctr_amendments.contract_id → ctr_contracts(id)`
- [ ] **CA-8** A migration cria UNIQUE em `ctr_contracts.sequential_number` (constraint ou índice unique)
- [ ] **CA-9** A migration cria PK composta `(contract_id, amendment_id)` em `ctr_contract_homologated_amendments`

### Funcionais (CA-10 a CA-14) — apenas com Docker daemon disponível

- [ ] **CA-10** Aplicar a migration via `docker exec -i core-api-mysql mysql -uroot -p... core < migration.sql` retorna exit 0
- [ ] **CA-11** Após aplicar, `SELECT table_name FROM information_schema.tables WHERE table_schema = 'core'` retorna `['ctr_contracts', 'ctr_amendments', 'ctr_contract_homologated_amendments']` (em qualquer ordem)
- [ ] **CA-12** `SELECT constraint_name FROM information_schema.check_constraints WHERE constraint_schema = 'core'` contém os 7 CHECKs esperados
- [ ] **CA-13** Tentar INSERT que viola F-L1 (`status='Active'` com `ended_at` populado) é rejeitado pelo MySQL com erro CHECK
- [ ] **CA-14** Tentar INSERT que viola F-L2 (`status='Homologated'` sem `homologated_at`) é rejeitado pelo MySQL com erro CHECK

## Plano de waves

| Wave | Entregas |
| :--- | :--- |
| **W0 RED** | `tests/.../migrations/mysql.test.ts` com 14 CAs. CA-1, CA-3 e CA-10..14 falham (arquivos não existem; nada aplicado). CA-2 pode passar acidentalmente se já tiver script; demais dependem do `.sql` gerado. |
| **W1 GREEN** | Criar `drizzle.mysql.config.ts`, adicionar script no `package.json`, rodar `pnpm db:generate:mysql`, validar 14/14 verde. |
| **W2 REVIEW** | Audit do SQL gerado vs declaração TS (Drizzle não gera CHECK errado? FK ok? índices nomeados consistentemente?). Audit do `drizzle.mysql.config.ts`. |
| **W3 QUALITY** | 4 gates verdes + suite completa (zero regressão; nenhum mapper foi tocado). |

## Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| `drizzle-kit` emite SQL com diferenças sutis vs o que esperamos (ex.: ordem de colunas, nomes auto-gerados) | Tests usam `grep` por substring (tabela/coluna/constraint name), não match exato do SQL |
| Drizzle-kit pode mudar o naming convention da CHECK entre versões | Versão pinada no `package.json` (`drizzle-kit@^0.31.10`); audit em cada upgrade |
| Migration aplicada parcialmente deixa DB em estado inconsistente | Usar transação no script de aplicação (`mysql --execute "START TRANSACTION; ...; COMMIT;"`) ou aceitar — MySQL DDL não é transacional, é cada `CREATE TABLE` atômico. Cleanup: `DROP DATABASE core; CREATE DATABASE core` entre testes |
| CHECKs com sintaxe MySQL-específica (`(A) = (B)`) podem ser ignorados se drizzle-kit não passar como literal | Validar via CA-12 — busca em `information_schema.check_constraints` |
| `pnpm db:generate:mysql` requer schema válido — falha se importação quebrar | TSC já passou no #2; risco baixo. Se falhar, é regression do #2 |

## Dependências novas

**Nenhuma.** `drizzle-kit@^0.31.10` já está em `package.json#devDependencies`. Apenas usamos via novo script.

## Tickets sucessores

3. ← **CTR-DB-MIGRATION-MYSQL** (este)
4. `CTR-DB-DRIVER-MYSQL` — wire `mysql2`, resolver F-C1 + F-C2
5. `CTR-CLEANUP-SQLITE` — remover schemas/sqlite, mappers atualizam para mysql, deletar `drizzle.config.ts` e `db:generate:sqlite`
6. `CTR-DOCKERFILE-MYSQL`, 7. `CTR-CLI-MYSQL-SMOKE`, 8. `CTR-DOCS-UPDATE-FOR-ADR-0020`
+ `CTR-DB-DOMAIN-INVARIANTS` (futuro) — S-4 do W2 do #2 + outros CHECKs de domínio

## Referências

- [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md)
- [W2 review do #2](../CTR-DB-SCHEMA-MYSQL-CTR-PREFIX/004-code-review/REVIEW.md) — Suggestion #1 absorvida aqui
- [`schemas/mysql.ts`](../../../../src/modules/contracts/adapters/persistence/schemas/mysql.ts) — fonte que será traduzida
- [Drizzle Kit Generate docs](https://orm.drizzle.team/kit-docs/commands#generate-migrations)
- [MySQL 8.4 Refman §INFORMATION_SCHEMA CHECK_CONSTRAINTS Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-check-constraints-table.html)
