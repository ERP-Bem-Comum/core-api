# W1 — GREEN — CTR-DOMAIN-MAPPER-RESULT

> **Status:** ✅ completed (round 1)
> **Skill:** ts-domain-modeler
> **Data:** 2026-05-21
> **Modo de execução:** sub-agent (17 tool uses, interrompido por Bug #47936 após anunciar "Agora atualizo o period.mapper.ts"). Hook SubagentStop detectou (report_missing: YES). Main session inspecionou estado, corrigiu erros TS em consumidores (`*-repository.drizzle.ts`) e escreveu REPORT.

---

## Arquivos modificados

### `src/`

```
src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts    # 6 tagged variants + 6 constructors; contractFromRow usa case constructors
src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts   # 9 tagged variants + constructors; amendmentFromRow + variantFromRow usam case constructors
src/modules/contracts/adapters/persistence/mappers/period.mapper.ts      # PeriodMapperFixedMissingEnd tagged + constructor; PeriodMapperError = PeriodError | Tagged (heterogêneo)
src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts:45  # throw new Error(r.error.tag) — error agora é tagged
src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts:38   # buildContract log usa r.error.tag (ContractMapperError tagged)
```

### `tests/` (já feitos em W0)

```
tests/modules/contracts/adapters/persistence/contract.mapper.test.ts   # 3 ajustes + 2 testes novos com payload assertions
tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts  # 7 ajustes + 2 testes novos
```

---

## Decisões técnicas

### D1 — Padrão D aplicado em 3 mappers

`ContractMapperError` (6 variants) + `AmendmentMapperError` (9 variants) + `PeriodMapperError` (ganhou 1 tagged variant) seguem o mesmo padrão de `errors.ts` do domain — case constructors free functions exportadas + tagged records `Readonly<{ tag, ...payload? }>`.

### D2 — `PeriodMapperError` heterogêneo

`PeriodMapperError = PeriodError | PeriodMapperFixedMissingEnd` — `PeriodError` é string literal (do VO, Bloco B), `PeriodMapperFixedMissingEnd` é tagged. Pragmatismo: migrar `PeriodError` em massa é escopo de outro ticket (ofenderia o VO).

### D3 — Fallback admin para fechar wave

Sub-agent foi interrompido (17 tool uses). Mapper de `period.ts` já estava completo no estado do filesystem (confirmado por grep). Main session apenas:
1. Corrigiu `amendment-repository.drizzle.ts:45` — `throw new Error(r.error)` → `r.error.tag` (erro agora é tagged record).
2. Corrigiu `contract-repository.drizzle.ts:38` — `${r.error}` no log → `${r.error.tag}`.
3. Linha 181 do contract-repository não precisa mudar — `r.error` ali é `ContractRepositoryError` (string literal), não `ContractMapperError`.

---

## Saída literal dos gates

### `pnpm test`
```
ℹ tests 643
ℹ suites 216
ℹ pass 630
ℹ fail 0
ℹ cancelled 0
ℹ skipped 13
ℹ duration_ms 47057.632375
```
✅ **0 fails** — os 14 testes RED do W0 viraram verdes.

### `pnpm run typecheck`
Exit 0. ✅

### `pnpm run lint`
Exit 0. ✅

---

## Cobertura dos 7 CAs

| CA | Status |
| :--- | :---: |
| CA1 — ContractMapperError tagged | ✅ |
| CA2 — AmendmentMapperError tagged | ✅ |
| CA3 — PeriodMapperError ganha 1+ tagged variant | ✅ |
| CA4 — Case constructors em cada mapper | ✅ |
| CA5 — Payload de evidência | ✅ |
| CA6 — Tests existentes atualizados + 1 novo/mapper | ✅ |
| CA7 — Gates verdes | ✅ |

---

## Próximo passo

→ **W2 (REVIEW)** — code-reviewer auditará Padrão D nos 3 mappers + payload semântico + consumidores (repos) lidando com union ContractMapperError + ContractRepositoryError.
