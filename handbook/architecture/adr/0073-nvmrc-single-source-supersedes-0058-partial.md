[← Voltar para ADRs](./README.md)

# ADR-0073: O `.nvmrc` é a fonte única da versão do runtime — as demais declarações derivam

- **Status:** Accepted (`supersedes` **parcialmente** [ADR-0058](./0058-runtime-tracks-recommended-lts.md): apenas a §2, que enumera os pontos de declaração, e a §4, que define o que o gate cobra. A §1 — acompanhar o LTS recomendado por subida gradual — e a §3 — troca de tecnologia justificada por inquiry — seguem **integralmente vigentes**)
- **Date:** 2026-10-06
- **Deciders:** Gabriel (dono do repo)
- **Contexto de origem:** medição da divergência entre dev, CI e produção durante a migração de toolchain da branch `chore/toolchain-oxc-ts7`

## Contexto

O [ADR-0058](./0058-runtime-tracks-recommended-lts.md) resolveu o problema certo — tirou a versão do runtime dos ADRs e a pôs onde é executável — e enumerou três pontos de declaração (§2):

| Onde | O que declara |
| --- | --- |
| `package.json` → `engines.node` | o piso aceito |
| `Dockerfile` → `FROM node:<versão>` | o que roda em produção |
| `.github/workflows/*.yml` → `node-version` | o que o CI usa |

A §4 mandou cobrar a concordância entre eles por gate, e o gate foi escrito (`tests/cleanup/node-version-single-source.test.ts`). **Dois meses depois, dev e produção rodavam versões diferentes com o gate verde.** Medido em 06/10/2026:

| Declaração | Valor | Observação |
| --- | --- | --- |
| `.nvmrc` | `24.16.0` | **não está na tabela da §2** |
| `package.json` → `devEngines.runtime.version` | `24.16.0` | **não está na tabela da §2** |
| `package.json` → `engines.node` | `>=24.0.0` | |
| `Dockerfile` → `FROM` | `node:24.15-bookworm-slim` | o que roda em hml e prod |
| `Dockerfile` → `LABEL image.base.name` | `node:24.15-bookworm-slim` | o que os scanners de CVE leem |
| 4 workflows → `node-version` | `'24'` / `24` | preso a nenhuma das duas; flutua a cada release upstream |

Três causas, todas de forma, nenhuma de julgamento:

1. **A §2 omitiu dois pontos que já existiam.** `.nvmrc` e `devEngines.runtime` estavam no repositório em 05/08/2026, quando o ADR-0058 foi aceito. Ficando fora da tabela, ficaram fora do gate — e são justamente os dois que fixam versão **exata**, enquanto os três listados são faixa, tag de minor e major solto.

2. **O gate cobrava só o major, e a divergência era de minor.** A decisão era deliberada e está escrita no docstring da versão anterior: exigir patch idêntico produziria vermelho a cada release do Node. O argumento valia enquanto cada ponto carregava o número **escrito à mão** — três cópias com três cadências. O efeito foi que o ADR-0058:41 registrou a divergência como "observação, não norma", disse que a §4 existia para torná-la visível, e ela passou verde por dois meses.

3. **`node-version` no CI é uma cópia do número, qualquer que seja a forma.** Um major solto (`'24'`) delega ao `setup-node` a escolha do runtime, que muda sem aviso e sem diff. Um valor exato (`24.21.0`) resolve a flutuação criando **quatro cópias novas** do número, uma por workflow — e cópia de número é a causa raiz desta própria divergência.

O calendário tornou isto urgente em vez de estético: a linha 24 sai de **Active LTS em 20/10/2026** e a 26 entra em **28/10/2026** (`nodejs/Release`, `schedule.json`). A §1 do ADR-0058 manda acompanhar o LTS recomendado — e cumpri-la exigia, até aqui, editar o mesmo número em cinco lugares sem nada capaz de dizer que um ficou atrás.

## Decisão

### 1. A versão do runtime vive no `.nvmrc`, e só nele — invariante

O `.nvmrc` **MUST** conter a versão **exata** (`major.minor.patch`), sem prefixo `v`. É a fonte única.

