# W3 — GREEN (gate final) · FIN-PAYABLE-ACCOUNT-ACTIVE

Skill: **`ts-quality-checker`**. Política de regressão zero: tudo verde.

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ verde |
| `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" (após `--write` no use-case) |
| `pnpm run lint` (`eslint .`) | ✅ sem erros |
| `pnpm test` | ✅ **3302 pass · 0 fail · 18 skipped** · 979 suites · ~59s |

Os 18 skipped são os testes de integração atrás do opt-in `MYSQL_INTEGRATION` (gate correto — não rodam no `pnpm test` puro).

## Nota de processo

`format:check` pegou o ternário do `list-cedente-accounts-with-balance.ts` (o hook prettier-write não normalizou aquele arquivo no fluxo da sessão principal). Corrigido com `prettier --write` antes de fechar o gate — consistente com a lição [[prettier-hook-reformats-after-commit]] / [[subagent-edits-skip-prettier-lint-hooks]].

## DoD

Seletor "Pagar da Conta" filtra `Active` sob `?status=active` sem quebrar a listagem geral (gestão mantém `Closed`); `save-document` rejeita conta-débito `Closed` com 422/PT. 6 CAs cobertos. **Fecha #293.**
