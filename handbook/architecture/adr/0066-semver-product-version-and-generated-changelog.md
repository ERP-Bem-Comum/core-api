[← Voltar para ADRs](./README.md)

# ADR-0066: A versão do produto é SemVer no `package.json` com tag anotada `vX.Y.Z`, e o CHANGELOG é derivado do git — `1.0.0` é a promessa de contrato, não um rótulo de marketing

- **Status:** Accepted
- **Date:** 2026-08-25 (aceito no mesmo dia pelo Tech Lead)
- **Deciders:** Gabriel Aderaldo (Tech Lead) — escolha de promover por `1.0.0-rc.1` antes do GA, e aceite da política · agente assistente — levantamento, pesquisa de terminologia e redação
- **Relacionado:** [ADR-0033](./0033-api-versioning-v1-legacy-mirror.md) (versionamento da API **por recurso** — eixo distinto deste) · [ADR-0054](./0054-ai-assisted-contribution-policy.md) (trailer `Assisted-by`) · issue [#873](https://github.com/ERP-Bem-Comum/core-api/issues/873) (o que bloqueia a promoção a produção) · issue [#826](https://github.com/ERP-Bem-Comum/core-api/issues/826) (BREAKING já mergeado na `dev`)

---

## Contexto

### O que existe hoje, medido em 25/08/2026

O repositório **nunca marcou uma versão**. O levantamento, contra `origin/dev@45b74d2e`:

| | estado |
| --- | --- |
| Tags de versão | **zero** — as 17 tags existentes são `archive/*`, `backup/*`, `legacy/*`, `checkpoint-*`: arquivamento de branch |
| Releases no GitHub | **zero** (`gh release list` vazio) |
| `package.json` | `"version": "0.1.0"`, sem script de release, changelog ou tag |
| `CHANGELOG.md` | não existe |
| `main` (dispara o deploy de produção) | último commit `9acf6db1`, **23/07/2026** |
| `dev` → `main` | **572 commits**, ou **192** contados por `--first-parent` (as unidades revisadas em PR) |

Não há ADR sobre versão de produto. O ADR-0033 existe e versiona **a API por recurso** (`/api/v1` congelado espelhando o legado, `/api/v2` greenfield) — é outro eixo, e a ausência de norma sobre o primeiro fez os dois serem confundidos.

### A terminologia que motivou este ADR

O pedido original falava em publicar `1.0.0-RELEASE` ou "LTS". Ambos os termos, aplicados aqui, produzem o oposto do pretendido:

- **`1.0.0-RELEASE` não é SemVer.** A regra 9 de [semver.org](https://semver.org/lang/pt-BR/) define que tudo após o **hífen** é *pré-lançamento*, e pré-lançamento tem precedência **menor** que a versão limpa: `1.0.0-RELEASE` **<** `1.0.0`. A forma vem do ecossistema Maven/Spring (`1.0.0.RELEASE`, com **ponto**), onde a semântica é outra. Publicá-la aqui declararia a release como anterior ao próprio 1.0.0 para qualquer resolvedor de dependência.
- **LTS não é número de versão** — é política de suporte. Node.js e Ubuntu a declaram porque mantêm **várias linhas vivas em paralelo**, com compromisso de backport por anos. Este produto tem **um** ambiente de produção e **um** cliente. Declarar LTS seria prometer manutenção de linha antiga que ninguém vai executar.
- O termo correto para "o beta virou produção" é **GA (General Availability)**, e o número dele é `1.0.0` — regra 5: *"Versão 1.0.0 define a API como pública"*.

O `0.1.0` estava **correto** até aqui: pela regra 4, `0.y.z` significa que a API pública **não deve ser considerada estável** e qualquer coisa pode mudar. Foi sob essa licença que o [#826](https://github.com/ERP-Bem-Comum/core-api/issues/826) (`expectedDueDate` obrigatório no PATCH de vencimento) entrou na `dev` como quebra de contrato legítima.

## Decisão

**D1 — SemVer 2.0.0 é a norma para a versão do produto**, declarada em `package.json#version`. Sufixo de pré-lançamento usa a escada `-alpha.N` → `-beta.N` → `-rc.N` → sem sufixo (GA). Nenhuma outra forma — em particular, nada de `.RELEASE`, `.FINAL`, `-LTS` ou `-stable`.

**D2 — Este eixo é independente do ADR-0033.** A versão do produto não altera prefixo de rota, e a criação de `/api/v3` não implica major do produto. São duas promessas a públicos diferentes: `package.json#version` fala do artefato entregue; o prefixo fala do contrato de cada recurso.

**D3 — `1.0.0` é uma promessa e tem custo.** A partir dele, quebrar contrato de recurso publicado exige `2.0.0` ou a manobra de coexistência do ADR-0033. Enquanto a `0.y.z` valeu, quebrar era barato; depois do GA, não é mais. É o motivo de a promoção passar por `-rc.N` primeiro.

**D4 — A tag é anotada, com prefixo `v`, e aponta para o commit promovido**: `git tag -a v1.0.0-rc.1 -m '…'`. Anotada, não leve, porque tag leve não guarda autor, data nem mensagem — e a tag é o único registro imutável de qual árvore foi a produção. O espaço `v*` é novo e não colide com os prefixos de arquivamento (`archive/*`, `backup/*`, `legacy/*`).

**D5 — O `CHANGELOG.md` é GERADO, nunca redigido.** `pnpm release:notes` o deriva de `git log --first-parent`, via `scripts/ci/release-notes.ts`. Editar o arquivo à mão é anti-padrão: a próxima geração sobrescreve, e um changelog divergente do histórico é registro que mente sobre o código — o defeito que o CLAUDE.md trata como invariante.

**D6 — O gerador erra para MOSTRAR.** Quando a classificação de uma entrada é ambígua — tipo `chore`, escopo desconhecido ou ausente — ela sai em seção visível, não em "Interno". A regra enumera os escopos de **processo** (`harness`, `handbook`, `ci`, `adr`, …) justamente para que módulo novo, ausente de qualquer lista, caia do lado visível. O caso que a motivou está neste range: `chore(financial): a rota de download da remessa passa a existir em todo ambiente` ([#855](https://github.com/ERP-Bem-Comum/core-api/pull/855)) é mudança de comportamento em produção que expõe cadastro bancário, e o prefixo do commit a chamaria de tarefa interna.

**D7 — O que o gerador não classifica sai NOMEADO no documento**, na seção "Não classificado", com sha e assunto. Descarte silencioso produziria um CHANGELOG que se lê como completo sem ser — e essa é a forma de registro mentiroso que não deixa sintoma. Na primeira execução foi exatamente esse relatório que revelou um defeito do parser: 30 dos 192 merges eram *squash* (mensagem no assunto) e não *merge commit* (mensagem no corpo), e estavam sendo perdidos.

**D8 — A CAPACIDADE entra na `dev`; a DECLARAÇÃO só no ato da promoção.** Este ADR, o gerador e sua suíte são infraestrutura: podem viver na `dev` indefinidamente sem afirmar nada sobre o artefato. Já `package.json#version` e o `CHANGELOG.md` **são** afirmações sobre o artefato, e por isso ficam fora da linha de trabalho até o momento em que a árvore é de fato promovida.

O motivo é concreto: mergear `1.0.0-rc.1` na `dev` faria a `dev` declarar-se uma release-candidate, e todo commit posterior nasceria nominalmente **dentro** de uma rc que não o contém — um registro que mente sobre o código pela via da data, não do conteúdo. Na promoção, o operador roda `pnpm release:notes`, faz o bump e cria a tag no mesmo commit. `package.json#version` permanece em `0.1.0` na `dev`, e isso é **correto** enquanto nenhuma versão tiver sido publicada.

**D9 — Este ADR não autoriza a promoção a produção.** A `1.0.0-rc.1` marcará a árvore candidata; o que a libera para `main` são os critérios da [#873](https://github.com/ERP-Bem-Comum/core-api/issues/873), incluindo o CA0 — se o RBAC vai a produção em `bypass` (hoje fixado em `src/server.ts:161`) ou `enforced`.

**D10 — A cerimônia de validação roda EM PRODUÇÃO, e por isso a promoção a `main` a precede.** É decisão da equipe de negócio que a conexão **ponta a ponta — do sistema até a VAN** — seja demonstrada no ambiente de produção. Isso fixa a sequência, e ela é o inverso da leitura intuitiva:

1. **Resolver o CA0 da #873** — o RBAC vai a produção em `bypass` ou `enforced`.
2. **Promover a `-rc.N` para `main`**, que é o deploy de produção (`compose.yaml` gera os taskdefs; job `migrate` antes de promover os Services, invariante do ADR-0003).
3. **Executar a cerimônia em produção**, demonstrando o caminho completo até a VAN.
4. **Declarar o GA** — bump para `1.0.0` e tag, sobre a **mesma árvore** que a cerimônia validou.

A cerimônia **não é pré-condição da promoção; a promoção é pré-condição da cerimônia.** Quem lê "validação antes de publicar" e inverte a ordem planeja o release errado.

É exatamente para isto que a escada de pré-lançamento de D1 existe. Uma release candidate **vai a produção sendo candidata** — é o que a distingue de um GA prematuro: o que está no ar tem nome que declara "ainda não validado". Se a cerimônia reprovar, o recuo se chama `-rc.2` e o `1.0.0` continua intacto (§D3). Aprovada, o passo 4 não toca `src/`, de modo que a árvore validada seja **byte a byte** a publicada — é essa identidade que a cerimônia certifica, e ela se perde se o código andar entre os passos 3 e 4.

> ⚠️ **Duas consequências que a ordem acima torna inevitáveis, e que o §D9 apenas apontava.** Como o passo 2 põe o sistema em produção *antes* da validação, o CA0 deixa de ser questão de release e vira **pré-requisito de deploy**: com `bypass`, todo usuário autenticado em produção é super-usuário em toda rota, inclusive a que enfileira pagamento. E a cerimônia do passo 3, sendo *ponta a ponta até a VAN* em produção, esbarra no CA2 da [#873](https://github.com/ERP-Bem-Comum/core-api/issues/873): gravar no `saida/` do bucket **é** enfileirar pagamento ([ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md)). Uma demonstração ponta a ponta real precisa de combinação prévia sobre valor, favorecido e reversão — não é um teste que se decide na hora.

## Consequências

- A `dev` ganha a capacidade de produzir a release sem declarar nenhuma. Medido na árvore candidata de 25/08, `pnpm release:notes` classifica **191 das 192** unidades de entrega e nomeia a restante, com as **2 quebras de contrato** do range ([#825](https://github.com/ERP-Bem-Comum/core-api/pull/825), [#811](https://github.com/ERP-Bem-Comum/core-api/pull/811)) reunidas em seção própria pela primeira vez fora do `git log`. O arquivo em si nasce na promoção (D8).
- A promoção passa a ter duas etapas nomeadas: marcar `-rc.N` na árvore candidata e, após o aceite, publicar `1.0.0` **sem tocar em `src/`** — só bump, geração e tag. Um recuo tem nome em vez de virar `1.0.1` queimado.
- `PROCESS_SCOPES` em `scripts/ci/release-notes.ts` vira lista mantida. Acrescentar escopo a ela é ato deliberado, visível em diff de PR — e errar por omissão custa ruído, nunca omissão.
- A suíte `tests/scripts/release-notes.test.ts` trava a assimetria de D6 nos dois sentidos, incluindo escopo inexistente e escopo nulo.

## Alternativas rejeitadas

- **`1.0.0-RELEASE` / `1.0.0.RELEASE`** — inverte a precedência (D-contexto). Rejeitada por incorreção, não por estilo.
- **Declarar LTS** — promete suporte a linha antiga sem ninguém para mantê-la, num produto de um ambiente e um cliente.
- **Ir direto a `1.0.0`** — possível e mais simples, mas queima o número se a validação da remessa no Validador Universal (CA6 da #873) reprovar; o recuo viraria `1.0.1` e o `1.0.0` ficaria na história como release que não serviu.
- **CHANGELOG redigido à mão** — é o modo de falha que este repositório já catalogou em outra frente: artefato que descreve o que o código não faz.
- **Derivar o changelog de todos os 572 commits** — devolve o ruído interno das branches. `--first-parent` devolve as 192 unidades que passaram por revisão, que é o que um changelog de release descreve.
