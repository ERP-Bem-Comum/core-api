# W2 — Code Review

**Resultado: APPROVED**

Mudança de config + tooling, escopo pequeno e auditável. Verificações:

- ADR-0029 cita literalmente `settings.md`/`supply-chain-security.md`; ADR-0012 marcado Superseded no padrão do projeto (ver ADR-0018→0020). ✓
- `engines.pnpm >=11 <12` e `packageManager` pinado coerentes com ADR-0011 §3 (pin de versão). ✓
- Settings de supply-chain explícitas mesmo quando coincidem com default v11 — auditável em YAML. ✓
- `trustPolicyExclude` fixado na versão (`undici-types@6.21.0`), não no nome — não afrouxa a política global. ✓
- Guard `only-allow-pnpm`: execpath só como fallback de UA vazio — não abre brecha para `npm install`. ✓
- `website/` ignorado por eslint/prettier — sem efeito colateral no core-api. ✓

Sem alteração em domínio/application/adapters.
