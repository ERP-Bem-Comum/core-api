# W1 — GREEN Report — CTR-SHARED-IMMUTABLE

> **Status:** ✅ GREEN. 20/20 tests passam no arquivo do ticket; 509/496/0/13 no `pnpm test` completo (+20 vs baseline pré-ticket).
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 2ª de 4 invocações (W1 apenas).
> **Nota de protocolo:** Subagent criou os arquivos em `src/` mas **não escreve** em `.claude/.pipeline/*` (restrição descoberta na W0). Conteúdo deste REPORT devolvido via sumário do Agent e escrito por Claude principal.

---

## Artefatos criados / editados

| Arquivo | Ação | LOC | Notas |
| :--- | :--- | :--- | :--- |
| `src/shared/immutable.ts` | **Criado** | 51 (incl. JSDoc) | 2 exports (`immutable`, `deepImmutable`); zero deps; zero `throw`/`class`/`any` |
| `src/shared/index.ts` | **Editado** | +1 linha | `export { immutable, deepImmutable } from './immutable.ts';` |

## API canônica entregue

```ts
// src/shared/immutable.ts

export const immutable = <T extends object>(value: T): Readonly<T> => Object.freeze(value);

export const deepImmutable = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    deepImmutable((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};
```

Assinaturas **exatamente** como o estado-alvo do `000-request.md` §"Estado-alvo" (linhas 41-63). Prettier reformatou `immutable` para uma linha (fit em 100 cols); semântica preservada.

## Decisões de implementação

- **`immutable` shallow:** `Object.freeze` direto, sem cópia. Preserva identidade (`immutable(x) === x`). Tipo de retorno `Readonly<T>` documenta a invariante em compile-time enquanto o runtime garante via `freeze`.
- **`deepImmutable` recursivo:** desce em cada chave que seja objeto antes de congelar o nível atual (post-order). Garante que ao terminar o congelamento do raiz, todos os descendentes já estão congelados.
  - **Guard de primitivo:** `value === null || typeof value !== 'object'` — single-line return preserva narrowing.
  - **Tipo de retorno `T`:** intencional. A entrevista não cravou `DeepReadonly<T>` (não há helper canônico no TS sem userland); o "deep" é puramente comportamental em runtime, complementando o `Readonly` lógico que o autor do VO já aplicou na definição.
  - **Funções, arrays, bigint, symbol:** `typeof function === 'function'`, então `function` falha o guard `!== 'object'` — passa direto sem congelar. Arrays passam o guard (são `object`) e são congelados; `Object.keys` enumera índices. `bigint` e `symbol` falham o guard — passam direto.
- **Único `as`:** `value as Record<string, unknown>` dentro do `for` é cast de narrowing necessário após o guard (TS não estreita `T` para keyed object). Não é violação do "zero `as` em domínio" do CLAUDE.md raiz porque este arquivo é uma **facade de infraestrutura de domínio** (helper genérico), não um agregado/VO.
- **Reexport via barrel `shared/index.ts`:** mantém o padrão dos outros helpers (`Result`, `Brand`, `newUuid`/`isUuidV4`).

## Saída de execução

### Teste específico do ticket

