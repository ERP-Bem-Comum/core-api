# CTR-PNPM-ONLY-ALLOW — Guard nativo contra package managers não-pnpm

## Origem

Auditoria de boas práticas (sessão 2026-05-26), gap pnpm #1. Hoje a única
barreira contra `npm install`/`yarn` é o corepack; `.npmrc` só tem
`dedupe-peer-dependents`. Um dev sem corepack configurado pode rodar `npm install`
e divergir o `pnpm-lock.yaml`.

## Escopo

Adicionar guard `preinstall` que aborta a instalação se o package manager não for
o pnpm. Implementação **nativa** (sem dep externa, sem `npx`), checando
`process.env.npm_config_user_agent` — o mesmo mecanismo interno do pacote
`only-allow`, mas alinhado a:

- **ADR-0011** (supply-chain: minimizar deps, substitutos nativos).
- **ADR-0012** (never npm/npx — o `npx only-allow pnpm` de `reference/pnpm/only-allow-pnpm.md:13` puxa um pacote e usa o toolchain npm).

## Critérios de aceitação

- CA1: script `scripts/only-allow-pnpm.ts` sai com código ≠ 0 quando
  `npm_config_user_agent` começa com `npm/` ou `yarn/` ou vazio.
- CA2: o mesmo script sai com código 0 quando começa com `pnpm/`.
- CA3: mensagem de erro em PT-BR cita ADR-0012.
- CA4: `package.json#scripts.preinstall` invoca o script.
- CA5: zero dependência nova adicionada.

## Fora de escopo

- `engine-strict` / settings adicionais de `.npmrc`.
- CI com `pnpm audit` (gap separado, diferido — Fase 1 CLI-first).
