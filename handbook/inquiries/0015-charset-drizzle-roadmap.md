# Inquiry-0015: Charset/collate por tabela via API drizzle-orm — roadmap

- **Status:** Open
- **Opened:** 2026-05-18
- **Closed/Decided:** —
- **Opened by:** Gabriel Aderaldo (via `pipeline-maestro`, ticket `CTR-DB-SCHEMA-HARDENING`)
- **Asked to:** drizzle-orm maintainers / observação de roadmap upstream
- **Impact:** `src/modules/contracts/adapters/persistence/schemas/mysql.ts`, qualquer migration emitida via `drizzle-kit generate` no futuro. Eventual ADR de **dependência tipográfica** quando suportado.

---

## 1. Contexto

Durante o ticket [`CTR-DB-SCHEMA-HARDENING`](../../.claude/.pipeline/CTR-DB-SCHEMA-HARDENING/) (audit `0002` §M1), foi necessário declarar `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` por tabela e `COLLATE utf8mb4_bin` em colunas UUID. O motivo: MySQL 8.4 rejeita FK quando a collation das colunas referenciadas diverge da collation default do servidor (ou diverge entre tabelas relacionadas) — defeito real em prod RDS gerenciado.

A versão atual do `drizzle-orm` no projeto é **`0.45.2`** (verificada em `node_modules/.pnpm/drizzle-orm@0.45.2_*/`). Inspeção das types em `mysql-core/table.d.ts` mostra que `MySqlTableExtraConfigValue` é `AnyIndexBuilder | CheckBuilder | ForeignKeyBuilder | PrimaryKeyBuilder | UniqueConstraintBuilder` — **sem opção para `charset`/`collate` table-level**. `varchar` também não aceita `collate` no `options`.

Solução adotada hoje: **SQL manual** na migration `0000_superb_inhumans.sql`, com comentário forte no header do `schemas/mysql.ts` instruindo o próximo dev a replicar em qualquer migration `0001+` que `drizzle-kit generate` venha a emitir. Os testes em `tests/.../schema-hardening.test.ts` (CA-15 + CA-16) cobrem apenas `0000_*.sql`.

Esta solução é **frágil**: depende de disciplina manual. Toda nova migration gerada precisa ser editada pós-emissão, e ainda se houver esquecimento o defeito só aparece no primeiro deploy real contra RDS — exatamente o cenário que o audit `0002` queria prevenir.

---

## 2. Pergunta(s)

1. **drizzle-orm tem charset/collate table-level no roadmap?** Em qual versão? Há issue/PR aberta?
2. **drizzle-orm tem `collate` por coluna no roadmap?** Necessário para o `utf8mb4_bin` em UUIDs.
3. **`drizzle-kit generate` vai emitir `ENGINE=InnoDB DEFAULT CHARSET=...`** quando o suporte vier? Ou continua produzindo `CREATE TABLE` sem table options?
4. **Existe um helper community-driven** (plugin, wrapper) que já faça isso hoje? Aceitável adotar até suporte nativo chegar?

Texto observacional (não há e-mail/issue ainda):

```
drizzle-orm@0.45.2: MySqlTableExtraConfigValue =
  AnyIndexBuilder | CheckBuilder | ForeignKeyBuilder | PrimaryKeyBuilder | UniqueConstraintBuilder
(verificado em node_modules/.pnpm/drizzle-orm@0.45.2_*/mysql-core/table.d.ts:11)
```

---

## 3. Respostas / Investigação

### 2026-05-18 — Inspeção do `node_modules` local

- `drizzle-orm@0.45.2` confirmadamente **sem** suporte table-level `charset`/`collate`. Nem coluna-level `collate`.
- Não há mention de `charset` ou `collate` em nenhum `.d.ts` sob `mysql-core/` ou `node_modules/.pnpm/drizzle-orm@0.45.2_*/`.

### 2026-08-05 — MEDIDO: a pergunta 2 está respondida, e sem esperar upstream

A pergunta 2 (`collate` por coluna, necessária para o `utf8mb4_bin` em UUIDs) **não depende de suporte
novo**. O `customType` do `drizzle-orm@0.45.2` já resolve, e foi reproduzido — não é leitura de doc:

```ts
const binId = customType<{ data: string }>({
  dataType: () => 'varchar(36) COLLATE utf8mb4_bin',
});
```

`drizzle-kit generate` emitiu, verbatim:

