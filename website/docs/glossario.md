---
sidebar_position: 99
slug: /glossario
title: Glossário
description: A linguagem ubíqua do projeto — o vocabulário compartilhado entre time técnico, P.O., gestores e auditoria.
---

# Glossário ubíquo

A **linguagem ubíqua** é o vocabulário compartilhado entre time técnico, P.O., gestores
e auditoria. Toda palavra abaixo deve aparecer **exatamente assim** em código, telas,
documentação e conversas. Quando o glossário e o código divergem, um dos dois está
errado.

## Contratos

**Aditivo (Amendment)**
Alteração formal a um contrato vigente. Tem um _kind_ (`Addition`, `Suppression`,
`TermChange`, `Misc`) e um _status_ de formalização. Só homologa com documento assinado.

**Estado Contratual Vigente**
O valor e o período correntes de um contrato — **derivados** de
`original + Σ aditivos homologados`, nunca editados direto.

**Homologação**
Ato que torna um aditivo efetivo, traduzindo-o em ajuste aplicado ao contrato. Exige
`signedDocumentRef` (RN-12).

**Timeline**
Read-model (projeção, ADR-0022) que reconstrói a história de um contrato a partir do
stream de eventos.

## Financeiro

**ACL (Anticorruption Layer)**
Camada que impede que termos de sistemas externos (CNAB, segmentos, posições) "sujem" o
domínio de negócio.

**Aprovador**
Perfil de governança com autoridade para "Selar" um documento e habilitar a geração de
títulos.

**Atrasado**
Status automático de um título `Transmitido` que ultrapassou D+1 sem confirmação de
saída bancária.

**Checksum / Hash**
Assinatura digital gerada na criação da remessa; garante que o arquivo enviado ao banco
é exatamente o que o sistema gerou.

**CNAB (240/400)**
Padrão de texto fixo para troca com bancos brasileiros. O Core não conhece este formato
— apenas a ACL.

**Crivo de Liquidação**
Ato de governança onde o Gestor confirma a conciliação. Obrigatório para mover um título
de `Pago` para `Liquidado`.

**Fato Gerador**
A raiz documental da obrigação financeira — o documento que dá origem à dívida.
Princípio central: **nada existe no financeiro sem um Fato Gerador**.

**FITID**
Identificador único da transação bancária; chave de unicidade na conciliação para
impedir lançamento duplicado.

**Reabertura**
Estorno do estado `Selado` para correções retroativas. Cancela títulos em aberto e
exige nova aprovação.

**Remessa / Retorno**
Remessa: arquivo CNAB enviado ao banco com ordens de pagamento. Retorno: arquivo
recebido confirmando o processamento (sucesso ou erro).

**Retenção na Fonte**
Imposto descontado do prestador e pago pelo tomador. Tipos: ISS, IRRF, INSS, CSRF.

**Saída Bancária**
O débito real na conta. **Soberano** sobre o arquivo de remessa — só a saída real move
o título para `Pago`.

**Selo / Selado**
Bloqueio administrativo que garante que o financeiro é fiel ao fiscal. Documento
`Selado` tem campos de valor imutáveis.

**Soberania do Documento**
Princípio de que o sistema reflete o que está escrito no papel/XML; o usuário ajusta,
mas o sistema sinaliza desvios.

**Time Travel (Trilha de Auditoria)**
Capacidade de auditar cada mudança de valor: "Quem, Quando, De, Para".

**Título Pai / Filho**
Pai: obrigação do valor líquido ao fornecedor. Filho: imposto derivado (ISS, IRRF,
INSS, CSRF), vinculado obrigatoriamente ao pai.

**VAN Bancária**
Túnel de comunicação de arquivos com o banco (escopo atual: Bradesco).

**Vigilante Fiscal**
Componente que sinaliza discrepâncias entre valor lido e alíquotas padrão — **sem
impedir** o fluxo.

## Convenções de status

| Domínio                 | Fluxo                                                                                        |
| :---------------------- | :------------------------------------------------------------------------------------------- |
| **Contrato**            | `Pending` → `Active` → `Expired` / `Terminated`                                              |
| **Documento (fin.)**    | `Aberto` → `Em_Aprovação` → `Selado` (com `Reaberto` como rollback)                          |
| **Título (fin.)**       | `Aberto` → `Aprovado` → `Transmitido` → `Pago` → `Liquidado` (`Recusado`/`Atrasado` desvios) |
| **Lote de Comunicação** | `Recebido` → `Processado` (ou `Falha_Layout`)                                                |

:::tip Fonte
Glossário completo do financeiro em `handbook/domain/08-glossario-ubiquo.md`; vocabulário
de contratos em `handbook/domain/contratos/`.
:::
