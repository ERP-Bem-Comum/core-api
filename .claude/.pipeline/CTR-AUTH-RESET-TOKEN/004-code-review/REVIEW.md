# W2 — Code Review

**Resultado: APPROVED**

- Espelha fielmente o padrão `RefreshToken` (estado computado pelo relógio, `at: Date` injetado, imutável). ✓
- One-time correto: `consume` só no estado `pending`; segundo uso → `reset-token-used` (garante invalidação após uso). ✓
- TTL respeitado: `expired` tem precedência sobre `pending`; `consume` após TTL → `reset-token-expired`. ✓
- `tokenHash` opaco non-empty; domínio não gera entropia nem hash (fica no adapter, DD-LOGIN-02). ✓
- Sem `throw`, sem `class`; switch exaustivo sobre o estado. ✓
