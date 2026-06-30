# W3 — Gate de Qualidade (CTR-SWEEPER-JOB-LOCK)

**Resultado:** 🟢 GREEN — disciplina `ts-quality-checker`.

| Comando | Resultado |
| :--- | :--- |
| `typecheck` | ✅ |
| `format:check` | ✅ |
| `lint` | ✅ |
| `test` | ✅ **2658 pass** / 0 fail / 18 skip |
| `test:integration` (contracts) | ✅ **88 pass** — inclui `claimJobRun` (adquire/não-adquire contra MySQL real) |

Integridade do working tree verificada após o incidente do W1 (`persistence/repos/` restaurado do HEAD,
9 arquivos, sem recorrência). Nenhum gate em vermelho.

Piloto da coordenação de jobs one-shot entregue (sweeper de contracts). Defense-in-depth p/ multi-instância
sem novo serviço (MySQL `INSERT IGNORE`); Valkey/store distribuído permanece adiado (ADR-0030) até a 2ª instância.
