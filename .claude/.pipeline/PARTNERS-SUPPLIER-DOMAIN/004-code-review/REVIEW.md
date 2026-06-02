# W2 — REVIEW · PARTNERS-SUPPLIER-DOMAIN

> Agente: code-reviewer · Round: 1 · Veredito: **APPROVED**

## Checklist

| Critério | Status | Nota |
| :--- | :--- | :--- |
| Idioma (código EN; serviceCategory literal D2; pixKeyType EN; erros kebab) | ✅ | |
| `import type` / `.ts` / `#src/*` | ✅ | |
| Domínio puro (sem framework/IO; id/occurredAt injetados) | ✅ | |
| Estados refinados Active/Inactive | ✅ | `deactivatedAt` só no inativo |
| Invariante de negócio expressa | ✅ | "destino de pagamento" (bank OU pix) no `register` |
| VOs com smart constructor + Result | ✅ | `BankAccount`/`PixKey`/`ServiceCategory` |
| Imutabilidade (`immutable`) | ✅ | |
| Idempotência de transição | ✅ | `supplier-already-inactive`/`-active` |
| Reuso do kernel + padrão do Financier | ✅ | `Cnpj.parse`; simetria de ciclo de vida |
| YAGNI | ✅ | sem evaluation/repo/use case/persistência |

## Análise pontual

- **Composição de erros**: `SupplierError` inclui `PaymentTargetError` (`invalid-bank-account`/
  `invalid-pix-key`) — o `register` propaga o erro do VO em vez de mascarar.
- **`ServiceCategory` por Set**: O(1), 39 valores; a union de tipo e o Set de runtime listam os mesmos
  valores (risco de drift mínimo, ambos derivados do DBML).
- **Email inline documentado**: regex pragmática com TODO implícito de migração para VO `Email` do
  kernel (D4) — dívida explícita, não silenciosa.
- **`reactivate`** descarta `deactivatedAt` (narrow para `InactiveFinancier`→Active), igual ao Financier.

## Issues

Nenhuma. Liberado para W3.
