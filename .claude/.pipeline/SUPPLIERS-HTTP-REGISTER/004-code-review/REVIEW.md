# W2 — REVIEW — SUPPLIERS-HTTP-REGISTER (S2)

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

## Conformidade
| Regra | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0026 | ✅ | registerSupplier no `supplierWriterRepo` (writerHandle no mysql). |
| ADR-0033 | ✅ | POST /api/v1/suppliers, 201 + Location (sem corpo). |
| ADR-0027 | ✅ | `createSupplierBodySchema`; shape inválido → 400. |
| ADR-0024 | ✅ | `authorize('supplier:write')`. |
| Result→HTTP; sem throw | ✅ | `sendWriteError` (sets → status; default 422); invariante payment-target → 422. |
| Reuso do domínio | ✅ | handler só chama use case + mapeia erro; DV CNPJ + payment-target validados no domínio. |

## Observações não-bloqueantes
1. Invariante "ao menos um payment target" no domínio (422), não no Zod — correto (regra de negócio, não shape).
2. Em memory, reader (seed) e writer são stores distintos → read-after-write não reflete; em mysql (reader=writer) reflete. Sem impacto nos CAs.
3. PUT update segue como gap de domínio (S-EDIT futura).

## Gate
```
$ pnpm run lint / typecheck / format:check → todos verdes
```

## Próximo passo
W3 (QUALITY) — gate final encadeado.
