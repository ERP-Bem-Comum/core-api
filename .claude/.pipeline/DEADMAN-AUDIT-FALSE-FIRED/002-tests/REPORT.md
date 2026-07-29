# W0 — Testes RED · DEADMAN-AUDIT-FALSE-FIRED

> **Skill:** `tdd-strategist` · **Issue:** [#368](https://github.com/ERP-Bem-Comum/core-api/issues/368) · **Branch:** `fix/368-deadman-audit-false-fired`
> **Arquivo:** `tests/scripts/deadman-audit.test.ts` (10.384 b, 14 `it()`)
> **Outcome:** **RED** ✅

## Estratégia

Suite **pura** — sem rede, sem S3, sem `gh`, sem Docker. Roda em `pnpm test` puro, sem opt-in. O `now` é **injetado** (`NOW = '2026-07-28T06:00:00.000Z'`), nunca `Date.now()`: decisão de auditor tem de ser determinística, no padrão `ClockFixed` do projeto (`src/shared/adapters/clock-fixed.ts`).

Duas frentes:

1. **Decisão** (12 `it()`) — trava o contrato da lógica que o W1 extrai do YAML para `scripts/ci/deadman-audit.ts`. RED por **inexistência da API** (`ERR_MODULE_NOT_FOUND`), no molde de `tests/scripts/test-integration-non-destructive.test.ts`.
2. **Workflow** (2 `it()`) — asserção de estrutura sobre o texto do YAML, no molde de `tests/scripts/semgrep-workflow.test.ts`. RED **pelo conteúdo atual do arquivo**, não pelo import.

Camada: unit. Nenhum teste de integração — a decisão é função pura de `(config, lastSeen, now, alreadyAlerted)`.

## Prova do RED

```
$ node --test --experimental-strip-types --no-warnings tests/scripts/deadman-audit.test.ts
✖ tests/scripts/deadman-audit.test.ts (57.178ms)
ℹ tests 1 · pass 0 · fail 1
  code: 'ERR_MODULE_NOT_FOUND'
  url: '.../scripts/ci/deadman-audit.ts'
```

```
$ pnpm run typecheck
tests/scripts/deadman-audit.test.ts(52,51): error TS2307: Cannot find module '#scripts/ci/deadman-audit.ts' …
```

Os dois `TS7006` restantes são **consequência** do `TS2307` (sem o módulo, os callbacks perdem o tipo) — somem quando o W1 criar o módulo tipado.

`prettier --check`: **verde**. `eslint`: **44 erros**, cuja distribuição é `no-unsafe-member-access` (25), `no-unsafe-assignment` (12), `no-unsafe-call` (5), `no-unsafe-return` (2) — **44/44 da família `no-unsafe-*`, zero de estilo ou lógica**. Todos derivam do mesmo `TS2307`: sem o módulo, tudo que vem dele é `any`, e o `typescript-eslint` *type-checked* acusa. Somem com o módulo tipado do W1; se sobrar algum depois do GREEN, é defeito real e o W2 deve barrar.

### As 2 asserções de workflow estão RED pela razão certa

O RED por `ERR_MODULE_NOT_FOUND` derruba o arquivo inteiro e **mascara** se cada asserção individual estaria vermelha por mérito. Verificado em isolado, contra o YAML real:

| Asserção | Resultado | Evidência |
| --- | --- | --- |
| YAML não decide morte inline | **RED ✓** | casa `status=DEAD # nenhum sinal jamais visto` (`:84`) |
| caminho de alerta sem `\|\| true` | **RED ✓** | casa `gh issue create … --label "agent-found,priority:p1" \|\| true` (`:90-92`) |

> **Falso-verde corrigido durante o W0.** A primeira versão da 2ª asserção filtrava **linha a linha** por `gh issue create`. O comando é multi-linha (continuação `\`) e o `|| true` mora na **última** linha (`:92`), fora da linha que contém o `gh issue create` (`:90`) — o filtro passaria em falso. Corrigido com `WORKFLOW.replace(/\\\n\s*/g, ' ')` **antes** do split, e a correção foi verificada em isolado (a tabela acima é o resultado *depois* do fix).

## Cobertura dos CAs

| CA | `it()` | O que trava |
| --- | :---: | --- |
| **CA1 — bootstrap** | 3 | `status === 'bootstrap'` (não `dead`) · `firesPayload === false` · **`ageHours === null`, jamais `0`** — o `0` é o que compõe o título mentiroso `sem sinal há 0h (limite 3d)` |
| **CA2 — vivo** | 1 | ping há 1h → `alive`, sem payload |
| **CA3 — dedup** | 3 | transição `alive→dead` dispara · morto **já alertado** não redispara (`status` segue `dead` — o dedup suprime o alerta, não o diagnóstico) · **re-alerta após ressuscitar e morrer de novo** (o dedup não pode ser permanente) |
| **CA4 — threshold por emissor** | 4 | `parseEmitterConfig` lê `threshold_days: 2` do `sweeper-vps-qa` · o veredito carrega o threshold · **ping há 60h: morto sob 2d(48h), vivo sob o default 3d(72h)** — o caso que discrimina D2 · `emitter` é o id real, nunca `'*'` |
| **CA5 — morte real** | 1 | ping há 192h → `dead` + payload. *Guarda contra o ticket produzir um auditor que nunca alerta.* |
| Workflow | 2 | decisão fora do bash inline · sem escape no alerta (ADR-0011) |

Os aritméticos de `ageHours` conferem contra `NOW`: 1h, 60h, 120h, 192h.

O teste lê o **`deadman/emitters.json` real** do repo (não um fixture sintético) — se alguém mudar o `threshold_days` do `sweeper-vps-qa`, o CA4 acusa.

## Assinatura para o W1

```ts
// scripts/ci/deadman-audit.ts
export type EmitterConfig  = { readonly id: string; readonly thresholdDays: number };
export type AuditStatus    = 'alive' | 'dead' | 'bootstrap';
export type EmitterVerdict = {
  readonly emitter: string;          // id REAL, nunca '*'  (D2)
  readonly status: AuditStatus;
  readonly ageHours: number | null;  // null quando nunca pingou  (D1)
  readonly thresholdDays: number;
  readonly firesPayload: boolean;
};

export const parseEmitterConfig = (json: string): readonly EmitterConfig[];
export const auditEmitters = (input: {
  readonly emitters: readonly EmitterConfig[];
  readonly lastSeenByEmitter: Readonly<Record<string, string>>; // ausente = nunca pingou
  readonly now: string;                                          // ISO-8601 UTC
  readonly alreadyAlerted: readonly string[];                    // estado persistido  (D3)
}) => readonly EmitterVerdict[];
```

`parseEmitterConfig` aplica `default_threshold_days` como **fallback** por emissor — não como valor único.

**O W1 também precisa decidir onde persistir `alreadyAlerted`.** O teste recebe o conjunto como *input*, então não amarra o mecanismo — mas o CA3 só se sustenta em produção se o estado sobreviver entre execuções do cron (candidato natural: um campo no `deadman/audit.jsonl`, que já é commitado pelo keep-alive do workflow). Fica como decisão do W1, não do W0.

## Baseline da suíte (política de regressão zero)

| Cenário | Resultado |
| --- | --- |
| `pnpm test` **sem** este arquivo | `pass 4536 · fail 0 · skipped 19 · todo 5` |
| `pnpm test` **com** este arquivo | `pass 4536 · fail 1 · skipped 19 · todo 5` |

**A única falha introduzida é o RED deste W0.** A suíte estava verde antes.

`tests/modules/financial/adapters/document-reader/native-pdf-real.local.test.ts` aparece na seção `failing tests` do relatório, mas **não conta** no `fail` (`fail 0` no baseline): é um `todo` anotado (`{ todo: '#388: hex Identity-H sem /ToUnicode' }`), esperado falhar, e só executa nesta máquina porque depende de fixtures gitignored por LGPD (`handbook/guidelines/ocr-fixtures-reais/`). No CI a pasta não existe e o arquivo pula inteiro. **Não é regressão nem gate mal-classificado** — o gate está correto.

## Fora de escopo (registrado, não consertado — ADR-0040)

O passo de download do S3 (`deadman-audit.yml:36-50`) e o self-heal (`:64-75`) permanecem no YAML: só a **decisão** migra. E `deadman/history.jsonl` estar vazio (nenhum ping jamais chegou, embora `tools/deadman-emitter/` exista) é verificação de **deploy**, não deste ticket — ver §"Observação operacional" do `000-request.md`.

## Handoff para o W1

`git checkout fix/368-deadman-audit-false-fired` → criar `scripts/ci/deadman-audit.ts` com a assinatura acima → fazer os 14 `it()` passarem → reescrever `deadman-audit.yml:52-102` para invocar o script e remover o `|| true` do alerta. **Mínimo suficiente (YAGNI):** nada de multi-emissor especulativo além do que `emitters.json` já declara.
