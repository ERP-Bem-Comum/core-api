# 003 — W1 (impl) — CTR-CONTRACT-SEQUENTIAL-NUMBER

Backend passa a **gerar** a numeração `NNNN/YYYY` por ano (opção C — tabela de sequência
dedicada, padrão CHILD_CODES Refman 8.4 §17.7.2.4). Cliente HTTP não fornece mais o número.

## Mudanças

### Domínio
- `domain/contract/contract.ts`: `SEQUENTIAL_NUMBER_FORMAT` relaxado `/^\d{3}\/\d{4}$/` → `/^\d{3,4}\/\d{4}$/`
  (aceita 3 dígitos do legado + 4 dígitos gerados). Necessário: o número gerado e o legado
  importado (`0042/2020`) têm 4 dígitos.
- `domain/contract/sequential-number.ts` (novo): `formatSequentialNumber(seq, year)` puro → `NNNN/YYYY`
  (zero-pad a 4 dígitos). Conhecimento de formato compartilhado pelos adapters.

### Port
- `domain/contract/repository.ts`: `nextSequentialNumber(year) => Promise<Result<string, ContractRepositoryError>>`.

### Persistência
- `adapters/persistence/schemas/mysql.ts`: tabela `ctr_contract_seq(year SMALLINT UNSIGNED PK, last_seq INT UNSIGNED DEFAULT 0)`.
- Migration `migrations/mysql/0010_busy_mordo.sql` (db:generate) + hardening manual
  (`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, alinhado a 0000/0001).
- `repos/contract-repository.in-memory.ts`: contador `Map<year, lastSeq>` (espelha a tabela; gaps aceitáveis).
- `repos/contract-repository.drizzle.ts`: transação `INSERT…ON DUPLICATE KEY UPDATE` (garante a linha do
  ano; PK `year` é a única UNIQUE → ODKU dirigível) → `SELECT last_seq … FOR UPDATE` → `UPDATE last_seq+1` → format.

### Application
- `create-contract.ts`: `CreateContractCommand.sequentialNumber` agora **opcional**; novo `BuildContractInput`
  (número resolvido) para `buildContract`. `createContract` gera quando ausente/vazio (ano = `clock.now().getFullYear()`),
  preserva quando presente.
- `create-pending-contract.ts`: mesma geração (modo Pending do POST).
- `import-contracts.ts`: `toCreateCommand` tipado como `BuildContractInput` — import sempre PRESERVA `row.numero`.

### Borda HTTP
- `adapters/http/schemas.ts`: `sequentialNumber` removido de `contractWriteShape` (body do POST). Mantido em
  `registrationShape` (response retorna o número gerado).
- `adapters/http/plugin.ts`: handler deixa de repassar `body.sequentialNumber` (Pending e Active).

## Testes ajustados (consequência da feature)
- `domain/contract/contract.test.ts`: "rejects 4-digit prefix" → **accepts** `0001/2026`.
- `application/use-cases/create-contract.test.ts`: "propagates …required" → **gera** quando vazio.
- `adapters/http/contracts-writes.routes.test.ts`: `sequentialNumber` removido dos body helpers; teste
  "duplicado -> 409 via POST" removido (cenário inalcançável — cliente não fornece número).
- `adapters/http/contracts-documents.routes.test.ts`: `sequentialNumber` removido dos 3 POST bodies.
- `application/use-cases/{import-contracts,list-contracts}.test.ts`: stubs de repo ganham `nextSequentialNumber`.
- `e2e/contracts-smoke.e2e.ts`: POST sem `sequentialNumber` (gera ponta-a-ponta no MySQL real).
- `persistence/drizzle-mysql.test.ts`: novo caso de integração `nextSequentialNumber` (CA-2: monotônico por
  ano + reset) + `ctr_contract_seq` incluída no `truncateAll`.

## Resultado

- W0 (`contract-sequential-number.test.ts`): **GREEN** (4/4).
- Suíte completa: **2660 pass / 0 fail / 19 skipped** (2679 total).
- Integração escopada (`drizzle-mysql.test.ts`, MySQL real via Docker): **28/28** — inclui o novo
  `nextSequentialNumber` e CA-11 (UNIQUE) como rede de segurança.

CAs atendidos: CA-1 (POST não exige número), CA-2 (único/crescente por ano via FOR UPDATE),
CA-3 (retorna o gerado; import preserva), CA-4 (UNIQUE como rede).

Próximo: W2 (code-review read-only — drizzle-orm-expert + typescript-language-expert).
