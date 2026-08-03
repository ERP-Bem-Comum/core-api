# Inquiry-0023: TypeScript 7 nativo — spike medido e diagnóstico de lentidão do `core-api`

- **Status:** Decided (com saídas pendentes de execução)
- **Opened:** 2026-07-31
- **Closed/Decided:** 2026-07-31
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Medição direta em máquina local (Apple M2, 8 cores, 8 GB) + fontes oficiais
- **Impact:** [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) — **o gatilho de reavaliação dele disparou**; ver §5 e §6
- **Reabre:** [Inquiry-0004](./0004-node-version-and-typescript-future.md) (Decided em 2026-04-28), cuja conclusão sobre a migração TS 7 era projeção e agora tem medição

---

## 1. Contexto

O [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) fixou **Node 24 LTS + TypeScript 6 estável**, com plano de migração para TS 7 e a exigência de rodar `tsgo --noEmit` em CI **em paralelo** ao `tsc`, "validando compatibilidade desde o dia 1". O gatilho de reavaliação declarado era: _"quando TypeScript 7.0 estável for lançado (estimativa Q3/Q4 2026) — ADR novo supersedes este"_.

Duas coisas mudaram desde então:

1. **TypeScript 7.0 estável saiu.** Medido: `typescript@latest` = **7.0.2**.
2. **O `tsgo` deixou de existir com esse nome.** O pacote `@typescript/native-preview`, pinado no `package.json`, foi descontinuado; o sucessor é o próprio `typescript@7`.

O objetivo inicial era avaliar se o TS 7 serve para projeto real. O objetivo derivou para diagnosticar a lentidão medida de `typecheck`, `lint`, `test` e `test:integration` no `core-api`.

> **Nota metodológica.** Todo número deste documento foi medido nesta máquina. Onde houve estimativa, está marcado como tal. As hipóteses do autor que o teste refutou estão registradas em §4.4 — inclusive as erradas.

---

## 2. Pergunta(s) feita(s)

1. O TS 7 nativo é usável em projeto real hoje, ou ainda é preview?
2. Ele mantém paridade de checagem com o TS 6 — mesmos diagnósticos, mesma semântica?
3. Qual o ganho real de performance, e a partir de que escala ele aparece?
4. O que quebra ao adotar? Especificamente: `typescript-eslint` funciona?
5. Por que o `test:integration` do `core-api` é lento — é I/O de banco ou outra coisa?

---

## 3. Respostas / Investigação

### 3.1 Ambiente medido

| Item | Valor |
| :--- | :--- |
| Máquina | Apple M2, 8 cores, 8 GB RAM, Darwin 25.5.0 |
| Node | v24.16.0 |
| Deno | 2.9.3 — **typescript 6.0.3 embutido** |
| Bun | 1.3.14 |
| pnpm | 11.15.1 |
| TypeScript `latest` | **7.0.2** |
| TypeScript `next` | 7.1.0-dev.20260731.1 |
| `@typescript/typescript6` | pacote npm **6.0.2**, compilador se identifica como **6.0.3** |

### 3.2 Instalação: dois pacotes, binário Go autônomo

`npm install -D typescript` instala **2 pacotes**: `typescript@7.0.2` (3,5 MB — shim JS + exports) e `@typescript/typescript-darwin-arm64@7.0.2` (26 MB — binário nativo Go). As outras 19 plataformas ficam `UNMET OPTIONAL DEPENDENCY`, o que é o comportamento normal de optional deps por plataforma.

**`node_modules/.bin` contém apenas `tsc`** — não existe `tsgo` nem `tsserver` no pacote estável.

O binário é Mach-O arm64 de 23.653.616 bytes e liga apenas contra `libSystem`, `libresolv`, `CoreFoundation` e `CoreServices`. Executado com `env -i` e `PATH` sem node, faz build completo (`.js` + `.d.ts` + maps).

O caminho padrão, porém, passa por Node (`node_modules/.bin/tsc` é shim que faz `import "../lib/tsc.js"`):

