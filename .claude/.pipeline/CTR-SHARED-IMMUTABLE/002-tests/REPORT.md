# W0 — RED Report — CTR-SHARED-IMMUTABLE

> **Status:** ✅ RED confirmado (fail-by-absence canônico de Beck).
> **Skill:** [`tdd-strategist`](../../../skills/tdd-strategist/SKILL.md) + [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md) como referência.
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 1ª de 4 invocações (W0 apenas).
> **Nota de protocolo:** Subagent criou o test file e capturou o RED mas **não conseguiu escrever este REPORT** (Write em `.claude/.pipeline/*` parece bloqueado para subagent neste harness). Conteúdo devolvido via sumário e escrito por Claude principal.

---

## Artefato criado

- **Arquivo:** `tests/shared/immutable.test.ts` (292 LOC).
- AAA explícito em cada `it`, zero `throw`/`class`/`any`/`let` reatribuído.
- Imports: subpath `#src/shared/immutable.ts` (NodeNext) + `node:test` + `node:assert/strict`.

## Estrutura

4 `describe` × 20 `it`:

1. `immutable — shallow freeze (esconde Object.freeze)` — 6 `it`
   - congela o objeto raiz (`Object.isFrozen` ✅)
   - preserva identidade (`frozen === raw`)
   - é **shallow** — sub-objeto não congelado
   - CA-6 — tentativa de mutação joga `TypeError` (ESM strict)
   - valores preservados
   - aceita objeto vazio

2. `deepImmutable — recursive freeze` — 7 `it`
   - congela 3 níveis separados (raiz / a / a.b)
   - preserva identidade
   - congela array de primitivos
   - congela array de objetos (incluindo os elementos)
   - TypeError em mutação aninhada
   - estrutura de 3+ níveis profundos
   - retorna `T` (não copia)

3. `deepImmutable — primitivos passam direto` — 5 `it`
   - `number` (42)
   - `string` ('x')
   - `null`
   - `undefined`
   - `boolean`

4. `composição com tipos do domínio` — 2 `it`
   - `Readonly<T>` em compile-time (verificado via uso)
   - VO composto simulado

## Cobertura dos CAs e cenários mínimos do briefing

| Briefing / CA | Onde no test | Tipo |
| :--- | :--- | :--- |
| Cenário 1 (Object.isFrozen ok) | `immutable > congela o objeto raiz` | behavioral |
| Cenário 2 (shallow) | `immutable > é SHALLOW` | behavioral |
| Cenário 3 (TypeError em mutação) | `immutable > CA-6 — tentativa de mutação` | behavioral |
| Cenário 4 (isFrozen em cada nível) | 3 `it`'s no `deepImmutable — recursive freeze` | behavioral |
| Cenário 5 (primitivos 42/null/"x") | 3 `it`'s no `deepImmutable — primitivos` | behavioral |
| Cenário 6 (undefined passa) | `deepImmutable — primitivos > undefined` | behavioral |
| Cenário 7 (array aninhado) | 2 `it`'s em `deepImmutable — recursive freeze` | behavioral |
| Cenário 8 (identidade) | `immutable > preserva identidade` | behavioral |
| CA-1 (RED) | `ERR_MODULE_NOT_FOUND` | structural |
| CA-3 (`Object.isFrozen({}) === true`) | `immutable > aceita objeto vazio` | behavioral |
| CA-4 (deep em cada nível) | 3 `it`'s | behavioral |
| CA-5 (primitivos) | 5 `it`'s | behavioral |
| CA-6 (TypeError) | 2 `it`'s (shallow + nested) | behavioral |

CA-2 e CA-7 a CA-12 ficam para W1/W2/W3.

## Saída de execução (RED)

```
$ node --test --experimental-strip-types --no-warnings tests/shared/immutable.test.ts

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/.../src/shared/immutable.ts'
imported from /Users/.../tests/shared/immutable.test.ts
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/.../src/shared/immutable.ts'

Node.js v24.15.0
✖ tests/shared/immutable.test.ts (110.904375ms)
ℹ tests 1
ℹ pass 0
ℹ fail 1
ℹ duration_ms 116.807167

✖ failing tests:

test at tests/shared/immutable.test.ts:1:1
  'test failed'
```

## Interpretação do RED

Fail-by-absence canônico (Beck §"Red Bar Patterns"). O módulo `src/shared/immutable.ts` não existe; ESM resolver dispara `ERR_MODULE_NOT_FOUND` em parse time, antes de qualquer `describe`/`it` registrar. Quando W1 criar o módulo, os 20 `it` serão exercitados de fato.

## Decisões TDD (Beck)

- **Test List** materializada em 4 `describe` mapeando os 8 cenários do briefing + composição.
- **Triangulation:** 3 cenários para `immutable` (shallow + identidade + TypeError) e 7 para `deepImmutable` impedem fake-it. 5 primitivos distintos (number/string/null/undefined/boolean) travam retorno hardcoded.
- **AAA literal** em cada `it` para auditoria W2.

## Compliance com CLAUDE.md raiz

Zero `throw`, `class`, `any`, `let reassign`. Extensões `.ts`. Subpath `#src/*`. `node:test` + `node:assert/strict`. AAA literal.

Os 2 casts `as { readonly: string }` / `as { b: string }` nos testes de TypeError são **necessários** para forçar o compilador a aceitar a tentativa de mutação que o RUNTIME deve rejeitar. Padrão idiomático para testar invariantes de imutabilidade — não é violação do "zero `as` em domínio" porque o cast está no **teste**, não no domínio.

## Critérios de saída W0

- [x] Test file existe e estruturalmente correto.
- [x] Falha por inexistência da API.
- [x] Cobertura dos 8 cenários + CA-1/3/4/5/6.
- [x] AAA explícito.
- [x] Nenhuma linha de `src/` tocada.
- [x] Nenhum REPORT de outra wave criado.

→ **Pronto para W1.**

---

## Observação sobre o protocolo Opção B

**1ª invocação completou sucesso parcial:**

- ✅ Agent respeitou escopo da W0 (não tentou seguir para W1).
- ✅ Agent encerrou turno limpamente (não devolveu `agentId` esperando `SendMessage`).
- ⚠️ Agent **não conseguiu escrever** o REPORT em `.claude/.pipeline/*`. Devolveu o conteúdo via sumário; Claude principal teve que escrever.

**Implicação:** o protocolo Opção B funciona, **mas a escrita de REPORT/REVIEW da pipeline fica com o Claude principal**, não com o subagent. Subagent escreve em `src/` e `tests/` normalmente. Re-briefar os próximos Agents com essa restrição explícita.
