[← Voltar para ADRs](./README.md)

# ADR-0063: O título é a unidade de escrita — compare-and-swap pela pré-condição da operação, não pela versão do documento

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Gabriel Aderaldo (Tech Lead) — hipótese original, escolha do CAS por valor e do conflito explícito · agente assistente — levantamento, implementação e medição
- **Relacionado:** [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox na mesma transação) · [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (features SQL permitidas) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (read-model derivado) · rules [`domain.md`](../../../.claude/rules/domain.md) e [`adapters.md`](../../../.claude/rules/adapters.md)
- **Realizado em:** PRs [#825](https://github.com/ERP-Bem-Comum/core-api/pull/825) (`7bff729b`) e [#827](https://github.com/ERP-Bem-Comum/core-api/pull/827) (`10a341e0`)

---

## Contexto

O `financial` tratava `Document` como o agregado e `Payable` como entidade interna. A consequência prática era que **toda escrita passava pelo `save` do documento**, mesmo quando o documento não mudava.

Duas operações tornam isso concreto, e o próprio código as denunciava por escrito. De `register-manual-payment.ts`:

> _"before = Approved; **after = mesmo documento (status inalterado)** com o título alvo Pago."_

`registerManualPayment` e `updatePayableDueDate` alteram **um título** e nada mais. Ainda assim chamavam `DocumentRepository.save` com `expectedVersion`, o que dispara `SELECT … FOR UPDATE` na PK do documento, `UPDATE fin_documents` com `version + 1` e a varredura das três tabelas filhas.

### O critério que já apontava para o título

Evans define raiz de agregado por **quem é referenciado de fora por identidade**. Medido no schema, **quatro** tabelas guardam `payable_id`:

| Tabela | Como referencia |
| :--- | :--- |
| `fin_payable_view` | como **PK** do read-model inteiro |
| `fin_reconciliation_items` | na PK composta |
| `fin_rejected_suggestions` | em índice único |
| `fin_remittance_payables` | com **FK real** |

Pelo critério canônico, o título já era raiz — o repositório é que seguia tratando-o como linha-filha descartável.

### Quatro sintomas, uma causa

A unidade de escrita era maior que a unidade de mudança, e isso apareceu de quatro formas independentes:

| Sintoma | Como nasce do boundary errado |
| :--- | :--- |
| Deadlock ([#803](https://github.com/ERP-Bem-Comum/core-api/issues/803)) | replace de conjunto endereçado por FK → gap lock em índice não-único |
| Pagamento em dobro ([PR #794](https://github.com/ERP-Bem-Comum/core-api/pull/794)) | id do título regenerado porque "é filho, ninguém referencia" |
| Status derivado na leitura e próprio na escrita | `findPaged` calcula `Reconciled` somando títulos; o documento não tem esse estado |
| Conflito de versão falso | dois operadores em títulos **irmãos** colidiam em `document-version-conflict` sem disputa real |

---

## Decisão

### 1. Operação que altera apenas o título escreve pelo `PayableRepository`

Port próprio (`domain/payable/repository.ts`), com escrita `UPDATE … WHERE id = ?` — chave primária, record lock, sem faixa. `fin_documents` não é tocado; as tabelas de retenção e imposto não são varridas; **nenhum `DELETE` é emitido**, logo não há gap lock a disputar.

O `DocumentRepository` **permanece** como port de leitura e como dono das operações que de fato alteram o documento (`adjust`, `approve`, `submit`, `cancel`). O que saiu foi a escrita de quem não o altera — não o agregado.

### 2. O controle de concorrência é CAS pela pré-condição da operação, não uma `version` genérica

O título **não** ganha coluna de versão. A escrita carrega no próprio `WHERE` a condição que a operação pressupõe, e `affectedRows = 0` significa que ela deixou de valer entre a leitura do cliente e a gravação.

⚠️ **As pré-condições são de naturezas diferentes, e traduzir uma na outra é o erro a evitar:**

| Operação | Natureza | Pré-condição |
| :--- | :--- | :--- |
| baixa manual | **transição** — ocorre uma vez; o estado de destino serve de guarda | `AND status = 'Approved'` |
| reagendamento | **atribuição** — ocorre N vezes legitimamente | `AND due_date = :lido_pelo_cliente` |

Para o reagendamento não existe estado nomeado que distinga "já reagendei" de "ainda não". Um `WHERE status IN (…)` aceitaria toda escrita e devolveria **last-write-wins mudo**, justamente onde antes havia detecção.

**O valor comparado é o que o CLIENTE tinha na tela**, não o que o use case acabou de ler: ancorar na leitura do próprio use case protegeria só os milissegundos até o `UPDATE`; ancorar no que o cliente viu cobre a janela desde a tela.

`version` continua aceita no contrato HTTP por compatibilidade e **não participa** mais destas escritas — está marcado como tal nos dois use cases.

### 3. Conflito é explícito; idempotência silenciosa é recusada

`affectedRows = 0` devolve erro nomeado (409), nunca sucesso. Devolver sucesso engoliria junto uma segunda operação **legítima** — um título rebaixado e reaprovado no mesmo dia — e ela sumiria sem rastro. Em operação de caixa, *"não aconteceu nada e ninguém avisou"* é pior que um erro na tela.

### 4. Um slug por operação, porque a mensagem ao humano é por slug

`payable-payment-conflict` e `payable-reschedule-conflict`, ambos 409 com o mesmo code público. Nasceram como um slug único, e a mensagem — escrita para a baixa — chegava a quem tentava reagendar. **Neutralizar a frase seria a correção errada:** as duas terminam em ações diferentes do operador, e uma frase genérica o bastante para as duas não diz o que fazer em nenhuma.

---

## Medição

Concorrência não é verificável contra fake: o que se mede é o InnoDB sob escrita simultânea. Seis casos rodaram contra MySQL 8.4 real, em **dois ambientes independentes** (laboratório e runner do CI):

| Caso | Afirma |
| :--- | :--- |
| CA1 / CA4 | duas escritas concorrentes no mesmo título: exatamente uma vence |
| CA2 | escritas em títulos **irmãos**: as duas passam — o caso que o desenho antigo reprovava |
| CA3 | a `version` do documento **não se move** |
| CA5 | valor divergente **não grava** — prova que a comparação está no `WHERE` |
| CA6 | valor correto **grava** — separa "discrimina" de "recusa tudo" |

CA5 e CA6 existem em par de propósito: um `WHERE` com fuso mordido passaria em CA5 (recusa tudo) e falharia em CA6.

---

## Consequências

**Positivas:** o gap lock não tem onde acontecer nestas rotas; títulos irmãos deixam de disputar; a `version` do documento para de inflar sem mudança, tornando a trilha legível; e o `payable_id` ganha o tratamento de identidade que quatro tabelas já pressupunham.

**Negativas / custos:** `expectedDueDate` passou a ser **obrigatório** no `PATCH` de vencimento — mudança breaking de contrato, com o handoff em [#826](https://github.com/ERP-Bem-Comum/core-api/issues/826). E o repositório passa a ter **dois portos de escrita** para o mesmo espaço de dados, o que exige disciplina: escrita que altere documento **e** título continua indo pelo `save`.

---

## O que este ADR NÃO decide

**O `save` do documento segue fazendo hard replace** das tabelas filhas para as demais operações. A #803 o tornou seguro (não emite `DELETE` quando o conjunto não mudou; quando muda, apaga por PK), mas o padrão continua lá.

Três frentes ficam **abertas**, e nenhuma é decidida aqui:

1. **Retenções e impostos como write-once** — se auditoria da origem é imutável, correção vira retificação e o replace some. Tem decisão de negócio embutida (o que acontece com o histórico quando o operador corrige uma retenção?) e por isso não entra por inércia técnica.
2. **FK cross-aggregate** — `fin_payables` sai do documento por `CASCADE`; a rule [`adapters.md`](../../../.claude/rules/adapters.md) fixa `RESTRICT` para cross-aggregate. Mudar isso altera o comportamento do cancelamento de documento com título em remessa. Relacionado: [#790](https://github.com/ERP-Bem-Comum/core-api/issues/790).
3. **O mesmo padrão fora do `financial`** — [#810](https://github.com/ERP-Bem-Comum/core-api/issues/810) inventaria `DELETE` por coluna não-única seguido de `INSERT` em `auth`, `budget-plans` e `contracts`. Este ADR não os alcança; dá dois adapters de referência e a medição que faltava.
