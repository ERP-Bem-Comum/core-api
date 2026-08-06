---
name: project-par-collab-foodcat-length
description: Ticket PAR-COLLAB-FOODCAT-LENGTH (issue #274) — bug food_category varchar(20) vs 21-char domain value
metadata:
  type: project
---

Ticket PAR-COLLAB-FOODCAT-LENGTH (issue #274, módulo partners): coluna `par_collaborators.food_category` é `varchar(20)` mas `FoodCategory.PREFIRO_NAO_RESPONDER` tem 21 chars → ER_DATA_TOO_LONG (errno 1406) ao persistir.

**Why:** colunas irmãs (gender_identity/race/education) já são varchar(30); só food_category ficou em 20 por omissão na migration 0002_young_cerise.sql.

**How to apply:** W0 (RED) entregue — test em `tests/modules/partners/adapters/persistence/collaborator-food-category-length.drizzle-mysql.test.ts`. W1 = ALTER TABLE par_collaborators MODIFY food_category varchar(30) ALGORITHM=INPLACE, LOCK=NONE (prod-safe: widening ≤255 bytes, MySQL Refman 8.4 p.3141).

State: W0 done (RED). Próximo: W1 (alterar schema `schemas/mysql.ts` foodCategory length 20→30 + `pnpm db:generate` + editar SQL manualmente para ALGORITHM=INPLACE, LOCK=NONE).
