# FIN-MANUAL-ENTRY-TAXONOMY — W3 (QUALITY)

> S2 do épico #502 · `ts-quality-checker` · 2026-07-21. Gates locais verdes; integração MySQL não-executada (#500).

## Gates (fio principal)

| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ limpo |
| `pnpm test` | ✅ **4270 tests · 4251 pass · 0 fail · 19 skipped** |

Baseline (início S2): 4258 / 4239. Δ = +12 tests / +12 pass / 0 fail. **Regressão zero.**

## Integração MySQL — NÃO executada (#500)
O bloco de `manual-entry-taxonomy.drizzle-mysql.test.ts` (CA1/CA8) exige MySQL na 3306 (ocupada) +
runner destrutivo. Registrado no grupo `financial`, **não-executado** — nunca marcado verde.

## Ressalva do W2 → issue aberta
- **M1 (Major não-bloqueante):** o batch de lançamento manual anuncia `budgetPlanRef`/`subcategoryRef`
  no body (schema compartilhado) mas o handler descarta em silêncio — contract-lie. Back-compat, blast
  radius zero hoje. Registrado em **#505** (`financial:manual-entry-batch:taxonomy-refs-dropped`), não
  consertado aqui (anti-padrão #15 — fora do escopo da S2 = endpoint single).

## Migration `0038`
2 `ADD COLUMN` com `CHARACTER SET utf8mb4 COLLATE utf8mb4_bin` (byte-idênticos aos refs irmãos).
Puramente aditiva/INSTANT.

## Estado
S2 pronta e verde. Bloqueio de integração externo (#500). Os dois lugares onde um título nasce
(documento na S1, título manual na S2) agora carregam plano + subcategoria.
