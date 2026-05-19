# 📘 Introdução: Módulo Financeiro (Core Financeiro)

## 1. Por que o sistema existe?

O sistema nasce para resolver a fragilidade do modelo de **"títulos avulsos"** e a falta de rastreabilidade entre o documento fiscal e o pagamento. Em organizações sem fins lucrativos, a transparência e a precisão sobre o **Fato Gerador** são críticas para a governança.

O sistema garante que toda obrigação financeira nasça de um documento validado, herdando automaticamente suas regras de retenção e garantindo integridade absoluta até a conciliação bancária.

## 2. O que o sistema faz, em uma frase?

> Transforma documentos fiscais e não fiscais em obrigações financeiras integradas, automatizando o cálculo de retenções e garantindo a imutabilidade do fluxo de caixa através do conceito de **Fato Gerador**.

## 3. Quem são os "clientes" do sistema?

* **Operador de Contas a Pagar** — Realiza a ingestão (OCR), o enriquecimento de dados e a conferência inicial.
* **Aprovador (Perfil de Governança)** — Único ator capaz de "Selar" o documento e autorizar pagamentos.
* **Gestor Financeiro** — Responsável pela aprovação de pagamentos, autorização de remessas bancárias e pelo crivo final de liquidação na conciliação.
* **Governança/Auditoria (Perfil)** — Qualquer usuário com permissão de visualização da **Trilha de Auditoria**, capaz de validar a "Linha do Tempo" (Time Travel) para entender quem alterou o quê e quando.
* **Sistema (Automatismos)** — O motor de retenções, o vigilante fiscal e o processador de arquivos CNAB (Remessa/Retorno via VAN).

> **Nota:** O perfil de **Auditoria** é tratado como uma **capacidade do sistema** (Governança) e não necessariamente um cargo isolado.

## 4. Como funciona o fluxo do dia na prática?

1. **Ingestão e OCR** — O documento é digitalizado; o sistema extrai dados e cruza com Contratos/Fornecedores.
2. **Enriquecimento Fiscal** — O motor de retenções gera os títulos "filhos" (impostos) vinculados ao "pai" (valor bruto).
3. **Aprovação** — O Aprovador sela o documento. Uma vez aprovado, os valores tornam-se imutáveis (travados para edição direta).
4. **Ciclo Bancário** — Títulos aprovados são agrupados em arquivos de **Remessa** e enviados à VAN.
5. **Processamento de Retorno** — O sistema lê o arquivo de retorno. Se houver erro, o título é marcado para intervenção.
6. **Conciliação** — O extrato bancário é vinculado ao título, alterando o status para `LIQUIDADO` (após crivo do Gestor).

## 5. Como o sistema lida com exceções?

* **Recusa Bancária** — Títulos rejeitados no arquivo de retorno assumem o status `RECUSADO`. Para seguir novamente, um operador deve revisar o erro e alterar manualmente o status para `APROVADO`, permitindo nova inclusão em remessa.
* **Divergência de Valores** — Qualquer tentativa de alterar um título de imposto exige a reabertura do documento pai, forçando o recálculo de toda a equação financeira.
* **Quebra de Integridade** — Se houver alteração manual na base de dados após a geração da remessa, o `Hash` de segurança invalidará a conciliação, alertando a Governança.
* **Atraso Bancário** — Se após a data prevista de pagamento o título permanecer como `Transmitido` (sem retorno de saída bancária), o sistema o sinaliza como `ATRASADO` para ação imediata do operador.

## 6. O que está dentro do MVP?

* ✅ Ingestão de documentos via OCR e extração de dados.
* ✅ Motor de cálculo (vigilância) de retenções (ISS, IRRF, INSS, CSRF).
* ✅ Geração de arquivos CNAB (Remessa/Retorno) — formato Bradesco.
* ✅ Importação de extratos (OFX primário; PDF e XLSX como fallback).
* ✅ Gestão de Status (Aberto, Aprovado, Transmitido, Recusado, Atrasado, Pago, Liquidado).
* ✅ Trilha de Auditoria (Logs de alteração por campo — "Time Travel").
* ✅ Conciliação com crivo humano de liquidação.

## 7. Principais métricas que o gestor pode acompanhar

* ⏱️ **Tempo de Ciclo** — Tempo médio entre a leitura do OCR e o agendamento do pagamento.
* ✅ **Acurácia de Retenção** — % de documentos cujos impostos foram calculados sem ajuste manual.
* 🔁 **Taxa de Liquidação Automática** — % de títulos conciliados via arquivo de retorno/extrato sem intervenção.
* 🚫 **Taxa de Rejeição Bancária (VAN)** — Volume de títulos que retornam com erro (ajuda a identificar problemas de cadastro de fornecedores).

## 8. Em resumo, o que o gestor precisa guardar?

> O sistema é um **organismo de integridade financeira**. O título não "existe" sozinho; ele é um reflexo do documento fiscal. A governança é garantida porque cada centavo pago tem um pai (documento) e um rastro (log de auditoria).
