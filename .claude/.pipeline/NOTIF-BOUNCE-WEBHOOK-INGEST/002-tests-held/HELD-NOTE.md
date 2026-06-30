# W0 RED em espera (held) — NOTIF-BOUNCE-WEBHOOK-INGEST (#132)

Estes 3 testes W0 (bounce-webhook) foram escritos antes de #132 ser **adiado** (decisão de 2026-06-19: bounce via webhook se a Umbler suportar, senão mailbox; implementar quando notifications for priorizado, após #117).

Estavam em `tests/modules/notifications/adapters/{http,persistence,webhook}/` (untracked) e **quebravam o `pnpm run typecheck` global** (TS2307 — importam `src/modules/notifications/...` ainda inexistente), bloqueando o gate W3 de outros tickets (ex.: FIN-RECON-CEDENTE-ACCOUNT).

Movidos para cá **sem alteração** (higiene de gate, não implementação), preservando o caminho original sob `tests/`. Para retomar #132 em W1, mover de volta:

```
.claude/.pipeline/NOTIF-BOUNCE-WEBHOOK-INGEST/002-tests-held/tests/...  →  tests/...
```

Arquivos:

- `tests/modules/notifications/adapters/http/webhook-email-ingest.http.test.ts`
- `tests/modules/notifications/adapters/persistence/suppression-list.in-memory.test.ts`
- `tests/modules/notifications/adapters/webhook/signature.test.ts`
