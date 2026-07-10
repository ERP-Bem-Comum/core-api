# BGP-OPTIONS-REF-UUID — escopo

> Issue **#394** — `GET /budget-plans/options → 500 (ResponseSerializationError: redes[].ref não é UUID)`. Módulo **`budget-plans`**. Size **S → M** (ampliado no W2).
> **Pivô da release #404**: desbloqueia #319 (Consolidado retorna 0 sem dados de rede) e #401.

> **REORIENTAÇÃO (W2, decisão do Gabriel):** o defeito não é só o `/options` — é o **rótulo trocado** da identidade de Rede em toda a família (domínio `refs.ts` + 4 schemas). Decisão: **identidade de Rede = chave natural (UF/IBGE), não UUID** (catálogo de geografia é estático/imutável; O(1) já garantido por hashMap com chave natural; UUID seria indireção + dado órfão). Escopo real = validar UF/IBGE na borda e no domínio, tornar os testes fiéis (fim do mascaramento por UUID). Ver `003-impl/REPORT.md` e `004-code-review/REVIEW.md` (Round 2).

## Contexto
O response schema strict de `GET /budget-plans/options` declara `redes[].ref` como UUID, mas o valor real serializado não é UUID → `ResponseSerializationError` (500). Mesmo tema da curadoria `.strict` (ticket `FIN-STRICT-RESPONSE-SCHEMAS`/#384), aqui como caso pontual de budget-plans.

## Escopo (in)
1. Diagnosticar a fonte do `ref` de rede (o que o agregado/read-model realmente emite) e alinhar **schema ↔ dado**: ou o `ref` passa a ser UUID canônico (identidade de Rede), ou o schema aceita o formato real documentado.
2. Corrigir `GET /budget-plans/options` para serializar sem erro (200) com `redes[]` coerente.
3. Se a decisão for "ref = UUID", semear/mapear a geografia de rede mínima para os totais de #319 deixarem de vir 0.

## Fora de escopo
- Curadoria transversal de `.strict()` nos demais response schemas (#384 / `FIN-STRICT-RESPONSE-SCHEMAS`).
- Cálculo/consolidação em si (#319 já implementado).

## Critérios de aceite
- **CA1** `GET /budget-plans/options` → **200** com `redes[]` válido contra o response schema (sem `ResponseSerializationError`).
- **CA2** `redes[].ref` bate com a identidade real de Rede (UUID se essa for a decisão) — teste de contrato cobrindo o formato.
- **CA3** Com dados de rede semeados, `GET /budget-plans/consolidated-result` (#319) deixa de retornar totais 0 (validado no x99).

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (contrato do response de /options + CA2) | skill **`tdd-strategist`** |
| W1 | alinhar schema↔dado + serialização | agente **`zod-expert`** (schema) + **`fastify-server-expert`** (borda) + **`drizzle-orm-expert`** (leitura do ref) |
| W2 | audit read-only | skill **`code-reviewer`** + agente **`zod-expert`** |
| W3 | gate + validação x99 | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`Explore`** sobre `src/modules/budget-plans/**/options*` + o read-model de rede.
- **`mcp__security`**: exposição de identidade na borda.
- ADR-0018/0020 (UUID em varchar(36); identidade canônica).

## DoD
Gate W3 verde. `/options` 200; `ref` coerente; #319 valida totais ≠ 0 no x99. Fecha #394 (e desbloqueia #319).
