# W3 — QUALITY — PARTNERS-HTTP-V1-BOOTSTRAP

> Skill: `ts-quality-checker` (gate final). **ALL GREEN.**

## Gates (encadeados, exit 0)

`pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`

```
$ tsc --noEmit
(zero erros)

$ prettier --check .
Checking formatting...
All matched files use Prettier code style!

$ eslint .
(zero erros/warnings)

ℹ tests 2005
ℹ suites 646
ℹ pass 1988
ℹ fail 0
ℹ skipped 17
ℹ duration_ms 27731
```

EXIT_CODE encadeado = **0**.

## Correção aplicada no W3 (política de regressão zero)

`format:check` apontou `src/modules/partners/domain/collaborator/types.ts` (arquivo já modificado
**antes** desta sessão — não tocado pelo ticket). Pela política de regressão zero (CLAUDE.md raiz),
todo vermelho no gate se conserta na hora: `prettier --write` removeu uma linha em branco (L93) e
trailing whitespace (L102) — **só formatação, zero semântica**. `tsc`/`test`/`lint` seguem verdes.

## Resultado

- typecheck: ✅ zero erros
- format:check: ✅ all files Prettier-clean
- lint: ✅ zero erros/warnings
- test: ✅ 1988 pass / 0 fail / 17 skipped (gates de integração opt-in, pré-existentes)

**Ticket pronto para fechar.** Os 6 CAs do `000-request.md` verificados pelos 11 testes da P0.
