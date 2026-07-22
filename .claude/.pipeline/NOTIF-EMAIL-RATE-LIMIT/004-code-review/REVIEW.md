# W2 — REVIEW de segurança (NOTIF-EMAIL-RATE-LIMIT, #133)

> **APPROVED após correções.** Auditoria por `security-backend-expert` (skill `web-security-backend`).
> Nota: o MCP `mcp__security` **não estava acessível** ao subagente; ancorou em CWE/OWASP/handbook do repo
> (igualmente verificável). Anti-enumeração **confirmada íntegra** (`/forgot-password` retorna 202 incondicional).

## Achados e resolução

| # | Sev | Achado | Resolução |
| :-- | :-- | :-- | :-- |
| **B1** | 🔴 Blocker | `Map` sem teto/TTL → memory exhaustion (CWE-770/400, OWASP API4:2023); worker roda pra sempre | **Corrigido**: `maxKeys` (default 100k) + `sweepExpired` + evição FIFO ao lotar. Teste B1 (evição observável). |
| **M1** | 🟠 Major | chave sem normalização (`+tag`, dot-Gmail) fragmenta orçamento | **Mitigado + documentado**: `keyOf` = `trim().toLowerCase()`; NÃO canonicalizar `+tag`/dot (por-provedor, agressivo) é **decisão consciente** comentada no código. |
| **M2** | 🟠 Major | `cc`/`bcc` não contados → bypass | **Corrigido**: `recipientsOf` inclui `to+cc+bcc`. Teste M2. |
| **M3** | 🟠 Major | config inválida → rate-limit off **silencioso** (CWE-636 fail-open) | **Corrigido**: `rateLimitConfigFromEnv` → `off\|on\|invalid`; `invalid` vira `EmailConfigError 'invalid-rate-limit'` → **boot falha alto** (EX_CONFIG no run.ts). Testes de config. |
| **M4** | 🟠 Major | worker loga "delivered" p/ e-mail descartado (CWE-778) | **Mitigado**: log distinto `rate-limited: suprimido eventId=...` (sem endereço). Métrica agregada na `WorkerStats` = follow-up opcional (worker genérico). |
| **m1** | 🟡 Minor | `to` duplicado corrompe contagem | **Corrigido**: dedup via `Set`. Teste m1. |
| **i2** | 🔵 Info | `reason` interpolado em erro genérico (fora do rate-limit) | Follow-up separado (afeta `smtp-rejected`/bounce, não este ticket). |

## Gate
`typecheck` ✅ · `format` ✅ · `lint` ✅ · testes do ticket **19/19** (decorator + config + delivery). Sem regressão.
Todos os achados acionáveis endereçados no mesmo round; nenhum silenciado (ADR-0040).