| Invocação | Tempo |
| :--- | ---: |
| binário direto | 0,067s |
| via `npx tsc` | 0,383s |

**5,7× de diferença**, quase toda boot do Node. Overhead fixo — irrelevante em projeto grande, relevante em watch e pre-commit.

### 3.3 Paridade de checagem — 9 probes

**Idênticos** (código, linha, coluna e mensagem): tail recursion 900 (limpo) e 1200 (`TS2589` @10:10); união de 100k membros (`TS2590` @4:14) e de 1M (`TS2590` @4:13); variância sob `strictFunctionTypes` (`TS2322` @15:24, 18:29, 26:7); regex inválida, 5 de 5 casos (`TS1515` @5:22, `TS1507` @8:12, `TS1532` @11:15, `TS1517` @14:13, `TS1500` @17:17).

**Três divergências reais:**

**(a) Exit code.** Com erros de tipo: TS 7 devolve **1**, TS 6 devolve **2**. Ambos não-zero, então `set -e` e `&&` seguem funcionando — mas quebra script que testa código específico.

**(b) `isolatedDeclarations`** — mesmo defeito, diagnóstico diferente. TS 6: `TS9008: Method must have an explicit return type annotation` na linha da assinatura. TS 7: `TS9013: Expression type can't be inferred` na linha do `return`. Nenhum dos dois deixa passar.

**(c) Template literal com emoji — breaking change SEMÂNTICO.** É o mais perigoso dos três:

```ts
type Chars<S extends string> = S extends `${infer C}${infer R}` ? [C, ...Chars<R>] : [];
type ComEmoji = Chars<'a😀b'>;
```

| | `['length']` | Motivo |
| :--- | :---: | :--- |
| TS 7 | **3** | code points (igual a `for...of`) |
| TS 6 | **4** | unidades UTF-16 (surrogate pairs) |

TS 6 emite `TS2322: Type '4' is not assignable to type '3'`; **TS 7 compila limpo**. Muda tipo inferido sem erro — afeta DSL em nível de tipo (parser de rota, validador de template).

### 3.4 Performance do checker

Arquivos encadeados por `import type`:

| arquivos | TS 7 (Go) | TS 6 (JS) | ganho |
| ---: | ---: | ---: | ---: |
| 10 | 0,09s | 0,24s | 2,7× |
| 50 | 0,03s | 0,26s | 8,7× |
| 200 | 0,09s | 0,88s | 9,8× |
| 1000 | 4,33s | 53,30s | **12,3×** |

**Leitura importante:** até ~200 arquivos o TS 6 responde em menos de 1s e a diferença é imperceptível. O ganho existe a partir de centenas de arquivos — o que é exatamente a escala do `core-api` (§3.7).

CPU e memória em 1000 arquivos:

| | real | user | RSS máx |
| :--- | ---: | ---: | ---: |
| TS 7 (Go) | 4,28s | 16,97s | **313 MB** |
| TS 6 (JS) | 52,70s | 54,29s | **788 MB** |

`user` a 4× o `real` no TS 7 indica paralelismo real em ~4 cores; TS 6 é single-thread (`user ≈ real`). Numa máquina de 8 GB, a diferença de 475 MB de RSS não é detalhe.

**`deno check` não é alternativa:** 68,57s nos mesmos 1000 arquivos — **mais lento que o TS 6 avulso** (52,76s), porque soma o overhead de resolução de módulos do Deno ao checker JS.

### 3.5 Nenhum runtime verifica tipos

Arquivo com erro de tipo genuíno, sem `as`, que corrompe dado em vez de crashar:

```
tsc 7      → error TS2345: Argument of type 'string' is not assignable
             to parameter of type 'number'.  (21,42)               exit 1
node 24    → total com frete : 59.69999999999999610
             é número?       : string                              exit 0
deno run   → (saída byte a byte idêntica)                          exit 0
bun        → (saída byte a byte idêntica)                          exit 0
deno check → TS2345 @ 21:42                                        exit 1
```