A escolha não é arbitrária: é o único arquivo que as duas pontas da cadeia leem **sem tradução humana** — o `fnm` o resolve no `cd` e o `actions/setup-node` o resolve por `node-version-file`. Qualquer outro candidato exigiria que alguém copiasse o número.

### 2. As demais declarações derivam, e nenhuma é fonte — invariante

| Onde | Deriva como | Por que não pode ser exata |
| --- | --- | --- |
| `package.json` → `devEngines.runtime.version` | **exata**, igual ao `.nvmrc` | — |
| `package.json` → `engines.node` | piso por **major** (`>=<major>.0.0`) | é contrato de compatibilidade, não pin |
| `Dockerfile` → `FROM node:<major>.<minor>-…` | **major.minor** | a tag oficial do Node não publica patch |
| `Dockerfile` → `LABEL image.base.name` | igual à tag do `FROM` | — |
| `package.json` → `@types/node` | faixa do **major** | segue o versionamento do DefinitelyTyped |
| `.github/workflows/*.yml` | `node-version-file: .nvmrc` | **não escreve número algum** |

Um workflow que use `actions/setup-node` **MUST NOT** declarar `node-version`, em nenhuma forma — nem major solto, nem valor exato. A §2 do ADR-0058, que listava `node-version` como ponto de declaração, é o que esta seção supersede.

### 3. O gate cobra a derivação na granularidade de cada alvo — invariante

`tests/cleanup/node-version-single-source.test.ts` **MUST** conferir cada declaração da §2 contra o `.nvmrc`, cada uma na granularidade que pode expressar. Isto supersede a §4 do ADR-0058, que cobrava apenas o major entre três pontos.

A objeção que justificava cobrar só o major — vermelho a cada release — **deixa de se aplicar** quando existe fonte única: subir o runtime é editar um arquivo, e o gate confere as derivadas contra ele em vez de comparar cópias entre si.

O gate **MUST** manter guarda contra verde por vacuidade. Não é zelo retórico: a guarda anterior (`há workflows declarando node-version`) foi **o único teste a falhar** quando esta migração trocou a forma do CI, e sem ela a troca teria deixado o gate verde por não achar o que verificar.

### 4. O que continua fora do alcance mecânico — declarado

Igual ao ADR-0058 §4, e pela mesma razão: **se o major é o LTS recomendado** exige consultar a rede, e o gate local é offline e determinístico por desenho. Um repositório inteiro coerente numa versão EOL passa em todos os gates.

A **pendência de CI agendado** declarada no ADR-0058 segue aberta e não é fechada aqui.

O **digest** do `FROM` também não é cobrado: a tag é reconstruída upstream a cada patch de Debian, e um gate tag↔digest nasceria vermelho no primeiro rebuild. Digest errado falha o build com `manifest unknown` — ruidoso, na hora.

> **Observação, não norma — e datada de propósito:** na data desta decisão o `.nvmrc` passou de `24.16.0` a `24.21.0`, e as cinco derivadas foram alinhadas no mesmo diff. Este ADR **não** escreve a versão-alvo em ponto normativo algum: fazê-lo repetiria o defeito que o ADR-0058 §2 corrigiu, e que a alternativa B dele registrou como rejeitada.

## Consequências

### Positivas

- **Subir o runtime passa a ser editar um arquivo.** As cinco derivadas são conferidas por gate; esquecer uma fica vermelho em vez de ficar invisível por dois meses.
- **O CI deixa de escolher sozinho.** `node-version-file` acaba com a classe de defeito em que o runner troca de runtime sem diff e sem aviso.
- **A divergência de minor passa a ser detectável.** Era o vão exato por onde dev `24.16.0` e produção `24.15` conviveram com o gate verde.
- **Os pontos que a §2 omitia entram na cobertura.** `.nvmrc` e `devEngines` eram os únicos com versão exata e eram os dois que ninguém conferia.
- **O `LABEL` e o `@types/node` entram junto.** Um label divergente manda Trivy/Scout/Snyk auditar uma imagem que não está no ar; `@types/node` de outra major faz o typecheck aprovar API que não existe em execução.

### Negativas, declaradas

