# W0 — Testes RED (FIN-MODULE-SCAFFOLD)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session, ticket XS)
> **Início:** wave-start em STATE.json · **Fim:** este REPORT.md
> **Artefato único:** `tests/modules/financial/public-api/scaffold.test.ts`

---

## 1. Estratégia de teste

O scaffold é um arquivo placeholder vazio — não há lógica de domínio a testar. O teste de W0 verifica três propriedades operacionais que justificam a existência do ticket:

| Asserção | CA | Justificativa |
| :--- | :--- | :--- |
| Arquivo existe no filesystem | CA-1 | Garante que a estrutura foi criada (não basta um arquivo virtual). |
| Módulo é importável via subpath alias `#src/modules/financial/public-api/index.ts` | CA-3 | Confirma que `package.json#imports` cobre o novo caminho — Node resolve sem erro. |
| `Object.keys(mod)` (sem `default`) === `[]` | CA-2 | Travanca regressão futura: nenhum ticket pode adicionar exports prematuros sem atualizar este teste primeiro. |

A combinação CA-2+CA-3 ficou no mesmo `it()` porque o segundo é precondição para o primeiro — não faz sentido falhar separadamente.

## 2. Arquivo criado

`tests/modules/financial/public-api/scaffold.test.ts` — 38 linhas, runner `node:test` nativo + `--experimental-strip-types`, sem dependências externas. Segue convenção `.claude/rules/testing.md`: discovery via `**/*.test.ts`, mirror de `src/`, import via `#src/*`.

## 3. Comando rodado

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/public-api/scaffold.test.ts
```

## 4. Saída (esperada RED)

```
▶ financial/public-api scaffold
  ✖ CA-1: arquivo public-api/index.ts existe no filesystem (1.775833ms)
  ✖ CA-2+CA-3: módulo é importável via subpath alias e exporta zero símbolos (1.386416ms)
✖ financial/public-api scaffold (3.609917ms)
ℹ tests 2
ℹ suites 1
ℹ pass 0
ℹ fail 2
```

### 4.1. Falha CA-1

```
AssertionError [ERR_ASSERTION]: Got unwanted rejection:
  src/modules/financial/public-api/index.ts deveria existir após W1
Actual message: "ENOENT: no such file or directory,
  access '.../src/modules/financial/public-api/index.ts'"
```

### 4.2. Falha CA-2+CA-3

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../src/modules/financial/public-api/index.ts'
  imported from .../tests/modules/financial/public-api/scaffold.test.ts
```

## 5. Diagnóstico RED

Ambas as falhas têm causa única: **o arquivo `src/modules/financial/public-api/index.ts` não existe**. Não há ambiguidade — não falha por bug no teste, por shape errado de import, nem por exports inesperados. W1 trivialmente vira GREEN criando o arquivo com `export {};` e header doc.

## 6. Lista pronta para W1

Implementer (main-session) deve:

1. Criar `src/modules/financial/public-api/index.ts` com:
   - Header doc citando ADR-0006 e regra "outros módulos importam apenas daqui".
   - Linha final: `export {};` (necessário em ESM puramente declarativo para garantir module shape — `verbatimModuleSyntax` exige).
2. Rodar `node --test --experimental-strip-types --no-warnings tests/modules/financial/public-api/scaffold.test.ts` — esperar `pass 2 fail 0`.
3. Rodar `pnpm test` completo para confirmar nenhuma regressão nos demais 23 tickets.

Tudo já está coberto pelo 000-request.md §2.1 e §4 (CAs).
