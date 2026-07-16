# W0 — Testes RED (#454 gap 3)

> Agente: `tdd-strategist` · Resultado: **RED** · 4 arquivos, 33 casos · **0 pass**.

## Arquivos

| Arquivo | CAs | Camada |
| :--- | :--- | :--- |
| `domain/cost-structure/edit-nodes.test.ts` | CA1/CA2/CA3/CA4/CA5/CA7 | unit (árvore pura) |
| `adapters/persistence/cost-structure-repository.suite.ts` (+2) | round-trip do `active` | contract (**2** adapters) |
| `adapters/persistence/cost-structure-deactivate.drizzle-mysql.test.ts` | CA8 | integração (MySQL real, opt-in) |
| `adapters/http/cost-structure-edit.routes.test.ts` | CA1/CA2/CA3/CA4/CA5/CA6/CA7 | borda (`fastify.inject`) |

## O mesmo falso-verde do #453 — e de novo o W0 pegou em si

Os **dois casos de CA6** (`nó inexistente → 404`) passaram de primeira: sem a rota, o **404 é o do
Fastify**, indistinguível do 404 do domínio. Teriam ficado verdes sem nada implementado.

Corrigido: exigem `error.code === 'cost-node-not-found'`. Agora **0 pass**.

> É a 2ª vez nesta sessão que um teste de "recurso ausente → 404" nasce verde. Vale como padrão:
> **em rota que ainda não existe, 404 nunca é evidência** — tem que assertar o código do envelope.

## O CA4 é o teste que separa as duas semânticas de cascata

D2 (decisão do Gabriel): desativar um Centro **não** grava nos filhos — eles ficam inativos por
**herança**, e a leitura entrega o efetivo.

O CA4 é o que distingue isso de cascata-na-escrita: desativa a subcategoria **à mão**, desativa o
Centro, reativa o Centro → a categoria volta (nunca foi desativada) e **a subcategoria continua
inativa**. Com cascata na escrita esse caso é impossível de acertar: ou tudo volta (revivendo o que
o usuário desativou de propósito) ou nada volta.

Complementos que fecham a semântica:
- `D2: desativar o Centro NÃO grava active=false nos filhos` — trava a escrita no domínio.
- `active faz round-trip por nó` (suíte) — a **persistência guarda a intenção, não o efetivo**. Se
  o repo gravasse o efetivo, o CA4 seria irrecuperável.
- `CA3: Categoria inativa → a irmã segue ativa` — a herança desce, não se espalha lateralmente.
- `withInheritedActive é pura` — não altera a árvore recebida (o efetivo é view, não estado).

## CA8 é risco concreto, não hipótese

A escrita da árvore é **replace-all** (apaga os nós do plano e reinsere) e
`bgp_budget_results.subcategoryId` aponta para subcategorias **sem FK**. Se o replace-all
reinserisse com id novo, os lançamentos ficariam órfãos — o **mesmo defeito** que o #453 gastou uma
transação inteira para evitar, por outro caminho. O teste vai pelo `mutate` (caminho real) e verifica
`bgp_budget_results` **e** que o id da subcategoria sobreviveu.

## CA5 — a precedência que interessa

`PATCH` num plano `APROVADO` cujo nó nem existe → **409**, não 404: o guard de status roda **antes**
de procurar o nó. É o comportamento herdado dos `add*` (`guardEditable` é a 1ª linha), e o teste
trava isso — senão um refactor poderia inverter a ordem e vazar a existência de nós de plano
aprovado.

## Decisões cobertas

- **D1 (sem DELETE)** — não há teste de exclusão porque não há exclusão. O CA8 é o que sustenta a
  decisão: nó com lançamento não pode sumir.
- **D2 (herança)** — CA3/CA4 + o teste de escrita.
- **D3 (reativar)** — `desativar e reativar volta ao estado anterior`.
- **D4 (aprovado bloqueia)** — CA5 no domínio e na borda.

## Gating

O caso MySQL fica atrás de `MYSQL_INTEGRATION=1`. Validação em container **descartável** no W1/W3 —
`test:integration:*` **destrói a infra dev**.

## Próxima wave

**W1** — `ts-domain-modeler` (árvore) + `drizzle-schema-author` (migration do `active`).
