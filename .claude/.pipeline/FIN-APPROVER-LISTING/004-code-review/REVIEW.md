# W2 APPROVED

Skill: code-reviewer. Plugin separado = aditivo (zero ripple aos 10 callers do usersHttpPlugin). Projeção lean (não vaza status/roles/hash). RBAC user:list. ADR-0014 (só lê auth_*) / ADR-0020 (SELECT/JOIN/DISTINCT). Join drizzle coberto-por-design (espelha a resolução de permissão do authorize, mesmas tabelas) + semântica do filtro validada e2e pelo HTTP test (adapter in-memory com roles reais via buildAuthHttpDeps seed). Teste de join em MySQL = follow-up pequeno (exige seed de role/permission no fixture). APPROVED.
