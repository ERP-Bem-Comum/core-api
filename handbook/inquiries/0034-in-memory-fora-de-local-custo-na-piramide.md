---
inquiry: 0034
title: 'Eliminar o in-memory fora de LOCAL — o custo na pirâmide de testes, e por que a estimativa de 179 arquivos estava errada'
state: open
opened: 2026-08-31
last_reviewed: 2026-08-31
---

# Inquiry-0034: Eliminar o in-memory fora de LOCAL — o custo na pirâmide de testes

- **Status:** Open
- **Opened:** 2026-08-31
- **Closed/Decided:** —
- **Opened by:** Gabriel (sessão assistida, worktree `failfast-799`)
- **Asked to:** time interno
- **Impact:** ADR (a política de env) + arquitetura da suíte de testes

---

## 1. Contexto

Em 31/08/2026 o dono fixou a política de variáveis de ambiente do core-api:

> FAIL-FAST em qualquer variável de ambiente usada. O único local que pode conter `inMemory` é
> LOCAL, e ali ele é tratado pelo orquestrador de containers, não pelo código.

A razão é operacional, não estética: em homologação e produção **as envs são postas manualmente na
console da AWS por um funcionário da Codebit**. Fallback silencioso ali não é degradação graciosa —
é esconder um erro de configuração humana de quem tem como corrigi-lo.

