# W2 — Code Review (read-only) · FIN-MANUAL-PAYMENT-PAIDAT-CMD (#232)

**Agente:** code-reviewer · **Veredito:** ✅ APPROVED (2 observações Minor, não bloqueantes)

## Conformidade

| Critério | Status |
| --- | --- |
| Idioma por camada (erro interno EN kebab `'paid-at-in-future'`, msg PT-BR, comentários PT) | ✅ |
| Sequência canônica application (validar → fetch → domain → persist) — validação de `paidAt` antes do `findById` | ✅ |
| `exactOptionalPropertyTypes` — `paidAt?: string` + spread condicional no handler (sem `undefined` explícito) | ✅ |
| Sem `throw`/`class`/`any`; `Result<T,E>`; imutável | ✅ |
| Idioma da borda Zod (`z.iso.date()` consistente com `dueDate`/`issueDate`) | ✅ |
| Backward-compat (fallback `clock.now()`; campo aditivo `.optional()`) | ✅ |
| Mapeamento de erro HTTP (422/unprocessable + PT-BR) | ✅ |

## Observações Minor (registradas, não bloqueiam)

1. **Invariante temporal na application vs. domínio** — a regra "pagamento não pode ser futuro" vive no use-case (precisa do `clock`). Um purista DDD a colocaria no agregado (`payPayableManually` recebendo o "now"). Aceito aqui: é validação de input temporal de fronteira, não transição de estado; mover exigiria mudar a assinatura do domínio (fora do escopo S). Reavaliar se #143/#141 tocarem o mesmo agregado.
2. **`new Date(cmd.paidAt)` confia no formato** — o caminho HTTP é protegido por `z.iso.date()`; um caller direto do use-case com string malformada geraria `Invalid Date`. Risco baixo (borda valida). Se virar problema, adicionar guarda `Number.isNaN(at.getTime())`.

## Conclusão

Mudança mínima, focada nos 3 CAs da #232, sem regressão. Aprovado para o W3.