Os três runtimes produziram **exatamente a mesma saída corrompida**. `19.90 * '3'` funciona por coerção em `*`, mas `+ '10'` concatena — metade do código acerta por acidente. Confirma, por medição, a premissa do ADR-0009 de que o checker é a rede, não o runtime.

| | Node 24 | Deno 2.9.3 | Bun 1.3.14 |
| :--- | :---: | :---: | :---: |
| Executa `.ts` | ✅ strip-only | ✅ transforma | ✅ transforma |
| `enum` / `namespace` | ❌ `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | ✅ | ✅ |
| …com flag | ✅ `--experimental-transform-types` | — | — |
| Verifica tipos ao rodar | ❌ | ❌ | ❌ |
| Checker embutido | ❌ | ✅ TS 6.0.3 (68,57s/1000) | ❌ |

### 3.6 As três flags que alinham checker e runtime

Arquitetura "tsc valida / runtime executa" tem furos onde a visão global do checker diverge da transpilação arquivo-a-arquivo. Três flags os fecham:

- **`verbatimModuleSyntax`** — sem ela, ambient `const enum` passa o checker (`exit 0`) e morre no runtime (`ReferenceError`). Com ela: `TS2748`.
- **`erasableSyntaxOnly`** — sem ela, `tsc exit 0`; com ela, `TS1294`. O Node strip-only daria `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. **O checker antecipa em 0,1s o mesmo erro que o Node daria ao subir.**
- **`isolatedModules`** — recusa o que não sobrevive a compilação por arquivo.

### 3.7 `typescript-eslint` com TS 7: quebra total

```
typescript-eslint does not support TS 7.0.
Please see .../#running-side-by-side-with-typescript-6.0
See also https://github.com/typescript-eslint/typescript-eslint/issues/10940
```

A falha é no **`import` do módulo** — nenhuma regra roda, nem as puramente sintáticas.

**Causa raiz medida:** o pacote `typescript@7` não expõe API programática. Seu `exports['.']` aponta para `lib/version.cjs`, cujo conteúdo inteiro é:

```js
const { version } = require('../package.json');
exports.version = version;
exports.versionMajorMinor = '7.0';
```

Logo `require('typescript')` devolve `{ version, versionMajorMinor }` — `createProgram`, `SyntaxKind` e `createSourceFile` são todos `undefined`.

**Solução verificada — side-by-side:**

```json
"@typescript/native": "npm:typescript@^7.0.2",
"typescript": "npm:@typescript/typescript6@^6.0.2"
```

Resultado: `require('typescript')` → versão 6.0.3 com 2248 chaves e `createProgram` presente; `node_modules/.bin/tsc` → **7.0.2** (o CLI vira o nativo); `node_modules/.bin/tsc6` → 6.0.3; `eslint` type-aware volta a detectar `no-floating-promises`.

**Consequência prática:** scripts que já chamam `tsc` passam a usar o nativo **sem alteração**.

Duas armadilhas medidas:

- **A receita quebra com `bun install`.** `require('typescript')` devolve 0 chaves. Causa: `@typescript/typescript6` declara internamente `'@typescript/old': 'npm:typescript@^6'`; o bun aplica o alias do root também nessa dependência transitiva, `@typescript/old` vira cópia de `@typescript/typescript6`, cujo `lib/typescript.js` é `module.exports = require('@typescript/old')` — ciclo fechado, módulo vazio. **npm ✅ · pnpm ✅ · bun ❌.** Como o repo é pnpm por [ADR-0012](../architecture/adr/0012-pnpm-package-manager.md)/[ADR-0029](../architecture/adr/0029-pnpm-11-supply-chain-defaults.md), não afeta.
- **Versão:** o pacote npm é `@typescript/typescript6@6.0.2` mas o compilador se identifica como 6.0.3. Fixar `^6.0.3` **falha na resolução** — usar `^6.0.2`.

### 3.8 Lint e teste

**ESLint type-aware, 700 arquivos:**

