# W1 — Implementação (GREEN)

## Arquivos

- **Novo:** `scripts/only-allow-pnpm.ts` — guard nativo: lê `npm_config_user_agent`; se não começa com `pnpm/`, escreve mensagem PT-BR citando ADR-0012 e `process.exit(1)`. Zero dependência (CA5).
- **Editado:** `package.json` — `scripts.preinstall` invoca o guard com as mesmas flags de runtime do projeto.

## Decisão de design

Não usei `npx only-allow pnpm` (recomendação literal de `handbook/reference/pnpm/only-allow-pnpm.md:13`): puxaria um pacote fetchado e o toolchain npm/npx, contra ADR-0011 (§substitutos nativos) e ADR-0012 (never npm). O guard nativo replica o mecanismo interno do `only-allow` (checagem de user-agent) sem custo de supply-chain.

## GREEN

5/5 do ticket. A passagem sob pnpm (`pnpm install` não aborta) é coberta por CA2 — user agent `pnpm/` → exit 0.
