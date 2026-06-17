# W1 — Implementação (GREEN) · PAR-COLLABORATOR-SELF-REGISTRATION (US5)

**Outcome:** GREEN. Os 6 CAs RED do W0 (`collaborators-autocadastro.routes.test.ts`) passaram + o caminho mysql foi verificado por integração.

## Camadas entregues

| Camada | Arquivos |
|---|---|
| Domínio (já-GREEN no W0) | `invite-token.ts`, `invite-token-id.ts` |
| Ports | `domain/collaborator/invite-token-repository.ts` (`markUsed` atômico), `application/ports/collaborator-invite-token-minter.ts`, `.../collaborator-invite-mailer.ts` |
| Adapters | `adapters/crypto/...minter.node.ts` (`randomBytes(32)`+`sha256`), `adapters/persistence/repos/...repository.in-memory.ts`, `...repository.drizzle.ts`, `adapters/persistence/mappers/invite-token.mapper.ts`, `adapters/notifications/...mailer.capturing.ts` (memory), `...mailer.email.ts` (EmailSender real) |
| Use cases | `issue-collaborator-invite.ts`, `view-collaborator-invite.ts` (CPF mascarado), `complete-collaborator-registration-via-invite.ts` |
| Schema + migration | `par_invite_tokens` em `schemas/mysql.ts` + `0014_odd_mysterio.sql` (`db:generate:partners` isolado; ENGINE/`COLLATE utf8mb4_bin` à mão) |
| Borda HTTP | `composition.ts` (expõe `sentInvites` memory; mailer env-resolvido mysql; mint no `POST /collaborators` na ROTA), `plugin.ts` (rotas estáticas públicas `GET/POST /collaborators/autocadastro` — resolvem o shadowing; mapas erro→HTTP), `schemas.ts` (`autocadastroQuery/Body`) |

## Decisões travadas

- **Mint no `POST /collaborators`** (contrato literal) composto **na rota**, não no use case `registerCollaborator` — evita disparar convite no `importCollaborators` (lote). Reenvio dedicado = YAGNI (issue futura).
- **`markUsed` atômico** (`UPDATE ... WHERE used_at IS NULL`) — anti-replay que o `auth` (find→save) não tem; débito explicitamente não-herdado.
- **404 uniforme** (desconhecido == expirado) + CPF errado **não queima** o token (CA5: `stillValid → 200`).
- Mailer **próprio do partners** (não importa `auth`, ISP/ADR-0006).
- Referência ao colaborador **por ID + índice, sem FK rígida** (ADR-0014, padrão `par_collaborator_history`).

## Gates

- `typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `pnpm test` ✅ **2729 pass, 0 fail** (6/6 CAs US5; 197 HTTP partners sem regressão).
- `test:integration:partners` (Docker) ✅ **42/42, 0 fail** — `DrizzleCollaboratorInviteTokenStore` (save/find/`markUsed` atômico) + migration `0014` aplicada na cadeia completa, sem regressão nos demais repos.

## Correções de teste no W0 (RED→GREEN, CAs intactas)

- Seam de captura via `autocadastroUrl`→token (mailer não conhece `collaboratorId`).
- Envelope de erro real é `{ error: { code } }` (não `{ error: string }`) — asserções ajustadas para `.error.code`.

## Pendente

W2 `web-security-backend` (obrigatório US5) → W3 close.
