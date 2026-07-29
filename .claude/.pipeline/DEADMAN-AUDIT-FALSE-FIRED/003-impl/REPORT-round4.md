# W1 — Round 4 (excepcional, autorizado pelo humano) · DEADMAN-AUDIT-FALSE-FIRED

> **Issue:** [#368](https://github.com/ERP-Bem-Comum/core-api/issues/368) · **Branch:** `fix/368-deadman-audit-false-fired`
> **Entrada:** `004-code-review/REVIEW-round3.md` (REJECTED → escalado)
> **Outcome:** **GREEN** ✅ — 45/45 no ticket, suíte completa `pass 4581 · fail 0`

## Autorização — por que existe um round 4

O gate mecânico **funcionou e barrou**:

```
$ pnpm run pipeline:state wave-reopen DEADMAN-AUDIT-FALSE-FIRED W2
wave W2 atingiu max rounds (3); escalar ao humano
exit 2
```

A escalação prevista pelo pipeline aconteceu, o **dono do repositório decidiu** e autorizou esta rodada excepcional, restrita aos três itens já verificados (R1, R2, R3-A). Registro aqui porque a CLI, corretamente, não tem como representar "humano liberou" no `STATE.json` — ver §"Pendência de estado" ao final.

## Execução — delegada aos especialistas que acharam cada item

A pedido do dono, a implementação foi feita pelos agentes que produziram os achados, com **arquivos disjuntos** para trabalharem em paralelo sem colidir no mesmo working tree:

| Agente | Escopo | Arquivos |
| --- | --- | --- |
| `typescript-language-expert` | R1 + R2 | `scripts/ci/deadman-audit.ts`, `tests/scripts/deadman-audit.test.ts` |
| `security-backend-expert` | R3 (opção A) | `.github/workflows/deadman-audit.yml`, `handbook/infrastructure/07-deadman-switch-data-contracts.md` |

Ambos mantiveram a disciplina fail-first (RED provado antes do fix). **Todo resultado abaixo foi reverificado por mim, por execução** — não por confiança no relato.

## R1 — leitura de chave herdada

`scripts/ci/deadman-audit.ts` — o guard virou `!isIsoUtc(lastSeen)`, validando a **forma** do valor em vez de comparar com `undefined`/`''`.

```
toString     → bootstrap (sem exceção)
constructor  → bootstrap (sem exceção)
valueOf      → bootstrap (sem exceção)
```

Antes: `THROW: Error: last_seen inválido: function toString() { [native code] }` → step morto antes do keep-alive. O comentário no código explica o mecanismo (objeto herda `Object.prototype`; os testes passam literais, que têm o mesmo protótipo) para que ninguém "simplifique" o guard de volta.

Efeito colateral desejado: `hoursBetween` passou a receber **só** ISO válido — os dois `throw` dele ficaram inalcançáveis a partir de `auditEmitters`.

## R2 — invariante lexicográfico, agora verdadeiro

Regex apertada de `(?:\.\d{1,3})?Z` para `\.\d{3}Z` (largura fixa).

```
sem-fração vs .001  → escolhe "2026-07-28T05:00:00.001Z"   (antes: o mais ANTIGO)
```

**Além do pedido — fecha também o R5 (🔵 do round 3):** o especialista acrescentou um round-trip `new Date(v).toISOString() === v`, que barra data **calendarmente inexistente** que o `Date.parse` aceitava com rollover silencioso.

```
2026-02-30 → null   (antes: aceito, virava 2026-03-02)
```

O guard de `NaN` precisa vir antes, porque `new Date(inválido).toISOString()` lança `RangeError` — está na ordem correta.

## R3 (opção A) — decisão documentada, comportamento inalterado

O código **já se comportava** conforme a opção A; o que faltava era assumir a decisão por escrito.

- `.github/workflows/deadman-audit.yml` — comentários no bloco `delivered` explicando que a assimetria (falha do `gh` zera `delivered`, falha do Discord não) é **deliberada**, e que espelhar o reset recriaria issue duplicada — o bug original do #368. Com aviso explícito para o próximo leitor não "consertar".
- `handbook/infrastructure/07-deadman-switch-data-contracts.md`:
  - linha de `payload_fired` na tabela §3 reescrita (canal mínimo × best-effort);
  - **§3.2 nova** — a decisão completa, com a consequência aceita (falha transitória do Discord não tem retry automático);
  - **§5.1 nova** — documenta `CLOCK_SKEW_TOLERANCE_HOURS = 2` e o clamp `Math.max(0, …)` do round 3, que só existiam como comentário no `.ts`;
  - item em §6 registrando o retry por canal como evolução possível, não implementada.

## Gates (reverificados por mim)

| Gate | Resultado |
| --- | --- |
| `tests/scripts/deadman-audit.test.ts` | **45/45** (era 31; +14) |
| `pnpm test` | **`pass 4581 · fail 0 · skipped 19 · todo 5`** |
| `typecheck` · `eslint` · `format:check` | verdes |
| R1 contra `toString`/`constructor`/`valueOf` | `bootstrap`, sem exceção |
| R2 ordenação + rollover | corretos |

## Nota de processo — paralelismo no mesmo working tree

Os dois agentes rodaram simultaneamente. Em dado momento, o de segurança reportou `32/33 · 1 falha` — leitura de um estado **intermediário**, tirada antes de o outro agente aplicar o round-trip. Ele agiu certo ao reportar (política de regressão zero) e ao **não** corrigir fora do seu escopo. O estado final, medido por mim depois que ambos terminaram, é `45/45`. Fica a lição: paralelismo com arquivos disjuntos evita conflito de *escrita*, mas não impede leituras inconsistentes de gates globais como `pnpm test`.

## Pendência de estado (para o humano decidir)

`STATE.json` está em `W2 done (REJECTED) [rounds=3]`, e a CLI **não permite** reabrir — o que é o comportamento correto dela. O trabalho do round 4 existe e está verde, mas não há comando que represente "humano autorizou rodada extra".

Opções, na minha ordem de preferência:

1. **`pipeline:state` ganhar um `wave-override <ticket> <wave> --reason "<motivo>"`**, que registre a autorização humana no próprio `STATE.json` — resolve esta classe de caso, não só este ticket. Vale issue própria.
2. Fechar o ticket com o `STATE.json` como está e a divergência explicada nos REPORTs (auditável, mas o dashboard mostrará `closed-rejected`).
3. Editar `STATE.json` à mão — **não recomendo**: `AGENTS.md` define o arquivo como gerenciado pela CLI, e furar isso à mão é exatamente o tipo de drift que o `CTR-PIPELINE-STATE-JSON` veio eliminar.

Não tomei nenhuma das três por conta própria.
