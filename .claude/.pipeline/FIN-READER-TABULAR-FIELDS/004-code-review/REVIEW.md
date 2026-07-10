# W2 — Code Review (audit read-only) · FIN-READER-TABULAR-FIELDS (#396)

**Agente:** `security-backend-expert` · **Rounds:** 2 · **Veredito final:** **APPROVED**

## Round 1 — REJECTED (2 Altos + 1 Médio, reproduzidos empiricamente)
- **F1 (Alto, CWE-400/834):** `unpdf`/pdf.js **sem timeout** → CPU-DoS single-instance. O reader in-house
  tem guards O(n) (F1–F5); o parser externo não os expõe.
- **F2 (Alto, CWE-20):** `/Prestador:\s*(.+)/` **sem terminador**. O `unpdf` colapsa `\n` (que o
  `native-text` preservava) → `(.+)` engole o documento inteiro → contamina `legalName` → **estoura**
  `description varchar(500)`. Reproduzido ao vivo.
- **F3 (Médio, ADR-0011 §5):** `unpdf` sem pin (`^1.6.2`).
- **Descartados** (verificados): exceção não vaza (try/catch cobre async); sem SSRF; `isEvalSupported:false`;
  regexes de valor novos sem ReDoS e conservadores (#62); LGPD (sem log de texto); sem postinstall.

## Round 2 — APPROVED (fixes verificados independentemente pelo revisor)
- **F1:** `Promise.race` + `setTimeout(reject).unref()` (defesa em profundidade); hang síncrono de CPU →
  `worker_threads.terminate()` documentado como risco residual → follow-up.
- **F2:** `/Prestador:\s*([^:\n]+)/` → `legalName` 110→24 chars (reproduzido); teste de regressão `#396/F2`.
- **F3:** pin `"unpdf": "1.6.2"`.
- **Gate rodado do zero:** typecheck/format/lint limpo; **3773 pass / 0 fail**.

## Follow-up (não-bloqueante → issue)
- `worker_threads.terminate()` para hang síncrono de CPU (F1 residual).
- Merge por-campo na cascata (hoje o fallback substitui o resultado do nativo inteiro).
- Precisão do `legalName` (lookahead para o próximo rótulo — resíduo cosmético `"...CNPJ"`).
