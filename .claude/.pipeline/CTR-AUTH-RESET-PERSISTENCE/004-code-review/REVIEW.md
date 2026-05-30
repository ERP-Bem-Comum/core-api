# W2 — Code Review

**Resultado: APPROVED**

- Port + adapters espelham fielmente o `RefreshToken` (token opaco persistido): mesmo safe-wrapper, mapper com tagged errors, SELECT FOR UPDATE → UPDATE/INSERT. ✓
- Schema aderente a ADR-0018/0020: varchar(36) UUID, char(64) hash, datetime(3), sem JSON/ENUM, FK RESTRICT, UNIQUE token_hash, índice composto (user_id, used_at) servindo `findUnusedByUserId`. ✓
- Migration com hardening manual (COLLATE utf8mb4_bin + ENGINE/CHARSET) consistente com a 0000 — comparação binária exata de id/hash. ✓
- `findUnusedByUserId` usa critério armazenável (`used_at IS NULL`); a expiração (temporal) fica no domínio (`consume`), repo sem Clock. ✓
- **Pendência registrada:** integração MySQL não exercida (porta 3306). O repo Drizzle não roda nesta sessão; cobertura via InMemory + paridade estrutural com o refresh.
