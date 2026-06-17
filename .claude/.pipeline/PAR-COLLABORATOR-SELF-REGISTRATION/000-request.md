# PAR-COLLABORATOR-SELF-REGISTRATION (US5 — Autocadastro público do Colaborador)

> Escopo derivado da spec canônica `specs/015-collaborator-complete-registration/` (épico #65).
> Fonte de verdade dos contratos: `contracts/http-contracts.md:37-46`. Este `000-request.md`
> foi consolidado no W0 (o ticket nasceu sem ele); a spec permanece a fonte autoritativa.

## Objetivo

Permitir que um colaborador **pré-cadastrado por um operador** complete o próprio cadastro por
um link público, autenticado por **token de convite uso-único (TTL 7 dias)** enviado por e-mail —
sem expor a borda autenticada nem permitir enumeração de colaboradores.

## Escopo

- **Domínio (GREEN):** `CollaboratorInviteToken` (`issue`/`state`/`consume`, uso-único + TTL).
- **W1:** minter (`randomBytes(32)`+`sha256`, espelho de `password-reset-token-minter.node.ts`),
  port + repo (`save`/`findByTokenHash`, `consume` **atômico**), schema `par_invite_tokens`
  (migration **0014**, `token_hash char(64)` UNIQUE), mailer próprio do partners (adapta
  `EmailSender` de notifications/public-api — **sem importar `auth`**), e 3 rotas:
  - `POST /api/v1/collaborators` (operador autenticado, `collaborator:write`) → 201 + mint convite + e-mail.
  - `GET /api/v1/collaborators/autocadastro?token=` (**público**) → 200 dados de pré-cadastro (CPF mascarado).
  - `POST /api/v1/collaborators/autocadastro { token, cpfPrefix, ...dados }` (**público**) → 200 Complete + invalida token.

## Critérios de aceite (viram `it()` no W0)

- [ ] **CA1** — `POST /collaborators` autenticado dispara exatamente um convite uso-único para o e-mail do colaborador.
- [ ] **CA2** — `GET /collaborators/autocadastro?token=<válido>` → `200` com CPF **mascarado** (CPF completo nunca na resposta).
- [ ] **CA3** — token **expirado / usado / desconhecido** → `404` **uniforme** (`-token-expired` / `-token-used`), sem vazar existência (anti-enumeração).
- [ ] **CA4** — `POST /collaborators/autocadastro` válido → `200` Complete; segundo submit → `404` (uso-único).
- [ ] **CA5** — prefixo de CPF divergente → `400 collaborator-autocadastro-cpf-mismatch`, **sem queimar** o token (segue válido).

## Restrições / segurança (OWASP Forgot Password — review `web-security-backend` OBRIGATÓRIO no W2)

- Token: CSPRNG ≥128 bits; persistir **só o hash** (`sha256`); uso-único + TTL.
- Não alterar estado antes de token válido; CPF errado não consome o token.
- 404 uniforme + tempo consistente para não permitir enumeração.
- Rate-limit por conta/IP **a avaliar** no W2.

## Definition of Done

Gate W3 verde (`typecheck` + `format:check` + `lint` + `test`) + REVIEW.md `web-security-backend` APPROVED.
