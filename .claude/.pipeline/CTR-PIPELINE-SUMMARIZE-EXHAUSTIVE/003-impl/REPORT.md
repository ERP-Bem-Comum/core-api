# W1 (GREEN) — CTR-PIPELINE-SUMMARIZE-EXHAUSTIVE

**Skill:** main-session (refactor de tooling)
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — CA-E2 verde; CA-E1 (caracterização) mantida verde.

## Implementação (mínima)

`scripts/pipeline/dashboard.ts` — `summarize`: cadeia `if/else if/else` → `switch
(s.state.status)` exaustivo, **sem `default`**:

```ts
switch (s.state.status) {
  case 'open':
  case 'in-progress':
    open++;
    break;
  case 'closed-green':
  case 'closed-rejected':
    closed++;
    break;
  case 'superseded':
    superseded++;
    break;
  case 'blocked':
    blocked++;
    break;
}
```

## Efeito

- **CA-E2 GREEN:** status fora do enum não cai mais em `blocked` (não há catch-all).
- **CA-E1 preservado:** contagem dos 6 status reais idêntica.
- **Proteção futura:** adicionar membro a `TicketStatus` sem atualizar esta função passa a quebrar
  `pnpm run lint` (`switch-exhaustiveness-check`) — alinhado a `byStatusOf` de `metrics.ts`.

## Gate (antecipado no W1 — lição do ticket anterior)

```
node --test ... tests/pipeline/dashboard.test.ts   → tests 12 · pass 12 · fail 0
pnpm exec eslint scripts/pipeline/ tests/pipeline/  → exit 0
pnpm run typecheck                                   → limpo
pnpm run format:check                                → All matched files use Prettier code style!
```

`format:check` rodado e corrigido (`prettier --write tests/pipeline/dashboard.test.ts`) ainda no
W1, evitando a rejeição de formatação que ocorreu no W2 de CTR-PIPELINE-SUPERSEDE-STATUS.
