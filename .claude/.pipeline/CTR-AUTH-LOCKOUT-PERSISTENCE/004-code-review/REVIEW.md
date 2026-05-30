# W2 — Code Review

**Resultado: APPROVED**

- Espelha fielmente o reset-persistence/refresh (mapper tagged errors, safe-wrapper, SELECT FOR UPDATE → UPDATE/INSERT). ✓
- Schema aderente a ADR-0018/0020: PK user_id (1 lockout/conta), int contador, datetime(3), FK RESTRICT, CHECK attempts ≥ 0; sem JSON/ENUM. ✓
- Lockout agora **persiste** no driver mysql (sobrevive a restart) — resolve metade da limitação do BE-REC-001 (a outra metade, compartilhar entre instâncias, ainda pede Redis OU é coberta pela persistência MySQL compartilhada). ✓
- Composition: store por driver via `Stores` (consistente com os demais repos). ✓
- **Pendência:** integração MySQL não exercida (porta 3306). Mapper coberto por teste; repo espelha os validados.
