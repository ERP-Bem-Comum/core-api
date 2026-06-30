# 000 — Request CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> Folha sem dependências. Bloco C da entrevista 0001 (DON'T §29 — "default: throw new Error no exhaustive switch viola zero throw do CLAUDE.md raiz").
> **Teste do protocolo Opção A** — delegação W0→W3 ao `contratos-orchestrator` num único turno.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco C** (Discriminated Unions & Exhaustive Switch) — fechado em 2026-05-19.
- **Decisão aplicável** (linha 884 do master doc — DO C§32):
  > Exhaustive switch: **omitir `default`** (preferível) ou `default: { const _: never = x; return _; }`. Nunca `throw`.
- **Antipadrão** (DON'T C§29, linha 922):
  > `default: throw new Error(...)` no exhaustive switch — viola "zero throw" do CLAUDE.md raiz. **Contradição admitida do PhD** (usou no template após cobrança).
- **Tabela canônica de tickets** (linha 970 do master doc):
  > `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX` — Bloco C — Remove `throw new Error(...)` de todo `default` exhaustive no domínio (correção da SKILL contra CLAUDE.md raiz). **— (folha)**.
- **Precedente:** [`CTR-DB-MAPPER-NO-THROW`](../CTR-DB-MAPPER-NO-THROW/STATE.md) — mesmo padrão de fix aplicado a 4 trechos de mapper Drizzle em 2026-05-18. APPROVED round 1.

---

## Estado atual (snapshot 2026-05-20)

`grep -rn "throw new Error" src/modules/contracts/` retorna 6 hits. Filtrando pelos **`default:` exhaustive** (escopo deste ticket):

| Arquivo | Linha | Função | Tipo de retorno |
| :--- | :--- | :--- | :--- |
| `src/modules/contracts/cli/formatters/period.ts` | 12 | `formatPeriod(p: Period): string` | `string` — `never ⊑ string` ✅ |
| `src/modules/contracts/application/use-cases/homologate-amendment.ts` | 72 | `toContractAdjustment(amendment): ContractAdjustment` | `ContractAdjustment` — `never ⊑ ContractAdjustment` ✅ |

**Fora de escopo** (não são `default:` exhaustive — são tratamento de `Result` dentro de transação Drizzle, padrão `throw-and-catch` permitido em adapter):

- `adapters/persistence/repos/contract-repository.drizzle.ts:135,142,180`
- `adapters/persistence/repos/amendment-repository.drizzle.ts:44`

Esses 4 throws ficam para um **ticket separado futuro** (provavelmente `CTR-DB-REPO-RESULT-IN-TX` — refactor mais profundo do uso de Result dentro de transações Drizzle, não trivial).

---

## Estado-alvo

Em ambos os sítios em escopo, padrão canônico de fix (precedente: `CTR-DB-MAPPER-NO-THROW`):

```ts
// ANTES
default: {
  const _exhaustive: never = x;
  throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
}

// DEPOIS
default: {
  const _exhaustive: never = x;
  return _exhaustive;
}
```

Justificativa do `return _exhaustive`:
- TS sabe que `_exhaustive: never` é unreachable em runtime — o tipo `never` não é habitável, então a expressão nunca executa.
- `never` é subtipo de qualquer tipo (`never ⊑ T` para todo T) — return type-safe em qualquer função.
- Compilador trava o `default` se algum case do union for adicionado e não tratado (graças a `noFallthroughCasesInSwitch` + ESLint `switch-exhaustiveness-check`).

Verificação após W1: `grep -rn "throw new Error" src/modules/contracts/` deve retornar **4 hits** (os 4 throws de adapter Drizzle), zero hits em sítios `default:` exhaustive.

---

## Escopo

### Em escopo

- Reescrever os 2 `default:` em `period.ts:10-13` e `homologate-amendment.ts:70-73`.
- W0: criar `tests/regression/no-throw-in-exhaustive-default.test.ts` — regression guard estrutural que escaneia `src/modules/contracts/**/*.ts` e falha se algum `default: { const _: never ...; throw ...; }` for encontrado.
- Atualizar STATE.md a cada wave.

### Fora de escopo

- Os 4 throws em adapters Drizzle — ticket separado (`CTR-DB-REPO-RESULT-IN-TX`).
- Mudança de retorno (`return` vs omissão do `default`) — `return _exhaustive` é o padrão estabelecido no precedente `CTR-DB-MAPPER-NO-THROW`; ambas formas são DO C§32, esta é a mais conservadora.
- Refresh do SKILL.md (vai com `CTR-SKILL-REFRESH-C` na última fase).

---

## Critérios de aceitação

| # | Critério | Wave |
| :--- | :--- | :--- |
| CA-1 | `tests/regression/no-throw-in-exhaustive-default.test.ts` existe e **falha** antes do W1 (encontra 2 hits) | W0 |
| CA-2 | Após W1, mesmo teste passa (0 hits em sítios `default:` exhaustive) | W1 |
| CA-3 | `period.ts:10-13` aplica o padrão canônico `return _exhaustive` | W1 |
| CA-4 | `homologate-amendment.ts:70-73` aplica o padrão canônico `return _exhaustive` | W1 |
| CA-5 | Zero novos `throw` introduzidos no diff | W2 |
| CA-6 | Zero novos `class`, `any`, `as` introduzidos | W2 |
| CA-7 | `pnpm run typecheck` verde | W3 |
| CA-8 | `pnpm run format:check` verde nos arquivos do diff (CLAUDE.md/README.md pré-existentes documentados) | W3 |
| CA-9 | `pnpm test` verde — 488 ou mais tests | W3 |
| CA-10 | `pnpm run lint` verde nos arquivos do diff (bonus) | W3 |

---

## Skills obrigatórias

| Wave | Skill | Razão |
| :--- | :--- | :--- |
| W0 — RED | [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) | Regression guard estrutural via grep+filesystem scan |
| W1 — GREEN | [`clean-code-reviewer`](../../skills/clean-code-reviewer/SKILL.md) ou [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Aplicar padrão canônico do precedente CTR-DB-MAPPER-NO-THROW |
| W2 — REVIEW | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | Audit read-only contra CLAUDE.md raiz + Bloco C entrevista 0001 |
| W3 — QUALITY | [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) | typecheck + format + test + lint |
| Todas | [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) | Orquestrar W0→W3 sequencialmente |

---

## Arquivos previstos

| Arquivo | Ação | Wave |
| :--- | :--- | :--- |
| `tests/regression/no-throw-in-exhaustive-default.test.ts` | **Criar** | W0 |
| `src/modules/contracts/cli/formatters/period.ts` | **Editar** linhas 10-13 (1 linha alterada) | W1 |
| `src/modules/contracts/application/use-cases/homologate-amendment.ts` | **Editar** linhas 70-73 (1 linha alterada) | W1 |
| `.claude/.pipeline/CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX/00*/REPORT.md` (4 arquivos) | **Criar** | W0..W3 |
| `.claude/.pipeline/CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX/STATE.md` | **Atualizar** ao fim de cada wave | W0..W3 |

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
| :--- | :--- | :--- |
| `JSON.stringify(_exhaustive)` antes fazia logging útil em runtime | Baixa — `never` é unreachable | O log nunca foi atingido (TS prova). Se atingido, era bug do compilador. |
| Alterar `formatPeriod` quebrar CLI E2E | Baixa | W3 roda `pnpm test` completo incluindo `tests/cli/contracts.cli.test.ts` |
| `return _exhaustive` deixar o linter reclamar | Baixa | Precedente verde em `CTR-DB-MAPPER-NO-THROW` |

---

## Protocolo de teste — Opção A (foco deste ticket)

Este ticket é o **primeiro teste do protocolo Opção A**: invocação do `contratos-orchestrator` com instrução de executar **W0→W3 sem ceder controle** ao caller entre waves.

Sucesso da Opção A é definido por:
- Agent escreve os 4 REPORTs (W0/W1/W2/W3) num único turno.
- Atualiza STATE.md ao final marcando tudo `✅ completed`.
- **Não devolve `agentId` esperando continuação.**
- Sumário final em texto livre, conciso (5-8 bullets).

Falha da Opção A:
- Agent volta ao caller após W0 ou W1 esperando confirmação (regressão pro comportamento de CTR-SHARED-RESULT-COMBINATORS).
- → Plano B: Claude principal assume continuação manualmente (como no ticket anterior).

---

## Próximos tickets habilitados

Folha sem dependências — não habilita nenhum ticket específico. Mas, junto com `CTR-SHARED-RESULT-COMBINATORS` (fechado), forma a base "domain limpo" antes dos tickets pesados:

- `CTR-DOMAIN-COMPOSE-REFACTOR` (depende de `CTR-SHARED-RESULT-COMBINATORS` ✅)
- `CTR-SHARED-IMMUTABLE` + `CTR-SHARED-BRAND-UNIQUE-SYMBOL` (paralelos — top-3 #2)
- `CTR-DOMAIN-DEBRAND-AGG` (paralelo — destrava top-3 #1)

---

## Autor / data

- **Autor:** Claude (delegação via `contratos-orchestrator`, teste do protocolo Opção A).
- **Aberto em:** 2026-05-20.
