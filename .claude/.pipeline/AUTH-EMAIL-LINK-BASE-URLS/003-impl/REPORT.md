# W1 — Implementação mínima · AUTH-EMAIL-LINK-BASE-URLS

**Agente:** nodejs-runtime-expert · **Data:** 2026-07-02 · **Resultado: GREEN ✅** (nos testes do escopo + suíte unit completa)

## Diff (4 arquivos)

1. **`src/shared/http/email-link-base-urls.ts` (novo)** — `readEmailLinkBaseUrls(env): Result<EmailLinkBaseUrls, readonly string[]>`: valida as 3 base URLs de link de e-mail (`AUTH_RESET_BASE_URL`, `AUTH_ACTIVATION_BASE_URL`, `PARTNERS_AUTOCADASTRO_BASE_URL`) como URL absoluta `http(s)` via `new URL` + protocolo; em `NODE_ENV=production`, ausente/vazia = erro; acumula todos os erros (mensagens PT-ASCII, estilo do worker).
2. **`src/server.ts`** — substitui a leitura crua de `AUTH_RESET_BASE_URL` pelo helper; em erro escreve cada mensagem em stderr e sai com **exit 78** (`EX_CONFIG`); injeta `activationBaseUrl` em `buildAuthHttpDeps` e `autocadastroBaseUrl` em `buildPartnersHttpDeps` (campos já existiam nas composições — `auth/composition.ts:428`, `partners/composition.ts:341`).
3. **`.env.example`** — documenta `AUTH_ACTIVATION_BASE_URL` + `PARTNERS_AUTOCADASTRO_BASE_URL` + nota de obrigatoriedade/validação em prod (aplicado via `git apply`; arquivo é bloqueado a Read/Edit pela política de permissões `.env*`).
4. **`handbook/infrastructure/03-secrets-catalog.md` §3.6** — 3 linhas novas na tabela + nota do ticket.

Nenhuma mudança em composições/use cases (já corretos — o gap era só o composition root).

## Evidência

- Teste alvo `tests/shared/http/email-link-base-urls.test.ts`: **8 pass / 0 fail** (era 0/1 RED no W0).
- Suíte unit completa `pnpm test`: **3339 pass / 0 fail / 18 skipped** (3357 tests) — sem regressão.
- `pnpm run lint`: **0 errors / 0 warnings** (1 warning de directive inútil introduzido e corrigido nesta wave — flagrado pelo Gabriel; lição registrada).
- `pnpm run typecheck`: diff deste ticket **limpo**; os únicos erros são os pré-existentes do backfill/ETL (baseline vermelho documentado em `000-request.md` — aguarda commit da migração do humano para o W3 fechar).

## Decisões

- Validação vive em `src/shared/http/` (composition-root-level, mesmo home do `readHttpConfig`) e NÃO nas composições dos módulos — preserva defaults de dev e evita duplicar a regra em 2 módulos.
- `javascript:`/`ftp:`/sem-protocolo rejeitados por allowlist de protocolo (`http:`/`https:`), não por denylist.
- Exit code 78 segue a convenção `EX_CONFIG` já usada pelo worker `email-dispatch` (`run.ts:34`).
