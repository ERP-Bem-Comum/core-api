---
name: "speckit-verify"
description: "Quality gate W3 da core-api: roda typecheck + format:check + lint + test e aplica a política de regressão zero antes de finalizar uma feature do spec-kit."
argument-hint: "(sem argumentos) — roda o gate completo no estado atual"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "bem-comum"
  source: "custom (não faz parte do bundle oficial do spec-kit)"
user-invocable: true
disable-model-invocation: false
---

## Objetivo

Etapa de verificação **custom** do fluxo spec-kit da camada `core-api`. Materializa o
**gate W3** e a **política de regressão zero** da constituição (Princípios I e II) como uma
etapa executável, invocável manualmente (`/speckit-verify`) ou automaticamente via hook
`after_implement` em `.specify/extensions.yml`.

> Esta skill é **custom** e não está no manifesto do spec-kit — updates do CLI **não** a
> sobrescrevem. As regras canônicas vivem em `AGENTS.md` e `handbook/`; aqui só as aplicamos.

## Execução

Rode o gate W3 completo, **em ordem**, parando para corrigir ao primeiro vermelho:

```bash
pnpm run typecheck      # tsc --noEmit
pnpm run format:check   # prettier --check .
pnpm run lint           # eslint . (strict + stylistic + type-checked)
pnpm test               # tests/**/*.test.ts via node:test --experimental-strip-types
```

Se a feature tocou persistência (MySQL/Drizzle), rode também antes de concluir:

```bash
pnpm run test:integration   # sobe MySQL via Docker compose --wait
```

Se a feature alterou algum `schema.ts`, confirme que a migration foi gerada:

```bash
pnpm run db:generate        # e versione a migration resultante
```

## Política de regressão zero (Princípio II — invariante)

**Qualquer vermelho é regressão a corrigir AGORA**, tenha ou não sido causado pelo diff
atual. "Não é meu erro" / "já estava quebrado" **não** encerram a etapa. Diante de uma
falha, exatamente uma destas saídas é aceitável:

1. **Consertar a causa** — o código/teste volta ao verde de verdade.
2. **Corrigir o gate mal-gateado** (ex.: teste de integração rodando em `pnpm test` puro)
   e **provar** o verde no caminho correto (`pnpm run test:integration`). Nunca esconder
   atrás de `skip` sem provar que o teste passa no lugar dele.
3. **Escalar ao humano** com diagnóstico de causa-raiz — só quando 1 e 2 estão fora do
   escopo, e sempre explícito.

Fechar o gate com vermelho não-endereçado é o anti-padrão #14. Veja
`AGENTS.md` §"Política de regressão zero".

## Saída

Ao final, reporte de forma concisa:

- ✅ **Verde**: liste os 4 comandos que passaram (+ integração/migration se aplicável).
- ⚠️ **Vermelho endereçado**: o que falhou e como foi corrigido (causa-raiz).
- 🚩 **Escalado**: o que não foi possível resolver e por quê, com diagnóstico.

Não declare a feature pronta enquanto o gate não estiver verde de verdade.
