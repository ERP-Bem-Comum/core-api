# W3 — QUALITY — CTR-DOMAIN-INVARIANT-CONTEXTUAL

> **Status:** ALL GREEN (round 1)
> **Skill:** [`ts-quality-checker`](../../../skills/ts-quality-checker/SKILL.md)
> **Data:** 2026-05-20
> **Modo de execução:** sub-agent `contratos-orchestrator` rodou os 4 gates e devolveu saída literal. Main session escreveu este REPORT e fechou o STATE (padrão Opção B — fallback admin).

---

## Sumário executivo

| # | Gate | Comando | Status | Detalhes |
| :- | :--- | :--- | :---: | :--- |
| 1 | Type check | `pnpm run typecheck` | OK | Exit 0 — zero erros de tipo |
| 2 | Format check | `pnpm run format:check` | WARN | Exit 1 — apenas `README.md` pré-existente (allowlisted, CA9) |
| 3 | Testes | `pnpm test` | OK | Exit 0 — 639 total, 626 pass, 0 fail, 13 skipped |
| 4 | Lint | `pnpm run lint` | OK | Exit 0 — zero erros ESLint |

---

## Gate 1 — `pnpm run typecheck`

```
> core-api@0.1.0 typecheck
> tsc --noEmit
```

**Exit 0** — zero erros de tipo. OK

---

## Gate 2 — `pnpm run format:check`

```
> core-api@0.1.0 format:check
> prettier --check .

Checking formatting...
[warn] README.md
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
 ELIFECYCLE  Command failed with exit code 1.
```

**Exit 1** — `README.md` é warning pré-existente fora do escopo deste ticket. Nao bloqueia. WARN aceitável per CA9.

---

## Gate 3 — `pnpm test`

```
> core-api@0.1.0 test
> node --test --experimental-strip-types --no-warnings 'tests/**/*.test.ts'

[... 639 testes executados ...]

i tests 639
i suites 214
i pass 626
i fail 0
i cancelled 0
i skipped 13
i todo 0
i duration_ms 45779.439583
```

**Exit 0** — 626 testes passam, 0 fails, 13 skipped intencionais. OK

---

## Gate 4 — `pnpm run lint`

```
> core-api@0.1.0 lint
> eslint .
```

**Exit 0** — zero erros de lint. OK

---

## Cobertura dos 9 CAs

| CA | Descricao | Status | Evidencia |
| :--- | :--- | :---: | :--- |
| CA1 | NonZeroMoney VO brandado em domain/shared/ | OK | non-zero-money.ts existe; exporta tipo + NonZeroMoneyError + from() |
| CA2 | from() retorna Result<NonZeroMoney, 'money-must-be-non-zero'> | OK | Smart constructor coberto em non-zero-money.test.ts |
| CA3 | AmendmentVariant exige NonZeroMoney; @ts-expect-error verde | OK | types.ts atualizado; amendment.test.ts com @ts-expect-error — compile-time estatico |
| CA4 | Runtime check cents===0 removido do dominio | OK | validateVariantInput sem if (input.impactValue.cents === 0) — zero hits no grep |
| CA5 | Polimorfismo Money / NonZeroMoney (widening automatico, reverso bloqueado) | OK | non-zero-money.test.ts:84-148; @ts-expect-error confirma rejeicao reversa |
| CA6 | Use case refina via NonZeroMoney.from na borda (rota gamma) | OK | create-amendment.ts chama NonZeroMoney.from; erro mapeado para amendmentImpactValueZero |
| CA7 | Mapper rehidrata + shape impossivel Addition+0 tagged | OK | amendment.mapper.ts:variantFromRow; amendment.mapper.test.ts cobre row corrompida |
| CA8 | Cobertura 639 (>=630) + 5 novos testes | OK | 639 total (+5 liquidos desde baseline 634 per STATE.md); 0 fail |
| CA9 | typecheck OK lint OK test OK format WARN README.md pre-existente (aceitavel) | OK | Todos os 4 gates rodados neste REPORT |

---

## Metricas finais

| Metrica | Valor |
| :--- | :--- |
| Testes totais | 639 |
| Pass | 626 |
| Fail | 0 |
| Skipped | 13 (intencionais) |
| Suites | 214 |
| tsc --noEmit | 0 erros |
| eslint . | 0 erros |
| prettier --check | 1 warning (README.md pre-existente, nao bloqueia) |
| Rounds W3 | 1 |
| Rounds totais (W0+W1+W2+W3) | 4 (1 por wave) |
| Duracao pnpm test | ~46s |

---

## Conclusao

**Ticket pronto para CLOSE.** NonZeroMoney brandado com Money & { readonly __nonZeroMoney: true } (workaround correto para nested branding — Brand<Money,K> resolve para never, documentado no REVIEW.md W2) esta em producao. AmendmentVariant exige NonZeroMoney em Addition/Suppression — invariante agora estatica (compile-time). Runtime check cents===0 removido do dominio. Use case refina na borda (rota gamma). Mapper rehidrata com NonZeroMoney e rejeita shapes impossiveis com amendment-mapper-impossible-shape. Compatibilidade de erro amendmentImpactValueZero preservada para callers externos.

### Progresso do Bloco D (Invariantes em Tipos)

| Ticket | Estado | Cobertura |
| :--- | :--- | :--- |
| CTR-DOMAIN-STATE-MACHINE-CONTRACT | CLOSED ALL GREEN | 3 estados refinados (Active/Expired/Terminated) |
| CTR-DOMAIN-STATE-MACHINE-AMENDMENT | CLOSED ALL GREEN | 3 estados refinados x 4 kinds aninhados |
| CTR-DOMAIN-INVARIANT-CONTEXTUAL | CLOSED ALL GREEN | NonZeroMoney rota alpha + rota gamma no use case |

**Proximos tickets candidatos:**
- CTR-SKILL-REFRESH-D — atualizar .claude/skills/ts-domain-modeler/SKILL.md §3.D com Padrao D consolidado (rotas alpha + beta + gamma).
- CTR-DOMAIN-MAPPER-RESULT — mappers retornam Result em vez de cast (Bloco A).
- CTR-DOMAIN-RESTRUCTURE — promove Money/NonZeroMoney para src/shared/kernel/.
