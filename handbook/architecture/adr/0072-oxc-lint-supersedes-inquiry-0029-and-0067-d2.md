[← Voltar para ADRs](./README.md)

# ADR-0072: O lint passa ao `oxlint` type-aware e o TypeScript 7 entra sem side-by-side — supersede a decisão de linter da Inquiry-0029 e o D2 do ADR-0067

- **Status:** Accepted
- **Date:** 2026-10-05 (aceito no mesmo dia pelo Tech Lead)
- **Deciders:** Gabriel Aderaldo (Tech Lead) — as quatro decisões de escopo abaixo (paridade 1:1, gates de AST, API `unstable/` do TS 7, fatiamento em PRs) · agente assistente — medição e redação
- **Supersedes (parcial):** [ADR-0067](./0067-typescript-7-side-by-side-supersedes-0009-language.md) — **só o D2** (o TS 6 retido por alias para o `typescript-eslint`). D1 (TS 7 é o compilador do gate), D3 (`@typescript/native-preview` sai), D4 (um checker só), D5 (risco do template literal com emoji) e D6 (quarentena sem exceção) **seguem vigentes**, e este ADR é o que finalmente os implementa.
- **Supersedes:** a decisão da [Inquiry-0029](../../inquiries/0029-linter-type-aware-sob-typescript-7.md) §6 (permanecer no ESLint + `--cache`).
- **Conformidade com:** [ADR-0011](./0011-supply-chain-hardening.md) §5 (justificativa de dependência nova) · [ADR-0029](./0029-pnpm-11-supply-chain-defaults.md) (quarentena e `trustPolicy`)

---

## Contexto

### O ADR-0067 está aceito há 41 dias e o código nunca o implementou

Medido em 2026-10-05 na `origin/dev` (`fbbca89d`): o `package.json` declara `typescript ^6.0.0`, `@typescript/native-preview 7.0.0-dev.20260515.1`, `eslint` e `typescript-eslint`. Nem o D1 (TS 7 como compilador) nem o D3 (`native-preview` fora) chegaram ao código. A razão é estrutural: o único caminho compatível com o ESLint é o alias do D2, e o próprio 0067 declara o preço dele — rebaixamento efetivo do compilador do lint para `6.0.2`, duas cópias do compilador, e o nome `typescript` deixando de significar o que aparenta.

### A Inquiry-0029 decidiu pela velocidade do `--cache` — e o `--cache` não entrega o que ela mediu

A 0029 (`decided` em 2026-08-06) descartou o `oxlint` com um argumento só, escrito por ela mesma: _"a razão para migrar era velocidade, e a velocidade estava disponível sem migrar"_ (§4.3c), com `eslint . --cache` quente em 1,5–2,0 s. Nenhum dos três gatilhos de reavaliação que ela fixou disparou (o lint quente segue em ~1 s; o TS 7.1 com API estável não saiu; não apareceu regra que o `typescript-eslint` não cubra). O que mudou foi a **base** da decisão, medida hoje:

| Medição (2026-10-05) | Resultado |
| :--- | :--- |
| `eslint . --cache` quente, local | 1,0–1,3 s — confirma a 0029 |
| `eslint .` sem cache, local | 30–32 s |
| Passo `Lint` no CI, últimos 4 runs da `dev` | **39–62 s** — o log diz `Cache not found for input keys` até no prefixo genérico `eslint-Linux-`: o cache do CI **nunca é restaurado** |
| Sonda controlada: `b.ts` chama função de `a.ts`; muda **só** `a.ts` para retornar `Promise` | `eslint --cache` → **exit 0**; `eslint` sem cache → **exit 1** (`no-floating-promises` em `b.ts`) |