| Configuração | Tempo |
| :--- | ---: |
| `eslint src/` (padrão) | 1,55s |
| `--concurrency auto` | **2,33s** ⚠️ pior |
| `--concurrency 4` | **2,08s** ⚠️ pior |
| `--cache` (frio) | 1,53s |
| `--cache` (quente) | **0,41s** ✅ 3,8× |

A inversão se repete em 150 arquivos (1,23s → 1,47s). Causa provável: cada thread reconstrói seu próprio `Program`. Referência: `tsc 7 --noEmit` nos mesmos 700 arquivos leva **0,12s**.

Limitação de fundo: `typescript-eslint` constrói o `Program` com a API do **TS 6**. Nem o side-by-side acelera isso — o lint só herda a velocidade do TS 7 quando a issue #10940 fechar (previsto para TS 7.1). E `--cache` **não ajuda no CI** a menos que o `.eslintcache` seja persistido entre runs.

**`node --test` — isolamento de processo:**

| Cenário | `isolation=process` (default) | `isolation=none` | ganho |
| :--- | ---: | ---: | ---: |
| 40 testes triviais | 0,64s | 0,08s | **8×** |
| 40 testes + módulo de 3200 linhas | 1,47s | 0,11s | **13×** |

O default roda um processo por arquivo, e cada um paga boot do Node mais parse/strip de tudo que importa. ⚠️ **Risco real:** sem isolamento, estado global vaza entre arquivos, mock de módulo interfere, e um crash derruba a suíte inteira.

### 3.9 Escopo real do `core-api`

| Diretório | arquivos `.ts` |
| :--- | ---: |
| `src` | 919 |
| `tests` | 804 |
| `scripts` | 45 |
| `db/drizzle` | 7 |
| **total no `include`** | **1.775** |
| arquivos `*.test.ts` | **769** |
| suites de integração com MySQL | **11** |

Pela curva de §3.4, 1.775 arquivos estão na faixa onde o ganho do TS 7 é de uma ordem de magnitude.

**Quatro achados no `package.json`:**

| # | Achado | Impacto |
| :-- | :--- | :--- |
| 1 | `"typecheck": "tsc --noEmit"` resolve para **`typescript@6`** | **o compilador nativo está instalado e não é usado** |
| 2 | `@typescript/native-preview` pinado em `7.0.0-dev.20260515.1` | pacote **descontinuado**; sucessor é `typescript@7` |
| 3 | `@types/node: ^22.10.0` com `engines: node >=24` | tipos não cobrem APIs do runtime declarado |
| 4 | `--experimental-strip-types` em ~40 scripts | redundante no Node 24 (é default) — inofensivo |

**Um achado no `tsconfig.json`:** tem `isolatedModules` ✅ e `verbatimModuleSyntax` ✅, mas **falta `erasableSyntaxOnly`** — e todo o runtime é `node --experimental-strip-types` (strip-only). Testado com o tsconfig exato do projeto:

```
tsconfig atual        → exit 0        ← aprova `enum`
+ erasableSyntaxOnly  → TS1294        ← recusa
node                  → ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX
```

**Bug latente:** o dia em que alguém escrever `enum StatusContrato`, o typecheck passa verde, o CI passa verde, e o worker morre ao subir.

### 3.10 O gargalo real: `test:integration`

Arquitetura atual em `scripts/ci/test-integration.ts`:

```
secrets → docker compose up --wait → node --test → SEMPRE compose down -v
                                                                     ^^
composeDownArgs = ['compose','-p','core-api-test','down','-v']
```

O **`-v` apaga o volume**, então cada suite força um **initdb completo** do MySQL 8.4 — não um restart. Medição em réplica isolada, com os scripts de init do projeto:

| Estratégia | Rodadas | Média |
| :--- | :--- | ---: |
| **A)** `down -v` + `up --wait` (atual) | 10,86s · 10,79s · 10,79s | **10,8s** |
| **B)** `down` sem `-v` + `up --wait` | 5,77s · 5,76s · 5,76s | **5,8s** |
| **C)** container UP + `DROP`/`CREATE DATABASE` | 27ms · 17ms · 20ms | **21ms** |

