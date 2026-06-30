# W2 — Code Review

**Resultado: APPROVED**

- Parametrização de porta nos testes é melhoria legítima (não hardcodar 3306) e mantém o default — não muda o comportamento do `test:integration:auth` padrão. ✓
- Teste novo gated por `MYSQL_INTEGRATION=1` → inerte no `pnpm test` (não exige Docker). ✓
- Setup respeita FK (user semeado antes; truncate em ordem filhas→pai). ✓
- Container alheio (`bemcomum-mysql`) preservado; conflito resolvido via porta isolada (3307), não derrubando serviço de terceiros. ✓