A última linha é a que decide. O `--cache` do ESLint guarda resultado **por arquivo**, e a regra type-aware depende de tipo declarado **noutro** arquivo. A documentação do `typescript-eslint` diz isso literalmente — _"Typed lint rules almost always have dependencies on types across files in practice. ESLint's caching doesn't account for those cross-file dependencies."_ ([FAQ](https://typescript-eslint.io/troubleshooting/faqs/eslint)). A configuração que a 0029 escolheu **dá falso verde** no gate local e **não acelera nada** no CI.

### A tentativa de 04/09/2026 não é precedente a seguir

As branches `chore/oxlint-ts7-migration` e `docs/tsdoc-contracts-financial` migraram a mesma toolchain e nunca viraram PR: 31 commits num dia, 483 arquivos, misturando toolchain, versões de pnpm/Node, TSDoc em 1300 funções, manifesto de deploy e bump de dependência; contradiziam a 0029 sem supersedê-la; ligavam categorias inteiras do oxlint (7.468 achados) e perderam o `no-restricted-imports` do ADR-0011 sem que ninguém notasse, porque ele já dava zero. Este ADR é feito do avesso daquilo: um assunto, porte regra a regra, prova por diferencial.

## Decisão

**D1 — O lint é o `oxlint` com type-aware (`oxlint-tsgolint`), em versão exata** — `oxlint 1.86.0`, `oxlint-tsgolint 7.0.2003`. `pnpm run lint` é `oxlint`; sem cache, porque não precisa: o repositório inteiro (2036 arquivos) roda em **2,3 s** com type-aware ligado.

**D2 — O `.oxlintrc.json` é paridade 1:1 com o ESLint de hoje, GERADO, não escrito.** O inventário saiu do próprio `eslint --print-config` nos cinco contextos do flat config (base, scripts, adapters, borda HTTP, testes): **158 regras ativas**. **154** têm equivalente no oxlint e foram portadas com a mesma severidade, as mesmas opções e as mesmas exceções por pasta (`overrides`). Todas as `categories` do oxlint ficam **desligadas** e só os plugins necessários ligados — o lint cobra o que o ESLint cobrava, nem mais, nem menos. Regra nova entra por decisão, uma por vez.

**D3 — As quatro regras sem equivalente têm destino explícito:**

| Regra do ESLint | Destino |
| :--- | :--- |
| `no-octal` | o compilador já recusa — `TS1121: Octal literals are not allowed` no TS 6 e no TS 7 (medido) |
| `no-restricted-syntax` (proíbe `class`) | gate de AST `tests/cleanup/lint-gaps.test.ts` |
| `@typescript-eslint/naming-convention` | idem, com a configuração do projeto portada da implementação do plugin (`validator.js`, `format.js`) |
| `@typescript-eslint/member-ordering` | idem, ordem padrão para `interface` e type literal |

Os três gates leem a AST do **TypeScript 7 pela API `typescript/unstable/*`**, concentrada num único arquivo (`tests/support/ts-ast.ts`). Exceção de nome é **allowlist com motivo** dentro do gate (hoje duas: `__brand` e `__nonZeroMoney`), cobrada nos dois sentidos — exceção que deixou de corresponder a um achado reprova.

**D4 — O `typescript` é o 7, em versão exata (`7.0.2`), sem alias.** Revoga o D2 do ADR-0067: o alias existia só porque o `typescript-eslint` exige TS 6 como biblioteca (peer `<6.1.0`), e o ESLint sai. Nenhum código do repositório importa `typescript` como biblioteca além dos gates de D3 — é por eles que a versão é exata: uma faixa deixaria a resolução trocar a superfície `unstable/` sem decisão.

**D5 — Saem do manifesto** `eslint`, `typescript-eslint`, `eslint-config-prettier`, `@eslint/js` e `@typescript/native-preview`; sai o `eslint.config.js`. O **Prettier fica** — a troca de formatador é assunto de outro PR, com ADR próprio.

**D6 — O que o oxlint acusa e o ESLint deixava passar é corrigido, não silenciado.** Foram 16 achados (17, contando um já coberto por diretiva justificada): 7 `prefer-optional-chain`, 4 `no-deprecated`, 3 `no-unnecessary-type-parameters`, 2 `prefer-readonly-parameter-types`, 1 `consistent-generic-constructors`. ⚠️ Os 4 `no-deprecated` são o `.meta({ example })` do Zod, depreciado pelo `zod-openapi` em favor de `examples` — **a correção muda o OpenAPI gerado** (`example` → `examples`, o formato do OpenAPI 3.1).

## Verificação

A paridade foi medida, não presumida:

| Prova | Resultado |
| :--- | :--- |
| **Diferencial** — as ~221 diretivas `eslint-disable` desligadas nos dois linters, comparando arquivo + linha + regra | 222 de 224 violações reais achadas pelos dois **no mesmo lugar**; as 2 restantes são `naming-convention`, cobertas por D3 |
| **Sondas de opção** — par positivo/negativo por regra com opção customizada (ex.: 4 parâmetros têm de passar com `max: 4`; o default do oxlint é 3) | **36 de 36**, conferidas também contra o ESLint |
| **Gate de nomes** contra o ESLint, com a regra forçada também em `tests/` | **46 de 46** nomes idênticos em 2036 arquivos, zero divergência nos dois sentidos |
| **Fixtures dos três gates** conferidos contra o ESLint | 15 de 15 combinações fixture × regra |
| **Prova invertida** — violação plantada das três regras num arquivo versionado | os três testes reprovam, com arquivo e linha |
| Gate completo na branch | `typecheck` · `format:check` · `lint` · `test` (11.904 pass, 0 fail, 20 skip) |

## Consequências

### Positivas

- **O falso verde do `--cache` deixa de existir** — o lint sempre olha o repositório inteiro, com tipo.
- **Lint em 2,3 s** contra 30–32 s do ESLint sem cache e 39–62 s no CI.
- **O ADR-0067 sai do papel:** um compilador só, o TS 7, com `typecheck` em ~1,9 s (o TS 6 levava ~7,2 s na mesma máquina).
- **Menos dependências:** por máquina instalada saem 81 pacotes e entram 6 (`oxlint`, `oxlint-tsgolint`, `typescript` e o binário nativo de cada um). No lockfile o saldo é −33 entradas, porque ele lista os binários de todas as plataformas.
- Duas afirmações de `enforced_by` que já eram falsas (ADR-0037 e ADR-0047 apontavam o `eslint.config.js`, que nunca cobriu fronteira de camada) passam a `[]`, que é o estado real.

### Negativas — declaradas, não omitidas

- **Os três gates dependem de API `unstable/`.** Um upgrade do `typescript` pode quebrá-los. A quebra é ruidosa (o gate tem guarda contra vacuidade e o autoteste exige linha exata), e o pin exato faz do upgrade um ato deliberado.
- **A fidelidade dos três gates passa a ser nossa.** O ESLint era a referência; ela foi congelada nos fixtures do autoteste enquanto ainda existia. Mudança de config de nomes exige mudar o gate **e** os fixtures.
- **O type-aware do oxlint se declara de cobertura incompleta** ([docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)) e três das regras portadas são `nursery` (`no-unnecessary-condition`, `prefer-optional-chain`, `no-useless-assignment`). Um upgrade do oxlint pode mudar o que elas acusam — de novo, por isso a versão exata.
- O checker embutido no `oxlint-tsgolint` não é o `tsc` do gate; uma divergência entre os dois não foi procurada além do que o diferencial cobre.

## Alternativas rejeitadas

- **Manter o ESLint e implementar o D2 do ADR-0067 (alias do TS 6).** Mantém o `--cache` com falso verde, ou o lint de 30–60 s sem ele, e herda o rebaixamento e a dívida de legibilidade que o próprio 0067 declarou.
- **ESLint sem `--cache`.** Correto, mas é o lint mais lento do gate, e continua exigindo o alias do TS 6.
- **Ligar categorias do oxlint** (`correctness`, `suspicious`, `pedantic`) em vez de portar regra a regra — é o caminho de setembro: 7.468 achados para triar, regras do projeto perdidas no meio, e uma cobertura que ninguém consegue comparar com a anterior.
- **`naming-convention` por plugin JS do oxlint.** Os plugins JS são alpha, não aceitam regra type-aware, e o pacote do `typescript-eslint` traria de volta o peer `typescript <6.1.0`.
- **Aceitar a perda do casing.** O CLAUDE.md declara o casing como enforced; perder o mecanismo o devolveria a norma em prosa.
- **Biome** — mesma avaliação da Inquiry-0029 §5 (inferência própria e parcial, falso-negativo silencioso).

## Quando Re-avaliar

- **TS 7.1 com API programática estável:** `tests/support/ts-ast.ts` troca de `unstable/` para a API estável.
- **[tsgolint#186](https://github.com/oxc-project/tsgolint/issues/186) fechar** (`naming-convention` no oxlint): o gate de nomes pode dar lugar à regra nativa — depois de o diferencial contra os fixtures passar.
- **Upgrade de major do oxlint, ou promoção/remoção das regras `nursery` portadas.**
- O formatador: o PR que trocar o Prettier pelo `oxfmt` traz ADR próprio.
