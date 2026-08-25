# 04 — Códigos de Ocorrência G059

Fonte: Manual de Procedimentos Multipag Bradesco, Nº 4008.523.687, **Versão 08** – julho/2025.
No PDF vigente a tabela G059 vive nas **págs. 106-115**
(`handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf`).

⚠️ Páginas citadas por ocorrência ao longo deste arquivo vieram de edição anterior. As 136
ocorrências e suas páginas reais estão em [`00-indice-campos.md`](./00-indice-campos.md) §Ocorrências.

Posições 231-240 dos registros de retorno. Até 5 ocorrências simultâneas, 2 dígitos cada.

**Esta é a tabela que o validador do banco implementa.** Quando ela divergir da tabela de layout,
ela vence. Cada entrada abaixo traz as posições exatas que a crítica verifica — use isso para
construir o validador de auto-checagem.

---

## Confirmações

| Cód. | Significado |
|---|---|
| `00` | Crédito ou Débito Efetivado — pagamento confirmado |
| `BD` | Inclusão Efetuada com Sucesso — pagamento agendado (pode estar autorizado ou desautorizado) |
| `BE` | Alteração Efetuada com Sucesso |
| `BF` | Exclusão Efetuada com Sucesso |
| `03` | Débito Autorizado pela Agência — Efetuado |
| `BN`–`BQ` | Operação de Consignação Incluída / Alterada / Excluída / Liquidada com Sucesso |

## Recusas financeiras

| Cód. | Significado |
|---|---|
| `01` | Insuficiência de Fundos — Débito Não Efetuado |
| `02` | Crédito ou Débito Cancelado pelo Pagador/Credor |
| `HF` | Conta Corrente da Empresa com Saldo Insuficiente |

---

## Estrutura e controle do arquivo

| Cód. | Ocorrência | Onde verificar |
|---|---|---|
| `AA` | Controle Inválido | Movimento processado com **Data e Hora de Gravação** de outro movimento já processado (arquivo duplicado). Também campos de controle (Banco, Lote, Registro) inválidos. **Header de arquivo, posições 144-151 e 152-157.** |
| `HA` | Lote Não Aceito | Movimento já processado (duplicado) ou Registro/Segmento incorreto |
| `HI` | Arquivo não aceito | Arquivo rejeitado por motivos de recusa nos segmentos de detalhe |
| `HJ` | Tipo de Registro Inválido | Posição **8** de todas as linhas. Também header de arquivo posição **143** (deve ser `1` = remessa; qualquer outro valor pode gerar recusa) |
| `H1` | Arquivo sem trailer | Falta a última linha, registro tipo `9` (posição 8) |
| `HG` | Lote de Serviço Fora de Sequência | Posições **4-7** (lotes duplicados ou fora de ordem na data de transmissão) e posições **9-13** dos segmentos (sequência crescente por lote aberto em arquivo multiheader) |
| `HH` | Lote de Serviço Inválido | Header de lote, posições **4-7**. Deve iniciar em `0001` e não repetir na data de transmissão |
| `HK` / `HL` | Código Remessa/Retorno Inválido / Versão de layout inválida | Header de lote **14-16** (`045` PAGFOR, `040` títulos, `012` tributos) e header de arquivo **164-166** (fixo `089`) |
| `TA` | Lote Não Aceito — Totais do Lote com Diferença | Trailer de lote **18-23** (qtd. registros) e **24-41** (valor total); trailer de arquivo **18-23** (qtd. lotes) e **24-29** (qtd. registros) |

---

## Cadastro / contrato

| Cód. | Ocorrência | Onde verificar |
|---|---|---|
| `AE` | Tipo/Número de Inscrição Inválido | Header de arquivo e de lote, posição **18** (`1` CPF, `2` CNPJ, `3` PIS, `9` outros) e posições **19-32** coerentes com o tipo |
| `AF` | Código de Convênio Inválido | Header de arquivo e de lote, posições **33-52**, conforme cadastro junto ao Banco |
| `AG` | Agência/Conta Corrente/DV Inválido | Header de arquivo e de lote: agência **53-57** (com zeros à esquerda, ex. `01111`), **DV da agência na posição 58**, conta **59-70**, DV da conta **71** |
| `HB` | Inscrição da Empresa Inválida para o Contrato | Header de arquivo e de lote, **19-32** deve pertencer ao convênio informado em **33-38** |
| `HC` | Convênio com a Empresa Inexistente/Inválido para o Contrato | Header de arquivo e de lote, posições **33-38** |
| `HD` | Agência/Conta da Empresa Inexistente/Inválida para o Contrato | Agência **53-57**, DV **58**, conta **59-70**, DV **71** |
| `HE` | Tipo de Serviço Inválido para o Contrato | Header de lote, **10-11**. Serviço pode estar correto mas indisponível no contrato |

