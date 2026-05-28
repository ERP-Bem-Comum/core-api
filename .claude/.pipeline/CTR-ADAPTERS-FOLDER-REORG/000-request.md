# 000 — Request CTR-ADAPTERS-FOLDER-REORG

> **Reorganizar `src/modules/contracts/adapters/` por port. Size S.**
> Move 5 arquivos source + atualiza ~30 imports. Sem mudança comportamental.

## Justificativa

`adapters/` hoje mistura subpastas organizadas (`persistence/`, `storage/`) com arquivos soltos no nível raiz (`event-delivery.in-memory.ts`, `event-delivery.logger.ts`, `outbox.in-memory.ts`, `*-repository.in-memory.ts`). Inconsistente, dificulta busca, e quando os adapters reais aparecerem (S3 storage no #2, Magalu no #3) o desbalanço fica pior.

Reorganização agrupa por **port** — cada port ganha subpasta com TODAS suas implementações. Padrão já estabelecido por `storage/` (in-memory.ts hoje, s3.ts no W1 do `CTR-STORAGE-S3-ADAPTER`) e `persistence/repos/` (drizzle hoje, in-memory entrando neste ticket).

## Decisões fixadas

1. **Não criar pasta `repositories/` separada** — InMemory dos repos vai para `persistence/repos/` junto com os Drizzle. Mesmo port (`ContractRepository`, `AmendmentRepository`), mesma pasta.
2. **Tests também movem** — mantém convenção mirror (`tests/` espelha `src/`).
3. **Sem mudança de exports public-api** — public-api do contracts continua reexportando o que já reexporta; nenhum consumer externo nota a mudança.
4. **Sem refactor de imports além do necessário** — só atualiza imports que apontam para os arquivos movidos.

## Escopo

### Movimentos de arquivos source

| De | Para |
| :--- | :--- |
| `src/modules/contracts/adapters/event-delivery.in-memory.ts` | `src/modules/contracts/adapters/event-delivery/in-memory.ts` |
| `src/modules/contracts/adapters/event-delivery.logger.ts` | `src/modules/contracts/adapters/event-delivery/logger.ts` |
| `src/modules/contracts/adapters/outbox.in-memory.ts` | `src/modules/contracts/adapters/outbox/in-memory.ts` |
| `src/modules/contracts/adapters/contract-repository.in-memory.ts` | `src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts` |
| `src/modules/contracts/adapters/amendment-repository.in-memory.ts` | `src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts` |

### Movimentos de arquivos test (mirror)

| De | Para |
| :--- | :--- |
| `tests/modules/contracts/adapters/event-delivery.in-memory.test.ts` | `tests/modules/contracts/adapters/event-delivery/in-memory.test.ts` |
| `tests/modules/contracts/adapters/event-delivery.logger.test.ts` | `tests/modules/contracts/adapters/event-delivery/logger.test.ts` |
| `tests/modules/contracts/adapters/outbox.in-memory.test.ts` | `tests/modules/contracts/adapters/outbox/in-memory.test.ts` |

Repositórios in-memory: tests já estão em `tests/modules/contracts/adapters/persistence/inmemory.test.ts` (mirror do `persistence/repos/`). **Não move** esse arquivo — só atualiza seus imports.

### Atualizações de imports

| Categoria | Quantidade aprox. | Arquivos afetados |
| :--- | ---: | :--- |
| Imports relativos internos (dos arquivos movidos) | ~15 | Os 5 arquivos source + 3 tests movidos têm imports `../../../shared/...`, `../application/ports/...` que precisam ajustar profundidade. |
| Imports externos para os arquivos movidos (de `src/`) | ~7 | `cli/state.ts`, `cli/drivers/memory.ts`, `cli/commands/run-outbox-worker.ts`, e os 2 repos in-memory que importavam `./outbox.in-memory.ts`. |
| Imports externos (de `tests/`) | ~18 | `tests/regression/...`, `tests/modules/contracts/cli/...`, `tests/modules/contracts/application/use-cases/...` (5 arquivos), `tests/modules/contracts/adapters/persistence/inmemory.test.ts`. |

### Sem tocar

- ADRs, handbook, public-api do contracts, package.json, scripts.
- `tests/bdd/QA-REPORT.md` (referências históricas a paths antigos — documento de QA).
- Pasta `tests/modules/contracts/adapters/storage/` (já organizada em subpasta).

## Critérios de aceitação

- **CA1** — 5 source files movidos para suas subpastas corretas.
- **CA2** — 3 test files movidos para mirror das subpastas (event-delivery.in-memory.test.ts, event-delivery.logger.test.ts, outbox.in-memory.test.ts).
- **CA3** — Todos os imports atualizados — typecheck do código tocado por esse refactor não reporta novo erro (apenas o RED herdado de CTR-STORAGE-S3-ADAPTER W0 permanece).
- **CA4** — Suite global excluindo `tests/infra/**` mantém exatamente os mesmos números antes/depois (zero regressão causada pelo reorg). 3 fails herdados continuam sendo os 3 arquivos do S3-ADAPTER W0.
- **CA5** — Estrutura final do `adapters/` é a aprovada (preview do AskUserQuestion). Sem novos arquivos soltos no nível raiz exceto subpastas.
- **CA6** — Public-api do contracts não é tocado.
- **CA7** — Format check OK.
- **CA8** — Lint não reporta novo erro causado pelo reorg (apenas os 106 herdados de S3 W0).

## Não-objetivos

- **Refatorar lógica de algum adapter** — fora de escopo. Movimento mecânico.
- **Renomear nomes de tipos/exports** — preserva `InMemoryOutbox`, `InMemoryEventDelivery`, etc.
- **Limpar `QA-REPORT.md`** — documento histórico.
- **Mover tests dos repos in-memory** — já estão em `tests/modules/contracts/adapters/persistence/inmemory.test.ts`, só imports atualizam.
- **Tocar pasta `storage/`** — já organizada e em uso ativo.

## Risco / pontos de atenção

1. **Imports relativos profundidade muda** — 5 níveis para repos InMemory que vão pra `persistence/repos/`. Verificar manualmente cada `../`.
2. **Refactor sem rede de teste nova** — confiamos nos tests existentes como rede de segurança. Se tests passam pós-refactor com os MESMOS números, regressão = zero. Se diff aparecer, há bug no refactor.
3. **Estado RED herdado do S3-ADAPTER** continua presente — gates W3 globais vão refletir, igual ao ticket anterior. Diff causado pelo reorg deve ser **zero**.
4. **Não usar `git mv`** — `git` não está disponível pra esta sessão (Xcode license). Usar `mv` puro + verificação por listing.
