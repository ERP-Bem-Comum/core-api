# 🔌 Bounded Context: Integração Bancária

## 1. Papel no Mapa

Este contexto é o diplomata do sistema. Ele isola as regras de negócio das complexidades de formatos de arquivos (CNAB 240/400) e protocolos de comunicação com a VAN. Ele garante que o Core Financeiro receba apenas dados limpos e estruturados.

Atua como uma **ACL (Anticorruption Layer)** e um **Open Host Service**, traduzindo a linguagem do banco (CNAB, OFX, XML) para a linguagem do domínio.

## 2. Atores

* **Operador de Contas a Pagar**: Faz o upload de arquivos de retorno e extratos.
* **VAN Bancária (Sistema Externo)**: O túnel que entrega e recebe os arquivos do banco.
* **Tradutor de Layouts (Serviço)**: Componente interno que conhece as "receitas" de cada banco.
* **ProcessadorRetornoService**: Sistema automatizado que lê o arquivo de retorno do banco e identifica acatamentos e erros.

## 3. Agregados e Entidades

```ts
LoteComunicacao {
  id: LoteID;
  tipo: 'Remessa' | 'Retorno' | 'Extrato';
  origem: 'VAN' | 'Upload_Manual';
  status: StatusLote; // Recebido, Processado, Falha_Layout
  hashSeguranca: string; // Checksum para garantir integridade do arquivo
  conteudo: TransacaoBancaria[];
}

TransacaoBancaria {
  fitid: string; // ID Único vindo do banco/arquivo
  valor: Money;
  dataTransacao: Date;
  documentoIdentificado: string; // Ex: CPF/CNPJ ou Código de Barras
  tipoMovimento: 'Debito' | 'Credito';
  retornoBancario?: {
    codigoOcorrencia: string; // Código de ocorrência do banco (ex: 00 = acatado, 03 = agência inválida)
    descricaoOcorrencia: string;
    statusProcessamento: 'Acatado' | 'Recusado';
  };
}
```

## 4. Comandos / Casos de Uso Principais

| Comando | Quem chama | Pré-condições | Efeito | Evento Publicado |
| :--- | :--- | :--- | :--- | :--- |
| **GerarArquivoRemessa** | BC Títulos | Títulos em `Aprovado` com forma de pagamento **TED** ou **Transferência Bancária** | Traduz títulos para o layout CNAB do banco (Segmentos P, Q, J). Gera hash de segurança. | `ArquivoRemessaGerado` |
| **ImportarRetornoBancario** | Operador/VAN | Arquivo de retorno disponível | `ProcessadorRetornoService` lê o arquivo e identifica ocorrências. | `RetornoProcessado` |
| **ProcessarAcatamento** | Sistema | Retorno positivo do banco | Ativa flag lógica `acatadoPeloBanco: true` no título. **Não altera o status persistido** (permanece `Transmitido`). | `TituloAcatado` |
| **ProcessarRecusa** | Sistema | Retorno com erro do banco | Altera status do título para `Recusado`. Alerta o operador com código e descrição da ocorrência. | `TituloRecusado` |
| **ImportarExtrato** | Operador | Arquivo OFX, PDF ou XLSX (D+1) | Lê transações de débito e limpa duplicidade via `FITID`. | `ExtratoImportado` |
| **SinalizarSaidaBancaria** | Sistema | Transação de débito confirmada no extrato D+1 | Localiza o título correspondente no Core e dispara confirmação de saída. | `SaidaBancariaConfirmada` |

## 5. Invariantes e Regras de Negócio