**A → C = ~500× mais rápido**, com isolamento equivalente para o propósito. Os 10,8s batem com os **10,9s** medidos pela própria equipe em `tests/reports/CA-3-flakiness-investigation/REPORT.md`.

Onde vão os 10,8s (timeline do log): o entrypoint do MySQL sobe um servidor **temporário** para o initdb (~2,5s), derruba, e sobe o definitivo. O grosso do custo é criação de container/volume/rede mais duplo boot — **não trabalho de banco**. O `02-load-timezones.sh` custa **1,25s** (1.795 timezones, 118.801 transições), apenas ~11% do boot: removê-lo compra pouco; **não recriar o container** faz pagá-lo 1× em vez de 11×.

Decomposição de uma suite (32-34s, do REPORT da equipe):

| Fatia | Tempo | Fonte | Evitável |
| :--- | ---: | :--- | :---: |
| `compose up --wait` | **10,8s** | medido | ✅ |
| overhead de processo por arquivo | ~3-4s | **estimado** | ✅ |
| I/O real de MySQL (migrations, DDL, queries) | ~17-19s | **estimado** | ❌ |

⚠️ Só a primeira linha é medida; a divisão dos ~21s restantes é estimativa calibrada pelos 35ms/arquivo de §3.8. Separar isso exigiria rodar a suíte real.

**Resposta à pergunta 5:** o `test:integration` **não** é lento primariamente por I/O. Cerca de 1/3 é recriação de container, e o I/O legítimo é a maior fatia do restante.

---

## 4. Análise interna

### 4.1 O gatilho do ADR-0009 disparou

O ADR-0009 declara: _"Quando TypeScript 7.0 estável for lançado (estimativa Q3/Q4 2026) — ADR novo `supersedes` este"_. TS 7.0.2 estável está medido. **Este é o terceiro gatilho de reavaliação do acervo a disparar**, junto com o `:117` do ADR-0024 (que gerou o ADR-0055) e o #1 do ADR-0018 (que gerou o ADR-0020).

### 4.2 Duas premissas do ADR-0009 foram refutadas pela medição

| Premissa do ADR-0009 | Realidade medida |
| :--- | :--- |
| "CI roda `tsc` e `tsgo --noEmit` em paralelo, validando desde o dia 1" | **Nunca rodou.** O pacote está em `package.json:86` e nenhum workflow o invoca |
| "Como port é estrutural, espera-se troca de comando + ajustes mínimos" | **Falso para o lint.** `typescript-eslint` não importa sob TS 7; a stack de lint fica presa no TS 6 até a issue #10940 |

A primeira é lacuna de execução; a segunda é erro de previsão — e é a que muda o desenho da migração, porque transforma "trocar o compilador" em "rodar dois compiladores lado a lado por tempo indeterminado".

### 4.3 O que a medição confirma do ADR-0009

- **Runtime não verifica tipos** (§3.5) — os três runtimes produziram a mesma saída corrompida. A separação "checker valida / runtime executa" do ADR está certa.
- **`tsconfig` strict total desde o dia 1 minimiza incompatibilidade** — as 9 flags exigidas estão presentes, e a paridade de diagnóstico entre TS 6 e TS 7 foi de 9/9 nas probes (§3.3), com as três divergências sendo documentadas e não silenciosas, exceto o caso (c).
- **Capabilities de runtime isoladas em adapters** — é o que torna a troca de compilador não-invasiva.

### 4.4 Hipóteses do autor que o teste refutou

Registrado por honestidade metodológica.

| # | Hipótese | Realidade medida |
| :-- | :--- | :--- |
| 1 | `const enum` exportado quebraria no bun | **Funciona** — desde TS 5 não inlineia sob `isolatedModules` |
| 2 | `namespace` com merging quebraria no bun | **Funciona** |
| 3 | Checagem de regex estaria incompleta no TS 7 | **Completa e idêntica** — 5/5 diagnósticos iguais |
| 4 | `eslint --concurrency` daria ganho fácil | **Piora** — 1,55s → 2,33s em 700 arquivos |
| 5 | `02-load-timezones.sh` custaria 10-30s | **1,25s** — ~11% do boot |
| 6 | `interval: 5s` do healthcheck causaria a variação | **Não** — com `interval: 1s` seguiu bimodal |
| 7 | `fib(x as never)` provaria falha do checker | **Teste inválido** — `never` é atribuível a tudo; o `as` derrota o checker também |

