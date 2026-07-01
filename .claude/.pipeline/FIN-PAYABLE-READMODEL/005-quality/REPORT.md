# W3 — GREEN (gate unitário) · FIN-PAYABLE-READMODEL (#235)

Skill: **`ts-quality-checker`**. Política de regressão zero.

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ sem erros |
| `pnpm test` | ✅ **3303 pass · 0 fail · 18 skipped** · 979 suites |

## Migration no MySQL real — deferida (Docker indisponível neste ambiente)

`test:integration:financial` exige Docker (MySQL via compose `--wait`); **Docker está down nesta sessão** → não é possível aplicar a migration `0027_classy_wild_child.sql` no banco real daqui. Não é um vermelho a esconder — é limite de ambiente:

- A migration é **gerada pelo drizzle-kit** (schema→SQL validado pela ferramenta) e é `CREATE TABLE` padrão MySQL 8.4 (CHECK suportado ≥ 8.0.16; índices simples). Sem `ALTER` (sem risco tipo `[[mysql84-alter-varchar-no-algorithm-hint]]`).
- **Validação empírica no MySQL real** fica com: (1) o follow-up `FIN-PAYABLE-PROJECTION-WORKER`, que detém o teste `payable-view-store.drizzle-mysql.test.ts` (roda migrations + `ON DUPLICATE KEY UPDATE` em lote + CHECKs no banco); (2) o gate de CI/validação na VM x99 (`[[vm-incus-validation-etl]]`).

## Nota de processo

`format:check` pegou o `_journal.json` (editado à mão para regenerar a `0027` limpa) — `prettier --write` normalizou antes de fechar. `[[prettier-hook-reformats-after-commit]]`.

## DoD (escopo núcleo)

Read-model `fin_payable_view` + `applyPayableEvent` idempotente + eventos enriquecidos, com CHECKs no schema + mapper `Result`-based na leitura. Gate unitário verde, W2 (2 agentes especialistas) endereçado. Worker + integração Drizzle-MySQL + guard de recência = follow-up `FIN-PAYABLE-PROJECTION-WORKER`. Avança #235 (Camada 0 do Dashboard/Reports).
