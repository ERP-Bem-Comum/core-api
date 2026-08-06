# Phase 0 — Research: Gestão de Programas

> Decisões de design com fundamento. Conforme **Princípio IX** da constituição, cada decisão-chave (DDD, DB, TDD) carrega **citação literal ≥4 linhas** de livro canônico extraída via MCP `acdg-skills`. As demais decisões ancoram em ADRs/handbook.

---

## D1 — Programa é um Bounded Context/módulo próprio (`programs`)

**Decisão**: criar módulo isolado `src/modules/programs/` (`prg_*`), não anexar a Financeiro nem a Contratos.

**Rationale**:

- No handbook, o Financeiro **referencia** `ProgramaID` como dimensão externa de categorização, não como entidade que possui: `handbook/domain_questions/financeiro/bounded-contexts/conciliacao.md:130` (`programa?: ProgramaID` em `LancamentoManual`) e `gestao-documentos.md:184` ("Categorização: Centro de Custo, Categoria, Subcategoria, Programa, Plano Orçamentário"). O `02-context-map.md:46,66` trata Contratos/Orçamento como contextos externos consumidos por evento (`TituloConciliado`).
- DDD (Evans) — referências externas devem apontar **apenas para a raiz** do agregado, o que sustenta "outros módulos só conhecem `ProgramaID`":

> A cluster of associated objects that are treated as a unit for the purpose of data changes. External references are restricted to one member of the AGGREGATE, designated as the root. A set of consistency rules applies within the AGGREGATE'S boundaries.
> — _(Eric Evans, Domain-Driven Design, p. 311, linha 6777)_

- DDD (Vernon) — o agregado se descobre pelas invariantes verdadeiras do modelo, que aqui são próprias de Programa (sigla única, transições de status), não do Financeiro:

> Rule: Model True Invariants in Consistency Boundaries
> When trying to discover the Aggregates in a Bounded Context (2), we must understand the model's true invariants. Only with that knowledge can we determine which objects should be clustered into a given Aggregate.
> An invariant is a business rule that must always be consistent. There are different kinds of consistency. One is transactional consistency, which is considered immediate and atomic.
> — _(Vaughn Vernon, Implementing Domain-Driven Design, p. 450, linha 8985)_

**Alternativas consideradas**: anexar a Financeiro (`fin_*`) — rejeitada: inverteria a dependência (o Financeiro consome `ProgramaID`) e forçaria Contratos/Documentos a importar de Financeiro, ofendendo o isolamento por BC (ADR-0014, ADR-0006).

---

## D2 — Identidade dupla: `id` UUID v4 (PK) + `program_number` sequencial (UNIQUE)

**Decisão**: `id` = UUID v4 (PK de domínio, `varchar(36)`, gerado no domínio); `program_number` = inteiro sequencial interno, `UNIQUE NOT NULL`, exibível ao usuário.

**Rationale**:

- ADR-0018/ADR-0020 fixam UUID gerado no domínio como PK e **proíbem `AUTO_INCREMENT` em PK de domínio** (ADR-0020:106). `UUID()` do MySQL não serve (não imprevisível — MySQL Refman §UUID, linha 109569).
- Modelagem relacional (Ramakrishnan) — `id` é a PRIMARY KEY; `program_number` é uma **chave candidata** declarada com UNIQUE:

> Especificando Restrições de Chave em SQL
> Na SQL, podemos declarar que um subconjunto das colunas de uma tabela constituem uma chave, usando a restrição UNIQUE. No máximo uma dessas chaves candidatas pode ser declarada como chave primária, usando-se a restrição PRIMARY KEY. (A SQL não exige que essas restrições sejam declaradas para uma tabela.)
> — _(Ramakrishnan & Gehrke, Sistemas de Gerenciamento de Banco de Dados, 3ª ed., p. 73, linha 1959)_

- Precedente no projeto: `contracts` já modela `id varchar(36) PK` + `sequential_number varchar(16) UNIQUE` (`src/modules/contracts/adapters/persistence/schemas/mysql.ts:61-62`).

**Tipo**: `program_number` como `BIGINT` (`{ mode: 'number' }`) — permite `ORDER BY`/`MAX()` numéricos sem collation. (Contracts usa `varchar(16)` porque o número é fornecido como string; aqui é interno e numérico.)

---

## D3 — Geração do `program_number`: `MAX(program_number)+1` sob `SELECT … FOR UPDATE`

**Decisão**: o repositório Drizzle gera o próximo número na transação de `save`: `SELECT MAX(program_number) FROM prg_programs FOR UPDATE` → `next = (max ?? 0) + 1` → `INSERT`. `UNIQUE` é o safety-net final (retry em corrida residual).

**Rationale**:

- **Divergência consciente do `contracts`**: lá o `sequential_number` é fornecido pelo cliente; aqui o número é **interno e auto-incremental no nível da aplicação** (FR-002b), pois a UI nunca o informa.
- `FOR UPDATE` é o lock canônico para "ler-e-travar para atualizar depois", com atenção a phantom rows (MySQL Refman §17.7.4, linha 136906). Mantém a geração no controle da aplicação (não no `AUTO_INCREMENT` do banco — ADR-0020).
- Programa nunca é deletado fisicamente (soft via status) → `MAX()` não regride; sem necessidade de tabela de sequência dedicada.

**Alternativas**: `AUTO_INCREMENT` secundário — rejeitado (ADR-0020 mantém geração no domínio/app; acopla ao banco; gaps em `innodb_autoinc_lock_mode=2`). Tabela de sequência dedicada — desnecessária para o volume OLTP.