```sql
`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
```

E a 2ª geração respondeu `No schema changes, nothing to migrate` — **idempotente, sem drift**, que
era o risco real de injetar SQL num `dataType()`. Testado em worktree descartável com a config do
repo.

**O que isso muda no §"O que decide o futuro deste inquiry":** os passos 2 e 3 ficam disponíveis
HOJE, sem bump de versão. A sintaxe especulativa que o passo 2 imaginava
(`varchar('id', { length: 36, collate: 'utf8mb4_bin' })`) não existe e não é necessária — o caminho é
o `customType`, que é API de primeira classe.

**O que NÃO muda:** a pergunta 1 (charset/collate **table-level**) segue sem resposta. A doc viva de
`orm.drizzle.team/docs/mysql/column-types` (verificada em 2026-08-05) não documenta nenhuma das duas,
e `drizzle-orm@0.45.2` é o dist-tag `latest` — a próxima linha é `1.0.0`, hoje em `rc.4`. O
table-level continua exigindo edição manual da migration.

**Correção de um argumento que este repositório chegou a registrar:** durante a triagem da alegação
`ADR-0014-C8` afirmei que expressar collation exigiria "passo manual permanente a cada
`db:generate`". Está errado, e o erro foi ler documentação em vez de medir — ver a correção em
`context/decisions/ADR-0014.yaml`.

**Encaminhamento:** adotar o `customType` para identificadores toca schema de 8 módulos e muda o SQL
gerado; merece ciclo próprio, não cabe nesta inquiry. Esta permanece `Open` pela pergunta 1
(table-level), agora com o escopo reduzido à metade que de fato depende de upstream. Ver
[Inquiry-0026](./0026-async-human-in-the-loop-and-drizzle-1-0.md) para a avaliação do `1.0.0`.

### 2026-08-05 — Pergunta 2 FECHADA: o ciclo próprio aconteceu (#636)

Os tipos vivem em `src/shared/persistence/identifier-columns.ts` e cobrem as **119** colunas
binárias dos 6 módulos que as têm. `db:generate` responde `No schema changes` em todos — nenhum
`ALTER` foi gerado para coluna existente.

Duas coisas que só apareceram na execução, e que a medição de maio/agosto não previa:

1. **O `binId` único da prova de conceito não bastava.** A collation binária vale para 7 larguras
   distintas, e a largura carrega significado (`varchar(14)` é CNPJ do ADR-0044, `varchar(11)` é
   CPF, `char(64)` é SHA-256 hex). Um tipo parametrizado por `length` devolveria ao schema a decisão
   de qual número usar — que é onde o erro mora. Viraram 7 tipos nomeados pelo que a coluna É.

2. **O CA4 exigiu corrigir o snapshot, e a razão é que ele MENTIA.** O `meta/*_snapshot.json`
   gravava `varchar(36)` enquanto o banco tem `utf8mb4_bin`, porque a migration foi editada à mão —
   a divergência nasceu na edição manual, não na adoção do `customType`. Sem corrigir, o diff via
   mudança de tipo e gerava `MODIFY COLUMN` em cada uma das colunas.

**A pergunta 1 (table-level) segue `Open`** — o `CHARSET`/`COLLATE` de tabela continua exigindo
edição manual da migration, e é o que mantém esta inquiry aberta.

### Pendente — issues e roadmap upstream

- Buscar issues em `drizzle-team/drizzle-orm` GitHub (palavras-chave: `mysql collate`, `charset table`, `utf8mb4_bin`).
- Buscar PRs abertas no mesmo repo.
- Verificar discussão em `drizzle-orm` Discord (#mysql channel) se existir.

---

## 4. Análise interna

### Alternativas avaliadas (no momento do ticket `CTR-DB-SCHEMA-HARDENING`)

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A. SQL manual na migration + comentário forte no schema TS** (escolhida) | Funciona com drizzle-orm 0.45; correção end-to-end; testes estruturais cobrem `0000_*.sql` | Frágil: dev precisa replicar manualmente em migrations futuras; teste estrutural só cobre 0000 hoje | ✅ Aplicada — pragmática enquanto não há suporte |
| B. Migration nova `0001_*.sql` com `ALTER TABLE ... CONVERT TO CHARACTER SET ... COLLATE ...` | Não toca a 0000 (clean migration history) | Mesma fragilidade da A para migrations futuras; adiciona migration que poderia ser evitada (0000 ainda não rolou em prod) | ❌ Rejeitada — `_journal.json` sem checksum + migration ainda não aplicada |
| C. Aguardar suporte upstream | Solução definitiva | Bloquearia o ticket por tempo indefinido; audit aponta defeito real em RDS | ❌ Rejeitada — bloqueio inaceitável |
| D. Helper/wrapper local (`mysqlTableHardened(name, cols, extras)`) que aplica charset/collate via `sql` raw injection | Encapsula a fragilidade em um único ponto | drizzle-kit ainda não emitiria as opções no SQL gerado; helper só ajuda o **schema TS** ler bonito, não o SQL emitido | ❌ Rejeitada — não resolve o emissor |

### O que decide o futuro deste inquiry

Quando drizzle-orm suportar charset/collate table-level (e idealmente per-column), a estratégia é:

1. Mover a configuração `{ charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }` para a chamada `mysqlTable(...)`.
2. Mover `collate: 'utf8mb4_bin'` para o `varchar('id', { length: 36, collate: 'utf8mb4_bin' })` (sintaxe especulativa baseada nos padrões usuais de drizzle).
3. Rodar `pnpm run db:generate` — drizzle-kit deve regenerar `0000_*.sql` com `ENGINE=InnoDB DEFAULT CHARSET=... COLLATE=...` e `COLLATE utf8mb4_bin` inline.
4. Remover o bloco "⚠️ CHARSET/COLLATE — aplicado em SQL manual" do header de `schemas/mysql.ts`.
5. Manter os testes `CA-15` / `CA-16` em `schema-hardening.test.ts` — agora validam que o SQL gerado contém as cláusulas (não que foram editadas manualmente).
6. Atualizar este inquiry para `Status: Decided`.

---

## 5. Decisão final

**PENDENTE — bloqueador externo**: suporte upstream em `drizzle-orm` ainda não disponível na versão 0.45.x.

Próximas ações:

- **Watch upstream**: revisar este inquiry a cada bump de minor de `drizzle-orm` (próxima oportunidade quando o `package.json` mover de `0.45.x` para `0.46.x+`).
- **Sentinel de regressão hoje**: testes `CA-15` e `CA-16` cobrem `0000_*.sql`. Quando nova migration `0001_*.sql` for emitida, estender o teste para cobrir também (será sinal claro de que a dívida está crescendo).
- **Sem timeline forçado**: aceitar a fragilidade enquanto (a) não há novas migrations, (b) `pnpm test:integration` está validando a aplicação real do schema endurecido.

---

## 6. Saídas (outputs concretos)

- [ ] **Watch**: monitorar `drizzle-team/drizzle-orm` GitHub para issue/PR sobre `mysql charset table option`.
- [ ] **Quando suportado**: abrir ticket `CTR-DB-SCHEMA-DRIZZLE-NATIVE-CHARSET` para migrar do SQL manual para a API TS.
- [ ] **Quando emitir nova migration**: estender `tests/.../schema-hardening.test.ts` `CA-15`/`CA-16` para varrer todas as migrations em `migrations/mysql/`, não apenas `0000_*.sql`.
- [x] **Comentário forte no `schemas/mysql.ts`** — já aplicado em `CTR-DB-SCHEMA-HARDENING` W1.
- [x] **Nota na §7 do audit `0002`** registrando a dívida.

---

## 7. Referências

- Ticket que originou: [`CTR-DB-SCHEMA-HARDENING`](../../.claude/.pipeline/CTR-DB-SCHEMA-HARDENING/) — W1 REPORT seção "Decisões aplicadas" D5 / D6.
- Audit fonte: [`reviews/0002-audit-adapters-persistence-mysql.md`](../reviews/0002-audit-adapters-persistence-mysql.md) §M1, §7.
- ADR alvo: [`architecture/adr/0014-mysql-database-isolation.md`](../architecture/adr/0014-mysql-database-isolation.md) — fixa `utf8mb4_unicode_ci` server-level.
- ADR alvo: [`architecture/adr/0020-mysql-only-supersedes-dual-dialect.md`](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — engine único.
- Best-practice MySQL: [`reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md`](../reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md) §"Comparação por versão" — explica por que FK exige collation match.
- Versão observada do drizzle-orm: `0.45.2` (em `node_modules/.pnpm/drizzle-orm@0.45.2_*/node_modules/drizzle-orm/mysql-core/table.d.ts:11`).
- Upstream a vigiar (placeholders, não verificados nesta inquiry): `https://github.com/drizzle-team/drizzle-orm/issues?q=mysql+collate` ; release notes do drizzle-orm.
