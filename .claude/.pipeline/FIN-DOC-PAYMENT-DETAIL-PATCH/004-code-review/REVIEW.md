# W2 — Code Review (read-only)

**Skill:** code-reviewer · **Veredito:** APPROVED · **Round:** 1

## Escopo revisado

Diff de 5 arquivos src (22 inserções, 1 deleção) + 1 teste novo. Espelha o campo `description` (precedente de edição via PATCH) para `paymentDetail`.

## Checklist

| Critério | Resultado |
| --- | --- |
| Adesão ao contrato §2 (`http-payment-detail.md:39-52`) | ✓ `paymentDetailInput.nullable().optional()` no `adjustDocumentBodySchema` |
| `exactOptionalPropertyTypes` (não passar `undefined` explícito) | ✓ spread condicional `...(x !== undefined ? {..} : {})` na borda, use-case e domínio |
| Semântica `null` apaga / `undefined` preserva | ✓ `adjust` e `editMetadata` usam `!== undefined ? : ` (não `??`) — apaga corretamente (CA6.2) |
| Domínio puro (sem infra) | ✓ `document.ts`/`projection.ts` sem import de adapter |
| Auditoria de timeline (CA6.5) | ✓ `documentSnapshot` ganha `paymentDetail` → diff before/after derivado do agregado |
| Reuso de validação (255/control chars) | ✓ `paymentDetailInput` já existente, idêntico ao create |
| Idioma (código EN, comentário PT só p/ não-óbvio) | ✓ comentários explicam semântica null/exactOptional |
| Migration | ✓ não-necessária (coluna `payment_detail` já existe — 0026) |

## Observação (não-bloqueante)

No `adjust` (caminho completo) `description` segue `c.description ?? d.description` (não apaga com `null`), enquanto `paymentDetail` usa `!== undefined` (apaga). Inconsistência **intencional e documentada** — `paymentDetail` ficou correto; o limite do `description` no caminho completo é pré-existente. Eventual correção do `description` seria escopo de outro ticket (issue-report), não deste.

## Conclusão

Sem blockers. Aprovado para W3.
