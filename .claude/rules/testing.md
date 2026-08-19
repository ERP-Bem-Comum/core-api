---
paths:
  - 'tests/**/*.ts'
verify:
  - claim: 'bdd/ e reports/ não guardam teste executável — são documento e forense'
    glob: 'tests/{bdd,reports}/**/*.test.ts'
    expect: []
  - claim: 'a classificação de referência decide por "está no git", nunca por "existe no disco"'
    root: 'scripts/handbook'
    pattern: 'targetExists'
    expect: []
  - claim: 'quem resolve ausência deliberada consulta o .gitignore pelo git'
    root: 'scripts/handbook'
    pattern: 'check-ignore'
    expect: ['scripts/handbook/link-scan.ts']
---

Runner: Node test runner nativo + `--experimental-strip-types`. O glob de descoberta é **um só** — `tests/**/*.test.ts` — e `tests/cleanup/test-discovery.test.ts` garante que nada de teste caia fora dele. As regras ESLint relaxadas aqui (`floating-promises`, `non-null-assertion`, `return-type`, `naming-convention`) estão em `eslint.config.js`, no bloco `files: ['tests/**/*.ts']`.

## Quatro naturezas de arquivo, e só uma roda no gate

| Sufixo | Roda em `pnpm test`? | O que é |
| --- | --- | --- |
| `.test.ts` | **sim** | o teste propriamente dito — 785 arquivos |
| `.suite.ts` · `.contract.ts` | não, por desenho | suíte parametrizada: exporta `(makeImpl) => void` que o adapter consome dentro do próprio `describe()`. 9 e 10 arquivos |
| `.e2e.ts` | **não** | smoke contra servidor real, por `pnpm run test:e2e:*` (`scripts/e2e/*.sh`). Vivem só em `tests/e2e/` |
| `.md` · `.log` | não | cenário BDD e artefato forense — `tests/bdd/`, `tests/reports/` |

⚠️ Escrever um `.e2e.ts` esperando que o gate o execute deixa o caso **sem cobertura e sem aviso**. O caminho do arquivo é o que torna a distinção visível.

## Mirror é a convenção de `tests/modules/`, não de `tests/`

676 dos 785 testes espelham `src/` (`tests/modules/contracts/domain/shared/money.test.ts` ↔ `src/modules/contracts/domain/shared/money.ts`). Os outros 109 se organizam por **natureza**, não por caminho de origem: `cleanup/` (invariantes estruturais que varrem o fonte), `infra/`, `scripts/`, `etl/`, `jobs/`, `workers/`, `pipeline/`, `decisions/`, `regression/`, `support/` (helpers, sem teste próprio além do `source-scan`).

Ao criar teste novo, a pergunta é o que ele testa: **um arquivo de `src/`** → mirror; **uma propriedade do repositório inteiro** → `tests/cleanup/`. Nem todo teste tem um arquivo-espelho, e forçar um inventa hierarquia falsa.

> O mirror já divergiu uma vez sem ninguém notar: os testes das primitivas estão em `tests/shared/result.test.ts`, enquanto o código foi para `src/shared/primitives/` no commit `e03a146a`. Ver [`shared-primitives.md`](./shared-primitives.md).

## Contrato de isolamento — integração contra MySQL real

Suítes de integração (`*.drizzle*.test.ts`, `*.integration.test.ts`) rodam **no mesmo banco**, arquivo a arquivo, com `--test-concurrency=1`. O runner **não recria** o schema entre arquivos irmãos: o resíduo de um é visível ao próximo. O contrato abaixo é o que torna cada arquivo independente de ordem.

- **Limpe na ENTRADA, não na saída.** Em `before`/`beforeEach`, das tabelas cujo espaço de chave o arquivo escreve. Quem só limpa em `after` fica à mercê da ordem — e um `beforeEach` **sem** `afterEach` entrega o resíduo do último caso ao próximo arquivo.
- **Limpe por TABELA, nunca por PK quando há UNIQUE natural.** `await db.delete(t)`, não `db.delete(t).where(inArray(t.id, […]))`. A limpeza por PK não pega resíduo inserido com **outro id** que colide na UNIQUE de negócio (CNPJ, CPF, `code`, `legacy_id`) — foi exatamente a colisão do **#521**.
- **Não afrouxe o teste para "passar".** Colisão de UNIQUE em setup é falha de isolamento, não motivo para trocar `assert.rejects` por matcher frouxo nem para remover o índice. Duplicata **intencional** (teste de `integrity-violation`) é asserção legítima — não confundir com resíduo.
- **Prova mecânica: a suíte tem de passar em ordem invertida.** Se inverter quebra, há dependência escondida.

  ```bash
  sed -n '/^  partners: mysqlSuite(/,/^  ]),/p' scripts/ci/test-integration.ts \
    | grep -oE "'tests/[^']+'" | tr -d "'" \
    | awk '{a[NR]=$0} END{for(i=NR;i>0;i--) print a[i]}' \
    | xargs node --test --test-concurrency=1 --experimental-strip-types
  ```

  A inversão usa `awk` de propósito: a versão anterior desta rule usava `tail -r`, que **só existe no macOS** — no CI Linux o comando falhava antes de rodar teste algum.

