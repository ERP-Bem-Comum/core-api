# 03 — Domínios de campos

Fonte: Manual de Procedimentos Multipag Bradesco, Nº 4008.523.687, **Versão 08** – julho/2025,
seção "Descrição dos Campos" — **págs. 95-139** no PDF vigente
(`handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf`).

**Páginas reancoradas na Versão 08 em 01/09/2026** (#924) e cobradas por
`tests/cleanup/cnab-reference-pages.test.ts` contra [`00-indice-campos.md`](./00-indice-campos.md).

⚠️ Uma citação pode apontar, de propósito, para página diferente da descrição do campo — a **nota
(2)** do `G029` está na p. 101 e o campo é definido na p. 100; a tabela `G059` começa na p. 106 e
cada ocorrência tem a sua. Essas exceções vivem nomeadas no gate, não como tolerância.

Se um valor não está aqui, **não invente**. Aponte a fonte oficial — Bacen (`bcb.gov.br`) para
finalidade de TED e ISPB.

---

## G003 — Tipo de Registro (pos. 8)

`0` Header de Arquivo · `1` Header de Lote · `2` Registros Iniciais do Lote · `3` Detalhe ·
`4` Registros Finais do Lote · `5` Trailer de Lote · `9` Trailer de Arquivo

## G005 — Tipo de Inscrição

`0` Isento/Não Informado · `1` CPF · `2` CNPJ · `3` PIS/PASEP · `9` Outro

## G006 — Número de Inscrição

Quando o Tipo de Inscrição for `0`, preencher com zeros.
CPF (11 dígitos) em campo de 14 → 3 zeros à esquerda.

## G009 / G011 / G012 — Dígitos verificadores

- **G009** (DV da agência): o manual o descreve como "Campo Não Obrigatório – Informação
  Opcional" (pág. 95). **Mas o G059 `AG` e `AM` exigem o preenchimento.** Ver
  `05-armadilhas-e-divergencias.md`.
- **G011** (DV da conta): para bancos com DV de duas posições, aqui vai a **1ª posição**.
  Ex.: C/C `45981-36` → G011 = `3`.
- **G012** (DV agência/conta): para bancos com DV de duas posições, aqui vai a **2ª posição**.
  Ex.: C/C `45981-36` → G012 = `6`.

## G015 — Código Remessa/Retorno (header arquivo, pos. 143)

`1` Remessa (cliente → banco) · `2` Retorno (banco → cliente)

## G016 / G017 / G044 / G068 / P003 / P009 — Datas e horas

Data: `DDMMAAAA`. Hora: `HHMMSS`.

## G018 — Número Sequencial do Arquivo (NSA)

Número sequencial controlado pelo gerador. **Evoluir a cada header de arquivo.**

## G019 — Versão do Layout do Arquivo (pos. 164-166)

Fixo `089`. Composto de versão (2 dígitos) + release (1 dígito).

## G020 — Densidade de Gravação (pos. 167-171)

`01600` (1600 BPI) ou `06250` (6250 BPI).

## G021 — Identificação Header modalidade Pix (pos. 172-174) — pág. 15

Literal `PIX` em caixa alta, **exclusivamente** na modalidade Pix.
Lotes Pix devem vir em **arquivo separado** das demais formas de pagamento.

⚠️ **O header do arquivo Pix é uma VARIANTE, não o header normal com três posições preenchidas.**
A pág. 15 traz duas tabelas: o header padrão, onde `G021` é "Para Uso Reservado do Banco" em
**172-191** (20 posições), e — abaixo de _"Para contratos que ainda efetuam pagamentos via PIX, em
arquivo separado dos demais serviços e modalidades"_ — a variante Pix, em que o campo se parte:

| Campo | Posições | Conteúdo |
| :--- | :--- | :--- |
| `22.0` Header de identificação Pix | **172-174** | literal `PIX`, Alfa |
| `22.1` Reservado Banco | **175-191** | 17 posições, não 20 |

Quem escrever `PIX` em 172-174 sem encurtar o campo seguinte produz registro de 243 posições, ou
come três posições do reservado da empresa. Confirmado no golden do banco (`..._PIX_240`, 29/08/2026).

A descrição de campos (pág. 97) define `G021` só como "Para Uso Reservado do Banco" — o uso Pix
**não** está lá. Procurar o segundo significado na descrição de campos não o encontra.

## G025 — Tipo de Serviço (header lote, pos. 10-11)

| | | | |
|---|---|---|---|
| `01` Cobrança | `03` Bloqueto Eletrônico | `04` Conciliação Bancária | `05` Débitos |
| `06` Custódia de Cheques | `07` Gestão de Caixa | `08` Consulta/Informação Margem | `09` Averbação da Consignação |
| `10` Pagamento Dividendos | `11` Manutenção da Consignação | `12` Consignação de Parcelas | `13` Glosa da Consignação (INSS) |
| `14` Consulta de Tributos a pagar | **`20` Pagamento Fornecedor** | `22` Pagamento de Contas, Tributos e Impostos | `25` Compror |
| `26` Compror Rotativo | `29` Alegação do Pagador | `30` Pagamento Salários | `32` Pagamento de honorários |
| `33` Pagamento de bolsa auxílio | `34` Pagamento de prebenda | `40` Vendor | `41` Vendor a Termo |
| `50` Pagamento Sinistros Segurados | `60` Pagamento Despesas Viajante em Trânsito | `70` Pagamento Autorizado | `75` Pagamento Credenciados |
| `77` Pagamento de Remuneração | `80` Pagamento Representantes/Vendedores | `90` Pagamento Benefícios | `98` Pagamentos Diversos |
| `99` Exclusivo Bradesco | | | |

## G028 — Tipo de Operação (header lote, pos. 9)

`C` Lançamento a Crédito · `D` Lançamento a Débito · `E` Extrato para Conciliação ·
`G` Extrato para Gestão de Caixa · `I` Informações de Títulos Capturados do Próprio Banco ·
`R` Arquivo Remessa · `T` Arquivo Retorno

Para pagamento a fornecedor, tributos e pagamento de títulos: fixo **`C`**.

## G029 — Forma de Lançamento (header lote, pos. 12-13)

| | |
|---|---|
| `01` Crédito em Conta Corrente/Salário | `02` Cheque Pagamento/Administrativo |
| `03` DOC/TED | `04` Cartão Salário (só Tipo de Serviço `30`) |
| `05` Crédito em Conta Poupança | `10` OP à Disposição |
| `11` Pagamento de Contas e Tributos com Código de Barras | `16` Tributo - DARF Normal |
| `17` Tributo - GPS | `18` Tributo - DARF Simples |
| `19` Tributo - IPTU Prefeituras | `20` Pagamento com Autenticação |
| `21` Tributo - DARJ | `22` Tributo - GARE-SP ICMS |
| `23` Tributo - GARE-SP DR | `24` Tributo - GARE-SP ITCMD |
| `25` Tributo - IPVA | `26` Tributo - Licenciamento |
| `27` Tributo - DPVAT | `30` Liquidação de Títulos do Próprio Banco |
| `31` Pagamento de Títulos de Outros Bancos | `40` Extrato de Conta Corrente |
| **`41` TED – Outra Titularidade** | `43` TED – Mesma Titularidade |
| `44` TED para Transferência de Conta Investimento | **`45` Pix Transferência** |
| **`47` Pix QR-CODE** | `50` Débito em Conta Corrente |
| `70` Extrato para Gestão de Caixa | `71` Depósito Judicial em Conta Corrente |
| `72` Depósito Judicial em Poupança | `73` Extrato de Conta Investimento |
| `99` Cadastro de favorecidos (exclusivo Bradesco) | |

### Correspondência obrigatória Forma × Câmara (Seg. A, 18-20)

| Forma de Lançamento | Câmara | Fonte |
|---|---|---|
| `03` (DOC/TED) | `018` (ou `700`, ver P001) | nota (2) do G029, **pág. 101** |
| `41` / `43` (TED) | `018` | nota (2) do G029, **pág. 101** |
| **`45` (Pix)** | **`009`** | **golden do banco — o manual NÃO diz** |
| demais modalidades | zeros | G059 ocorrência `AK`, pág. 107 |

> ⚠️ **A linha do Pix não vem do manual — vem do golden, e o golden é norma aqui.**
> A nota (2) do G029 (pág. 101, verificada na página renderizada em 01/09/2026) tabula **apenas**
> `03 018 / 41/43 018`. A descrição de `P001` (pág. 132) enumera só `018` e `888`. E `009` **não
> ocorre uma única vez** no PDF inteiro — `pdftotext … | grep 009` volta vazio.
>
> O que sustenta o `009` é o **golden `GOLDEN_TEST_MULTIPAG_PIX_240`** (29/08/2026): forma `45` no
> header de lote, `[009]` nas posições 18-20 do Segmento A. **Decisão do dono do repositório
> (Gabriel, 01/09/2026): os goldens vieram de fonte confiável e valem como verdade.** Não é
> hipótese pendente de validador — `clearingHouseFor('45')` devolvendo `000` é defeito
> ([#890](https://github.com/ERP-Bem-Comum/core-api/issues/890) achado 2), e a divergência com o
> manual é lacuna **do manual**.
>
> O registro da divergência fica porque ele é o que impede a próxima pessoa de "corrigir" o `009`
> de volta para `000` lendo a nota (2) — não porque a questão esteja aberta.

### Os goldens são norma sobre a FORMA, não sobre a ESCOLHA

Esta é a demarcação que a decisão de 01/09/2026 **não** revoga, e ignorá-la produz o próximo defeito.

O golden responde _"que forma o banco espera?"_ — posição, presença, largura, domínio estrutural,
quais segmentos existem, o que sai zerado e o que sai em branco. **Não** responde _"que valor este
pagador deve escrever?"_, porque essa pergunta é do negócio de quem paga, não do banco.

A evidência de que a distinção é real está no arquivo irmão. No
`GOLDEN_TEST_MULTIPAG_TED_TRANSFERENCIA_BOLETO`, o lote de TED sai com `P011 = 00010`, que o
Dicionário de Domínios do SPB resolve como _"Repasses da Lei 8727"_ — e o emissor deste repositório
escreve `00005`, _"Pagamento a Fornecedor"_ (`bun …/dominios/dominio.ts FinlddIF 5`), por decisão da
P.O. registrada na [#813](https://github.com/ERP-Bem-Comum/core-api/issues/813). **O código está
certo e o golden não**, porque ali o golden só exercitava o campo.

Trocar `00005` por `00010` "porque o golden faz assim" declararia ao Banco Central a finalidade
errada num arquivo que passa em qualquer validador — exatamente o modo de falha que a #813 fechou.

## G030 — Versão do Layout do Lote (header lote, pos. 14-16)

| Modalidade | Versão |
|---|---|
| PAGFOR (pagamento fornecedor, TED, DOC, Pix) | `045` |
| Pagamento de Títulos de Cobrança | `040` |
| Tributos | `012` |

## G031 — Mensagem 1 / 2

- **Informação 1** (header de lote, 103-142): genérica, consta em todos os avisos do lote.
- **Informação 2** (segmento A, 178-217): específica daquele detalhe.

Formatações especiais da Informação 2:

| Uso | Posições | Estrutura |
|---|---|---|
| SIAPE | 178-197 | Órgão 178-182, UPAG 183-191, UG 192-197 |
| Depósito judicial (formas `71` e `72` — obrigatório) | 198-215 | 18 posições |
| Situação funcional | 216 | `1` Ativo, `2` Pensão Alim. Ativo, `3` Aposentado, `4` Pensão Alim. Aposentado, `5` Pensionista, `6` Pensão Alim. Pensionista |
| **Pix** | a partir de 178 | `CCCCCCCCCCCCCCIIIIIIIIRR` — CNPJ (14) ou CPF (11 com zeros à esq.), ISPB (8), complemento do registro (2): `01` conta corrente, `02` conta pagamento, `03` conta poupança |

## G038 — Nº Sequencial do Registro no Lote (pos. 9-13)

Sequência crescente, **inicializada em `00001` em cada novo lote**.

## G040 — Tipo de Moeda (segmento A, pos. 102-104)

`BRL` Real · `USD` Dólar Americano · `BTN` Bônus do Tesouro Nacional + TR · `PTE` · `FRF` ·
`CHF` · `JPY` · `IGP` · `IGM` · `GBP` · `ITL` · `DEM` · `TRD` · `UPC` · `UPF` · `UFR` · `XEU`

## G041 — Quantidade da Moeda

Segmento A pos. 105-119: 10 inteiros + 5 decimais implícitos.
Ver `05-armadilhas-e-divergencias.md` sobre o campo zerado.

## G059 — Códigos das Ocorrências (pos. 231-240)

Até 5 ocorrências simultâneas, cada uma com 2 dígitos. Tabela completa em
`04-ocorrencias-g059.md`.

## G060 — Tipo de Movimento (segmento A/J, pos. 15)

`0` Inclusão · `1` Consulta · `3` Estorno (só retorno) · `5` Alteração · `7` Liquidação ·
`9` Exclusão

## G061 — Código da Instrução para Movimento (segmento A/J, pos. 16-17)

| | |
|---|---|
| **`00` Inclusão de Registro Detalhe Liberado** | `05` Alteração de dados de pagamento e desautoriza |
| `06` Alteração de dados do pagamento e autoriza | **`09` Inclusão do Registro Detalhe Bloqueado** |
| `10` Alteração do Pagamento Liberado para Bloqueado | `11` Alteração do Pagamento Bloqueado para Liberado |
| `17` Alteração do Valor do Título | `19` Alteração da Data de Pagamento |
| `23` Pagamento Direto ao Fornecedor - Baixar | `25` Manutenção em Carteira - Não Pagar |
| `27` Retirada de Carteira - Não Pagar | `33` Estorno por Devolução da Câmara (só Tipo de Movimento `3`) |
| `40` Alegação do Pagador | |

Exclusivos Bradesco: `50` Inclusão de conta do favorecido · `51` Alteração de conta ·
`52` Bloqueio de conta · `53` Desbloqueio de conta · `54` Exclusão de conta ·
`60` Inclusão de Favorecidos · `61` Alteração · `62` Bloqueio · `63` Desbloqueio ·
`64` Abertura massiva de contas · `70` Exclusão de Favorecido · `71` Exclusão massiva de contas ·
`99` Exclusão do Registro Detalhe Incluído Anteriormente

**`00` vs `09` é a diferença entre o pagamento sair e ficar travado esperando liberação manual.**

## G065 — Código da Moeda (segmento J, pos. 223-224)

`01` Reservado · `02` Dólar Comercial · `03` Dólar Turismo · `04` ITRD · `05` IDTR ·
`06` UFIR Diária · `07` UFIR Mensal · `08` FAJ-TR · `09` Real · `10` TR · `11` IGPM · `12` CDI ·
`13` Percentual do CDI · `14` Euro

## G067 — Identificação de Registro Opcional

`01` Sacador Avalista · `02` Alegação do Pagador · `03` Dados do Pagador ·
`04` Cheques Utilizados · `11` Parcelas de Compror · `50` Rateio de Crédito ·
`51` Notas Fiscais · `52` Entes envolvidos no processo de pagamento

## G073 — Código da Multa

`1` Valor Fixo · `2` Percentual

## G100 — Forma de Iniciação (segmento B, pos. 15-17) — só Pix

`01` Chave Pix tipo Telefone · `02` Chave Pix tipo Email · `03` Chave Pix tipo CPF/CNPJ ·
`04` Chave Aleatória · `05` Dados Bancários

## G101 — Informações 10 / 11 / 12 do Segmento B

Ver as duas tabelas de subdivisão em `02-layout-registros.md`.

## G102 — Chave de Pagamento (segmento J-52 Pix)

Obrigatório. URL para QR-Code Dinâmico ou Chave Pix para QR-Code Estático.
TXID é opcional no QR-Code Estático e limitado a 30 posições.

---

## P001 — Código da Câmara Centralizadora (segmento A, pos. 18-20) — pág. 132

| Valor | Significado | Fonte |
|---|---|---|
| `018` | TED (STR, CIP) | descrição de campos, pág. 132 |
| `888` | TED usando ISPB da instituição destinatária — **obriga** preencher o Código ISPB no segmento B (233-240) | descrição de campos, pág. 132 |
| `700` | DOC (COMPE) — ⚠️ ver abaixo | histórico de versões, pág. 139 |
| `009` | Pix (SPI) — ⚠️ ausente do manual | golden do banco, ver G029 |
| zeros | demais modalidades | G059 ocorrência `AK`, pág. 107 |

> ⚠️ Era **`988`** aqui até 01/09/2026, e o manual diz **`888`** — corrigido contra a pág. 132
> renderizada. Um dígito errado num campo de três posições produz arquivo bem-formado que o banco
> recusa, e o `remittance-inspector.ts` não pega, porque não é defeito de forma.
>
> O `700` **não está** na descrição de campos da pág. 132: aparece só no histórico de versões
> (pág. 139), junto das alterações da modalidade **DOC — descontinuada em fev/2024** (ver `P005`
> abaixo, campo extinto pela mesma descontinuidade). Tratar como provavelmente **removido**, não
> como valor emitível, até que um golden ou o validador diga o contrário.

## P005 — Complemento do Tipo de Serviço (segmento A, pos. 218-219) — ⚠️ CAMPO EXTINTO

> **NÃO ESCREVER NENHUM DESTES VALORES em 218-219.** O campo foi **excluído do manual** com a
> descontinuidade da modalidade DOC (fev/2024); a posição hoje é `G004` — Uso Exclusivo
> FEBRABAN/CNAB, default Brancos. Um código deste domínio ali é **recusa nomeada** pelo validador:
> _"Quando TED, não informar finalidade complementar DOC"_. Medido em 25/08/2026 —
> [inquiry-0033](../../../../handbook/inquiries/0033-cnab-multipag-bisseccao-validador.md).
>
> A tabela fica **como referência histórica**, para ler arquivo antigo e para reconhecer o domínio
> quando alguém o citar — nunca para gerar. O `07` daqui já foi confundido com o `07` da tabela de
> TED, que é **aluguel**: as duas tabelas não compartilham numeração.

| | |
|---|---|
| `01` Crédito em Conta | `02` Pagamento de Aluguel/Condomínio |
| `03` Pagamento de Duplicata/Títulos | `04` Pagamento de Dividendos |
| `05` Pagamento de Mensalidade Escolar | `06` Pagamento de Salários |
| **`07` Pagamento a Fornecedores** | `08` Operações de Câmbio/Fundos/Bolsa |
| `09` Repasse de Arrecadação/Pagamento de Tributos | `10` Transferência Internacional em Real |
| `11` DOC para Poupança | `12` DOC para Depósito Judicial |
| `13` Outros | `16` Pagamento de bolsa auxílio |
| `17` Remuneração à cooperado | `18` Pagamento de honorários |
| `19` Pagamento de prebenda | |

## P006 — Aviso ao Favorecido (segmento A, pos. 230)

`0` Não Emite Aviso · `2` Só para o Remetente · `5` Só para o Favorecido ·
`6` Remetente e Favorecido · `7` Favorecido e 2 vias para o Remetente

## P011 — Código de Finalidade da TED (segmento A, pos. 220-224)

Códigos de **finalidade cliente** do Banco Central. O manual não reproduz a tabela — remete a
bcb.gov.br → Sistema de Pagamentos Brasileiro → Transferência de Arquivos → Dicionários de
Domínios para o SPB.

**Não invente código aqui.** Consulte a Tabela de Domínio do SPB, que vive local:
`bun .claude/skills/cnab240-bradesco/dominios/dominio.ts FinlddIF <codigo>` — e **leia a vigência**.

⚠️ **`P011` tem domínio PRÓPRIO e NÃO espelha o `P005`.** Este parágrafo afirmava o contrário até
25/08/2026, concluindo que `00005` seria "mensalidade escolar" e incompatível com Pagamento
Fornecedor. **É falso**, e a afirmação já produziu um falso suspeito num diagnóstico de recusa real.

No domínio de TED, `FinlddIF/5` é **"Pagamento a Fornecedor"**, vigente desde 2003 — consultado na
tabela do Bacen, não inferido. É o valor que casa com o Tipo de Serviço `20`; `07` ali é aluguel.

**Medido em 25/08/2026** ([inquiry-0033](../../../../handbook/inquiries/0033-cnab-multipag-bisseccao-validador.md)
§4.1): em TED o campo é obrigatório e `00007` também foi aceito; **fora de TED, 220-224 vai em
BRANCOS — preencher com zeros é recusa.**

⚠️ A mesma afirmação falsa vivia em `05-armadilhas-e-divergencias.md` e foi corrigida lá primeiro,
**sobrevivendo aqui a duas revisões independentes que a tinham como alvo**. Ao achar premissa falsa
nestas referências, faça `grep` pelo CONCEITO em todo o diretório antes de dar por corrigida.

## P013 — Código Finalidade Complementar (segmento A, pos. 225-226)

Para finalidade TED, domínio fechado:

- `CC` — destino com tipo de conta corrente
- `PP` — destino com tipo de conta poupança

Na modalidade DOC, a informação vem do código de finalidade DOC (P005).

## P014 — Indicativo de Forma de Pagamento (header lote, pos. 223-224)

`01` Débito em Conta Corrente

## P015 — Código ISPB (segmento B, pos. 233-240)

Código do Bacen para identificar instituições financeiras no SPB.
Obrigatório quando for necessário enviar TED para instituição sem código COMPE (câmara `988`) e
na modalidade Pix por dados bancários.

**Não invente ISPB.** Consultar bcb.gov.br.

## P016 — Número Conta Pagamento Creditada (segmento C, pos. 128-147)

Identifica contas em Instituições de Pagamento, permitindo transferência de conta corrente para
conta de pagamento.
