# 000 — Request CTR-SHARED-IMMUTABLE

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> Folha sem dependências (Bloco B). Pertence ao **top-3 leverage #2** ("Parse, don't validate") junto com `CTR-SHARED-BRAND-UNIQUE-SYMBOL` e `CTR-SHARED-VO-CANONICAL`.
> **Teste do protocolo Opção B** — 4× `Agent(contratos-orchestrator)` em série, uma invocação por wave, Claude principal coordena.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco B** (Smart Constructor + Brand + Identity) — fechado em 2026-05-19.
- **Pergunta semântica:** [`handbook/interviews/0001/Pergunta_B1_B2_B3_followup_*.md`](../../../handbook/interviews/0001/Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) §"5. Proposta do Gabriel — facade `immutable()`: endossada" (linhas 215–259) + §"Nota de naming" (linhas 297–320).
- **Decisões aplicáveis** (DO/DON'T do Bloco B no master doc):
  - **DO B§10** (linha 862): "Identidade fixa via facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`. Esconde `Object.freeze`."
  - **DON'T B§5** (linha 898): "`Object.freeze` direto no código de domínio — usa `immutable`/`deepImmutable`."
  - **CONSIDER B§2** (linha 934): "`deepImmutable` para VOs compostos com sub-VOs aninhados."
  - **CONSIDER B§5** (linha 937): "`Object.isFrozen()` em property-based tests confirmando invariante de imutabilidade."
- **Tabela canônica de tickets** (linha 957):
  > `CTR-SHARED-IMMUTABLE` — Bloco B — Cria `shared/immutable.ts` (`immutable`, `deepImmutable`) + testes. Esconde `Object.freeze` atrás de vocabulário do domínio. **— (folha, sem dependências)**.

---

## Estado atual (snapshot 2026-05-20)

```
$ ls src/shared/
brand.ts  id.ts  index.ts  result.ts  adapters/  ports/  utils/

$ grep -rn "Object.freeze\|immutable" src/ tests/ 2>/dev/null
(saída vazia — Object.freeze não é usado em domínio hoje, nenhum VO tem constantes congeladas)
```

**`Money`, `Period`, `BucketName`, `StorageKey`, etc. não têm constantes hoje** (`Money.ZERO`, `Period.UNBOUNDED`). A facade `immutable` será criada **antes** do `CTR-SHARED-VO-CANONICAL` que vai introduzir essas constantes.

`shared/index.ts` atual reexporta `Result`, `ok/err/...`, `Brand`, `newUuid/isUuidV4`. Vai ganhar `immutable` + `deepImmutable`.

---

## Estado-alvo

`src/shared/immutable.ts` — ~30 LOC, zero deps:

```ts
/**
 * Constante "de verdade" — imutável em compile-time E runtime.
 * Esconde o mecanismo (Object.freeze hoje, Records & Tuples no futuro).
 * Documenta intenção no vocabulário do projeto, não no de implementação.
 */
export const immutable = <T extends object>(value: T): Readonly<T> =>
  Object.freeze(value);

/**
 * Variante para VOs compostos com sub-objetos aninhados.
 * `Object.freeze` é shallow; `deepImmutable` congela recursivamente.
 */
export const deepImmutable = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    deepImmutable((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};
```

Reexport em `src/shared/index.ts`:

```ts
export { immutable, deepImmutable } from './immutable.ts';
```

---

## Escopo

### Em escopo

- Criar `src/shared/immutable.ts` com `immutable` e `deepImmutable`.
- Atualizar `src/shared/index.ts` reexportando ambos.
- Testes em `tests/shared/immutable.test.ts` cobrindo:
  - `immutable` retorna o **mesmo** objeto congelado (`Object.isFrozen` ✅).
  - `immutable` shallow: sub-objetos NÃO são congelados.
  - `immutable` em modo strict — tentativa de mutação joga `TypeError` (regra B§5 CONSIDER).
  - `deepImmutable` congela o objeto e cada sub-objeto recursivamente.
  - `deepImmutable` em valores não-objeto (number, string, null) retorna o valor sem alteração.
  - `deepImmutable` em estrutura com aninhamento profundo (3+ níveis).
  - Tipo de retorno de `immutable<T>` é `Readonly<T>` — verificação compile-time via uso.
  - Tipo de retorno de `deepImmutable<T>` preserva `T` — note que **não há `DeepReadonly<T>`** (o type system de TS não tem helper canônico; a entrevista intencionalmente mantém o tipo `T` original — o "deep" é só comportamental em runtime, complementando o `Readonly` lógico).

### Fora de escopo

- Adotar `immutable` em VOs existentes — vai em `CTR-SHARED-VO-CANONICAL`.
- `Brand<T, K>` com `unique symbol` — vai em `CTR-SHARED-BRAND-UNIQUE-SYMBOL`.
- Tipo `DeepReadonly<T>` — não há precedente no projeto e a entrevista não cravou esse helper; o `T` original já é o contrato semântico.

---

## Critérios de aceitação

| # | Critério | Wave |
| :--- | :--- | :--- |
| CA-1 | `tests/shared/immutable.test.ts` existe e **falha** antes do W1 (módulo `immutable.ts` não existe ainda) | W0 |
| CA-2 | `src/shared/immutable.ts` exporta `immutable` e `deepImmutable` com as assinaturas exatas do estado-alvo | W1 |
| CA-3 | `Object.isFrozen(immutable({}))` é `true` | W1 (testado) |
| CA-4 | `Object.isFrozen(deepImmutable(<aninhado>))` é `true` em cada nível | W1 (testado) |
| CA-5 | `deepImmutable(42)` retorna `42`; `deepImmutable(null)` retorna `null`; `deepImmutable('x')` retorna `'x'` | W1 (testado) |
| CA-6 | Tentativa de mutação em modo strict produz `TypeError` (`'use strict'` implícito em ESM) | W1 (testado) |
| CA-7 | `shared/index.ts` reexporta `immutable` e `deepImmutable` | W2 |
| CA-8 | Zero `throw`, zero `class`, zero `any` no diff | W2 |
| CA-9 | `pnpm run typecheck` verde | W3 |
| CA-10 | `pnpm run format:check` verde nos arquivos do ticket | W3 |
| CA-11 | `pnpm test` verde — 489 ou mais tests | W3 |
| CA-12 | `pnpm run lint` verde nos arquivos do ticket (bonus) | W3 |

---

## Skills obrigatórias

| Wave | Skill | Razão |
| :--- | :--- | :--- |
| W0 — RED | [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) + [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Escrever testes que consomem a API canônica antes da impl, propriedades estruturais via `Object.isFrozen` |
| W1 — GREEN | [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Aplicar Padrão D (free functions, sem class), tipo `Readonly<T>` no retorno |
| W2 — REVIEW | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | Audit read-only contra CLAUDE.md raiz + Bloco B da entrevista 0001 |
| W3 — QUALITY | [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) | typecheck + format + test + lint |
| Todas | [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) | Orquestrar W0→W3 |

---

## Arquivos previstos

| Arquivo | Ação | Wave |
| :--- | :--- | :--- |
| `tests/shared/immutable.test.ts` | **Criar** | W0 |
| `src/shared/immutable.ts` | **Criar** | W1 |
| `src/shared/index.ts` | **Editar** (1 linha — reexport) | W1 |
| `.claude/.pipeline/CTR-SHARED-IMMUTABLE/00*/REPORT.md` (4 arquivos) | **Criar** | W0..W3 |
| `.claude/.pipeline/CTR-SHARED-IMMUTABLE/STATE.md` | **Atualizar** ao fim de cada wave | W0..W3 |

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
| :--- | :--- | :--- |
| `deepImmutable` em estrutura cíclica → stack overflow | Baixa (VOs do domínio são acíclicos) | Documentar limitação; não otimizar prematuramente |
| Mutação em modo non-strict NÃO joga TypeError (apenas falha silenciosa) | Média | Testes ESM rodam em strict mode por padrão — confirmar via `'use strict'` implícito |
| Tipo `Readonly<T>` colidir com brand atual | Baixa | `Brand<T,K> = T & { __brand: K }`; `Readonly<Brand<T,K>>` = `Readonly<T> & Readonly<{ __brand: K }>` — composição OK |

---

## Protocolo de teste — Opção B (foco deste ticket)

**4 invocações `Agent(contratos-orchestrator)` em série, uma por wave**, Claude principal coordena entre elas:

| Invocação | Wave | Briefing | Encerra após |
| :--- | :--- | :--- | :--- |
| 1ª | W0 | Lê 000-request.md; escreve test file; captura RED; escreve 002-tests/REPORT.md | REPORT W0 escrito |
| 2ª | W1 | Lê 000-request.md + 002-tests/REPORT.md; cria immutable.ts + edita index.ts; roda testes; escreve 003-impl/REPORT.md | REPORT W1 escrito |
| 3ª | W2 | Lê 000-request.md + 003-impl/REPORT.md; audit do diff; escreve 004-code-review/REVIEW.md | REVIEW escrito |
| 4ª | W3 | Lê 000-request.md + 004-code-review/REVIEW.md; roda 4 gates; escreve 005-quality/REPORT.md; atualiza STATE.md | STATE.md completed |

**Sucesso da Opção B:** as 4 invocações completam suas waves, cada Agent encerra turno limpamente (sem `agentId` órfão), Claude principal mantém visibilidade.

**Falha da Opção B:** Agent não encerra turno limpamente (tenta seguir para outra wave, ou devolve `agentId`), OU briefing não é suficiente para Agent operar sem o contexto da conversa principal.

---

## Próximos tickets habilitados

- `CTR-SHARED-VO-CANONICAL` — depende deste + `CTR-SHARED-BRAND-UNIQUE-SYMBOL`.
- Indireto: `CTR-DOMAIN-IMPORT-CODEMOD` (depende de `CTR-SHARED-VO-CANONICAL`).

---

## Autor / data

- **Autor:** Claude (delegação via `contratos-orchestrator`, teste do protocolo Opção B).
- **Aberto em:** 2026-05-20.
