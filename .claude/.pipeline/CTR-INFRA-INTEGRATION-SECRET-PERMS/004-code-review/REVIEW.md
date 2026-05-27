# W2 — Code Review (read-only)

**Agente:** code-reviewer
**Round:** 1
**Veredito:** **APPROVED** ✅

## Escopo revisado

- `package.json:30` — `test:integration`: `chmod 600` → `chmod 644` (única mudança de produção).
- `tests/infra/integration-script-secret-perms.test.ts` — novo (3 testes).

## Checklist

| Critério | Status | Nota |
| --- | :---: | --- |
| Mudança mínima (YAGNI) | ✅ | 1 token (`600`→`644`); nenhuma extração especulativa |
| Idioma: comentários PT, identificadores EN | ✅ | docstring/comentários PT; `readScripts`, `CHMOD_600_SECRETS` EN |
| Imports com extensão `.ts` | ✅ | n/a — só `node:*` builtins |
| `import type` p/ tipos | ✅ | n/a — `PackageJson`/interfaces locais; valores são funções runtime |
| Convenções `tests/` (testing.md) | ✅ | `tests/**/*.test.ts`, runner nativo, sem rede/docker |
| `noUncheckedIndexedAccess` | ✅ | `scripts['test:integration']` é `string\|undefined`; `assert.ok(script)` (`asserts value`) estreita antes do uso |
| Não toca `src/` | ✅ | só `package.json` + teste |
| Não cruza módulos / ADR-0014 | ✅ | infra de tooling; sem `ctr_*`/`fin_*` |
| Determinismo do teste | ✅ | lê `package.json` do disco; sem flakiness, sem Docker |
| Segurança (ADR-0011) | ✅ | `0644` = `rw-r--r--`, sem world/group-write; secrets não commitados (efêmeros no script) |

## Observações (não-bloqueantes)

1. **CA-1b acopla à solução `chmod 644` inline.** Se um refactor futuro delegar a criação de
   secrets a `secrets:setup`, CA-1b passa a falhar (não haveria `chmod 644` literal no script).
   É aceitável: reflete fielmente a decisão de design do W1 (mínimo inline). Caso a delegação
   venha, o teste deve evoluir junto — registrar no ticket que a fizer.

2. **Prova funcional delegada.** O teste é estático por escolha de design (W0 REPORT §"Decisão").
   A prova de que `0644` cria `readonly_bi` e boota healthy vive em `mysql-compose.test.ts`
   (CA-3/CA-5/CA-6). O W3 deve rodar `pnpm run test:integration` para fechar CA-5 do request
   (boot healthy de primeira pelo caminho real do script corrigido).

## Conclusão

Mudança correta, mínima e bem-testada para a regressão visada. Sem issues bloqueantes.
Liberado para W3.
