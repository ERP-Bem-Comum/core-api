# Decisão de segurança — política de senha (USR-PASSWORD-POLICY)

> Veredito do agente `security-backend-expert` (sessão 2026-06-10), fundamentado na **OWASP Authentication
> Cheat Sheet 2025** + **OWASP Top 10:2025 A07** + **NIST 800-63B §5.1.1**. Pesquisa web feita na sessão.

## Contexto verificado

- **Sem MFA** no projeto (grep em `src/modules/auth/` — auth é email+senha puro; nenhum ADR planeja MFA).
- Política atual (`password-policy.ts:26-32`): min **8**, máx **128**, blocklist, **sem complexidade**.

## Recomendações OWASP 2025 (fontes)

| Aspecto | OWASP/NIST | Decisão |
| --- | --- | --- |
| Complexidade (composição) | **Desencorajada** ("no composition rules") | **Manter sem complexidade** — rejeita o design legado |
| Máximo | **≥ 64** (passphrases) | **Manter 128** |
| Blocklist (vazadas) | **Recomendada** | **Manter** |
| Mínimo | **8 com MFA / 15 sem MFA** | **Subir 8 → 12** (compromisso; sem MFA) |

- Fontes: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html> ·
  <https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/>

## Decisão final (P.O., 2026-06-10)

- **Mínimo = 12** (escolhido entre 12/15/manter-8). ~71 bits de entropia; alinha ASVS nível 1/2. 15 era a
  postura OWASP full sem MFA, mas 12 é o compromisso UX×segurança aceito. Se MFA chegar (Fase 2+), pode baixar.
- **Rejeitada** a proposta do design legado (máx 15 + complexidade): contraria OWASP em 2 pontos (máx deve ser
  ≥64; complexidade é proibida). O **front sincroniza com o backend**, não o contrário.
- **Endpoint `GET /auth/password-policy`** aprovado, expondo **apenas** `{ minLength, maxLength }`, **sem auth**,
  **sem** revelar a blocklist (revelar permitiria contornar).

## Consequência registrada (follow-up, fora de escopo)

Com MIN=12, as entradas da blocklist com < 12 chars (a maioria) tornam-se **inalcançáveis** (rejeitadas por
comprimento antes). A blocklist só "morde" senhas ≥12 comuns (ex.: `administrator`). Recomenda-se um ticket
futuro para **expandir a blocklist com passphrases/senhas comuns ≥12 chars**.
