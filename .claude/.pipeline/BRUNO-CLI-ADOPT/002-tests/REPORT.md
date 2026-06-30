# W0 — RED — BRUNO-CLI-ADOPT

Prova de que, sem a mudança, o objetivo (rodar o `bru` resolvido do projeto) **não é atingível** e a
instalação direta é **bloqueada** pelo guard de supply-chain.

## RED-1 — `bru` não resolve do projeto

```
$ pnpm exec bru --version
[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "bru" not found
```

## RED-2 — `@usebruno/cli` ausente do `package.json`

```
deps: (ausente) | devDeps: (ausente)
```

## RED-3 — instalar no repo é bloqueado pelo `trustPolicy: no-downgrade` (ADR-0029)

```
$ pnpm add -D @usebruno/cli@3.4.2
[ERR_PNPM_TRUST_DOWNGRADE] High-risk trust downgrade for "semver@6.3.1" (possible package takeover)
... at @usebruno/converters@0.20.0 → jscodeshift@17.3.0 → @babel/core@7.29.7
```

## Critério de saída do RED

A wave fecha GREEN (W3) quando `pnpm exec bru --version` = 3.4.2 **e** `pnpm install --frozen-lockfile`
fica verde com o `@usebruno/cli` em `devDependencies` — sem workaround fora da árvore.

**Outcome:** RED (esperado).
