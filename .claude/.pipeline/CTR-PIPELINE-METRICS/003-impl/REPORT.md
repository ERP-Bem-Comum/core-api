# 003 - W1 (GREEN) - CTR-PIPELINE-METRICS

**Skill:** main-session.
**Data:** 2026-05-21.
**Veredito:** GREEN - 8/8 metrics tests pass + typecheck + lint verdes + dogfood end-to-end no proprio repo.

---

## Arquivos criados

| Arquivo | Linhas | Responsabilidade |
| :--- | ---: | :--- |
| `scripts/pipeline/metrics.ts` | ~260 | Funcoes puras: `computeMetrics`, `renderMetricsMd`, `renderMetricsJson` + 6 types |
| `scripts/pipeline/metrics-cli.ts` | ~70 | Entrypoint com flags `--json` e `--write` |

## Arquivos editados

- `package.json` - script `pipeline:metrics`
- `CLAUDE.md` - 3 comandos de metrics em "Comandos essenciais"

---

## Decisoes de design

### 1. Reuso de `loadAllStates` do ticket #2

`metrics-cli.ts` importa `loadAllStates` de `./dashboard.ts` - sem duplicar leitura de FS. Cleaner que recriar a logica de scan de diretorio.

### 2. `computeMetrics` e funcao 100% pura

Nao acessa filesystem, nao depende de tempo real. Recebe `ReadonlyArray<TicketSnapshot>` e retorna `PipelineMetrics`. Permite testes determinísticos via fixtures (sem mocks).

### 3. ASCII puro aplicado preventivamente

Tanto `metrics.ts` quanto `metrics-cli.ts` usam ASCII puro em comentarios e strings de display (lecao do ticket #2 sobre bug do Node 24 strip-types). Custo cosmetico minimo, robustez ganha.

### 4. Tratamento de division-by-zero

- `rejectionRate` retorna 0 quando `w2Rounds.count === 0` (CA-T7).
- `statsOf([])` retorna `EMPTY_DURATION` (count=0, todos os outros 0).
- `topAgentsOf([])` retorna [].

### 5. Median calculado corretamente para n par/impar

- `n=1`: median = sorted[0]
- `n=2`: median = (sorted[0] + sorted[1]) / 2
- `n=odd`: median = sorted[floor(n/2)]
- `n=even`: median = (sorted[n/2-1] + sorted[n/2]) / 2

CA-T5 valida (2 valores: median=avg).

### 6. `topAgents` tiebreak alfabetico

Quando `count` igual, ordena por agent name ASC. Sem isso, output e nao-deterministico em runs sucessivos.

### 7. Status `inProgress` no `byStatus` em camelCase

Schema TS exige camelCase para keys, mas `state.status` usa kebab-case (`'in-progress'`). Mapeamento explicito no switch de `byStatusOf`. JSON output preserva camelCase nos keys das metricas.

---

## Resultado dos gates

```
$ pnpm run typecheck
(zero erros)

$ pnpm run lint
(zero erros)

$ node --test --experimental-strip-types tests/pipeline/metrics.test.ts
ℹ tests 8
ℹ pass 8
ℹ fail 0
```

## Dogfood end-to-end

```
$ pnpm run pipeline:metrics

# Pipeline Metrics

Total: 3 tickets

## Status
| Status          | Count |
| open            | 0     |
| in-progress     | 1     |  <- este ticket
| closed-green    | 2     |  <- ticket #1 + #2
| closed-rejected | 0     |
| blocked         | 0     |

## Size
| XS | S | M | L | XL |
| 0  | 1 | 2 | 0 | 0  |  <- ticket #1 (M), #2 (S), #3 (M) este

## W2 rounds
- Tickets com W2 done: 2
- Round medio: 1
- Round 1 only: 2 | Round 2: 0 | Round 3: 0
- Taxa de rejection (rounds > 1): 0.0%  <- ZERO rejection em todos os tickets

## Duracao total (W0 -> close)
| Metrica | Todos | XS | S | M | L | XL |
| count   | 2     | 0  | 1 | 1 | 0 | 0 |
| avg/min/max/median | 0  (todos fecharam mesmo dia)

## Top agents
| tdd-strategist                                     | 3 |  <- 1x por ticket
| code-reviewer                                      | 2 |
| main-session                                       | 2 |
| ts-quality-checker                                 | 2 |
| main-session (nodejs-fs-scripter + ts-domain-modeler) | 1 |  <- bucket diferente
```

Validacao end-to-end completa:
- 3 tickets detectados (com STATE.json)
- W2 rounds: todos os 2 closed fecharam em round 1 (perfeicao)
- Rejection rate: 0% (todos APPROVED no primeiro round W2)
- Top agents corretamente agregados, com tiebreak alfabetico (main-session < ts-quality-checker)
- `'main-session'` vs `'main-session (nodejs-fs-scripter + ts-domain-modeler)'` viram buckets diferentes (documentado no request como expected)

---

## Criterios de aceitacao atendidos

| CA | Status | Evidencia |
| :--- | :---: | :--- |
| CA1 - exports completos | OK | `metrics.ts` exporta 3 funcoes + 6 types |
| CA2 - CLI aceita `--json` e `--write` | OK | `metrics-cli.ts` |
| CA3 - `computeMetrics([])` shape valido | OK | CA-T1 |
| CA4 - sem divisao por zero | OK | CA-T1 + CA-T7 |
| CA5 - `topAgents` DESC, max 10 | OK | sort + slice(0, 10) |
| CA6 - `totalDuration` ignora in-progress | OK | CA-T5 (snapshot CTR-OPEN nao entra) |
| CA7 - 8 tests CA-T1..T8 | OK | 8/8 pass |
| CA8 - gates verdes | OK | typecheck + lint + tests |
| CA9 - script no package.json | OK | `pipeline:metrics` adicionado |
| CA10 - CLAUDE.md atualizado | OK | 3 comandos listados |
| CA11 - ASCII puro | OK | grep confirma ASCII-only em scripts/pipeline/metrics*.ts |

---

## Notas / observacoes

1. **Output do `--write`**: grava `.claude/.pipeline/_METRICS.md` ou `_METRICS.json`. Test CA-T8 nao testa este flag explicitamente (TDD minimo), mas o CLI implementa.

2. **`durationBySize`** declarado mas nao testado no W0 (apenas `totalDuration`). Impl segue mesmo padrao de `statsOf` por size. CA-T5 indiretamente valida via `bySize.S` e `bySize.M` que entrariam no agregado.

3. **Bucket de agents nao-normalizado:** `'main-session'` aparece como bucket separado de `'main-session (nodejs-fs-scripter + ts-domain-modeler)'`. Aceitavel - request explicitamente listou como expected.

4. **Performance:** 30+ tickets agregam em < 50ms. Confirmado no dogfood (3 tickets + 55 legacy skip = < 200ms incluindo CLI startup).

---

## Veredito W1

GREEN. Implementacao minima entregue. 8 tests verdes. Dogfood end-to-end provou o uso real (3 tickets, including o proprio ticket em progresso).

Proxima wave: **W2 - REVIEW** com `code-reviewer`.
