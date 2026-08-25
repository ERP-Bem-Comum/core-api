# 00 — Índice do manual: campo → página

> **Derivado. Não editar à mão.** Regerado por `pnpm run cnab:index`.
> Fonte: `handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf` — Manual de Procedimentos Multipag Bradesco, Layout CNAB 240 Posições,
> Nº 4008.523.687, **Versão 08**, revisado em julho/2025 (139 páginas).

Este arquivo **não reproduz o manual** — ele diz em que página está cada coisa. O PDF vive em
`handbook/guidelines/`, que está no `.gitignore` por restrição de redistribuição; este diretório é
commitável e o repositório é público. Ler a norma é abrir o PDF na página indicada.

**A página é a do PDF, que coincide com a impressa no rodapé.** Números de página vindos de outra
edição do manual não conferem com esta: o deslocamento varia por seção (+13 no G009, +17 no G059),
então não existe conversão por fórmula. Se uma citação não bater com a página daqui, ela veio de
outra edição — reancorar, não ajustar.

## Campos (115)

Onde a seção de descrição **define** o campo. Uma tabela de layout que apenas o cita na coluna
"Desc." não entra aqui.

| Cód. | Campo | Pág. |
| :--- | :--- | ---: |
| `G001` | Código do Banco na Compensação | 95 |
| `G002` | Lote de Serviço | 95 |
| `G003` | Tipo de Registro | 95 |
| `G004` | Uso Exclusivo FEBRABAN / CNAB | 95 |
| `G005` | Tipo de Inscrição da Empresa | 95 |
| `G006` | Número de Inscrição da Empresa | 95 |
| `G007` | Código do Convênio no Banco | 95 |
| `G008` | Agência Mantenedora da Conta | 95 |
| `G009` | Dígito Verificador da Agência | 95 |
| `G010` | Número da Conta Corrente | 95 |
| `G011` | Dígito Verificador da Conta | 96 |
| `G012` | Dígito Verificador da Agência / Conta Corrente | 96 |
| `G013` | Nome | 97 |
| `G014` | Nome do Banco | 97 |
| `G015` | Código Remessa / Retorno | 97 |
| `G016` | Data de Geração do Arquivo | 97 |
| `G017` | Hora de Geração do Arquivo | 97 |
| `G018` | Número Sequencial do Arquivo | 97 |
| `G019` | Número da Versão do Layout do Arquivo | 97 |
| `G020` | Densidade de Gravação do Arquivo | 97 |
| `G021` | Para Uso Reservado do Banco | 97 |
| `G022` | Para Uso Reservado da Empresa | 97 |
| `G025` | Tipo de Serviço | 98 |
| `G028` | Tipo de Operação | 99 |
| `G029` | Forma de Lançamento | 100 |
| `G030` | Número da Versão do Layout do Lote | 101 |
| `G031` | Mensagem 1 / 2 | 101 |
| `G032` | Endereço | 102 |
| `G033` | Cidade | 102 |
| `G034` | CEP | 102 |
| `G035` | Sufixo do CEP | 102 |
| `G036` | Estado / Unidade da Federação | 103 |
| `G037` | Quantidade de Contas para Conciliação (Lotes) | 103 |
| `G038` | Número Sequencial do Registro no Lote | 103 |
| `G039` | Código de Segmento do Registro Detalhe | 103 |
| `G040` | Tipo de Moeda | 103 |
| `G041` | Quantidade da Moeda | 103 |
| `G042` | Valor do Documento (Nominal) | 103 |
| `G043` | Número do Documento Atribuído pelo Banco (Nosso Número) | 103 |
| `G044` | Data de Vencimento Nominal | 103 |
| `G045` | Valor do Abatimento | 103 |
| `G046` | Valor do Desconto | 103 |
| `G047` | Valor da Mora | 103 |
| `G048` | Valor da Multa | 103 |
| `G049` | Quantidade de Lotes do Arquivo | 104 |
| `G050` | Valor do Imposto de Renda | 104 |
| `G051` | Valor do Imposto sobre Serviços | 105 |
| `G052` | Valor do Imposto sobre Operações Financeiras | 105 |
| `G053` | Valor de Outras Deduções | 105 |
| `G054` | Valor de Outros Acréscimos | 105 |
| `G055` | Valor de INSS | 105 |
| `G056` | Quantidade de Registros do Arquivo | 105 |
| `G057` | Quantidade de Registros do Lote | 105 |
| `G058` | Somatória de Quantidade de Moedas | 105 |
| `G059` | Código das Ocorrências para Retorno/Remessa | 106 |
| `G060` | Tipo de Movimento | 116 |
| `G061` | Código adotado pela FEBRABAN, para identificar a ação a ser realizada com o lançamento enviado no arquivo. Domínio: | 117 |
| `G062` | Código Padrão | 118 |
| `G063` | Código de Barras | 118 |
| `G064` | Número do Documento Atribuído pela Empresa (Seu Número) | 118 |
| `G065` | Código da Moeda | 118 |
| `G066` | Número do Aviso de Débito | 118 |
| `G067` | Identificação de Registro Opcional | 118 |
| `G068` | Data de Gravação Remessa / Retorno | 118 |
| `G069` | Identificação do Título no Banco | 119 |
| `G070` | Valor Nominal do Título | 119 |
| `G071` | Data de emissão do Título. | 120 |
| `G072` | Identificação do Título na Empresa | 120 |
| `G073` | Código da Multa | 120 |
| `G074` | Data da Multa | 120 |
| `G075` | Valor / Percentual a Ser Aplicado | 120 |
| `G076` | Valor da Tarifa / Custas | 120 |
| `G077` | Valor do IOF Recolhido | 120 |
| `G078` | Valor Líquido a ser creditado | 120 |
| `G079` | Número Remessa / Retorno | 120 |
| `G080` | Data do Saldo Inicial | 120 |
| `G081` | Situação do Saldo Inicial (D/C) | 120 |
| `G082` | Posição do Saldo Inicial | 120 |
| `G083` | Número de Sequência do Extrato | 121 |
| `G084` | Natureza do Lançamento | 122 |
| `G085` | Tipo do Complemento do Lançamento | 122 |
| `G086` | Complemento do Lançamento | 122 |
| `G087` | Identificação de Isenção do CPMF | 122 |
| `G088` | Data Contábil | 122 |
| `G089` | Data do Lançamento | 122 |
| `G090` | Valor do Lançamento | 122 |
| `G091` | Tipo do Lançamento: Valor a Débito / Crédito | 122 |
| `G092` | Categoria do Lançamento | 123 |
| `G093` | Código do Histórico do Lançamento no Banco | 124 |
| `G094` | Descrição do Histórico do Lançamento no Banco | 124 |
| `G095` | Número Documento / Complemento | 124 |
| `G096` | Limite da Conta | 124 |
| `G097` | Data do Saldo Final | 124 |
| `G098` | Situação do Saldo Final (D/C) | 125 |
| `G099` | Posição do Saldo Final | 125 |
| `G100` | Forma de Iniciação | 125 |
| `G101` | Informação 10 | 125 |
| `G102` | Chave de Pagamento | 126 |
| `P001` | Código da Câmara Centralizadora | 132 |
| `P002` | Código do Banco do Favorecido | 132 |
| `P003` | Data Real da Efetivação do Lançamento | 132 |
| `P004` | Valor Real da Efetivação do Pagamento | 132 |
| `P005` | - Complemento do Tipo de Serviço | 139 |
| `P006` | Aviso ao Favorecido | 132 |
| `P007` | Somatória dos Valores | 132 |
| `P008` | Código / Documento do Favorecido | 133 |
| `P009` | Data do Pagamento | 133 |
| `P010` | Valor do Pagamento | 133 |
| `P011` | Código de Finalidade da TED | 133 |
| `P012` | Código da UG Centralizadora | 133 |
| `P013` | Código Finalidade Complementar | 133 |
| `P014` | Indicativo de Forma de Pagamento | 133 |
| `P015` | Código ISPB da Instituição Financeira | 133 |
| `P090` | Documento de Origem Utilizado na GNRE | 133 |
| `P091` | Número do Convênio ou Protocolo Utilizado na GNRE | 133 |