1. **Mais um ponto de falha no CI.** Se o `.nvmrc` for apagado ou malformado, todo workflow com `setup-node` falha de uma vez. É falha ruidosa e imediata, e o gate cobra a forma do arquivo — mas o acoplamento é real e substitui N falhas independentes por uma central.
2. **`node-version-file` exige `actions/setup-node` v4+.** O repositório está em v6.4.0, pinado por SHA; a restrição é satisfeita hoje e passa a ser requisito para qualquer downgrade da action.
3. **O Dockerfile e o `devEngines` ainda escrevem o número.** A derivação é **conferida**, não **gerada** — ver alternativa C. Duas cópias permanecem, e o que muda é que agora elas falham quando divergem.
4. **A granularidade heterogênea é carga cognitiva.** Quem sobe a versão precisa saber que o Dockerfile leva `major.minor` e o `devEngines` leva a exata. O gate diz qual está errada, mas a assimetria existe porque os alvos a impõem.

### Neutras

- A escolha de **Node como runtime** (ADR-0002) e o critério de **acompanhar o LTS recomendado** (ADR-0058 §1) não são reabertos. Este ADR muda **onde** a versão vive e **como** a concordância é cobrada.
- A §2 é enunciada para o runtime Node. O **pnpm** continua sob o seu próprio arranjo de três pontos (`packageManager`, `engines.pnpm`, `ENV PNPM_VERSION`, cobrado por `tests/cleanup/supply-chain-settings.test.ts`), e **não** há aqui decisão de unificar os dois modelos — seria ADR próprio.

## Alternativas Consideradas

### A. Manter o literal do ADR-0058 (`node-version` no CI)

Rejeitada. Não escrever ADR é tentador porque o ADR-0058 é recente e bem construído, mas manter `node-version: '24'` preserva metade do defeito: o CI continua flutuando a cada release upstream, e a divergência de minor — a que de fato ocorreu — continua fora do alcance do gate.

### B. Pinar o valor exato nos workflows (`node-version: 24.21.0`)

Rejeitada, e é a alternativa que parece mais segura. Resolve a flutuação e respeita o literal da §2, mas cria **quatro cópias novas** do número: cada subida passaria a tocar oito lugares em vez de cinco. Cópia de número é a causa raiz desta divergência, e a resposta não pode ser multiplicá-la.

### C. Gerar as derivadas por script a partir do `.nvmrc`

Rejeitada **por ora**, e é a alternativa mais forte. Um `scripts/ci/sync-node-version.ts` eliminaria as duas cópias restantes (Dockerfile, `devEngines`) em vez de apenas conferi-las. Fica fora porque o `FROM` carrega **digest**, que não é derivável do `.nvmrc` — precisa de `docker buildx imagetools inspect`, isto é, de rede e de Docker no caminho. Um gerador que resolve duas das três partes da linha e deixa a terceira para o humano é mais frágil que um conferidor que cobra as três. Candidata a reabrir quando houver resolução de digest offline no CI.

### D. Deixar a política na rule de supply-chain, sem ADR

Rejeitada, pela mesma razão que o ADR-0058 rejeitou a sua alternativa D: `.claude/rules/` é regra operacional por path e não carrega *ratio legis*. A razão desta decisão — "fonte única em vez de N cópias concordantes" — é o conteúdo mais valioso dela, e supersedir parcialmente um ADR aceito exige ADR, não rule.

## Gatilho de reavaliação

Este ADR **MUST** ser reaberto por um ADR que o supersede se **qualquer uma** destas ocorrer:

1. Surgir resolução de digest offline que torne a alternativa C viável — a derivação passa de conferida a gerada, e a §3 muda de conteúdo.
2. O `actions/setup-node` descontinuar `node-version-file`, tornando a §2 inaplicável ao CI.
3. O projeto adotar runtime sem equivalente a `.nvmrc`, tornando a §1 sem alvo.
4. A granularidade heterogênea da §2 provar-se fonte de erro recorrente — isto é, se o gate acusar repetidamente a mesma confusão entre `major.minor` e versão exata, indicando que o arranjo pede geração em vez de conferência.
