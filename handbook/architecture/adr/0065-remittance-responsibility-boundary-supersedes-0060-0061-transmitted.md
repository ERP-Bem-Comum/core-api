[← Voltar para ADRs](./README.md)

# ADR-0065: A responsabilidade pela remessa termina no bucket — o título vira `Transmitted` na geração, e o arquivo é baixável em produção sob permissão dedicada e registro de acesso (supersede parcial dos ADRs 0060 e 0061)

- **Status:** Accepted
- **Date:** 2026-08-24 (aceito no mesmo dia pelo Tech Lead, PR #840)
- **Deciders:** P.O. (lekadecastro) — decisão de produto sobre o significado de "transmitido" e sobre o download em produção · Gabriel Aderaldo (Tech Lead) — aceite da fronteira e do controle · agente assistente — levantamento e redação
- **Supersedes (parcial):** [ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) `:78-79` — a cláusula _"a transição para `Transmitted` passa a depender de sinal externo"_ deixa de valer para o **título**; segue valendo para a **remessa** (estado do transporte). [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) `:114` — _"o backend consegue decidir a transição de `Transmitted` a partir de um contrato explícito"_ passa a descrever só a remessa. **Tudo o mais nos dois ADRs — a rota por bucket, os cinco prefixos, o `status/` como única janela, a caixa do convênio — permanece vigente e é premissa deste.**
- **Conformidade com:** [ADR-0063](./0063-payable-is-the-write-aggregate-cas-by-precondition.md) (o título é a unidade de escrita; CAS pela pré-condição da operação) · [ADR-0052](./0052-rbac-bypass-flag.md) (bypass é total; o que sobrevive a ele é o que ele não desfaz depois)
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (adapter como ACL) · [ADR-0050](./0050-document-reader-cascade-supersedes-0034.md) (bytes pela API, nunca URL assinada) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (timeline por projeção) · issues [#792](https://github.com/ERP-Bem-Comum/core-api/issues/792), [#822](https://github.com/ERP-Bem-Comum/core-api/issues/822), [#59](https://github.com/ERP-Bem-Comum/core-api/issues/59), [#787](https://github.com/ERP-Bem-Comum/core-api/issues/787), [#823](https://github.com/ERP-Bem-Comum/core-api/issues/823), [#690](https://github.com/ERP-Bem-Comum/core-api/issues/690), épico [#756](https://github.com/ERP-Bem-Comum/core-api/issues/756)

---

## Contexto

### O que o código faz hoje (`dev@b0c63e6f`, 2026-08-24)

A remessa tem máquina de estados própria e fechada: `Queued → Transmitted | Failed → Discarded` (`src/modules/financial/domain/remittance/`). Ela **segura** os títulos que carrega enquanto não for descartada (`remittance.ts:106`, `holdsPayables`), e só sai de `Queued` quando o worker lê o envelope do `status/` (`application/use-cases/confirm-remittance.ts:119-120`). Esse desenho está certo e não muda aqui.

O **título**, porém, não tem transição alguma. `Transmitted` existe no enum (`domain/document/types.ts:38`) e está declarado _"reservado (sem transição)"_ (`:31`); o agregado `Document` é `Draft | Open | Approved` (`:130`); o `confirmRemittance` salva só a remessa (`:134`) e não conhece repositório de título; o read-model colapsa `Transmitted` em `Approved` (`domain/payable-view/types.ts:31-33`). O efeito, registrado na [#792](https://github.com/ERP-Bem-Comum/core-api/issues/792): depois de gerar e transmitir, **o operador vê "Aprovado"**, o pré-voo devolve o título como `ready`, e a recusa por `remittance-payables-already-held` só chega no último clique.

No `generateRemittance` a ordem é **registrar antes de enfileirar** (`generate-remittance.ts:198-228`): o `save` de criação reserva os títulos sob lock e grava a remessa (`:215`); o upload para `saida/` vem depois (`:224`); se o upload falha, sobra uma remessa `Queued` sem arquivo, prendendo títulos (`:228`) — hoje sem via de descarte, porque `discard` exige `Failed` (`remittance.ts:164`).

O download do arquivo que foi ao banco existe **só fora de produção** (`adapters/http/plugin.ts:1287`), sob `remittance:read`, e um teste **fixa** o 404 em produção (`tests/modules/financial/adapters/http/remittance-file-download.http.test.ts:139-155`). A justificativa registrada é legítima: o arquivo carrega o cadastro bancário de todos os favorecidos do lote.

### O que os ADRs 0060 e 0061 decidiram sobre `Transmitted`

O [ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) trocou o `exec()` síncrono pelo bucket e registrou o preço:

> _"**Gravar no bucket não é transmitir ao banco.** — **A transição para `Transmitted` passa a depender de sinal externo.** O estado já existe reservado no domínio (…); o que muda é que o momento da transição deixa de ser síncrono."_ (`0060:78-79`)

O [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) fechou o contrato do `status/` e listou como consequência positiva que _"o backend consegue decidir a transição de `Transmitted` a partir de um contrato explícito"_ (`0061:114`). Nenhum dos dois distingue **de qual** `Transmitted` fala — o da remessa ou o do título —, porque em 08/2026 só o da remessa existia. A decisão de 11/08 ("o documento só vira `Transmitted` ao ler o `status/`") foi a leitura mais conservadora dessa ambiguidade, e ficou codificada em `remittance.ts:97-106` e no `confirmRemittance`.

### A decisão de produto que muda a pergunta

Em 24/08/2026, diante das opções (A) transição na geração × (B) transição ao confirmar no `status/` × (C) estado intermediário, a P.O. decidiu, com o Gabriel:

> _"Assim que o usuário gerar a remessa e a responsabilidade da VAN entrar em vigor, já pode disparar TRANSMITIDO — pelo princípio de ACL (Vernon), a responsabilidade deixa de ser do sistema e passa a funções externas (VAN + instituição financeira), que validam ou não a remessa, acompanhada via site da instituição."_

Isto não é uma escolha de _timing_; é uma escolha de **fronteira**. O que o ADR-0060 chamou de "transmitir ao banco" é um fato do **transporte** — e o transporte é, por decisão do próprio 0060, um sistema externo operado por outro time. O que o título registra é outro fato: **a remessa saiu da alçada do core-api**. Vernon define a camada que separa os dois modelos:

> _"As a downstream client, create an isolating layer to provide your system with functionality of the upstream system in terms of your own domain model. This layer talks to the other system through its existing interface, requiring little or no modification to the other system. Internally, the layer translates in one or both directions as necessary between the two models."_
> — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 142 (definição de Anticorruption Layer, citando Evans)

"Em termos do nosso próprio modelo", `Transmitido` é _"entregue à VAN"_ — não _"confirmado pelo banco"_. O que o banco fez com o arquivo é dado do **retorno**, e a P.O. decidiu na mesma data ([#59](https://github.com/ERP-Bem-Comum/core-api/issues/59)) que o retorno é trilha posterior à habilitação da remessa: **`Pago` segue manual**, acompanhando o site da instituição.

### E o download

A P.O. decidiu em 21/08 ([#822](https://github.com/ERP-Bem-Comum/core-api/issues/822)) que produção **precisa** baixar a cópia do arquivo — é com ela que se confere com o banco quando há divergência, e essa necessidade é maior justamente onde o dinheiro é real. A pergunta que sobrou não é "abrir ou não"; é **sob que controle**. Com a fronteira acima, o download é a única forma de o operador ver **exatamente** o que saiu da alçada do sistema.

---

## Decisão

### 1. A fronteira: a responsabilidade do core-api pela remessa termina ao registrar e enfileirar em `saida/`

Do lado de cá da fronteira: montar, reservar títulos, consumir NSA, registrar a remessa, gravar o objeto em `saida/`. Do lado de lá: transmitir, confirmar, recusar, pagar. O `status/` continua sendo a única janela para o que acontece do lado de lá — mas o que ele informa é o desfecho do **transporte**, e é a **remessa** que o carrega.

### 2. O título vira `Transmitted` na geração, na mesma transação da reserva

No `generateRemittance`, o `save` de criação — que já reserva os títulos sob lock (`remittance-repository.drizzle.ts:217-298`, [#789](https://github.com/ERP-Bem-Comum/core-api/issues/789)) — passa a executar, **na mesma transação**, a transição de cada título reservado:

```sql
UPDATE fin_payables SET status = 'Transmitted' WHERE id = ? AND status = 'Approved'
```

CAS pela pré-condição da operação, sem coluna de versão, como manda o [ADR-0063](./0063-payable-is-the-write-aggregate-cas-by-precondition.md) §2. `affectedRows ≠ quantidade reservada` é conflito explícito e desfaz a transação inteira — inclusive a reserva e o NSA consumido não volta (regra já vigente).

- **O estado vive no título** (`fin_payables.status`), não no documento. O ADR-0063 fixou o título como unidade de escrita e é por título que a remessa segura (`findHeldPayables`). O valor `Transmitted` do enum do documento (`document/types.ts:38`) **permanece reservado e sem transição**; "documento transmitido" é leitura derivada — todos os títulos transmitidos —, no mesmo molde em que `Reconciled` já é derivado (`0063`, §"Quatro sintomas").
- **Um evento por título** na mesma transação: `PayableTransmitted { payableId, remittanceId, nsa, fileName, occurredAt }`, no outbox do `financial`, projetado na timeline ([ADR-0022](./0022-read-models-via-projection-over-event-stream.md)). É o marco que a [#823](https://github.com/ERP-Bem-Comum/core-api/issues/823) pede — "em qual remessa o título foi" — e o pré-requisito do CA4 dela.
- **A ordem "registrar antes de enfileirar" não muda.** Se o upload para `saida/` falhar depois da transação, o resultado é o de hoje — remessa `Queued` sem arquivo, `remittance-upload-failed` para o operador — com os títulos já `Transmitted`. A saída é o descarte (§4). É o mesmo "erra-se para menos" do use case: título preso por remessa que não saiu é visível e recuperável; título livre com arquivo a caminho do banco não é.

### 3. A remessa mantém sua máquina de estados — são dois fatos, não um

| Fato | Onde vive | Quem decide | Quando |
| :--- | :--- | :--- | :--- |
| "saiu da nossa responsabilidade" | `fin_payables.status = 'Transmitted'` | `generateRemittance` | na geração, transacionalmente |
| "o agente transmitiu / falhou" | `fin_remittances.status` (`Queued → Transmitted \| Failed`) | `confirmRemittance`, lendo o `status/` | quando o envelope chega (até 5 min + transmissão) |

O `Transmitted` da remessa continua dependendo de sinal externo, exatamente como o 0060 previu. O que este ADR corrige é que essa dependência **nunca deveria ter sido atribuída ao título**.

### 4. `Failed` não devolve; `Discarded` devolve

- **`Failed`** (o `status/` disse que não transmitiu): os títulos **permanecem** `Transmitted`. "Sem confirmação" não é "não transmitiu" — a regra de 11/08 segue de pé, e é o operador, pelo site do banco, quem sabe se o arquivo chegou.
- **`discard(reason)`** (decisão humana, motivo obrigatório): devolve cada título a `Approved` por CAS — `UPDATE fin_payables SET status = 'Approved' WHERE id = ? AND status = 'Transmitted'`, restrito aos títulos que **esta** remessa segura —, e emite `PayableTransmissionDiscarded { payableId, remittanceId, reason }`. Só então o título volta a ser candidato a remessa.
- **`discard` a partir de `Queued` sem arquivo** passa a ser permitido quando o objeto não existe em nenhum prefixo (`saida/`, `processados/`, `falhas/` — o bloco `storage.findRemittance` já existe em `download-remittance-file.ts:57`). É a via que falta para o "produtor 1" da [#787](https://github.com/ERP-Bem-Comum/core-api/issues/787); o resto daquela issue (varredura de `Queued` antiga) não é decidido aqui.

### 5. Pré-voo e grid dizem a verdade

- **Pré-voo:** título `Transmitted` volta na linha com status próprio `transmitted` (novo valor de `PreviewLineStatus`), nunca `ready` — CA2 da #792. A recusa deixa de chegar no último clique.
- **Read-model `fin_payable_view`:** deixa de colapsar `Transmitted` em `Approved` (`payable-view/types.ts:31-33`); o grid e os contadores (`/payable-titles/counts`) ganham o balde "Transmitido" — CA4 da #792.
- **Remessa `Failed`** aparece na lista de remessas como está hoje; o que muda é que os títulos dela dizem "Transmitido", não "Aprovado".

### 6. `Pago` continua manual — decisão da P.O. na #59

`payPayableManually` (`document.ts:338-344`, hoje "só `Approved` vira Pago") passa a aceitar **duas** origens, ambas transição por CAS: `status = 'Approved'` (pagamento fora da VAN — cheque, caixa, boleto avulso) e `status = 'Transmitted'` (VAN, conferido pelo operador no site do banco). É a mesma ação humana; não há slug distinto por origem. `Pago → Reconciliado` pela conciliação do extrato não muda. Quando o efeito do retorno ([#690](https://github.com/ERP-Bem-Comum/core-api/issues/690)) entrar, ele partirá de `Transmitted` — e este ADR já lhe dá o ponto de partida.

### 7. O arquivo da remessa é baixável em produção — sob permissão dedicada, com registro de acesso, bytes pela API

- **A rota `GET /financial/remittances/:id/file` é registrada em todo ambiente.** O `if (!isProductionEnv(…))` de `plugin.ts:1287` sai.
- **Permissão dedicada `remittance:download`**, separada de `remittance:read` (acompanhar) e de `remittance:generate` (disparar). Quem confere com o banco tem; o resto da operação não. Quem não tem recebe **403 com slug `remittance-download-forbidden`** — negar por decisão é diferente de não existir, e o front já distingue os dois (CA2 da #822).
- **Registro de acesso obrigatório:** cada download emite uma linha de log estruturado com `userId`, `remittanceId`, `objectKey` (com o prefixo — `falhas/` significa que o envio não completou), `contentHash` e instante. O dado sai, mas **nunca em silêncio**. Não há tabela nova: o log de produção é retido pela plataforma, e criar armazenamento próprio antes de alguém precisar consultá-lo seria construir para uma pergunta que ainda não existe (ver "Quando re-avaliar").
- **Os bytes continuam passando pela API**, com conferência de `contentHash` (divergente → `remittance-file-corrupted`) e `application/octet-stream` — os comportamentos do PR #784 permanecem (CA3 da #822). URL assinada fica rejeitada, pelo mesmo motivo que o [ADR-0050](./0050-document-reader-cascade-supersedes-0034.md) `:73` a rejeitou: o dado sai sem a verificação da API e a URL vaza para terceiros.
- **Semeadura:** a permissão nova entra pelo `sync-permissions` ([#462](https://github.com/ERP-Bem-Comum/core-api/issues/462), roda entre `migrate` e `http`), que hoje a concede apenas a `admin-sistema` ([#496](https://github.com/ERP-Bem-Comum/core-api/issues/496)); a concessão a outros papéis pertence ao redesenho do RBAC ([#634](https://github.com/ERP-Bem-Comum/core-api/issues/634)). Sob `AUTH_RBAC_MODE=bypass` ([ADR-0052](./0052-rbac-bypass-flag.md)) todo autenticado a tem — é o estado aceito hoje, e este ADR não o altera. O teste que fixa "em produção a rota NÃO EXISTE" (`remittance-file-download.http.test.ts:139-155`) é **invertido conscientemente**: o que passa a ser provado em produção é o 403 de quem não tem a permissão e o 200 de quem tem.

---

## Consequências

### Positivas

- **O operador vê o que aconteceu.** Título transmitido é distinguível de título aprovado no grid, no pré-voo e nos contadores — sem esperar o agente, sem esperar o banco.
- **A recusa chega antes do último clique.** O pré-voo deixa de prometer `ready` para título já em remessa.
- **Um significado por palavra.** `Transmitted` da remessa = o agente transmitiu; `Transmitted` do título = saiu da nossa alçada. Nenhum dos dois pede que o outro exista.
- **O caminho do `Pago` automático fica pronto**: quando o efeito do retorno entrar, parte de um estado que existe.
- **A trilha do título ganha o marco da remessa** (`PayableTransmitted` com NSA e nome do arquivo) — a #823 vira projeção do que este ADR grava.
- **O download em produção sai com o controle mais forte que o repositório sabe operar hoje** (permissão + rastro), sem inventar mecanismo novo.

### Negativas

- **"Transmitido" na tela não significa "o banco recebeu".** Um arquivo que o agente nunca transmitiu (remessa `Failed`, ou `Queued` sem arquivo) mostra títulos "Transmitidos" até alguém descartar. O operador precisa acompanhar a lista de remessas e o site do banco — a P.O. aceitou esse preço explicitamente. A [#787](https://github.com/ERP-Bem-Comum/core-api/issues/787) (sinal de `Queued` antiga) fica mais importante, não menos.
- **Descartar passa a ter efeito colateral em outro agregado** (os títulos). A operação continua exigindo motivo, e o CAS restrito aos títulos que a remessa segura impede que um descarte alcance título de outra remessa.
- **O arquivo com o cadastro bancário dos favorecidos passa a sair de produção por HTTP.** O controle é permissão + log, não impedimento. Quem tem a permissão e o token pode baixar; o rastro existe para auditoria, não para prevenção.
- **Enquanto o RBAC não for redesenhado**, `remittance:download` chega só a `admin-sistema` — em ambiente com bypass isso não aparece; em ambiente com RBAC ligado, quem não for admin recebe 403 até a concessão manual.

### Neutras

- O domínio segue sem conhecer transporte; a transição do título é decidida pelo use case com uma pré-condição de domínio (`Approved`), e a leitura do `status/` continua em adapter.
- O NSA consumido continua não voltando, em nenhum caminho.
- O `Transmitted` do documento continua reservado — não se remove valor de enum que uma migration com CHECK já conhece.

---

## Alternativas Consideradas

### A. Transição ao confirmar no `status/` (opção B da #792)

Coerente com a leitura literal do 0060/0061 e com o `Transmitted` da remessa. Rejeitada pela P.O. porque coloca a fronteira no lugar errado: o título ficaria "Aprovado" durante a janela de até 5 minutos mais a transmissão, e **para sempre** se o envelope nunca chegasse (o caso da #787) — o operador olharia a tela e não saberia se o arquivo saiu. Exigiria ainda propagar remessa → títulos no `confirmRemittance`, que hoje não conhece repositório de título.

### B. Estado intermediário "Em remessa" entre `Approved` e `Transmitted` (opção C da #792)

O mais explícito para a tela: "em remessa → transmitido → pago". Rejeitada pelo custo — valor novo no enum, CHECK de migration, projeções, read-model e front — e porque a P.O. não quer três estágios: "transmitido" já é o que ela quer ver assim que a remessa sai. O épico #756 evitou este caminho de propósito e este ADR mantém a escolha.

### C. Transição depois do upload, fora da transação da reserva

Semanticamente mais próxima de "o objeto está em `saida/`", mas cria uma janela em que o arquivo está no bucket e o título ainda diz "Aprovado" — o inverso do defeito que este ADR corrige — e um segundo ponto de falha (upload ok, `UPDATE` falha) sem transação que o desfaça. Rejeitada: a reserva já é o ponto em que o sistema se compromete (NSA consumido, remessa registrada), e é ali que o título muda.

### D. Manter o título em `Approved` e derivar "transmitido" só na leitura (JOIN com `fin_remittance_payables`)

Zero escrita nova; o read-model calcularia o estado. Rejeitada porque o **pré-voo** e o `payPayableManually` precisam do estado como pré-condição de escrita — derivar na leitura devolveria exatamente o "status derivado na leitura e próprio na escrita" que o ADR-0063 listou como sintoma do boundary errado.

### E. Download: registrar a rota sem controle novo

Zero trabalho; reabre o que o gate fechou de propósito e transforma `remittance:read` (acompanhar remessas) em licença para exportar cadastro bancário. Rejeitada.

### F. Download: URL assinada de curta duração

Os bytes não passariam pela API. Rejeitada pelo motivo do ADR-0050 `:73` (vazamento a terceiros) e porque perderia a conferência de `contentHash` — o operador baixaria um objeto que a API não validou.

### G. Download: só permissão, sem registro; ou só registro, sem permissão

Só permissão: o dado sai em silêncio para quem a tem. Só registro: qualquer `remittance:read` exporta o lote inteiro, com rastro mas sem alçada. Rejeitadas; os dois controles respondem a riscos diferentes e custam pouco juntos.

---

## Quando Re-avaliar

- **Quando o efeito do retorno (#690) entrar:** `Pago` automático a partir de `Transmitted`; este ADR não precisa mudar, mas a §6 ganha um segundo caminho.
- **Se o piloto mostrar remessas `Failed` ou `Queued` sem arquivo ficando dias com títulos "Transmitidos"** sem que ninguém descarte — sinal de que "acompanhar pelo site" não está acontecendo; a #787 (alerta de `Queued` antiga) sobe de prioridade e pode exigir um dead-man específico da remessa, que o [ADR-0062](./0062-deadman-switch-decommissioned-supersedes-0042.md) deixou descoberto.
- **Se alguém precisar consultar quem baixou o quê** (auditoria, LGPD): o log estruturado vira tabela `fin_remittance_file_access` projetada por evento, no molde do ADR-0022. Não antes.
- **Quando o RBAC for redesenhado (#634):** `remittance:download` pode ganhar alçada por valor ou por conta-cedente; este ADR fixa só a existência da permissão e o 403 nomeado.
- **Se o banco entregar caixa de homologação:** nada muda aqui — a fronteira é a mesma em homologação e em produção; o que muda é o bucket.

---

## Referências

- [ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) `:78-79` — a cláusula superseded para o título; a rota por bucket permanece.
- [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) `:114` — idem; o contrato do `status/` permanece.
- [ADR-0063](./0063-payable-is-the-write-aggregate-cas-by-precondition.md) — título como unidade de escrita; CAS por pré-condição.
- [ADR-0050](./0050-document-reader-cascade-supersedes-0034.md) `:73` — URL assinada rejeitada.
- [ADR-0052](./0052-rbac-bypass-flag.md) — bypass total; [#462](https://github.com/ERP-Bem-Comum/core-api/issues/462) / [#496](https://github.com/ERP-Bem-Comum/core-api/issues/496) / [#634](https://github.com/ERP-Bem-Comum/core-api/issues/634) — semeadura e concessão de permissão.
- Vaughn Vernon, _Implementing Domain-Driven Design_, p. 142 — definição de Anticorruption Layer (citação via `acdg-skills`, `ddd--vernon-livro-vermelho.md:2331`).
- `src/modules/financial/domain/remittance/remittance.ts` (`:106`, `:157-165`) · `application/use-cases/generate-remittance.ts` (`:198-228`) · `application/use-cases/confirm-remittance.ts` (`:119-134`) · `domain/document/types.ts` (`:31,38,130`) · `domain/payable-view/types.ts` (`:31-33`) · `adapters/http/plugin.ts` (`:1273-1291`) · `tests/modules/financial/adapters/http/remittance-file-download.http.test.ts` (`:139-155`).
- Issues [#792](https://github.com/ERP-Bem-Comum/core-api/issues/792) (decisão de 24/08, com o menu de trade-offs) · [#822](https://github.com/ERP-Bem-Comum/core-api/issues/822) (decisão da P.O. de 21/08) · [#59](https://github.com/ERP-Bem-Comum/core-api/issues/59) (`Pago` manual) · [#787](https://github.com/ERP-Bem-Comum/core-api/issues/787) · [#823](https://github.com/ERP-Bem-Comum/core-api/issues/823) · [#690](https://github.com/ERP-Bem-Comum/core-api/issues/690) · [#756](https://github.com/ERP-Bem-Comum/core-api/issues/756).
