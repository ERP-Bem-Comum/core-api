# W3 (ALL-GREEN) — CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE

**Skill:** ts-quality-checker
**Data:** 2026-05-27
**Resultado:** 🟢 ALL-GREEN — 4/4 comandos do gate (exit 0).

## Gate

| # | Comando | Exit | Saída |
| :-- | :--- | :--: | :--- |
| 1 | `pnpm run typecheck` | 0 | sem erros |
| 2 | `pnpm run format:check` | 0 | `All matched files use Prettier code style!` |
| 3 | `pnpm run lint` | 0 | sem warnings/errors |
| 4 | `pnpm test` | 0 | `tests 1220 · pass 1204 · fail 0 · skipped 16` |

## Observações

- Sugestões 🔵 do W2 endereçadas antes do W3: #1 `EffectiveContract` mantido (vocabulário);
  #2 comentário stale corrigido; #3 `ContractMapperInvalidPendingShape` criado + teste CA-M3.
- **`test:integration` (round-trip MySQL real) NÃO incluído** no gate — Docker offline. A migration
  `0006` + CHECKs (`pending_consistency_chk`, status ampliado) permanecem **não exercidos contra o
  MySQL**. Cobertura atual: typecheck + unit do mapper (CA-M1/M2/M3) + round-trip in-memory (CA6).
  **Pendência operacional: rodar `pnpm run test:integration` com Docker antes do merge da branch.**

## Veredito

ALL-GREEN (gate unit). Ticket pronto para `close`, com a ressalva da validação MySQL pendente.
