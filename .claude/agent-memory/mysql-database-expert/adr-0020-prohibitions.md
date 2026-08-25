---
name: adr-0020-prohibitions
description: ADR-0020 linha 103 proíbe stored procedures, triggers e eventos agendados MySQL — lógica de negócio vive no TS; qualquer desvio exige novo ADR
metadata:
  type: project
---

ADR-0020:103 é explícito: "Stored procedures / triggers / eventos agendados — Lógica de negócio vive no código TS, não no SGBD (regra invariante do CLAUDE.md). Stored proc é 'mágica invisível, impossível de testar' — anti-padrão da skill database-engineer §10."

**Why:** A regra não é de paridade de dialeto (ADR-0018 era assim). É uma posição arquitetural sobre onde a lógica vive — no domínio TS, não no SGBD. Isso torna qualquer `CREATE EVENT` MySQL uma violação ADR imediata.

**How to apply:** Ao avaliar hipóteses de "fazer no banco" (UPDATE direto, MySQL Event), o ponto de partida é que qualquer lógica de negócio embutida no SGBD viola ADR-0020 e exige novo ADR para ser considerada. Hipóteses devem ser apresentadas como "tecnicamente possível mas ADR-bloqueado" antes de detalhar prós/contras.