## Ocorrências G059 (136)

Códigos de crítica devolvidos no retorno (posições 231-240). **É a tabela que o validador do banco
implementa** — quando ela divergir da tabela de layout, ela vence.

| Cód. | Ocorrência | Pág. |
| :--- | :--- | ---: |
| `00` | Crédito ou Débito Efetivado - Este código indica que o pagamento foi confirmado | 106 |
| `01` | Insuficiência de Fundos - Débito Não Efetuado | 106 |
| `02` | Crédito ou Débito Cancelado pelo Pagador/Credor | 106 |
| `03` | Débito Autorizado pela Agência – Efetuado | 106 |
| `5A` | Agendado sob lista de debito | 115 |
| `5B` | Pagamento não autoriza sob lista de debito | 115 |
| `5C` | Lista com mais de uma modalidade | 115 |
| `5D` | Lista com mais de uma data de pagamento | 115 |
| `5E` | Número de lista duplicado | 115 |
| `5F` | Lista de debito vencida e não autorizada | 115 |
| `5I` | Ordem de Pagamento emitida | 115 |
| `5J` | Ordem de pagamento com data limite vencida | 115 |
| `5M` | Número de lista de debito invalida | 115 |
| `5T` | Pagamento realizado em contrato na condição de TESTE | 115 |
| `AA` | Controle Inválido | 106 |
| `AB` | Tipo de Operação Inválido | 106 |
| `AD` | Forma de Lançamento Inválida | 106 |
| `AE` | Tipo/Número de Inscrição Inválido | 106 |
| `AF` | Código de Convênio Inválido | 106 |
| `AG` | Agência/Conta Corrente/DV Inválido | 107 |
| `AH` | Nº Sequencial do Registro no Lote Inválido | 107 |
| `AI` | Código de Segmento de Detalhe Inválido | 107 |
| `AJ` | Tipo de Movimento Inválido | 107 |
| `AK` | Código da Câmara de Compensação do Banco Favorecido/Depositário Inválido | 107 |
| `AL` | Código do Banco Favorecido Inoperante nesta data ou Depositário Inválido | 107 |
| `AM` | Agência Mantenedora da Conta Corrente do Favorecido Inválida | 107 |
| `AN` | Conta Corrente/DV do Favorecido Inválido | 107 |
| `AO` | Nome do Favorecido Não Informado | 107 |
| `AP` | Data Lançamento Inválido | 107 |
| `AQ` | Tipo/Quantidade da Moeda Inválido | 107 |
| `AR` | Valor do Lançamento Inválido | 107 |
| `AT` | Tipo/Número de Inscrição do Favorecido Inválido | 108 |
| `AU` | Logradouro do Favorecido Não Informado | 108 |
| `AV` | Nº do Local do Favorecido Não Informado | 109 |
| `AW` | Cidade do Favorecido Não Informada | 109 |
| `AX` | CEP/Complemento do Favorecido Inválido | 109 |
| `AY` | Sigla do Estado do Favorecido Inválida | 109 |
| `AZ` | Código/Nome do Banco Depositário Inválido | 109 |
| `BA` | Código/Nome da Agência Depositária Não Informado | 109 |
| `BB` | Seu Número Inválido | 109 |
| `BC` | Nosso Número Inválido | 109 |
| `BD` | Inclusão Efetuada com Sucesso | 109 |
| `BE` | Alteração Efetuada com Sucesso | 109 |
| `BF` | Exclusão Efetuada com Sucesso | 109 |
| `BG` | Agência/Conta Impedida Legalmente | 109 |
| `BH` | Empresa não pagou salário‘BI’ = Falecimento do mutuário | 109 |
| `BJ` | Empresa não enviou remessa do mutuário | 109 |
| `BK` | Empresa não enviou remessa no vencimento | 109 |
| `BL` | Valor da parcela inválida | 109 |
| `BM` | Identificação do contrato inválida | 109 |
| `BN` | Operação de Consignação Incluída com Sucesso | 109 |
| `BO` | Operação de Consignação Alterada com Sucesso | 109 |
| `BP` | Operação de Consignação Excluída com Sucesso | 109 |
| `BQ` | Operação de Consignação Liquidada com Sucesso | 109 |
| `CA` | Código de Barras - Código do Banco Inválido | 109 |
| `CB` | Código de Barras - Código da Moeda Inválido | 109 |
| `CC` | Código de Barras - Dígito Verificador Geral Inválido | 109 |
| `CD` | Código de Barras - Valor do Título Divergente/Inválido. | 109 |
| `CE` | Código de Barras - Campo Livre Inválido | 109 |
| `CF` | Valor do Documento Inválido | 110 |
| `CG` | Valor do Abatimento Inválido | 110 |
| `CH` | Valor do Desconto Inválido | 111 |
| `CI` | Valor de Mora Inválido | 111 |
| `CJ` | Valor da Multa Inválido | 111 |
| `CK` | Valor do IR Inválido | 111 |
| `CL` | Valor do ISS Inválido | 111 |
| `CM` | Valor do IOF Inválido | 111 |
| `CN` | Valor de Outras Deduções Inválido | 111 |
| `CO` | Valor de Outros Acréscimos Inválido | 111 |
| `CP` | Valor do INSS Inválido | 111 |
| `H1` | Arquivo sem trailer | 113 |
| `H2` | Mutuário sem crédito na competência | 113 |
| `H3` | Não descontado – outros motivos | 113 |
| `H4` | Retorno de Crédito não pago | 113 |
| `H5` | Cancelamento de empréstimo retroativo | 113 |
| `H6` | Outros Motivos de Glosa | 113 |
| `H7` | Margem consignável excedida para o mutuário acima do prazo do contrato | 113 |
| `H8` | Mutuário desligado do empregador | 113 |
| `H9` | Mutuário afastado por licença | 113 |
| `HA` | Lote Não Aceito | 111 |
| `HB` | Inscrição da Empresa Inválida para o Contrato | 111 |
| `HC` | Convênio com a Empresa Inexistente/Inválido para o Contrato | 111 |
| `HD` | Agência/Conta Corrente da Empresa Inexistente/Inválido para o Contrato | 111 |
| `HE` | Tipo de Serviço Inválido para o Contrato | 111 |
| `HF` | Conta Corrente da Empresa com Saldo Insuficiente | 111 |
| `HG` | Lote de Serviço Fora de Sequência | 111 |
| `HH` | Lote de Serviço Inválido | 111 |
| `HI` | Arquivo não aceito | 111 |
| `HJ` | Tipo de Registro Inválido | 111 |
| `HK` | Código Remessa / Retorno Inválido | 112 |
| `HL` | Versão de layout inválida | 113 |
| `HM` | Mutuário não identificado | 113 |
| `HN` | Tipo do benefício não permite empréstimo | 113 |
| `HO` | Benefício cessado/suspenso | 113 |
| `HP` | Benefício possui representante legal | 113 |
| `HQ` | Benefício é do tipo PA (Pensão alimentícia) | 113 |
| `HR` | Quantidade de contratos permitida excedida | 113 |
| `HS` | Benefício não pertence ao Banco informado | 113 |
| `HT` | Início do desconto informado já ultrapassado | 113 |
| `HU` | Número da parcela inválida | 113 |
| `HV` | Quantidade de parcela inválida | 113 |
| `HW` | Margem consignável excedida para o mutuário dentro do prazo do contrato | 113 |
| `HX` | Empréstimo já cadastrado | 113 |
| `HY` | Empréstimo inexistente | 113 |
| `HZ` | Empréstimo já encerrado | 113 |
| `IA` | Primeiro nome do mutuário diferente do primeiro nome do movimento do censo ou diferente da base de Titular do Benefício | 113 |
| `PA` | "Pix não efetivado - Tente mais tarde" | 113 |
| `PB` | “Transação interrompida devido a erro no PSP do Recebedor” | 113 |
| `PC` | “Número da conta transacional encerrada no PSP do | 113 |
| `PE` | “Tipo de transação não é suportado/autorizado na conta transacional especificada” | 113 |
| `PF` | “CPF/CNPJ do usuário recebedor não é consistente com o titular da conta | 113 |
| `PG` | “CPF/CNPJ do usuário recebedor incorreto” | 113 |
| `PH` | “Ordem rejeitada pelo PSP do Recebedor” | 113 |
| `PI` | “ISPB do PSP do Pagador inválido ou inexistente” | 113 |
| `PJ` | “Chave não cadastrada no DICT” | 113 |
| `PK` | “QR COde Inválido/vencido” | 113 |
| `PL` | Forma de iniciação | 113 |
| `PN` | Chave de Pagamento não informada | 113 |
| `TA` | Lote Não Aceito - Totais do Lote com Diferença | 113 |
| `YA` | Título Não Encontrado | 113 |
| `YB` | Identificador Registro Opcional Inválido | 114 |
| `YC` | Código Padrão Inválido | 114 |
| `YD` | Código de Ocorrência Inválido | 114 |
| `YE` | Complemento de Ocorrência Inválido | 114 |
| `YF` | Alegação já Informada | 114 |
| `ZA` | Agência/Conta do Favorecido Substituída | 114 |
| `ZB` | Divergência entre o primeiro e último nome do beneficiário versus primeiro e último nome na Receita Federal | 114 |
| `ZC` | Confirmação de Antecipação de Valor | 115 |
| `ZD` | Antecipação Parcial de Valor | 115 |
| `ZE` | Título bloqueado na base | 115 |
| `ZF` | Sistema em contingência – título valor maior que referência | 115 |
| `ZG` | Sistema em contingência – título vencido | 115 |
| `ZH` | Sistema em contingência – título indexado | 115 |
| `ZI` | Beneficiário divergente - Dados do Beneficiário divergente do constante na CIP. | 115 |
| `ZJ` | Limite de pagamentos parciais excedidos | 115 |
| `ZK` | Boleto já liquidado - Título de cobrança já liquidado na base da CIP. | 115 |
