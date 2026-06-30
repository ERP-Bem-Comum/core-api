# W1 — Implementação (GREEN)

## Arquivo

- **Editado:** `package.json` — inserido `--enable-source-maps` entre
  `--experimental-strip-types` e `--no-warnings` em **todos** os scripts que
  executam `.ts` em runtime: `preinstall`, `test`, `test:integration`,
  `test:integration:notifications`, `test:integration:storage`, `cli:contracts`,
  `cli:financial`, `secrets:setup`, `pipeline:state`, `pipeline:status`,
  `pipeline:metrics`.

## CA

- CA1 ✅ todo script com `node ... .ts` inclui a flag.
- CA2 ✅ ordem `--experimental-strip-types --enable-source-maps --no-warnings` preservada.
- CA3 ✅ `pnpm test` verde (1156 pass).
