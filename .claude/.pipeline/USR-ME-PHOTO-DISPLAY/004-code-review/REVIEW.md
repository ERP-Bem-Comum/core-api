# W2 — REVIEW — USR-ME-PHOTO-DISPLAY

**Data:** 2026-06-11 · **Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ **APPROVED**

## Escopo revisado

Diff completo da branch (8 arquivos `src/` modificados + 1 novo + 12 testes), read-only.

## Checklist de auditoria

| Regra | Resultado |
| :--- | :--- |
| Camadas (application só conhece ports; sem import de adapters) | ✅ `get-profile-photo.ts` importa apenas ports/domain/shared |
| Adapters: try/catch convertido em `Result` na borda | ✅ S3 `download` mapeia `NoSuchKey`/`NotFound` → `photo-object-missing`; resto → `photo-storage-unavailable` |
| Erros internos EN kebab-case | ✅ `user-photo-not-found`, `photo-object-missing` |
| Isolamento de módulo (ADR-0006/0014) | ✅ tudo em `auth/`; zero import cross-módulo |
| TS strict (`import type`, extensão `.ts`, Readonly) | ✅ |
| Segurança — `GET /me/photo` | ✅ `requireAuth`; self por construção (`req.userId`, sem `:id`) |
| Segurança — `GET /users/:id/photo` | ✅ `requireAuth` + `authorize('user:read')` (mesma permissão do `GET /users/:id`); `userIdParamSchema` → 400 antes do domínio |
| Content-Type da resposta não é controlável pelo cliente na leitura | ✅ vem do objeto gravado no upload (allowlist jpeg/png/webp validada no `setProfilePhoto`); fallback `application/octet-stream` |
| Sem vazamento de detalhe interno em erro | ✅ envelope padrão via `sendResult`; 404/503 |
| Cache | ✅ `no-store` garantido pelo hook global `onSend` (`src/shared/http/app.ts:174`); handler não redefine (decisão documentada no W1) |
| YAGNI (sem presigned/ETag/thumbnail) | ✅ |
| Convenção de corpo binário sem `response` schema | ✅ espelha `GET /contracts/:id/documents/:documentId/content` |

## Observações (não-bloqueantes)

1. `profile-photo-storage.in-memory.ts` — `download` devolve a referência do `bytes` armazenado
   sem cópia; o helper `get` pré-existente tem o mesmo comportamento (adapter de teste/dev).
   Consistente com o padrão do arquivo; não bloqueia.
2. Os 3 testes que "passavam em RED" por colisão de 404 (rota inexistente vs recurso ausente)
   ganharam valor discriminante com o CA1 verde da mesma suíte — tratado no REPORT de W0.

## Issues

Nenhuma issue bloqueante. **APPROVED.**