---

## 5. Decisão final

**O TS 7 nativo é adotável hoje, em modo side-by-side, e o `core-api` está na escala onde o ganho é de uma ordem de magnitude.** Mas a adoção não é "trocar o compilador": é rodar dois, porque o `typescript-eslint` fica no TS 6 até a issue #10940.

**O maior ganho isolado não é o compilador — é parar de recriar o container de teste** (~108s por bateria contra ~10× no typecheck).

As saídas concretas, com a classificação que cada achado recebe, estão em §6.

---

## 6. Saídas (outputs concretos)

Classificação de cada achado. O critério é o mesmo do inventário em [`context/decisions/`](../../context/decisions/SCHEMA.md): **o que pode ser mecânico não vira texto**, e o que não é acionável ao editar um path não vira rule.

### 6.1 Vira ADR novo — `supersedes` parcial do ADR-0009 (parte "linguagem")

| Conteúdo | Por que precisa de ADR |
| :--- | :--- |
| Adotar TS 7 nativo em **side-by-side** (`typescript` → `npm:@typescript/typescript6@^6.0.2`; `@typescript/native` → `npm:typescript@^7.0.2`) | Troca de compilador é decisão arquitetural; entra dependência nova sob o checklist §5 do [ADR-0011](../architecture/adr/0011-supply-chain-hardening.md) |
| Registrar que o **lint permanece no TS 6** até a issue #10940 (previsto TS 7.1) | Corrige a previsão errada do ADR-0009 ("ajustes mínimos"); é condição de execução, não detalhe |
| Registrar o **breaking change semântico** de template literal com emoji (§3.3c) | Muda tipo inferido **sem erro**; afeta DSL em nível de tipo. Precisa ficar como risco declarado, não como surpresa |
| Remover `@typescript/native-preview` (descontinuado) | O ADR-0009 o exigia em CI; o ADR novo redefine o mecanismo |
| Reafirmar ou revogar a exigência de "dois checkers em paralelo no CI" | O ADR-0009 exigiu e nunca aconteceu. Sob side-by-side, `tsc` (7) e `tsc6` coexistem — decidir se ambos rodam no gate |

> ⚠️ Este ADR deve **reafirmar explicitamente as consequências negativas e os gatilhos** do ADR-0009, em vez de omiti-los. Duas das quatro cadeias de supersessão do acervo perderam o raciocínio ao superseder — ver [`context/decisions/ADR-0018.yaml`](../../context/decisions/ADR-0018.yaml) `#findings`.

### 6.2 Vira enforcement mecânico — não vira rule

| Ação | Mecanismo | Nota |
| :--- | :--- | :--- |
| Ligar **`erasableSyntaxOnly`** no `tsconfig.json` | `tsc` passa a barrar (`TS1294`) | Fecha o bug latente de §3.9 com **zero** texto de doutrina. Rodar antes para ver se já existe `enum`/`namespace` no código |
| Persistir `.eslintcache` entre runs de CI | cache do ESLint | 3,8× local; sem persistência o ganho no CI é **zero** |

A flag `erasableSyntaxOnly` é o caso exemplar de "mecânico vence texto": uma linha de `tsconfig` substitui qualquer regra escrita sobre não usar `enum`.

### 6.3 Vira issue — melhoria mensurada, sem decisão arquitetural

