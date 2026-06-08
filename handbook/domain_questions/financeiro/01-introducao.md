# 📘 Introdução: Módulo Financeiro (Core Financeiro)

## 1. Por que o sistema existe?

O sistema nasce para resolver a fragilidade do modelo de "títulos avulsos" e a falta de rastreabilidade entre o documento fiscal e o pagamento. Em organizações sem fins lucrativos, a transparência e a precisão sobre o **Fato Gerador** são críticas para a governança. O sistema garante que toda obrigação financeira nasça de um documento validado, herdando automaticamente suas regras de retenção e garantindo integridade absoluta até a conciliação bancária.

## 2. O que o sistema faz, em uma frase?

Transforma documentos fiscais e não fiscais em obrigações financeiras integradas, automatizando o cálculo de retenções e garantindo a imutabilidade do fluxo de caixa através do conceito de "Fato Gerador".

## 3. Quem são os "clientes" do sistema?

* **Operador de Contas a Pagar / Analista**: Realiza a ingestão (OCR ou inclusão manual), o enriquecimento de dados, a geração de remessas CNAB, monitora rejeições e registra pagamentos manuais. **Não aprova**.
* **Aprovador (Perfil de Governança)**: Valida os lançamentos e aprova o título, autorizando o prosseguimento do ciclo financeiro. Pode desfazer aprovação. Pode ser o Gestor Financeiro ou outro perfil com poder de aprovação. **Analistas/Operadores nunca aprovam**.
* **Operador do Submódulo Conciliação**: Executa o processo de conciliação (casamento título/extrato), autoriza `Unreconcile` e desfazimento de conciliação. Pode ser o Gestor Financeiro.
* **Governança/Auditoria (Perfil)**: Qualquer usuário com permissão de visualização da **Trilha de Auditoria**, capaz de validar a "Linha do Tempo" (Time Travel) para entender quem alterou o quê e quando.
* **Sistema (Automatismos)**: O motor de retenções, o processador de arquivos CNAB (Remessa/Retorno via VAN) e o leitor de extratos bancários (D+1).

## 4. Como funciona o fluxo do dia na prática?

1. **Ingestão e OCR**: O documento é digitalizado (ou incluído manualmente); o sistema extrai dados e cruza com Contratos/Fornecedores/Plano Orçamentário.
2. **Rascunho e Autosave**: O Operador preenche o documento. O sistema salva automaticamente (autosave) enquanto o preenchimento está em andamento.
3. **Submissão/Salvamento**: O Operador clica em "Salvar Documento". O sistema gera automaticamente:
   * **Título Pai** (valor líquido) + **Títulos Filhos** (quando aplicável), todos com status `Aberto`.
   * **NFS-e**: Gera filhos (ISS, IRRF, INSS, CSRF).
   * **RPA**: Gera filhos (IRRF, INSS, CSRF).
   * **DANFE**: Registra impostos (ICMS, IPI, PIS, COFINS), mas **não gera filhos**.
   * **Fatura**: Gera apenas 1 título pai.
   * **Boleto, Recibo, Imposto**: Geram 1 título pai cada.
   * **Reforma Tributária**: Registra CBS, IBS Municipal e IBS Estadual (leitura apenas, sem impacto no líquido).
   * **Descontos na Fonte**: Abatidos do valor bruto.
4. **Aprovação**: O Aprovador aprova o título. Campos vitais tornam-se imutáveis. Status muda de `Aberto` para `Aprovado` (pai e filhos).
6. **Ciclo Bancário**: Títulos aprovados com forma de pagamento **TED** ou **Transferência Bancária** são agrupados em arquivos de **Remessa** CNAB e enviados à VAN. Outras formas (PIX, Boleto, Cartão Corporativo, etc.) seguem fluxo de pagamento manual.
7. **Processamento de Retorno** (alguns minutos depois): O sistema lê o arquivo de retorno.
   * **Acatado**: Título permanece `Transmitido` (flag lógica ativada). Aguarda extrato D+1.
   * **Recusado**: Título vai para `Recusado`. Operador deve revisar e resetar para `Aprovado`.
8. **Extrato D+1**: No dia seguinte, o sistema lê o extrato bancário e confirma a saída de caixa real.
9. **Conciliação**: O Gestor confirma o casamento entre título e extrato. **Apenas títulos `Pago` podem ser conciliados.** Status final: `Conciliado`.

## 5. Como o sistema lida com exceções?

* **Recusa Bancária**: Títulos rejeitados no arquivo de retorno assumem o status `Recusado`. Para seguir novamente, um operador deve revisar o erro e alterar manualmente o status para `Aprovado`, permitindo nova inclusão em remessa.
* **Falha na Leitura do Extrato D+1**: Se o sistema não conseguir ler o extrato, o Operador pode marcar o título como `Pago` manualmente (fluxo contingencial), desde que o retorno tenha sido acatado.
* **Erro de Pagamento/Estorno**: O Gestor pode desfazer um pagamento (`Pago` → `Aprovado`) ou desfazer uma conciliação (`Conciliado` → `Pago`), permitindo correções sem perda de histórico.
* **Divergência de Valores**: Qualquer tentativa de alterar campos vitais (valor, fornecedor, impostos) exige a reabertura do documento pai (`Desfazer Aprovação`), forçando o recálculo de toda a equação financeira. Filhos são deletados e recriados.
* **Quebra de Integridade**: Se houver alteração manual na base de dados após a geração da remessa, o `Hash` de segurança invalidará a conciliação, alertando a Governança.
* **Cancelamento**: Documentos em `Aberto` podem ser cancelados (hard delete nos títulos). Documentos já aprovados com títulos transmitidos, pagos ou conciliados **não podem ser cancelados**.

## 6. O que está dentro do MVP?

* ✅ Ingestão de documentos via OCR e inclusão manual (NFS-e, DANFE, RPA, Fatura, Boleto, Recibo, Imposto).
* ✅ Motor de cálculo de retenções automáticas (ISS, IRRF, INSS, CSRF).
* ✅ Registro de impostos da Reforma Tributária (CBS, IBS Municipal, IBS Estadual).
* ✅ Geração de arquivos CNAB 240 (Remessa/Retorno).
* ✅ Gestão de Status completa: `Rascunho`, `Aberto`, `Aprovado`, `Transmitido`, `Recusado`, `Pago`, `Conciliado`.
* ✅ Trilha de Auditoria (Logs de alteração por campo).
* ✅ Conciliação bancária com extrato D+1 (OFX, PDF, XLSX).
* ✅ Integração cross-módulo: Contratos (histórico de pagamento) e Orçamento (consolidação de gastos).

## 7. Principais métricas que o gestor pode acompanhar

* ⏱️ **Tempo de Ciclo**: Tempo médio entre a leitura do OCR e o agendamento do pagamento.
* ✅ **Acurácia de Retenção**: % de documentos cujos impostos foram calculados sem ajuste manual.
* 🔁 **Taxa de Conciliação Automática**: % de títulos conciliados via arquivo de retorno/extrato sem intervenção.
* 🚫 **Taxa de Rejeição Bancária (VAN)**: Volume de títulos que retornam com erro (ajuda a identificar problemas de cadastro de fornecedores).
* 🔄 **Taxa de Desfazimento**: % de pagamentos ou conciliações desfeitas (indicador de qualidade de dados).

## 8. Em resumo, o que o gestor precisa guardar?

> O sistema é um **organismo de integridade financeira**. O título não "existe" sozinho; ele é um reflexo do documento fiscal. A governança é garantida porque cada centavo pago tem um pai (documento), um rastro (log de auditoria) e uma validação final (conciliação bancária).