## Header de lote

| Cód. | Ocorrência | Onde verificar |
|---|---|---|
| `AB` | Tipo de Operação Inválido | Header de lote, posição **9** (fixo `C` para fornecedor, tributos e títulos) e posições **223-224** (parâmetro fixo `01`) |
| `AC` | Tipo de Serviço Inválido | Header de lote, **10-11** |
| `AD` | Forma de Lançamento Inválida | Tipo de serviço incompatível com a forma de pagamento |

---

## Segmento A — favorecido e pagamento

| Cód. | Ocorrência | Onde verificar |
|---|---|---|
| `AH` | Nº Sequencial do Registro no Lote Inválido | Posições **9-13** de cada segmento. Numérica, crescente, iniciando em `00001` a cada novo lote |
| `AI` | Código de Segmento de Detalhe Inválido | Sequência numérica crescente iniciando em `00001` por lote |
| `AJ` | Tipo de Movimento Inválido | Posição **15** de cada segmento (`0` Inclusão, `5` Alteração, `9` Exclusão) |
| `AK` | Código da Câmara de Compensação Inválido | Segmento A, **18-20**. `018` TED (STR, CIP), `700` DOC (COMPE), demais modalidades zeros |
| `AL` | Código do Banco Favorecido Inoperante ou Depositário Inválido | Segmento A, **21-23**, numérico |
| `AM` | Agência Mantenedora da Conta do Favorecido Inválida | Segmento A, **24-28**, **com o DV da agência na posição 29** |
| `AN` | Conta Corrente/DV do Favorecido Inválido | Segmento A, **30-41**, DV na posição **42**. A conta também pode estar encerrada ou bloqueada |
| `AO` | Nome do Favorecido Não Informado | Segmento A, **44-73**, não pode estar todo em branco |
| `AP` | Data de Lançamento Inválida | Campo de data zerado, em branco, fora do padrão `DDMMAAAA` ou não numérico; data inferior à data base de processamento; horário de inclusão/liberação de TED ou títulos ultrapassou o limite de envio |
| `AQ` | Tipo/Quantidade da Moeda Inválido | Tipo de moeda fora do domínio **ou quantidade de moeda não numérica ou zerada** — segmento A, **102-104** e **105-119** |
| `AR` | Valor do Lançamento Inválido | Segmento A **120-134** e **163-177**; segmento J **153-167**; segmento O **108-122**; segmento N **96-110** |
| `BB` | Seu Número Inválido | Compromisso já cadastrado no Multipag (duplicidade). Segmento A, **74-93** |
| `BC` | Nosso Número Inválido | Nosso Número irregular para quitação de títulos |
| `BG` | Agência/Conta Impedida Legalmente/Bloqueada | Conta de crédito impedida por determinação legal |
| `AZ` | Código/Nome do Banco Depositário Inválido | Código do banco favorecido inválido, não numérico ou zerado |
| `BA` | Código/Nome da Agência Depositária Não Informado | Títulos rastreados ou DDA |

---

## Segmento B — inscrição e endereço do favorecido

**Estas cinco críticas de endereço são a causa mais comum de rejeição silenciosa**, porque a
tabela de layout não marca esses campos com asterisco.

| Cód. | Ocorrência | Posições (segmento B) |
|---|---|---|
| `AT` | Tipo/Número de Inscrição do Favorecido Inválido | **18** (tipo) e **19-32** (número), coerentes entre si |
| `AU` | **Logradouro do Favorecido Não Informado** | **33-62** |
| `AV` | **Nº do Local do Favorecido Não Informado** | **63-67** |
| `AW` | **Cidade do Favorecido Não Informada** | **98-117** |
| `AX` | **CEP/Complemento do Favorecido Inválido** | **118-122** (CEP) e **123-125** (complemento) |
| `AY` | **Sigla do Estado do Favorecido Inválida** | **126-127** |

---

## Segmento C — deduções e acréscimos

| Cód. | Ocorrência | Posições |
|---|---|---|
| `CK` | Valor do IR Inválido | **18-32** |
| `CL` | Valor do ISS Inválido | **33-47** |
| `CM` | Valor do IOF Inválido | **48-62** |
| `CN` | Valor de Outras Deduções Inválido | **63-77** |
| `CO` | Valor de Outros Acréscimos Inválido | **78-92** |
| `CP` | Valor do INSS Inválido | **113-127** |

Todos devem ser apenas numéricos.

---

## Segmento J — código de barras e títulos

