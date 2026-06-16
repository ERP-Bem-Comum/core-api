# W3 — Gate de Qualidade (CORE-CNPJ-ALPHANUMERIC)

**Resultado:** 🟢 GREEN — disciplina `ts-quality-checker`.

## Gate (`pnpm run`)

| Comando | Resultado |
| :--- | :--- |
| `typecheck` (`tsc --noEmit`) | ✅ sem erros |
| `format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| `lint` (`eslint .`) | ✅ sem warnings/erros |
| `test` (`node --test`) | ✅ **2606 pass** / 0 fail / 18 skipped |

## Não-regressão cross-BC

A mudança é no kernel (`Cnpj`), consumido por `supplier`, `financier`, `act` e pelo import
legado de `contracts`. A suíte completa verde confirma que a extensão alfanumérica é
**retrocompatível** — nenhum consumidor regrediu. Os 18 skips são suítes de integração
gateadas por env (`MYSQL_INTEGRATION`/etc.), verdes no home próprio (`test:integration:*`).

## Política de regressão zero

Nenhum gate fechado em vermelho. Achado externo (índice do README sem ADRs 0038–0042) é
débito pré-existente, fora de escopo — a registrar como issue de documentação (anti-padrão #15).
