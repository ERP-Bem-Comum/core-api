# W3 — QUALITY (gate final) · PARTNERS-ETL-ORCHESTRATOR

> Skill: `ts-quality-checker`. Gate final sem Docker (slice 3b-ii). A integração 2-DB
> (`orchestrate.integration.test.ts`) roda numa etapa separada depois — nesta wave ela
> deve aparecer **skipped**, não em erro. Ticket **NÃO** fecha aqui (`pipeline:state close`
> fica para depois da prova end-to-end 2-DB).
>
> Ambiente: branch `feat/partners-etl-bootstrap`, Node v24.15.0 (nvm), pnpm 11.5.0, Docker OFF.
> Provas re-verificadas de forma independente pelo orquestrador-main.

## Veredito: ✅ ALL GREEN (4/4 gates)

| Gate | Comando | Resultado | Exit |
| :--- | :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | zero erros | 0 |
| Format | `pnpm run format:check` (`prettier --check .`) | "All matched files use Prettier code style!" | 0 |
| Lint | `pnpm run lint` (`eslint .`) | zero erros/warnings | 0 |
| Test | `pnpm test` (`node --test --experimental-strip-types`) | **tests 1926 / pass 1910 / fail 0 / skipped 16** | 0 |

## Confirmação crítica: integração orchestrate SKIPPED (não erro)

Docker OFF de propósito. A regressão a evitar era o teste de integração falhar com
`ERR_MODULE_NOT_FOUND` em vez de skipar limpo. Linha literal do output (`node:test`):

```
﹣ ORCHESTRATOR integration — legado efêmero → core-api efêmero (2 DBs) (1.337667ms) # PARTNERS_ETL_INTEGRATION!=1
```

- `﹣` é o marker de skipped; razão explícita `# PARTNERS_ETL_INTEGRATION!=1` → skip-guard funcionou.
- `grep -ciE "ERR_MODULE_NOT_FOUND|Cannot find module|MODULE_NOT_FOUND"` no output → **0**.
- `grep -c "✖"` (fail markers) → **0**.
- Era 1923/1907 antes do delta da Obs.2 do W2 (+3 testes novos da fidelidade de `reason`).

## Regressão zero

Nenhum vermelho em nenhum dos 4 gates. O único item não-executado (integração 2-DB) está
corretamente gated por opt-in (`PARTNERS_ETL_INTEGRATION=1` + Docker), não escondido por `skip`
cego — mesmo padrão canônico do READER.

## Integração 2-DB (etapa 2) — PROVADA end-to-end (2026-06-02)

Rodada com Docker (`pnpm run test:integration:etl:orchestrate`, script tornado autocontido):
**`tests 2 / pass 2 / fail 0`** — migração completa do dump sintético + reconciliação balanceada,
e idempotência 2× (`alreadyExists === read`). Containers up/healthy → migra → teardown limpo.

### 2 bugs encontrados pela integração 2-DB e corrigidos (systematic-debugging + 4 especialistas)
A 1ª execução real pegou bugs que os fakes unitários não validam (constraints/obrigatoriedade do MySQL):

1. **CNPJ duplicado na fixture** (`legacy-mini.sql`): 2 suppliers com mesmo CNPJ violavam
   `par_suppliers UNIQUE(cnpj)` → `ER_DUP_ENTRY` → quarentena. Fix: CNPJ distinto válido
   `11222333000181` no supplier 2.
2. **`role=NULL` em collaborator** (exposto pelo hardening `quarantined===0`): domínio exige
   `role: string` (`types.ts:49`), legado permite NULL → quarentena `RequiredFieldMissing/role`.
   Fix: `role='Auxiliar Operacional'` no collaborator 2 da fixture. Caso `role=NULL` segue coberto
   por teste unitário (`collaborator.mapper.test.ts:81`). Decisão **D18** registrada (HANDOFF §11).

### Hardening do teste (nodejs-runtime-expert)
`orchestrate.integration.test.ts` teste 1 agora asserta `quarantined === 0` por entidade —
contrato "fixture 100% migrável" explícito, que pegou o bug #2 (antes mascarado por `isBalanced`).

### Follow-ups (NÃO bloqueiam o 3b-ii)
- **Achado 1** (HANDOFF §11): duplicatas de CNPJ/CPF/email no dump de produção → query pré-go-live.
- **Achado 2** (HANDOFF §11): bug de observabilidade no `partners-etl-store.drizzle.ts`
  (`ER_DUP_ENTRY` em índice secundário vira `-unavailable`; `log()` descarta `.cause`) → ticket
  dedicado no módulo partners.

## Conclusão

W3 ALL-GREEN com a integração 2-DB provada end-to-end. Ticket pronto para `close`.