| Cód. | Ocorrência | Posições |
|---|---|---|
| `CA` | Código de Barras — Código do Banco Inválido | **18-61** |
| `CB` | Código de Barras — Código da Moeda Inválido | **18-61**, e **18-20** para o código do banco (ex. `237`). Só numérico |
| `CC` | Código de Barras — Dígito Verificador Geral Inválido | **18-61**, dígito geral na posição 22 do código de barras |
| `CD` | Código de Barras — Valor do Título Divergente/Inválido | **18-61**, e **27-36** do código de barras |
| `CE` | Código de Barras — Campo Livre Inválido | **18-61**, e **37-61** do código de barras |
| `CF` | Valor do Documento Inválido | **100-114** |
| `CG` | Valor do Abatimento Inválido | **115-129** |
| `CH` | Valor do Desconto Inválido | **115-129** |
| `CI` | Valor de Mora Inválido | **130-144** |
| `CJ` | Valor da Multa Inválido | **130-144** |
| `YA` | Título Não Encontrado | Título não localizado na CIP |

---

## Pix

| Cód. | Ocorrência |
|---|---|
| `PA` | Pix não efetivado — Tente mais tarde |
| `PB` | Transação interrompida devido a erro no PSP do Recebedor |
| `PC` | Número da conta transacional encerrada no PSP do Recebedor |
| `PD` | Tipo incorreto para a conta transacional especificada |
| `PE` | Tipo de transação não suportado/autorizado na conta transacional |
| `PF` | CPF/CNPJ do recebedor não consistente com o titular da conta transacional |
| `PG` | CPF/CNPJ do usuário recebedor incorreto |
| `PH` | Ordem rejeitada pelo PSP do Recebedor |
| `PI` | ISPB do PSP do Pagador inválido ou inexistente |
| `PJ` | Chave não cadastrada no DICT |
| `PK` | QR-Code inválido/vencido |
| `PL` | Forma de iniciação inválida (segmento B, 15-17) |
| `PM` | Chave de Pagamento inválida |
| `PN` | Chave de Pagamento não informada |

---

## Consignação / INSS

`BH` Empresa não pagou salário · `BI` Falecimento do mutuário · `BJ` Empresa não enviou remessa do
mutuário · `BK` Empresa não enviou remessa no vencimento · `BL` Valor da parcela inválida ·
`BM` Identificação do contrato inválida · `HM` Mutuário não identificado · `HN` Tipo do benefício
não permite empréstimo · `HO` Benefício cessado/suspenso · `HP` Benefício possui representante
legal · `HQ` Benefício é do tipo PA · `HR` Quantidade de contratos excedida · `HS` Benefício não
pertence ao banco informado · `HT` Início do desconto já ultrapassado · `HU` Número da parcela
inválida · `HV` Quantidade de parcela inválida · `HW` Margem consignável excedida dentro do prazo ·
`H2` Mutuário sem crédito na competência · `H3` Não descontado – outros motivos ·
`H4` Retorno de Crédito não pago · `H5` Cancelamento de empréstimo retroativo · `H6` Outros
Motivos de Glosa · `H7` Margem consignável excedida acima do prazo · `H8` Mutuário desligado do
empregador · `H9` Mutuário afastado por licença · `HX` Empréstimo já cadastrado ·
`HY` Empréstimo inexistente · `HZ` Empréstimo já encerrado · `IA` Primeiro nome do mutuário
divergente

---

## Alegação do Pagador

`YB` Identificador Registro Opcional Inválido · `YC` Código Padrão Inválido · `YD` Código de
Ocorrência Inválido · `YE` Complemento de Ocorrência Inválido · `YF` Alegação já Informada

---

## Informativos (prefixo Z)

| Cód. | Significado |
|---|---|
| `ZA` | Agência/Conta do Favorecido Substituída |
| `ZB` | Divergência entre primeiro/último nome do beneficiário e a Receita Federal |
| `ZC` | Confirmação de Antecipação de Valor |
| `ZD` | Antecipação Parcial de Valor |
| `ZE` | Título bloqueado na base da CIP |
| `ZF` | Sistema em contingência — título valor maior que referência |
| `ZG` | Sistema em contingência — título vencido |
| `ZH` | Sistema em contingência — título indexado |
| `ZI` | Beneficiário divergente do constante na CIP |
| `ZJ` | Limite de pagamentos parciais excedido |
| `ZK` | Boleto já liquidado na base da CIP |

---

## Exclusivos do layout CNAB Bradesco

| Cód. | Significado |
|---|---|
| `5A` | Agendado sob lista de débito |
| `5B` | Pagamento não autorizado sob lista de débito |
| `5C` | Lista com mais de uma modalidade |
| `5D` | Lista com mais de uma data de pagamento |
| `5E` | Número de lista duplicado |
| `5F` | Lista de débito vencida e não autorizada |
| `5I` | Ordem de Pagamento emitida |
| `5J` | Ordem de pagamento com data limite vencida |
| `5M` | Número de lista de débito inválido (deve ser numérico) |
| `5T` | Pagamento realizado em contrato na condição de TESTE |
