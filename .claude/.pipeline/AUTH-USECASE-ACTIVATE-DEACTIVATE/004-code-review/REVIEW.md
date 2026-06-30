# W2 — Code Review · AUTH-USECASE-ACTIVATE-DEACTIVATE

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- **Application pura**: factory `(deps) => (cmd) => Promise<Result>`; importa só ports + domínio. ✅
- **Reuso de domínio**: `User.disable`/`User.enable` sem reescrita; nenhuma regra de negócio vazou pro use case. ✅
- **Idempotência (FR-010)**: estado-alvo → no-op com `event: null`, sem `save`. ✅
- **Anti-lockout**: `cannot-deactivate-self` antes de qualquer escrita. ✅
- **Sequência**: rehydrate → fetch (404) → self-check → domain → persist; evento após save. ✅
- **Result na borda, sem throw**; erros kebab-case EN. ✅
- **Narrowing** por discriminante de `status` (sem cast). ✅

## Observações (não-bloqueantes)

- `activateUser` sem `actorId` por design (reativar a si mesmo é inalcançável — `disabled` não loga).
- Eventos `UserDisabled`/`UserEnabled` ainda não publicados em outbox (consumo cross-módulo é fase futura).

Sem issues bloqueantes.
