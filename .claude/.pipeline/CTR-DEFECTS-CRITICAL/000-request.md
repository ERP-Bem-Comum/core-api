# Ticket CTR-DEFECTS-CRITICAL: 4 fixes do QA-REPORT (2 críticos + 2 altos)

> Documentação PT, identificadores EN (regra invariante).
> **Fonte:** [`tests/bdd/QA-REPORT.md`](../../../tests/bdd/QA-REPORT.md) apêndice adversarial.

## Defeitos cobertos

| # | Severidade | Origem | O que tem hoje | Esperado |
| :-: | :-- | :-- | :-- | :-- |
| **#5** | 🔴 Crítica | A1 | Cria 2 contratos com mesmo `001/2026` | Rejeita 2º com `contract-sequential-number-duplicated` |
| **#8** | 🔴 Crítica | A4 | `Money.fromCents(9_007_199_254_740_993)` aceita, mas armazena `9_007_199_254_740_992` (perda IEEE 754) | Rejeita com `money-exceeds-safe-integer` |
| **#6** | 🔴 Alta | A2 / BDD-1.1 | Aceita `ABC`, `1/26`, `001-2026` como `sequentialNumber` | Rejeita com `contract-sequential-number-invalid-format`. Aceita só `^\d{3}/\d{4}$` |
| **#12** | 🔴 Alta | A12 | `state.ts` lança `SyntaxError`, `EISDIR`, `ENOENT` cru pra `main.ts` | Retorna `Result<void, StateError>` com mensagens humanas |

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | **#5** — adicionar `findBySequentialNumber` no port `ContractRepository`, validar no `createContract` use case **antes** do save | Mantém a regra na application (não no domain — domain não conhece "outro contrato"). InMemory adapter implementa varredura linear (~O(n)); MySQL real usará índice unique. |
| D2 | **#8** — validar `cents > Number.MAX_SAFE_INTEGER` em `Money.fromCents` | Mais simples que migrar para `bigint`. Limite real: ~9×10¹⁵ centavos = R$ 90 trilhões — irrelevante para ERP de cooperativa. Migração para `bigint` fica pra ticket futuro se demanda crescer. |
| D3 | **#6** — validar regex `/^\d{3}\/\d{4}$/` no smart constructor do `Contract.create` | Regra de **formato**, não de unicidade. Vive no domain (igual aos outros validadores de input). |
| D4 | **#12** — refatorar `loadState`/`saveState` para `Result<void, StateError>` | Conforme regra do CLAUDE.md raiz: "`throw` em adapter é OK, mas convertido para `Result` antes de devolver". `main.ts` recebe Result e formata mensagem PT-BR humana. |

## Critérios de aceite

### Defeito #5 — unicidade de `sequentialNumber`

- [ ] `ContractRepository` ganha método `findBySequentialNumber(n: string): Promise<Result<Contract | null, ContractRepositoryError>>`.
- [ ] `InMemoryContractRepository` implementa via `[...map.values()].find(c => c.sequentialNumber === n)`.
- [ ] `createContract` use case carrega via `findBySequentialNumber` **antes** do save; se já existir → `err('contract-sequential-number-duplicated')`.
- [ ] Teste: 2 chamadas com mesmo numero → 2ª retorna erro; primeiro contrato preservado.

### Defeito #8 — overflow Money

- [ ] `Money.fromCents(Number.MAX_SAFE_INTEGER)` → `Ok` (limite inclusivo).
- [ ] `Money.fromCents(Number.MAX_SAFE_INTEGER + 1)` → `Err('money-exceeds-safe-integer')`.
- [ ] `Money.fromCents(1e25)` → `Err('money-exceeds-safe-integer')` (não é mais inteiro mas o check vem antes).

> **Ordem de checks importante:** `MAX_SAFE_INTEGER` ANTES de `isInteger`? Não — Number.isInteger(1e25) é true, mas perdeu precisão. A regra correta: rejeitar NaN/Infinity → rejeitar não-inteiro → rejeitar negativo → rejeitar > MAX_SAFE. Sequência preserva mensagens claras.

### Defeito #6 — formato `XXX/AAAA`

- [ ] `Contract.create` com `sequentialNumber: '001/2026'` → `Ok`.
- [ ] `'ABC'`, `'1/26'`, `'001-2026'`, `'0001/2026'`, `''` → `Err('contract-sequential-number-invalid-format')`.
- [ ] Whitespace-only continua retornando `'contract-sequential-number-required'` (após trim).

### Defeito #12 — boundary I/O em state.ts

- [ ] `loadState(path, ...)` retorna `Result<void, StateError>` com:
  - `'state-file-not-readable'` (EISDIR, EACCES)
  - `'state-file-corrupted'` (JSON.parse falha)
  - `'state-schema-invalid'` (snapshot.contracts/amendments não-array)
- [ ] `saveState(path, ...)` retorna `Result<void, StateError>` com:
  - `'state-file-not-writable'` (ENOENT do diretório-pai, EACCES, EISDIR)
- [ ] `context.ts` propaga erros via `buildContext` returnando `Result<CliContext, StateError>`.
- [ ] `main.ts` formata erro humano: "Não foi possível ler o arquivo de estado: ..." e exit 74 (EX_IOERR).
- [ ] Testes com fixtures: JSON inválido, schema inválido, arquivo vazio (success), path em dir inexistente.

## Fora de escopo

- Migração de `cents` para `bigint` — Defeito #10 (formatter Intl) trata correlato.
- Validação de "ano > 9999" — Defeito #7 trata períodos exotéricos.
- Adicionar lint rule customizada para checks de I/O — futuro.

## Estimativa

~150 linhas de produção (4 arquivos modificados) + ~120 linhas de teste novo.
