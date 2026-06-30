# W1 — Implementação GREEN · AUTH-AGG-SESSION

- **Wave:** W1 (GREEN) · **Skill:** `ts-domain-modeler` · **Data:** 2026-05-27 · **Outcome:** GREEN (14/14 · typecheck + lint limpos)
- **Decisões:** DD-SESSION-01..03.

## Arquivos criados

- `session/refresh-token-id.ts` — `RefreshTokenId` branded + generate/rehydrate.
- `session/refresh-token.ts` — `RefreshToken` + `RefreshTokenState` + `RefreshTokenError` + `issue`/`state`/`verify`/`revoke`/`rotate`.

## Aderência às decisões

- **DD-SESSION-01** — estado **computado** por `state(token, now)`; `verify(token, now)` é o gate. Sem tipos refinados (estado temporal).
- **DD-SESSION-03** — `state` com precedência `revoked > rotated > expired > active` (switch exaustivo, sem `throw`). `rotate` marca `replacedBy`; `revoke` marca `revokedAt` (idempotente). `tokenHash` string opaca non-empty.
- **DD-SESSION-02** — sem eventos no agregado.

## Nota de design (para o W2)

`rotate(token, replacement, _at)` mantém o parâmetro `_at` na assinatura (simetria com `revoke(token, at)` e com o 000-request) mas **não o usa** — a rotação não registra timestamp pois DD-SESSION-02 difere eventos/auditoria. Aceito pelo lint (`argsIgnorePattern '^_'`). Reavaliar (remover o param ou passar a registrar `rotatedAt`) quando os use cases de sessão entrarem.

## Testes

```
ℹ tests 14
ℹ pass 14
ℹ fail 0
```
`pnpm run typecheck` e `pnpm run lint`: sem erros.

## Checklist auto-revisão
- [x] Zero `throw`/`class`/`this`/`any`. `immutable` + spread; sem mutação.
- [x] Switch exaustivo em `verify` sem `default`/`throw` (cobre os 4 estados).
- [x] Return types explícitos; `import type`; `.ts`; EN + erros kebab EN; ASCII puro.
- [x] Sem import cross-módulo.

## Próxima wave
W2 (code review read-only).