Isso responde a **#799** ("estender o fail-fast além da produção") e torna duas guardas existentes
mais frouxas que a norma: `src/shared/persistence/module-driver-config.ts` (#456) e
`src/modules/programs/adapters/http/logo-storage-config.ts` (#516), que degradam fora de produção.

Ao dimensionar o trabalho, apareceu um número assustador — **179 arquivos de teste declaram
`driver: 'memory'`** — e com ele a hipótese de que aplicar a política transformaria a suíte
unitária em suíte de integração. O dono pediu a pesquisa antes de seguir: *"o problema dos testes
demorados e a pirâmide de testes é uma coisa a ser estudada AGORA"*.

---

## 2. Pergunta(s) feita(s)

```
Eliminar o in-memory como capacidade fora de LOCAL obriga a migrar 179 arquivos de teste
para integração? A suíte de 11.500 testes, que hoje roda em ~111s SEM Docker, sobrevive?
Existe caminho que preserva a camada unitária?
```

---

## 3. Respostas / Investigação

### 2026-08-31 — medição no código (`dev@01bbf477`)

**Existem DUAS fronteiras de configuração, com DOIS tipos distintos.** Confundi-las é o que produz
a estimativa de 179:

| Fronteira | Tipo | Entrada | Quantos consumidores |
| :--- | :--- | :--- | ---: |
| env → config | `ModuleDriverConfig` (`shared/persistence/module-driver-config.ts:32-34`) | `process.env` | **1** |
| config → deps do módulo | `FinancialCompositionConfig` e 5 irmãos, um por módulo | parâmetro de função | **179** |

Comandos e resultados:

```
grep -rn "ModuleDriverConfig" src/ | grep -v module-driver-config.ts
  → src/server.ts:87            (ÚNICO consumidor de produção)

grep -rl "driver: 'memory'" tests/ | wc -l          → 179
grep -rl "driver: 'memory'" tests/ | xargs grep -l "HttpDeps" | wc -l → 179   (100%)
grep -rl "readModuleDriverConfigs" tests/ | wc -l   → 2
```

Os 179 são, sem exceção, chamadas do tipo:

```ts
const deps = await buildFinancialHttpDeps({ driver: 'memory' });
```

Isto é: eles **não passam pela leitura de env**. Entram na segunda fronteira, por parâmetro. Cada
módulo declara o próprio tipo (`FinancialDriver`, `ContractsDriver`, `AuthDriver`, `ProgramsDriver`,
`ReportsDriver`, `PartnersDriver` — todos `'memory' | 'mysql'`), e o `server.ts:260-264` é quem
traduz um no outro:

```ts
const financialDeps = await buildFinancialHttpDeps(
  financial.driver === 'mysql'
    ? { driver: 'mysql', writerUrl: financial.connectionString }
    : { driver: 'memory' },
);
```

**Consequência:** remover `memory` da PRIMEIRA fronteira fecha a porta que hml e produção usam — a
env — e **não toca nenhum dos 179**, porque eles entram pela segunda.

### 2026-08-31 — a estimativa antiga, e onde ela errou

A memória de trabalho do projeto registrava o número como custo de "matar o driver":

> matar o _driver_ migra 178 arquivos para integração e faz o `pnpm test` (11229 testes, 111s, **sem
> Docker**) passar a exigir MySQL

O número está certo; a **conclusão, não**. Ele mede quantos arquivos declaram a variante — não
quantos dependem da leitura por env. A própria memória já avisava do risco (*"os 178 não dependem
do fallback — injetam a escolha direto"*), e ainda assim a frase seguinte tratou os dois como um só.
Esta inquiry existe porque eu repeti o mesmo erro ao apresentar as opções ao dono.

### 2026-08-31 — fonte canônica (Vocke, via `acdg-skills`)

Sobre o que custa mover um teste para integração:

> **Integration Tests** are there to help. They test the integration of your application with all
> the parts that live outside of your application.
>
> For your automated tests this means you don't just need to run your own application but also the
> component you're integrating with. If you're testing the integration with a database you need to
> run a database when running your tests.
>
> — Ham Vocke, _The Practical Test Pyramid_ (martinfowler.com), linha 341

E sobre a direção certa de mover:

> - If a higher-level test spots an error and there's no lower-level test failing, you need to write
>   a lower-level test
> - **Push your tests as far down the test pyramid as you can**
>
> \[…\] The second rule is important to keep your test suite fast.
>
> — Ham Vocke, _The Practical Test Pyramid_ (martinfowler.com), linha 1003

Migrar 179 arquivos para integração empurraria a suíte **pirâmide acima** — o oposto exato da
segunda regra — e obrigaria a rodar MySQL para exercitar regra de negócio que não fala com banco.

---

## 4. Análise interna

A política do dono fala de **ambiente**: o que sobe em hml e em produção. Um double injetado em
teste não é um ambiente — é a técnica que a própria pirâmide prescreve para manter a base rápida. As
duas coisas compartilham o nome "in-memory" e não compartilham mais nada; o repositório já
distinguia três sentidos do termo, e é a terceira vez que confundi-los produz uma estimativa errada.

O que a política pede, em termos mecânicos, é: **nenhuma variável de ambiente pode produzir
in-memory**. Isso se resolve inteiro na primeira fronteira.

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A — fail-fast na fronteira de env**: `ModuleDriverConfig` perde a variante `memory`; env ausente/inválida derruba o boot em TODO ambiente; os tipos por módulo seguem aceitando `'memory'` por parâmetro | Fecha a porta que hml/prod usam. Custo medido: `server.ts` + 2 arquivos de teste. `pnpm test` segue em ~111s sem Docker. Base da pirâmide intacta | Local passa a exigir env declarada (`.env`/compose) — decisão já tomada pelo dono. O tipo por módulo continua tendo a variante, o que exige comentário dizendo por que ela não é alcançável por configuração | ✅ **Recomendada** |
| **B — remover `driver: 'memory'` também dos tipos por módulo** | Leitura literal de "in-memory não via código". Impossível construir deps voláteis por qualquer caminho | 179 arquivos migram para integração; `pnpm test` passa a exigir Docker; a base da pirâmide vira topo. Contraria Vocke nas duas regras citadas. O ganho de segurança sobre A é **zero em hml/prod**, porque lá o único caminho é a env, que A já fecha | ❌ Rejeitada — custo alto, ganho nulo sobre A |
| **C — status quo** | Nenhum trabalho | Contraria a política; mantém `X_DRIVER` ausente degradando em silêncio fora de produção | ❌ Rejeitada |

**O argumento decisivo contra B:** ela não protege nada que A já não proteja. Em homologação e
produção, a única porta para o in-memory é a variável de ambiente — não existe caller que passe
`{ driver: 'memory' }` fora de `server.ts` e dos testes. Fechada a env, o in-memory deixa de ser
alcançável naqueles ambientes por qualquer meio. B paga 179 arquivos e a velocidade do gate para
fechar uma porta que já está trancada.

### Sub-decisão embutida em A, e ela contradiz requisito escrito

Hoje `X_DRIVER=memory` **declarado** sobe em produção com aviso, e isso é FR-007, citado
literalmente em `module-driver-config.ts:197`:

> `memory` declarado em producao sobe (FR-007 e explicito: "sem falhar e sem exigir configuracao
> adicional")

A política nova diz que in-memory só existe LOCAL. Sob A, `X_DRIVER=memory` em produção passa a
**derrubar o boot** — o que revoga o FR-007. É revogação deliberada e precisa ficar escrita, não
resolvida em silêncio.

---

## 5. Decisão final

**PENDENTE** — aguarda o dono escolher entre A e B, agora com o custo real medido. A recomendação é
**A**, com a revogação do FR-007 registrada em ADR.

O bloqueador é só a escolha: o caminho técnico de A está mapeado e cabe em um PR.

---

## 6. Saídas (outputs concretos)

- [ ] Decisão A ou B pelo dono
- [ ] ADR novo: política de env fail-fast em todo ambiente, revogando o FR-007 do #456
- [ ] `module-driver-config.ts`: env ausente/inválida derruba em todo ambiente; `memory` deixa de ser valor aceito de `X_DRIVER`
- [ ] `logo-storage-config.ts` (#516): mesma régua
- [ ] Fechar **#799** citando o ADR
- [ ] Corrigir a memória de trabalho que trata os 179 como custo de matar o driver

---

## 7. Referências

- Issue **#799** — estender o fail-fast além da produção (a que esta inquiry responde)
- Issue **#456** — a guarda de boot dos 7 drivers · **#516** — o fail-fast do logo do `programs`
- Incidentes que motivaram o rigor: **#374**, **#444**, **#474** — os três por omissão de configuração
- `src/shared/persistence/module-driver-config.ts` · `src/server.ts:87,260-264`
- Ham Vocke, _The Practical Test Pyramid_ — linhas 341 e 1003, via `acdg-skills`
- PRs irmãos sob a mesma política: **#914** (storage da VAN) e **#916** (storage do comprovante)
