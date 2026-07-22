# Code Review — FIN-DOCREPO-TEST-PAIDAT-CHECK — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-13
**Escopo revisado (read-only):** `tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts` (3 pontos)

---

## Issues

### 🔴 Crítica / 🟡 Importante
Nenhuma.

### 🔵 Sugestão
Nenhuma.

---

## O que está bom

- **Corrige a causa, não mascara.** O defeito era o raw-SQL não gravar `paid_at` ao promover `Paid`; o fix
  grava `paid_at='2026-07-01'` — valor real e coerente (= `due_date` do cenário), não um `skip` nem um
  valor absurdo (satisfaz CA3).
- **CHECK respeitado em todos os pontos.** Os 3 `status='Paid'` (2 UPDATE + 1 INSERT) agora têm `paid_at`.
- **`Reconciled` intocado — correto.** `fin_payables_paid_at_chk` = `(status<>'Paid') OR (paid_at IS NOT NULL)`
  só exige `paid_at` para `Paid`; mexer nos UPDATE de `Reconciled` seria ruído.
- **Semântica do teste preservada.** As asserções derivam o grid de `Paid`/`Reconciled` (`byId.get(...)`,
  `total`); `paid_at` não participa dessas asserções — o fix só satisfaz a constraint sem alterar o que é testado.
- **Determinístico.** Data literal fixa (não `NOW()`), reprodutível.
- **Comentário justificado.** Documenta a invariante não-óbvia (CHECK `fin_payables_paid_at_chk`, #231/#232) —
  padrão do projeto (comentar só o "porquê" oculto).
- **Zero produção.** Só o arquivo de teste; `src/` intocado (produção já grava `paidAt` via `payPayableManually`).

---

## Próximo passo

- **APPROVED** → W3: `document-repository.drizzle-mysql` 20/20 @ x99 (já verde no W1) + gate Mac.
