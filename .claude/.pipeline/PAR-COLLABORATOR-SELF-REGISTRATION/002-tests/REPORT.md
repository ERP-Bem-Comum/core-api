# W0 — Testes RED · PAR-COLLABORATOR-SELF-REGISTRATION (US5 da feature 015)

**Agente:** tdd-strategist · **Outcome:** RED · **US mais sensível (segurança)** — W2 exige review `web-security-backend`.

## Estado real (reconciliação fail-first)

O núcleo de domínio do token (`invite-token.ts` / `invite-token-id.ts` + `invite-token.test.ts`, 4/4) **já está GREEN** — escorregou para W1 antes da formalização do W0 (domínio puro, sem CSPRNG/comparação/I/O: camada mais segura da fatia). A âncora RED legítima do W0 é a borda HTTP, onde mora a superfície OWASP real.

**Âncora RED:** `tests/modules/partners/adapters/http/collaborators-autocadastro.routes.test.ts` — **6/6 FAIL** (pass 0, fail 6), todos por inexistência de feature:

| CA | Teste | Falha RED (motivo certo) |
|----|-------|--------------------------|
| CA1 | pré-cadastro dispara convite uso-único + e-mail | seam `partnersDeps.sentInvites` inexistente |
| CA2 | token válido → 200 CPF mascarado (público) | idem (não chega a mintar/capturar) |
| CA3a | token desconhecido → 404 anti-enumeração | rota `/collaborators/autocadastro` não registrada → `400` da `/:id` (shadowing) |
| CA3b | token usado → 404 `-token-used` | seam + rotas inexistentes |
| CA4 | submit válido → 200 Complete; 2º → 404 (uso-único) | idem |
| CA5 | CPF divergente → 400 `-cpf-mismatch` (token preservado) | idem |

## Modelagem — ESPELHA o molde `auth` (password-reset)
`CollaboratorInviteToken` (domínio, GREEN): `{ id, collaboratorId, tokenHash, issuedAt, expiresAt, usedAt }` + `issue`/`state`/`consume` (uso-único). Minter (W1): `randomBytes(32).toString('base64url')` + `sha256` hex (idêntico ao `password-reset-token-minter.node.ts`). Repo (W1): `save`/`findByTokenHash` + **`consume` atômico** (`UPDATE ... WHERE used_at IS NULL` / tx `FOR UPDATE` — o `confirm-password-reset.ts:72‑99` faz `find→save` SEM tx; débito a NÃO herdar: race = replay). Schema `par_invite_tokens` (migration `0014`, `token_hash char(64)` UNIQUE). Mailer PRÓPRIO do partners adaptando `EmailSender` (notifications/public-api — sem importar `auth`, que já tem `invite-mailer` próprio). Rotas públicas (sem `requireAuth`). TTL 7 dias (clarify).

## Citação canônica (OWASP — via security MCP, `cheatsheets`)
> "Randomly generated using a cryptographically safe algorithm · Sufficiently long to protect against brute-force · Stored securely · Single use and expire after an appropriate period." — `Forgot_Password_Cheat_Sheet.md` §General Security Practices.
> "Return a consistent message for both existent and non-existent accounts · Ensure that responses return in a consistent amount of time to prevent an attacker enumerating which accounts exist." — idem §Forgot Password Request.
> "Do not make a change to the account until a valid token is presented." — idem §Introduction.
> Secure Code Review: "Secure token generation (≥128 bits entropy)."

**Aplicação:** token uso-único + TTL armazenado como **hash** (defesa primária IDOR); token expirado/usado/desconhecido → **404 uniforme** sem vazar dados (anti-enumeração); CPF errado → **400** sem queimar o token (`stillValid → 200`); revalidação de CPF é secundária.

## Achados que o RED expôs (entrada do W1)
1. **Seam de captura** — o composition `memory` deve expor `sentInvites: ReadonlyArray<{ to, token, collaboratorId }>` via fake invite-mailer (o token CLARO só é conhecível via e-mail; o store guarda só o hash).
2. **Route-shadowing** — registrar a rota **estática** `/collaborators/autocadastro` (GET+POST) de forma que não seja capturada por `/collaborators/:id` (Zod UUID → 400). Radix tree do Fastify prioriza estático quando ambos existem.
3. **Cobertura de expiração (TTL)** — fica no domínio (`invite-token.test.ts`, GREEN) + use-case no W1 (clock fake); não há seam de clock na borda (segue o padrão `auth`, que testa expiry no use-case, não na rota).

## CAs (US5) — contrato `specs/015-collaborator-complete-registration/contracts/http-contracts.md:37-46`
CA1 (POST `/collaborators` autenticado → convite + e-mail) · CA2 (GET `/collaborators/autocadastro?token=` → 200 CPF mascarado) · CA3 (expirado/usado/desconhecido → 404 uniforme) · CA4 (POST `/collaborators/autocadastro` → Complete + invalida token) · CA5 (CPF não bate → 400 `collaborator-autocadastro-cpf-mismatch`).