| # | Ação | Ganho medido | Risco |
| :-- | :--- | :--- | :--- |
| 1 | Eliminar `down -v` entre suites; isolar por `DROP`/`CREATE DATABASE` | **~108s por bateria** (11 × 10,8s → 10,8s + 10 × 21ms) | médio — exige garantir a limpeza |
| 2 | `--test-isolation=none` **só nos unitários** | 8-13× no overhead de processo | **médio** — vaza estado global; manter isolamento na integração |
| 3 | `@types/node` → `^24` | 0 (consistência com `engines`) | nulo |

A #1 é compatível com o contrato de isolamento já normativo em [`.claude/rules/testing.md`](../../.claude/rules/testing.md) ("limpe na ENTRADA, por TABELA") — muda o mecanismo de reset, não o contrato. A #2 precisa de nota na mesma rule, porque a exceção "só unitários" é o que a torna segura.

### 6.4 Não entra — registrado para não ser tentado de novo

| Item | Por quê |
| :--- | :--- |
| `eslint --concurrency` | **Piora** de forma medida (1,55s → 2,33s), em duas escalas |
| Remover `--experimental-strip-types` dos ~40 scripts | Churn sem ganho; redundante mas inofensivo no Node 24 |
| Reduzir o `include` do `tsconfig` para acelerar | Vende cobertura de tipos por segundos que o compilador nativo já devolve |
| `deno check` como checker | **68,57s**/1000 arquivos — mais lento que o TS 6 avulso |
| Trocar o package manager para bun | A receita side-by-side **quebra** no bun (§3.7); e contraria ADR-0012/0029 |

---

## 7. Referências

- [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) — Node 24 + TS 6 com roadmap TS 7 (**gatilho disparado**)
- [Inquiry-0004](./0004-node-version-and-typescript-future.md) — análise original, projeção sem medição
- [ADR-0011](../architecture/adr/0011-supply-chain-hardening.md) — checklist §5 para dependência nova
- [ADR-0012](../architecture/adr/0012-pnpm-package-manager.md) · [ADR-0029](../architecture/adr/0029-pnpm-11-supply-chain-defaults.md) — pnpm é o package manager (o que salva a receita side-by-side)
- `tests/reports/CA-3-flakiness-investigation/REPORT.md` — medição independente da equipe, que confirma os 10,8s
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) · [Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/) · [RC](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/)
- [Progress on TypeScript 7 — December 2025](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/)
- [typescript-eslint #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) — suporte a TS ≥7.1

### Limitações declaradas do TS 7.0 (citações)

> "TypeScript 7 does not yet expose a stable programmatic API, and so tools (such as Volar) which embed TypeScript into their own compilers and language services can only currently rely on TypeScript 6.0."

> "Workflows that use Vue, MDX, Astro, Svelte, and others will likely not yet be able to leverage TypeScript 7."

**Removidos no 7.0:** target ES5, `downlevelIteration`, AMD/UMD/SystemJS, `baseUrl`, `moduleResolution: classic`.
**Defaults alterados:** `strict` e `noUncheckedSideEffectImports` → `true`; `types` → `[]`; `rootDir` → `./`; `stableTypeOrdering` permanentemente ligado.
**Language server novo:** −80% comandos falhos, −60% crashes (número da Microsoft, **não verificado aqui**).

### Artefatos do spike (reprodução)

```
scripts/tsc-native            resolve o binário Go por uname (darwin/linux/freebsd × arm64/x64)
scripts/comparar-checkers.sh  roda cada probe em TS7 e TS6, com watchdog
scripts/comparar-runtimes.sh  mesmo .ts em tsc / node / deno run / deno check / bun
scripts/curva-escala.sh       mede typecheck em 10/50/200/1000 arquivos
scripts/gerar-escala.ts       gerador dos arquivos encadeados
probes/01..09                 casos-limite do checker
interop/                      const enum, namespace, ambient const enum, tipos-mentem
node-app/                     alvo Node 24: tsconfig strip-only + tsconfig.build
```

O bench de MySQL foi feito em réplica isolada (projeto compose `bench-mysql-*`), com cópias dos `initdb.d`/`conf.d` do `core-api` e secrets próprios. **Nenhum container, volume ou secret do `core-api` foi tocado** — verificado ao final.
