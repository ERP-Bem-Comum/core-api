# 🔌 Bounded Context: Integração Bancária

## 1. Papel no Mapa
Este contexto é o diplomata do sistema. Ele isola as regras de negócio das complexidades de formatos de arquivos (CNAB 240/400) e protocolos de comunicação com a VAN. Ele garante que o Core Financeiro receba apenas dados limpos e estruturados.

Atua como uma **ACL (Anticorruption Layer)** e um **Open Host Service**, traduzindo a linguagem do banco (CNAB, OFX, XML) para a linguagem do domínio.

## 2. Atores
* **Operador de Contas a Pagar**: Faz o upload de arquivos de retorno e extratos.
* **VAN Bancária (Sistema Externo)**: O túnel que entrega e recebe os arquivos do banco.
* **Tradutor de Layouts (Serviço)**: Componente interno que conhece as "receitas" de cada banco.

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
}
```

## 4. Comandos / Casos de Uso Principais

| Comando | Quem chama | Pré-condições | Efeito | Evento Publicado |
| :--- | :--- | :--- | :--- | :--- |
| **GerarArquivoRemessa** | BC Títulos | Títulos em `Aprovado` | Traduz títulos para o layout CNAB do banco. | `ArquivoRemessaGerado` |
| **ImportarRetornoBancario** | Operador/VAN | Arquivo disponível | Extrai ocorrências (sucesso/erro) de cada título. | `RetornoProcessado` |
| **ImportarExtrato** | Operador | Arquivo OFX, PDF ou XLSX | Lê transações e limpa duplicidade via `FITID`. | `ExtratoImportado` |
| **SinalizarSaidaBancaria** | Sistema | Transação de Débito lida | Localiza o título correspondente no Core. | `SaidaBancariaIdentificada` |

## 5. Invariantes e Regras de Negócio
* **R1 (Proteção de Duplicidade)**: Nenhuma transação com o mesmo `FITID` pode ser processada duas vezes, independente do arquivo de origem (OFX, PDF, etc.).
* **R2 (Integridade de Remessa)**: O sistema deve gerar um **Checksum (Hash)** no momento da criação da remessa. Se o arquivo for alterado fora do sistema antes de chegar ao banco, a reconciliação deve falhar.
* **R3 (Soberania do Layout)**: O Core do sistema não conhece "posições de memória" ou "espaços em branco" do CNAB. Apenas este contexto lida com strings de texto fixo.
* **R4 (Fallback de Extrato)**: Se o sistema falhar em ler o formato digital (OFX), ele deve permitir a importação via XLSX/PDF, aplicando a mesma regra de limpeza de dados.

## 6. Fluxo de Importação de Extrato (Governança)
1. O Operador faz o upload de um arquivo **OFX**.
2. O sistema varre cada linha:
    - Se o `FITID` já existe no histórico, a linha é ignorada (descarte silencioso).
    - Se o `FITID` é novo, ele cria uma `TransacaoBancaria`.
3. Para cada transação de **Débito**, o sistema busca no BC de Títulos por um `TituloID` ou código de barras correspondente.
4. Ao encontrar, ele dispara o evento `SaidaBancariaIdentificada`.
5. O BC de Títulos reage movendo o status para `PAGO` em D+1.

## 7. Padrões Aplicados
* **Anticorruption Layer (ACL)**: Impede que termos como "Segmento P", "Segmento J" ou "Posição 212" invadam o domínio financeiro.
* **Open Host Service (OHS)**: Define um protocolo único de "Pagamento" que qualquer banco integrado deve obedecer após a tradução.

## 8. Glossário Específico
* **CNAB (240/400)**: O padrão de texto para troca de informações com bancos brasileiros.
* **OFX (Open Financial Exchange)**: Padrão internacional para extratos bancários.
* **Checksum**: Assinatura digital que garante que o arquivo enviado é exatamente o mesmo que o sistema gerou.
* **Tradutor de Layouts**: "Intérprete de idiomas" — recebe ordens limpas do Core ("pague R$ X para o fornecedor Y") e converte para o dialeto exato exigido por cada banco (Bradesco/Itaú/Santander). Trocar de banco requer apenas adicionar uma nova "receita de tradução" neste contexto, sem tocar no Core.