---

## D4 — Concorrência: optimistic-lock por coluna `version`

**Decisão**: `prg_programs.version INT NOT NULL` (inicia 1). `UPDATE … SET version = version + 1 WHERE id = ? AND version = ?`; 0 linhas afetadas → `program-version-conflict` (HTTP 409).

**Rationale**:

- SC-005 + FR-016 + US4-cenário4 exigem **rejeitar** a gravação concorrente baseada em versão obsoleta — semântica de optimistic-lock, não last-write-wins.
- **Divergência consciente do `contracts`** (que usa SELECT-FOR-UPDATE puro / last-write-wins): justificada na Complexity Tracking do plano. Custo baixo (1 coluna + cláusula `WHERE`).
- Cliente envia a `version` corrente no `PUT` (e em deactivate/reactivate se desejado); o servidor compara.

**Alternativa**: SELECT-FOR-UPDATE sem `version` — rejeitada por não cumprir SC-005 (não distingue stale-write).

---

## D5 — Estratégia de testes (pirâmide do projeto)

**Decisão**: TDD fail-first (W0 RED), nas camadas do projeto:

1. **Unit de domínio** (puro, rápido): `Program.create`, VOs `Sigla`/`Status`, transições.
2. **Use cases** (com InMemory): sigla duplicada, geração de `program_number`, version-conflict.
3. **Rota HTTP** via `fastify.inject` (driver `memory`): status codes, `Location`, paginação, autorização.
4. **Persistência**: suite parametrizada rodada com InMemory **e** Drizzle/MySQL (`.integration.test.ts`).
5. **Integração HTTP real**: coleção Bruno (ADR-0034) exercitando a borda.

**Rationale** — ciclo canônico (Beck), API desenhada pelo teste antes da implementação:

> O ciclo geral de TDD é o seguinte:
>
> 1. Escreva um teste. Pense em como você gostaria que a operação em sua mente aparecesse em seu código. Você está escrevendo uma história. Invente a interface que deseja ter.
> 2. Faça-o rodar. Fazer rapidamente aquela barra ir para verde domina todo o resto.
> 3. Faça direito. [...] Remova a duplicação que você introduziu e chegue ao verde rapidamente.
>    — _(Kent Beck, TDD: Desenvolvimento Guiado por Testes, p. 23, linha 500)_

---

## D6 — Máquina de estados `ProgramStatus`

**Decisão**: VO `ProgramStatus = 'ATIVO' | 'INATIVO'`. Transições: `create → ATIVO`; `deactivate: ATIVO → INATIVO` (rejeita se já INATIVO → `program-not-active`); `reactivate: INATIVO → ATIVO` (rejeita se já ATIVO → `program-not-inactive`). Switch exaustivo com `const _: never`. Persistência: `varchar(16)` + `CHECK IN ('ATIVO','INATIVO')` (sem ENUM nativo — ADR-0020). Soft-deactivate: nunca há DELETE físico (FR-019).

---

## D7 — Logo em object storage (S3/MinIO)

**Decisão**: binário do logo no object storage via `@aws-sdk/client-s3` (ADR-0019); a tabela guarda só a referência (`logo_key varchar`). Port `LogoStorage` no `application/ports/`; adapters `.in-memory.ts` (testes) e `.s3.ts` (prod). Endpoint dedicado `POST /:id/logo` (multipart) valida formato de imagem e tamanho ≤ 5 MB (FR-021) → 415/413. `create`/`update` aceitam programa **sem** logo (FR-022).

**Rationale**: ADR-0019 fixa `@aws-sdk/client-s3` como cliente único; não persistir binário no MySQL. Upload é o ponto de maior esforço — fatiável como sub-ticket P3.

---

## D8 — Autorização (reuso de `auth`, catálogo fixo)

**Decisão**: adicionar ao catálogo fixo (`src/modules/auth/domain/authorization/permission-catalog.ts`, ordem alfabética por resource): `program:deactivate`, `program:read`, `program:write`. `read` cobre listar/detalhar; `write` cobre criar/editar/logo; `deactivate` cobre desativar/reativar (gestão de status, ação sensível separada — espelha o "botão danger" do frontend). Catálogo local em `public-api/permissions.ts` (`PROGRAM_PERMISSION`). Catálogo é **fixo em código** (ADR-0024), não gerenciável em runtime.

---

## Resumo de decisões

| #   | Decisão                                   | Fonte                                                        |
| --- | ----------------------------------------- | ------------------------------------------------------------ |
| D1  | Módulo próprio `programs`                 | Evans 6777 · Vernon 8985 · handbook context-map · ADR-0014   |
| D2  | `id` UUID + `program_number` UNIQUE       | Ramakrishnan 1959 · ADR-0018/0020 · contracts mysql.ts:61-62 |
| D3  | `program_number` via MAX+1 sob FOR UPDATE | MySQL Refman 136906 · ADR-0020                               |
| D4  | optimistic-lock por `version`             | SC-005/FR-016 (spec)                                         |
| D5  | TDD por camadas                           | Beck 500 · pirâmide do projeto                               |
| D6  | máquina de estados ATIVO/INATIVO          | spec US5/US6 · ADR-0020                                      |
| D7  | logo em S3/MinIO                          | ADR-0019                                                     |
| D8  | permissões `program:*` no catálogo fixo   | ADR-0024                                                     |
