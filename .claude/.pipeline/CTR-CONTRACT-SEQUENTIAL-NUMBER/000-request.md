# 000 — Request CTR-CONTRACT-SEQUENTIAL-NUMBER

> Backend gera a numeração sequencial do contrato **por ano** (`NNNN/YYYY`), em vez de exigir
> `sequentialNumber` do cliente (hoje o BFF inventa `CT 0001/2026`). Size M. Ticket em
> `handbook/tickets/todo/CTR-CONTRACT-SEQUENTIAL-NUMBER.md`.

## Decisão de modelagem — opção (C), fundamentada (especialistas + MCP ACDG)

**Tabela de sequência dedicada `ctr_contract_seq(year PK, last_seq)`** — padrão `CHILD_CODES` do
**MySQL Refman 8.4 §17.7.2.4** (p. 3069, citado literalmente): contador lido com `FOR UPDATE` e
incrementado; "Do not use either consistent read or a shared mode read… a duplicate-key error occurs".

Por que (C) e não (A)/(B) — o decisor foi o **dump legado futuro**:
- (A) `MAX` textual/regex sobre `varchar` heterogêneo → **colisão silenciosa** (gerar `0005/2026`
  enquanto o dump insere `0005-2026`: `UNIQUE` de varchar não barra strings distintas). REJEITADA.
- (B) colunas auxiliares em `ctr_contracts` → polui a tabela + backfill por regex no ETL. Inferior.
- (C) tabela própria → seq numérico isolado do rótulo; `ctr_contracts.sequential_number` **não muda**
  (continua `varchar`, rótulo exibível, heterogêneo para legados). O dump reconcilia `last_seq` via
  query batch **no ETL** (`UPDATE … last_seq = GREATEST(last_seq, MAX(parse dos conformes))`), uma
  vez — nunca em produção. Formatos não-conformes (`001-2026`) são ignorados (nunca colidiriam).

## Plano de W1 (handoff — sobrevive a `/clear`)

1. **Schema** `adapters/persistence/schemas/mysql.ts`: nova `ctr_contract_seq` (`year SMALLINT UNSIGNED
   PK`, `last_seq INT UNSIGNED NOT NULL DEFAULT 0`). `ctr_contracts` intacto.
2. **Migration** `pnpm run db:generate` + endurecer (CHARSET/COLLATE na tabela nova; ENGINE InnoDB).
3. **Port** `domain/contract/repository.ts`: `nextSequentialNumber: (year: number) => Promise<Result<string, ContractRepositoryError>>` (retorna `NNNN/YYYY`).
4. **In-memory** `repos/contract-repository.in-memory.ts`: `Map<year, lastSeq>`; `next` = ++lastSeq; formata `LPAD(seq,4,'0')/year`.
5. **Drizzle** `repos/contract-repository.drizzle.ts`: transacional — `INSERT … ON DUPLICATE KEY UPDATE`
   (garante a linha do ano) → `SELECT last_seq … FOR UPDATE` → `UPDATE last_seq+1` → formata. Espelha o
   padrão de `nextProgramNumber` mas na tabela `ctr_contract_seq`.
6. **Use case** `create-contract.ts`: `CreateContractCommand.sequentialNumber` vira **opcional**;
   `createContract` gera quando ausente (`year = clock.now().getFullYear()`), preserva quando presente
   (import). `buildContract` recebe o número resolvido. `UNIQUE`/`findBySequentialNumber` seguem como rede.
7. **HTTP** `adapters/http/schemas.ts`: remover `sequentialNumber` do `createContractBodySchema` (cliente
   não fornece). Response retorna o número gerado (já no detalhe).
8. **Import** `import-contracts.ts`: já passa `sequentialNumber: row.numero` → preserva (sem mudança além
   de adequar à assinatura opcional).
9. **Testes**: W0 (`contract-sequential-number.test.ts`) → GREEN; atualizar testes de rota `POST` que
   enviavam `sequentialNumber` no body e asseriam o valor (agora gerado); fixture do drizzle/in-memory.

## Critérios de Aceitação

1. `POST /contracts` não exige `sequentialNumber`; backend gera `NNNN/YYYY` por ano.
2. Números únicos e crescentes por ano, sem corrida (geração transacional `FOR UPDATE`).
3. Contrato criado retorna o número gerado; import legado preserva o número antigo.
4. `UNIQUE(sequential_number)` como rede de segurança final.

## Fechamento

W1 GREEN → W2 (especialistas: drizzle-orm-expert + typescript-language-expert, como no distrato) → W3
(typecheck/lint/format + test + `test:integration`) → close. Mover ticket `todo/` → `done/`.

## Estado atual

- **W0 RED** registrado (`002-tests/REPORT.md`). Próximo: W1 (lista acima).
