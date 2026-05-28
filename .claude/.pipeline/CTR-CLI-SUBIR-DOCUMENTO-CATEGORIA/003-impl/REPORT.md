# W1 (GREEN) — CTR-CLI-SUBIR-DOCUMENTO-CATEGORIA

**Skill:** application-cli-builder · **Data:** 2026-05-27 · **Resultado:** 🟢 GREEN (4/4 do ticket; regressão 16/16; escopo limpo no typecheck/format/lint).

## Implementação

`cli/commands/subir-documento.ts`:
- `ALLOWED += 'categoria'` (exportado em `allowedFlags`).
- Lê `flags['categoria'] ?? 'other'`; valida contra `DOCUMENT_CATEGORIES` (set dos 8 `DocumentCategory`).
  Inválida → stderr `--categoria invalida: <x>. Validas: ...` + exit 64.
- Narrowing `string → DocumentCategory` após o `.has()` (cast documentado, padrão de borda da CLI).
- Substitui o `categoria: 'other'` hardcoded (`:113`) pela categoria validada.
- `help`/`descricao` atualizados com as 8 categorias e default `other`.

`cli/state.ts`:
- `DOCUMENT_CATEGORIES` passa a ser **exportado** (era privado) — reuso como única fonte da lista,
  evitando uma terceira cópia das 8 categorias. Sem mudança de comportamento.

## Gate (escopo do ticket)

```
node --test contracts.cli.subir-documento-categoria.test.ts → tests 4 · pass 4 · fail 0
node --test contracts.cli.test.ts (regressão)               → tests 16 · pass 16 · fail 0
pnpm exec prettier --check <arquivos do ticket>             → OK
pnpm exec eslint <arquivos do ticket>                       → exit 0
```

## ⚠️ Bloqueador externo do gate repo-wide (NÃO é deste ticket)

`pnpm run typecheck` e `pnpm run lint` repo-wide falham (1 erro TS + 48 lint), **todos** em
`src/modules/auth/` e `tests/modules/auth/` — WIP **untracked** do ticket `AUTH-VO-EMAIL` (outra
sessão; pasta `auth/` + `.claude/.pipeline/AUTH-VO-EMAIL/` + `.claude/.planning/AUTH-MODULE-TICKETS.md`,
todos `??` no git). É um W0 RED de outro ticket deixado no working tree. Não toquei.

**Decisão pendente para o W3:** o gate W3 é repo-wide e não fica all-green enquanto o WIP `auth`
estiver RED no working tree. Opções para o humano: (a) stash/mover o `auth/` antes do W3 deste ticket;
(b) avançar o `AUTH-VO-EMAIL` até GREEN primeiro; (c) aceitar W3 deste ticket validado por escopo.

## Próximo passo (W2)

Audit read-only de `subir-documento.ts` + `state.ts` (export) + o teste novo.
