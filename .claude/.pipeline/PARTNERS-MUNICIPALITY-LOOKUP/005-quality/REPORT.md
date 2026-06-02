# W3 — QUALITY · PARTNERS-MUNICIPALITY-LOOKUP

> Agente: ts-quality-checker · Resultado: **GREEN**

## Gate

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ zero erros |
| `pnpm run lint` | ✅ zero erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm test` | ✅ `tests 1618 · pass 1602 · fail 0 · cancelled 0` (16 skipped = integração gated) |

## Achados corrigidos durante o W3

1. **lint (naming-convention)** — `interface IbgeRow` no gerador declarava chaves hifenadas
   (`municipio-id`, `UF-sigla`), violando o formato camelCase. Trocado por `Readonly<Record<string,
   string | number>>` + leitura via bracket/`String()`. Data file regenerado (output idêntico).
2. **format** — `municipalities.data.ts` foi escrito por script (fora do hook `prettier-write`);
   normalizado com `pnpm exec prettier --write` (single quotes; apóstrofos preservados em double quote).

## Higiene

`.tmp/` adicionado ao `.gitignore` — a fonte bruta (2.3 MB IBGE) não é commitada; os scripts de
tooling e o `municipalities.data.ts` gerado (commitável) permanecem versionados.

## Veredito

Verde em todos os gates. Ticket pronto para fechar.
