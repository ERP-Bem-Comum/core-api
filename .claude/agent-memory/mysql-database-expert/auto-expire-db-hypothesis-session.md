---
name: auto-expire-db-hypothesis-session
description: Análise de hipóteses de alternativas no banco para o auto-expire de contratos — veredito: MySQL EVENT viola ADR-0020; UPDATE direto perde outbox; status colunar/read-model é legítimo
metadata:
  type: project
---

Contexto: CTR-AUTO-EXPIRE implementou expiração via sweeper.ts (TS puro) + outbox. A questão era se MySQL Event Scheduler / UPDATE direto / projeção/read-model seria mais simples.

Veredito das hipóteses:
1. MySQL EVENT (CREATE EVENT ... DO UPDATE) — DESCARTADA: viola ADR-0020:103 diretamente.
2. UPDATE direto de aplicação sem domínio — DESCARTADA: duplica regra D+1, perde ContractEnded no outbox, perde type safety.
3. Status como coluna derivada (VIRTUAL GENERATED) — DESCARTADA para status mutável: generated column é read-only, não pode ser alvo de UPDATE.
4. Read-model de "contratos vencidos hoje" separado da mutation — NEUTRA: já existe (ctr_contracts_expirable_idx); o sweeper usa findExpirable como query especializada, que é equivalente.

**Why:** Sessão de estudo pré-lançamento, zero usuários, Gabriel sentindo que havia anti-pattern no auto-expire.

**How to apply:** Se reabrir essa discussão, a resposta é: a estrutura TS+outbox é a correta para este projeto. O único ajuste legítimo no banco seria uma view/generated column para facilitar relatórios de "quantos expiram hoje", mas não substitui a mutation.
