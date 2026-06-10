# Request — USR-PASSWORD-POLICY

> Origem: handbook/tickets `USR-PASSWORD-POLICY` (handoff front). Decisão de segurança fundamentada em
> `001-security-decision.md` (veredito `security-backend-expert` + OWASP 2025/NIST 800-63B).

## Título

Alinhar política de senha ao OWASP/NIST (mínimo 8 → 12) + expor `GET /auth/password-policy`

## Size

S

## Escopo

1. **`password-policy.ts`**: `MIN_LENGTH` 8 → **12**. Atualizar comentário citando OWASP 2025 (sem MFA) e a
   decisão. Máx 128 e ausência de complexidade **mantidos** (já corretos). Blocklist mantida.
2. **Novo endpoint `GET /api/v2/auth/password-policy`**: retorna `{ minLength: 12, maxLength: 128 }`, **sem
   autenticação**, **sem** expor a blocklist. Fonte única para o front alinhar o checklist.
3. **Ajustar testes/fixtures** impactados pela mudança de mínimo (senhas de teste de 8–11 chars que esperam
   sucesso ou `password-too-common` passam a `password-too-short` — trocar por senhas ≥12 / `administrator`).
4. **Rejeição formal** da proposta do legado (máx 15 + complexidade) — registrada na decisão.

## Critérios de Aceitação

- **CA1:** `Password.parse` de senha com **11** chars → `password-too-short`; com **12** chars (fora da
  blocklist) → `ok`. Boundary 12.
- **CA2:** máx **128** mantido; **sem complexidade** — senha de ≥12 chars só com minúsculas (fora da
  blocklist) é aceita.
- **CA3:** blocklist segue funcionando para senha comum **≥12** (`administrator` → `password-too-common`).
- **CA4:** `GET /api/v2/auth/password-policy` → **200** `{ minLength: 12, maxLength: 128 }`, **sem token**;
  resposta **não** contém a blocklist nem contagem.
- **CA5:** suíte completa **verde** (sem regressão) após ajustar as fixtures de senha curta.

## Fora de Escopo

- Regras de complexidade (rejeitadas por OWASP).
- Expandir a blocklist com entradas ≥12 (follow-up registrado na decisão).
- MFA; medidor de força (zxcvbn) — responsabilidade do front.
