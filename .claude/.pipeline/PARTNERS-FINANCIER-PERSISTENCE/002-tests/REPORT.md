# W0 — RED · PARTNERS-FINANCIER-PERSISTENCE

> Agente: tdd-strategist · Resultado: **RED**

## Arquivos de teste

| Arquivo | Gate | Cobre |
| :--- | :--- | :--- |
| `tests/.../domain/financier/financier-rehydrate.test.ts` | default | `Financier.rehydrate` reconstrói Active/Inactive; Inactive sem `deactivatedAt` → `financier-inactive-requires-deactivated-at` |
| `tests/.../adapters/persistence/financier.mapper.test.ts` | default | `financierToInsert`/`financierFromRow` round-trip; reconstrói Active/Inactive; rejeita id/cnpj inválido na row |
| `tests/.../adapters/persistence/repos/financier-repository.drizzle.test.ts` | **gated** (`MYSQL_INTEGRATION=1`) | save→findById; findByCnpj; list; CNPJ duplicado → `financier-cnpj-duplicate` |

## Execução (gate default)

```
ℹ tests 4 · pass 0 · fail 4
Cannot find module '.../mappers/financier.mapper.ts'
```

RED legítimo. O teste de integração fica skipped sem `MYSQL_INTEGRATION`. Liberado para W1.