- **Segunda prova, que a inversão NÃO substitui: a suíte tem de passar DUAS VEZES seguidas, sem recriar o banco entre elas.** A ordem invertida acha dependência **entre arquivos**; ela é cega para a dependência do arquivo com o **próprio resíduo da execução anterior**, porque ambas as ordens partem de um banco limpo. Medido em 18/08/2026: `financial` passou 164/164 em ordem normal **e** invertida, e falhou **6** ao repetir sem limpar — todas em arquivos que a inversão aprovara minutos antes. Duas provas, dois defeitos diferentes; passar numa não diz nada sobre a outra.

  ⚠️ **Quando o `save` é upsert, o sintoma mente.** `ON DUPLICATE KEY UPDATE` colide na UNIQUE **sem levantar erro**: vira UPDATE da linha antiga, o id novo nunca é inserido, e a falha só aparece como `findById` devolvendo `null` muitas asserções adiante. A mensagem manda quem depura para o adapter, que está certo. O caso detectável — chave composta por contador de processo — é cobrado por `tests/cleanup/integration-rerun-safety.test.ts`; o que sobra é julgamento.

- **Rodar o arquivo isolado não é tê-lo executado.** O run isolado mede o código; o run dentro da suíte mede o código **mais o estado que os vizinhos deixam** — e é esse o ambiente do CI. Arquivo verde sozinho e vermelho na suíte não é flake: das duas medições, só a segunda valia.

Verificado em 2026-07-23 (MySQL 8.4 isolado): após o #521, `partners` (50/50) e `financial` (119/119) passam invertidas. Remedido em 18/08/2026 contra MySQL 8.4.10: `financial` passa **164/164** nas duas ordens — mas só a partir de banco limpo, ver a segunda prova acima. Os helpers `resetPartnersTables`/`resetFinancialTables` **não existem** e não precisam existir enquanto cada arquivo limpar por tabela na entrada — YAGNI.

## Gate estrutural pergunta ao git, não ao disco

Teste de `tests/cleanup/` que decide "este caminho existe" **MUST** perguntar ao git — `git ls-files` para o que está versionado, `git check-ignore` para a ausência deliberada. `existsSync` responde diferente na máquina de quem escreve e no runner, e **gate cuja resposta depende de onde roda não verifica nada**.

Custou dois vermelhos de CI seguidos na spec 041: `handbook/guidelines/` está no `.gitignore` (PDFs sob restrição de redistribuição), existe para quem tem os arquivos e não existe no runner — o mesmo link era vivo aqui e morto lá. E o erro nem era inédito: `claude-md-links.test.ts` já resolvia isso com `git ls-files` + `check-ignore` desde a #641. Escolher `existsSync` foi reinventar pior o que o repositório já tinha.

- ⚠️ **Padrão de DIRETÓRIO no `.gitignore` (`foo/`) só casa o caminho SEM barra quando o diretório existe no disco** — o git não tem como saber que um caminho ausente seria diretório. Consultar **as duas formas**, `x` e `x/`. Foi este detalhe, e não a lógica de classificação, que derrubou o gate na segunda rodada.

  | | diretório ausente (CI) | presente (local) |
  | --- | --- | --- |
  | `foo` | **não casa** | ignorado |
  | `foo/` | ignorado | ignorado |

- **Uma chamada por varredura, não uma por caminho.** `git check-ignore --stdin` em lote; um processo por link inviabiliza um gate que varre 1288 arquivos. A implementação de referência é `ignoredPaths` em `scripts/handbook/link-scan.ts`.

- **Reproduza o runner no teste, não a sua máquina.** O caso acima só ficou coberto com um teste que cria repositório temporário, escreve o padrão de diretório e **não cria o diretório** — ver `tests/scripts/link-scan.test.ts`. Verde na máquina de quem escreveu não é evidência.

> Débito conhecido: `redirects.test.ts`, `handbook-refs.test.ts` e `handbook-links.test.ts` ainda decidem existência com `existsSync`. Passam hoje porque todos os alvos que consultam são versionados — mas repetem o padrão e mentem no dia em que um alvo for gitignored.

Próximo teste do ciclo: [`tdd-strategist`](../skills/tdd-strategist/SKILL.md) · arquitetura da suíte (camada, doubles, o que falta): [`test-pyramid-engineer`](../skills/test-pyramid-engineer/SKILL.md).