```
$ node --test --experimental-strip-types --no-warnings tests/shared/immutable.test.ts

▶ immutable — shallow freeze (esconde Object.freeze)
  ✔ congela o objeto raiz (Object.isFrozen retorna true)
  ✔ preserva identidade — não copia, só congela (immutable(obj) === obj)
  ✔ é SHALLOW — sub-objetos NÃO são congelados
  ✔ CA-6 — tentativa de mutação em propriedade congelada joga TypeError (ESM strict)
  ✔ preserva os valores originais após o freeze
  ✔ aceita objeto vazio
✔ immutable — shallow freeze (esconde Object.freeze) (1.998042ms)
▶ deepImmutable — recursive freeze
  ✔ congela o objeto raiz
  ✔ congela o nível intermediário (a)
  ✔ congela o nível mais profundo (a.b)
  ✔ preserva identidade — não copia, congela in-place
  ✔ congela array aninhado em objeto
  ✔ congela objetos dentro de array
  ✔ mutação em propriedade aninhada congelada joga TypeError
✔ deepImmutable — recursive freeze (0.651708ms)
▶ deepImmutable — primitivos passam direto
  ✔ number: deepImmutable(42) retorna 42
  ✔ string: deepImmutable("x") retorna "x"
  ✔ null: deepImmutable(null) retorna null
  ✔ undefined: deepImmutable(undefined) retorna undefined
  ✔ boolean: deepImmutable(true) retorna true
✔ deepImmutable — primitivos passam direto (0.246167ms)
▶ composição com tipos do domínio
  ✔ immutable preserva o tipo do objeto (Readonly<T> em compile-time)
  ✔ deepImmutable em VO composto (Money + Period-like) congela todos os níveis
✔ composição com tipos do domínio (0.347792ms)

ℹ tests 20
ℹ suites 4
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 101.737875
```

### Suite completa

```
$ pnpm test

ℹ tests 509
ℹ suites 170
ℹ pass 496
ℹ fail 0
ℹ cancelled 0
ℹ skipped 13
ℹ todo 0
ℹ duration_ms 47463.387625
```

**Baseline pré-ticket:** 489/476/0/13. **Delta:** +20 tests (do `tests/shared/immutable.test.ts` novo), +20 pass, 0 novo fail, 0 novo skip.

## Cobertura dos critérios de aceitação (W1)

| CA | Critério | Status |
| :--- | :--- | :--- |
| CA-2 | `src/shared/immutable.ts` exporta `immutable` e `deepImmutable` com as assinaturas exatas | ✅ |
| CA-3 | `Object.isFrozen(immutable({}))` é `true` | ✅ |
| CA-4 | `Object.isFrozen(deepImmutable(<aninhado>))` é `true` em cada nível | ✅ (3 `it`'s) |
| CA-5 | `deepImmutable(<primitivo>)` retorna primitivo intocado | ✅ (5 `it`'s) |
| CA-6 | Tentativa de mutação em strict produz `TypeError` | ✅ (2 `it`'s) |
| CA-7 | `shared/index.ts` reexporta `immutable` + `deepImmutable` | ✅ |

CA-1 fechado em W0. CA-8 a CA-12 ficam para W2/W3.

## Compliance com CLAUDE.md raiz

- ✅ Zero `throw`, zero `class`, zero `this`, zero `extends`, zero `new Error`.
- ✅ Zero `any`. Um único `as Record<string, unknown>` no `deepImmutable` — narrowing após guard de primitivo.
- ✅ `Readonly<T>` no retorno de `immutable`. `T` preservado em `deepImmutable` (decisão consciente).
- ✅ Funções standalone, sem `this`, sem `class`.
- ✅ Sem mutação observável: arquivo só usa `const`, `for…of` sem reassign, `Object.freeze`.
- ✅ Imports: `immutable.ts` zero deps; `index.ts` usa `.ts` extension (NodeNext).
- ✅ Idioma: identificadores EN, JSDoc PT.

## Critérios de saída W1

- [x] Todos os testes da W0 passam (20/20).
- [x] Implementação mínima — sem código além do necessário.
- [x] Suite completa verde (509/496/0/13).
- [x] Compliance com CLAUDE.md raiz.
- [x] Reexport via `index.ts`.
- [x] Nenhum REPORT de outra wave criado.

→ **Pronto para W2 — REVIEW.**

---

## Observação sobre o protocolo Opção B

**2ª invocação completou sucesso parcial (mesmo padrão da W0):**

- ✅ Agent respeitou escopo da W1 (não tentou seguir para W2).
- ✅ Agent encerrou turno limpamente.
- ⚠️ Agent confirmou a restrição de escrita em `.claude/.pipeline/*`; REPORT devolvido via sumário.

**Implicação consolidada:** protocolo Opção B operacional para waves de código (W0 RED, W1 GREEN). Próximas invocações (W2 REVIEW, W3 QUALITY) seguirão o mesmo padrão.