* **R1 (Proteção de Duplicidade)**: Nenhuma transação com o mesmo `FITID` pode ser processada duas vezes, independente do arquivo de origem (OFX, PDF, etc.).
* **R2 (Integridade de Remessa)**: O sistema deve gerar um **Checksum (Hash)** no momento da criação da remessa. Se o arquivo for alterado fora do sistema antes de chegar ao banco, a reconciliação deve falhar.
* **R3 (Soberania do Layout)**: O Core do sistema não conhece "posições de memória" ou "espaços em branco" do CNAB. Apenas este contexto lida com strings de texto fixo.
* **R4 (Fallback de Extrato)**: Se o sistema falhar em ler o formato digital (OFX), ele deve permitir a importação via XLSX/PDF, aplicando a mesma regra de limpeza de dados.
* **R5 (Acatamento Não Altera Status)**: O sucesso no arquivo de retorno (acatamento) **nunca** muda o status do título para um estado intermediário. O status permanece `Transmitido` até a confirmação da saída bancária (extrato D+1) ou pagamento manual.
* **R5.1 (Escopo da Remessa CNAB)**: A remessa CNAB só inclui títulos com forma de pagamento **TED** ou **Transferência Bancária**. Títulos com outras formas (PIX, Boleto, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro) não entram na remessa e seguem o fluxo de pagamento manual.
* **R6 (Bifurcação do Retorno)**: O `ProcessadorRetornoService` deve identificar para cada título:
  * **Acatado**: Código de ocorrência 00 (ou equivalente). Apenas atualiza flag lógica.
  * **Recusado**: Qualquer outro código de erro. Altera status para `Recusado` e notifica o operador.
* **R7 (D+1 como Verdade Absoluta)**: O extrato bancário do dia seguinte (D+1) é a única fonte de verdade para a transição de `Transmitido` para `Pago`. O arquivo de retorno (acatamento) é apenas uma indicação de que o banco aceitou processar.
* **R8 (Contingência de Extrato)**: Se o sistema falhar em ler o extrato D+1, o operador pode marcar o título como `Pago` manualmente, desde que o retorno tenha sido acatado (`acatadoPeloBanco: true`). Essa ação habilita o título para o processo de conciliação no submódulo Conciliação.

## 6. Fluxo de Processamento do Retorno (Acatamento vs. Recusa)

1. O banco processa o arquivo de remessa e gera o arquivo de retorno (alguns minutos após o envio).
2. O sistema recebe o arquivo de retorno via VAN ou upload manual.
3. O `ProcessadorRetornoService` lê cada linha e identifica a ocorrência:
   * **Acatado (código 00)**: Ativa `acatadoPeloBanco: true`. Status permanece `Transmitido`.
   * **Recusado (qualquer erro)**: Altera status para `Recusado`. Alerta o operador com o código e descrição do erro (ex: "03 - Agência Inválida").
4. Títulos acatados aguardam o extrato D+1 para confirmação de saída bancária.

## 7. Fluxo de Importação de Extrato (D+1)

1. No dia seguinte à transmissão (D+1), o Operador faz o upload do extrato bancário (OFX, PDF ou XLSX).
2. O sistema varre cada transação de débito:
   - Se o `FITID` já existe no histórico, a linha é ignorada (descarte silencioso).
   - Se o `FITID` é novo, cria uma `TransacaoBancaria`.
3. Para cada transação de débito, o sistema busca no BC de Títulos por um `TituloID` ou código de barras correspondente.
4. Ao encontrar o título em `Transmitido` (com ou sem flag `acatadoPeloBanco`), dispara o evento `SaidaBancariaConfirmada`.
5. O BC de Títulos reage movendo o status para `Pago`.
6. Se o extrato não estiver disponível ou falhar na leitura, o operador pode usar o fluxo contingencial (pagamento manual), desde que o retorno tenha sido acatado.

## 8. Padrões Aplicados

* **Anticorruption Layer (ACL)**: Impede que termos como "Segmento P", "Segmento J" ou "Posição 212" invadam o domínio financeiro.
* **Open Host Service (OHS)**: Define um protocolo único de "Pagamento" que qualquer banco integrado deve obedecer após a tradução.

## 9. Glossário Específico

* **CNAB (240/400)**: O padrão de texto para troca de informações com bancos brasileiros.
* **OFX (Open Financial Exchange)**: Padrão internacional para extratos bancários.
* **Checksum**: Assinatura digital que garante que o arquivo enviado é exatamente o mesmo que o sistema gerou.
* **Tradutor de Layouts**: "Intérprete de idiomas" — recebe ordens limpas do Core ("pague R$ X para o fornecedor Y") e converte para o dialeto exato exigido por cada banco (Bradesco/Itaú/Santander). Trocar de banco requer apenas adicionar uma nova "receita de tradução" neste contexto, sem tocar no Core.
* **Acatamento**: Confirmação do banco de que o título foi aceito para processamento. **Não significa pagamento efetuado**.
* **Código de Ocorrência**: Código retornado pelo banco indicando o resultado do processamento (ex: 00 = acatado, 03 = agência inválida).
