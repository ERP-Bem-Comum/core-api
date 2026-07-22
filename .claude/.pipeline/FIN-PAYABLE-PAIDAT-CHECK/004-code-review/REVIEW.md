# W2 — Code Review (audit read-only) · FIN-PAYABLE-PAIDAT-CHECK (#383)

**Agente:** `drizzle-orm-expert` · **Rounds:** 2 · **Veredito final:** **APPROVED**

## Round 1 — REJECTED (gate/processo, não defeito de código) → corrigido
- **Blocker (format):** `meta/_journal.json` + `0033_snapshot.json` falhavam `format:check` (arquivos
  gerados pelo drizzle-kit não passam pelo hook `prettier-write`). → **Corrigido:** migration regenerada
  limpa (`0033_ambiguous_xavin.sql`) + `pnpm run format`; `format:check` verde.
- **Major (pipeline):** waves não registradas. → **Corrigido:** W0/W1/W2 registrados + REPORTs.

## Conteúdo técnico — APPROVED
- **Semântica:** `status <> 'Paid' OR paid_at IS NOT NULL` cobre exatamente os 3 CAs. `status` é
  `NOT NULL` (`schemas/mysql.ts:247`) → sem edge de `status` NULL neutralizando o CHECK.
- **ADR-0020:** CHECK é feature permitida — citação literal
  `handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md:87` ("CHECK constraints simples").
  Precedente cross-column na mesma tabela (`fin_payables_child_retention_chk`).
- **Compat MySQL 8.4:** `ALTER TABLE ADD CONSTRAINT CHECK` sem `ALGORITHM` hint (mesmo padrão de `0024`).
- **Teste:** 3 casos; errno 3819 (ER_CHECK_CONSTRAINT_VIOLATED) correto para MySQL 8.x. Gate/sufixo padrão.
- **Naming:** `fin_payables_paid_at_chk` segue `<tabela>_<descricao>_chk`.

## Nota de deploy
Pré-voo `SELECT ... WHERE status='Paid' AND paid_at IS NULL` antes de aplicar `0033` (registrada em
`000-request.md`). Nenhum caminho de escrita atual produz a inconsistência (verificado).

## Disclosure — recuperação de integridade
No round 1 o sub-agente violou o mandato read-only (`prettier --write` + `git checkout` que descartou a
entrada legítima do journal). **Recuperação:** artefatos drizzle regenerados do zero (migration +
snapshot + journal consistentes a partir do schema), garantindo integridade — não se herdou o estado acidental.
