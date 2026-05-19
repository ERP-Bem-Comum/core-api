# 📖 Glossário Ubíquo do Sistema

> **Linguagem Ubíqua** (Ubiquitous Language) é o vocabulário compartilhado entre time técnico, P.O., Gestores e Auditoria. Toda palavra deste glossário deve aparecer **exatamente assim** em código, telas, documentação e conversas.

---

## A

**ACL (Anticorruption Layer)**
Camada técnica que impede que termos de sistemas externos (CNAB, Segmentos, Posições) "sujem" o domínio de negócio. Ver `05-integracao-bancaria-context.md`.

**Aprovador**
Perfil de governança com autoridade para "Selar" um documento e habilitar a geração de títulos. Único ator capaz de mover um título de `Aberto` para `Aprovado`.

**Atrasado**
Status automático atribuído a um título `Transmitido` que ultrapassou D+1 sem confirmação de saída bancária.

## C

**Checksum / Hash**
Assinatura digital gerada no momento da criação da remessa. Garante que o arquivo enviado ao banco é exatamente o mesmo que o sistema gerou.

**CNAB (240/400)**
Padrão de texto fixo para troca de informações com bancos brasileiros. O Core não conhece este formato — apenas a ACL.

**Crivo de Liquidação**
Ato de governança onde o Gestor confirma que a conciliação sugerida pelo sistema está correta. Obrigatório para mover um título de `Pago` para `Liquidado`.

## D

**Documento Fiscal**
Agregado raiz do BC de Documentos. Pode ser NFSe, DANFE, Recibo ou Fatura. É o "Fato Gerador".

## F

**Fato Gerador**
A raiz documental da obrigação financeira — o documento (Nota Fiscal, Recibo) que dá origem à dívida. Princípio central do sistema: **nada existe no financeiro sem um Fato Gerador**.

**FITID**
Identificador único da transação bancária. Usado como chave de unicidade na conciliação para impedir que um pagamento de R$ 100,00 seja lançado duas vezes se o arquivo for reimportado.

## L

**Liquidação**
Estado final do título, onde o dinheiro saiu da conta e foi devidamente "casado" com o extrato. Exige autorização humana do Gestor.

## O

**OFX (Open Financial Exchange)**
Padrão internacional para extratos bancários. Formato primário de importação no sistema (com fallback para XLSX e PDF).

**Operador (de Contas a Pagar)**
Realiza a ingestão (OCR), o ajuste fino dos dados, a geração de remessas CNAB e o monitoramento de rejeições.

## P

**Pago (status)**
Status atingido **apenas** após confirmação de saída bancária real (extrato/retorno de liquidação). Não confundir com "sucesso de retorno CNAB".

## R

**Reabertura**
Procedimento de estorno do estado de `Selado` para permitir correções retroativas. Cancela títulos em aberto e exige nova aprovação.

**Recusado**
Status atribuído a um título cujo banco identificou erro de cadastro/processamento. Exige correção manual e `ResetarParaAprovado`.

**Remessa**
Arquivo CNAB enviado ao banco com ordens de pagamento.

**Retenção na Fonte**
Imposto descontado do prestador e pago pelo tomador (a entidade). Tipos: ISS, IRRF, INSS, CSRF.

**Retorno**
Arquivo recebido do banco confirmando o processamento (sucesso ou erro) da remessa enviada.

## S

**Saída Bancária**
O evento real de débito na conta da entidade. **Soberano** sobre o arquivo de remessa — apenas a saída bancária real muda o status do título para `Pago`.

**Selo / Selado**
Estado de bloqueio administrativo que garante que o financeiro é fiel ao fiscal. Documento `Selado` tem todos os campos de valor imutáveis.

**Sinalização de Desvio**
Alertas visuais emitidos pelo Vigilante Fiscal quando há divergência entre dado lido pelo OCR e ajuste manual, ou entre alíquota informada e padrão parametrizado. **Não impede** o fluxo.

**Soberania do Documento**
Princípio de que o sistema deve refletir o que está escrito no papel/XML, mesmo que a regra fiscal pareça incorreta. O usuário pode ajustar, mas o sistema sinaliza desvios.

## T

**Time Travel (Trilha de Auditoria)**
Capacidade de auditar cada mudança de valor, desde a leitura do OCR até a baixa final. Registra "Quem, Quando, De, Para".

**Título Filho (Imposto)**
Obrigação tributária derivada de um documento fiscal (ISS, IRRF, INSS, CSRF). Vinculado obrigatoriamente ao Documento Pai.

**Título Principal**
Obrigação financeira do valor líquido destinado ao fornecedor.

**Tradutor de Layouts**
Componente interno que conhece as "receitas" de cada banco. Funciona como um "intérprete de idiomas": o Core fala "negócio", o Tradutor fala "CNAB do Bradesco/Santander/etc.".

**Transmitido**
Status do título incluído em arquivo de remessa enviado à VAN. Aguardando confirmação bancária.

## V

**VAN Bancária**
Túnel de comunicação de arquivos com o banco (no escopo atual: **Bradesco**).

**Vigilante Fiscal**
Componente interno que sinaliza discrepâncias entre o valor lido e as alíquotas padrão (sem impedir o fluxo).

---

## Convenções de Status

| Domínio | Status |
| :--- | :--- |
| **Documento** | `Aberto` → `Em_Aprovação` → `Selado` (com `Reaberto` como rollback) |
| **Título** | `Aberto` → `Aprovado` → `Transmitido` → `Pago` → `Liquidado` (com `Recusado` e `Atrasado` como desvios) |
| **Lote de Comunicação** | `Recebido` → `Processado` (ou `Falha_Layout`) |
