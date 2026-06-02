# W3 — QUALITY — PARTNERS-CONTRACTOR-READ-PORT

**Skill:** ts-quality-checker. **Resultado: ALL GREEN.**

## Gates (saída literal)
GATE 1 — typecheck (tsc --noEmit): 0 erros.
GATE 2 — format:check (prettier --check .): "All matched files use Prettier code style!"
GATE 3 — lint (eslint .): 0 erros / 0 warnings.
GATE 4 — pnpm test:
  ℹ tests 1945 / suites 628 / pass 1929 / fail 0 / skipped 16

## Integração partners (gate não-órfão + skip sem Docker)
- Teste novo `partners-read-port.integration.test.ts` ADICIONADO ao script `test:integration:partners`
  (package.json) — não fica órfão.
- Rodado isolado SEM MYSQL_INTEGRATION (sem Docker): tests 1 / pass 1 / fail 0 — carrega sem
  ERR_MODULE_NOT_FOUND e é no-op (guard `if (integrationEnabled())`). Skip limpo confirmado.

## Critérios de aceite
- CA1 (View com bank/PIX + updatedAt; inexistente→ok(null)) — coberto (unit + integração).
- CA2 (só leitura) — adapter só db.select(); applyMigrations:false; audit W2 sem .insert/.update/.delete.
- CA3 (erro infra → Result err tipado) — try/catch → err('contractor-read-unavailable').
- CA4 (consumível só via public-api; nada par_* cru) — index.ts re-exporta; devolve *View (projeção).
- CA5 (integração gated provando round-trip) — partners-read-port.integration.test.ts (MYSQL_INTEGRATION=1).

## Estado: ticket pronto para close. NÃO commitado (instrução do dono).
