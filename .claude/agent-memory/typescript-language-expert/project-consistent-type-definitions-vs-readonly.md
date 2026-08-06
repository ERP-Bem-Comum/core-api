---
name: project-consistent-type-definitions-vs-readonly
description: O ESLint deste repo PREFERE `interface` (stylistic default), e o `type X = Readonly<{...}>` do src/ só passa porque a regra não vê type-alias com type-reference no RHS
metadata:
  type: project
---

`eslint.config.js` carrega `tseslint.configs.stylisticTypeChecked` **sem override** de `@typescript-eslint/consistent-type-definitions`. O default dessa regra é `['error', 'interface']` (confirmado em `.../eslint-plugin/dist/rules/consistent-type-definitions.js` → `defaultOptions: ['interface']`). Ou seja: **o lint deste repo prefere `interface`, não `type`.**

O `src/` inteiro usa `type` mesmo assim (censo em 2026-07-28: 2187 `export type` × 5 `export interface`) porque a regra só flagra type-alias cujo RHS é um **object literal type puro** (`type X = { ... }`). O idioma do projeto — `type X = Readonly<{ ... }>` — tem um **type reference** no RHS e é invisível para a regra. Os 5 `export interface` são todos de `scripts/ci/` (`check-commit-trailers.ts`, `deadman-audit.ts`).

**Why:** a regra "sempre `type`, nunca `interface`" mora no agent file (`.claude/agents/typescript-language-expert.md`, tier 4) e em `.claude/rules/application.md` — cujo `paths:` cobre **apenas** `src/modules/*/application/**`. Nem `AGENTS.md` §"Regras invariantes — sintaxe TS" nem qualquer ADR proíbem `interface` em `scripts/`. Tratar `interface` num script como violação é citar o próprio agent file como se fosse norma do repo (ofende [[adr-over-code-precedent-for-adherence]] pelo avesso).

**How to apply:** ao revisar `interface` fora de `src/modules/*/application/`, classificar como **nit de consistência com o censo do repo**, não como Major/violação — e dizer explicitamente que o ESLint, se opinasse, opinaria a favor do `interface`. Dentro de `application/` (e por convenção em todo `src/`), `type X = Readonly<{...}>` continua sendo o idioma.
