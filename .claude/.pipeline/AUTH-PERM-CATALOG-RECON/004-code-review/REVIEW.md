# Code Review — AUTH-PERM-CATALOG-RECON — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** `auth/domain/authorization/permission-catalog.ts` + teste.

- 🔴 nenhuma. Domínio puro (sem throw/class), ASCII, ordenado por resource; só dados (strings canônicas no catálogo).
- 🟡 nenhuma.
- 🔵 Escopo ampliado de forma deliberada: além de `reconciliation:*` (#176), incluído `bank-account:*` — gap introduzido pelo #138 (cedente) no mesmo arquivo. Sem isso o admin não acessa os endpoints de conta-cedente recém-mergeados (regressão funcional do #138). Fix idêntico, mesma causa.

**O que está bom:** fail-first respeitado (RED→GREEN); zero drift (seed do admin deriva de `all`); sem regressão (dev-seed/list-catalog verdes).

**APPROVED** → W3.
