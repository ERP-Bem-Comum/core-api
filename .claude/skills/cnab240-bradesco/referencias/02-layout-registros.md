# 02 — Layout dos registros, posição a posição

Fonte: Manual de Procedimentos Multipag Bradesco, Nº 4008.523.687, **Versão 08** – julho/2025
(`handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf`).

**As páginas dos cabeçalhos foram reancoradas na Versão 08 em 01/09/2026** (#924), conferidas uma a
uma contra o sumário do PDF (págs. 3-4) e, em três casos, contra a página renderizada.

⚠️ **Os cabeçalhos de seção NÃO são cobrados por gate** — `cnab-reference-pages.test.ts` só alcança
citações que trazem um código `Gxxx`/`Pxxx`, e o índice derivado não mapeia registros. Ao editar um
`## … — pág. N` daqui, **abra o PDF**: foi por esta porta que a #891 herdou "pág. 26" para o J-52,
que na Versão 08 é a **33** (a 26 é o Segmento C).

Confirme a posição no PDF antes de escrever código: uma posição errada gera arquivo que o banco
recusa sem explicar.

`*` na coluna Obr. = campo marcado com asterisco no manual (crítica).
**Atenção:** ausência de asterisco NÃO significa opcional. Ver `05-armadilhas-e-divergencias.md`.

---

## Header de Arquivo (Tipo 0) — pág. 15

| Pos. | Tam. | Campo | Fmt | Default | Obr. | Desc. |
|---|---|---|---|---|---|---|
| 1-3 | 3 | Código do Banco na Compensação | Num | `237` | | G001 |
| 4-7 | 4 | Lote de Serviço | Num | `0000` | * | G002 |
| 8 | 1 | Tipo de Registro | Num | `0` | * | G003 |
| 9-17 | 9 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 18 | 1 | Tipo de Inscrição da Empresa | Num | | * | G005 |
| 19-32 | 14 | Número de Inscrição da Empresa | Num | | * | G006 |
| 33-52 | 20 | Código do Convênio no Banco | Alfa | | * | G007 |
| 53-57 | 5 | Agência Mantenedora da Conta | Num | | * | G008 |
| 58 | 1 | DV da Agência | Alfa | | * | G009 |
| 59-70 | 12 | Número da Conta Corrente | Num | | * | G010 |
| 71 | 1 | DV da Conta | Alfa | | * | G011 |
| 72 | 1 | DV da Agência/Conta | Alfa | | * | G012 |
| 73-102 | 30 | Nome da Empresa | Alfa | | | G013 |
| 103-132 | 30 | Nome do Banco | Alfa | | | G014 |
| 133-142 | 10 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 143 | 1 | Código Remessa/Retorno | Num | `1` remessa | | G015 |
| 144-151 | 8 | Data de Geração (DDMMAAAA) | Num | | | G016 |
| 152-157 | 6 | Hora de Geração (HHMMSS) | Num | | | G017 |
| 158-163 | 6 | Número Sequencial do Arquivo (NSA) | Num | | * | G018 |
| 164-166 | 3 | Versão do Layout do Arquivo | Num | `089` | * | G019 |
| 167-171 | 5 | Densidade de Gravação | Num | `01600` | | G020 |
| 172-174 | 3 | Identificação Remessa PIX | Alfa | `PIX` só no Pix | | G021 |
| 175-191 | 17 | Uso Reservado do Banco | Alfa | Brancos | | G021 |
| 192-211 | 20 | Uso Reservado da Empresa | Alfa | Brancos | | G022 |
| 212-240 | 29 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |

---

## Trailer de Arquivo (Tipo 9) — pág. 16

| Pos. | Tam. | Campo | Fmt | Default | Obr. | Desc. |
|---|---|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | `237` | | G001 |
| 4-7 | 4 | Lote de Serviço | Num | `9999` | * | G002 |
| 8 | 1 | Tipo de Registro | Num | `9` | * | G003 |
| 9-17 | 9 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 18-23 | 6 | Quantidade de Lotes do Arquivo | Num | | | G049 |
| 24-29 | 6 | Quantidade de Registros do Arquivo | Num | | | G056 |
| 30-35 | 6 | Qtde de Contas p/ Conciliação | Num | | * | G037 |
| 36-240 | 205 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |

---

## Header de Lote — Pagamento Fornecedor / TED / DOC / Pix (Tipo 1) — pág. 23

| Pos. | Tam. | Campo | Fmt | Default | Obr. | Desc. |
|---|---|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | `237` | | G001 |
| 4-7 | 4 | Lote de Serviço | Num | | * | G002 |
| 8 | 1 | Tipo de Registro | Num | `1` | * | G003 |
| 9 | 1 | Tipo da Operação | Alfa | `C` | * | G028 |
| 10-11 | 2 | Tipo do Serviço | Num | | * | G025 |
| 12-13 | 2 | Forma de Lançamento | Num | | * | G029 |
| 14-16 | 3 | Versão do Layout do Lote | Num | `045` | * | G030 |
| 17 | 1 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 18 | 1 | Tipo de Inscrição da Empresa | Num | | * | G005 |
| 19-32 | 14 | Número de Inscrição da Empresa | Num | | * | G006 |
| 33-52 | 20 | Código do Convênio no Banco | Alfa | | * | G007 |
| 53-57 | 5 | Agência Mantenedora da Conta | Num | | * | G008 |
| 58 | 1 | DV da Agência | Alfa | | * | G009 |
| 59-70 | 12 | Número da Conta Corrente | Num | | * | G010 |
| 71 | 1 | DV da Conta | Alfa | | * | G011 |
| 72 | 1 | DV da Agência/Conta | Alfa | | * | G012 |
| 73-102 | 30 | Nome da Empresa | Alfa | | | G013 |
| 103-142 | 40 | Informação 1 (Mensagem) | Alfa | | * | G031 |
| 143-172 | 30 | Logradouro da Empresa | Alfa | | | G032 |
| 173-177 | 5 | Número do Local | Num | | | G032 |
| 178-192 | 15 | Complemento | Alfa | | | G032 |
| 193-212 | 20 | Cidade | Alfa | | | G033 |
| 213-217 | 5 | CEP | Num | | | G034 |
| 218-220 | 3 | Complemento do CEP | Alfa | | | G035 |
| 221-222 | 2 | Sigla do Estado | Alfa | | | G036 |
| 223-224 | 2 | Indicativo de Forma de Pagamento | Num | `01` | | P014 |
| 225-230 | 6 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 231-240 | 10 | Códigos das Ocorrências p/ Retorno | Alfa | | * | G059 |

---

## Segmento A — Pagamento (Tipo 3) — pág. 24

| Pos. | Tam. | Campo | Fmt | Default | Obr. | Desc. |
|---|---|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | `237` | | G001 |
| 4-7 | 4 | Lote de Serviço | Num | | * | G002 |
| 8 | 1 | Tipo de Registro | Num | `3` | * | G003 |
| 9-13 | 5 | Nº Sequencial do Registro no Lote | Num | | * | G038 |
| 14 | 1 | Código de Segmento | Alfa | `A` | * | G039 |
| 15 | 1 | Tipo de Movimento | Num | | * | G060 |
| 16-17 | 2 | Código da Instrução p/ Movimento | Num | | | G061 |
| 18-20 | 3 | Código da Câmara Centralizadora | Num | | * | P001 |
| 21-23 | 3 | Código do Banco do Favorecido | Num | | | P002 |
| 24-28 | 5 | Agência do Favorecido | Num | | * | G008 |
| 29 | 1 | DV da Agência do Favorecido | Alfa | | * | G009 |
| 30-41 | 12 | Conta Corrente do Favorecido | Num | | * | G010 |
| 42 | 1 | DV da Conta | Alfa | | * | G011 |
| 43 | 1 | DV da Agência/Conta | Alfa | | * | G012 |
| 44-73 | 30 | Nome do Favorecido | Alfa | | | G013 |
| 74-93 | 20 | Seu Número (docto atribuído pela empresa) | Alfa | | | G064 |
| 94-101 | 8 | Data do Pagamento (DDMMAAAA) | Num | | | P009 |
| 102-104 | 3 | Tipo da Moeda | Alfa | `BRL` | * | G040 |
| 105-119 | 15 | Quantidade da Moeda (10 int + 5 dec) | Num | | | G041 |
| 120-134 | 15 | Valor do Pagamento (13 int + 2 dec) | Num | | | P010 |
| 135-154 | 20 | Nosso Número (atribuído pelo banco) | Alfa | Brancos na remessa | * | G043 |
| 155-162 | 8 | Data Real da Efetivação | Num | Zeros na remessa | | P003 |
| 163-177 | 15 | Valor Real da Efetivação | Num | Zeros na remessa | | P004 |
| 178-217 | 40 | Informação 2 (Mensagem) | Alfa | | * | G031 |
| 218-219 | 2 | Uso Exclusivo FEBRABAN/CNAB ⚠️ | Alfa | Brancos | | G004 |
| 220-224 | 5 | Código de Finalidade da TED | Alfa | | * | P011 |
| 225-226 | 2 | Código Finalidade Complementar ⚠️ | Alfa | | * | P013 |
| 227-229 | 3 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 230 | 1 | Aviso ao Favorecido | Num | | * | P006 |
| 231-240 | 10 | Códigos das Ocorrências p/ Retorno | Alfa | | * | G059 |

⚠️ **As duas linhas com ⚠️ acima foram corrigidas em 25/08/2026 e valem por si**
([inquiry-0033](../../../../handbook/inquiries/0033-cnab-multipag-bisseccao-validador.md), 18 submissões ao validador):

- **218-219 NÃO é mais `P005`.** Este arquivo listava ali "Complemento do Tipo de Serviço" **com
  asterisco**, e o campo foi **excluído do manual** com a descontinuidade do DOC (fev/2024). No
  layout vigente a posição é `G004`, default Brancos. Preencher com código do domínio DOC é
  **recusa nomeada**: _"Quando TED, não informar finalidade complementar DOC"_. Foi esta linha que
  induziu 8 das críticas do experimento.
- **225-226 (`P013`) É crítica**, e não tinha asterisco aqui. Em TED exige `CC` ou `PP`; branco é
  recusado. **Fora de TED é o inverso: preenchido é recusado.** O manual não o marca com asterisco
  e a G059 não tem código para ele — é o caso exemplar de "sem asterisco ≠ opcional".

---

## Segmento B — Complemento do Favorecido (Tipo 3) — pág. 25

| Pos. | Tam. | Campo | Fmt | Obr. | Desc. |
|---|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | | G001 |
| 4-7 | 4 | Lote de Serviço | Num | * | G002 |
| 8 | 1 | Tipo de Registro (`3`) | Num | * | G003 |
| 9-13 | 5 | Nº Sequencial do Registro no Lote | Num | * | G038 |
| 14 | 1 | Código de Segmento (`B`) | Alfa | * | G039 |
| 15-17 | 3 | Forma de Iniciação (só Pix) / CNAB | Alfa | | G100 |
| 18 | 1 | Tipo de Inscrição do Favorecido | Num | * | G005 |
| 19-32 | 14 | Nº de Inscrição do Favorecido | Num | * | G006 |
| 33-67 | 35 | Informação 10 | Alfa | | G101 |
| 68-127 | 60 | Informação 11 | Alfa | | G101 |
| 128-226 | 99 | Informação 12 | Alfa | | G101 |
| 227-232 | 6 | Código UG Centralizadora (SIAPE) | Num | | P012 |
| 233-240 | 8 | Código ISPB | Num | | P015 |

### Segmento B — subdivisão das Informações 10/11/12

**Modalidade NÃO-Pix** (crédito em conta, DOC, TED, OP, pagamento com autenticação):

| Pos. | Tam. | Campo | Fmt | Ocorrência |
|---|---|---|---|---|
| 33-62 | 30 | Logradouro do Favorecido | Alfa | `AU` |
| 63-67 | 5 | Nº do Local | Num | `AV` |
| 68-82 | 15 | Complemento | Alfa | |
| 83-97 | 15 | Bairro | Alfa | |
| 98-117 | 20 | Cidade | Alfa | `AW` |
| 118-122 | 5 | CEP | Num | `AX` |
| 123-125 | 3 | Complemento do CEP | Alfa | `AX` |
| 126-127 | 2 | Sigla do Estado (UF) | Alfa | `AY` |
| 128-135 | 8 | Data do Vencimento (nominal) ⚠️ | Num | crítica, sem código |
| 136-150 | 15 | Valor do Documento (nominal) ⚠️ | Num | crítica, sem código |
| 151-165 | 15 | Valor do Abatimento | Num | |
| 166-180 | 15 | Valor do Desconto | Num | |
| 181-195 | 15 | Valor da Mora | Num | |
| 196-210 | 15 | Valor da Multa | Num | |
| 211-225 | 15 | Código/Documento do Favorecido | Alfa | |
| 226 | 1 | Aviso ao Favorecido | Num | |

**Modalidade Pix:**

| Pos. | Tam. | Campo | Fmt |
|---|---|---|---|
| 15-17 | 3 | Forma de Iniciação (domínio G100) | Alfa |
| 33-67 | 35 | TXID (opcional) | Alfa |
| 68-127 | 60 | Identificação do pagamento entre usuários (opcional) | Alfa |
| 128-226 | 99 | Se iniciação `01`/`02`/`04`: **chave Pix**. Se `05`: tipo de conta em 128-129 (`01` corrente, `02` pagamento, `03` poupança), resto em brancos | Alfa |
| 233-240 | 8 | Código ISPB do PSP do recebedor | Num |

⚠️ **`G100` é campo Alfa de 3 posições com domínio de 2 dígitos — o preenchimento é `04 `, não
`004`.** Alfa alinha à esquerda com brancos à direita (regra geral desta skill), e o golden do banco
confirma: `[04 ]` em 15-17. Zero-padding à esquerda aqui é o reflexo errado de tratar um domínio
numérico como campo Num, e produz uma forma de iniciação que não existe no domínio.

Medido no golden `GOLDEN_TEST_MULTIPAG_PIX_240` (01/09/2026), lote de forma `45`: `33-67` em
brancos (TXID é opcional e saiu vazio), `68-127` com texto livre, `128-226` com a chave alinhada à
esquerda, `233-240` com o ISPB do PSP. O `P012` (UG SIAPE, 227-232) saiu **zerado**, não em brancos
— apesar de o layout marcá-lo Num sem obrigatoriedade.

---

## Segmento C — Complemento Opcional (Tipo 3) — pág. 26

| Pos. | Tam. | Campo | Fmt | Desc. |
|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | G001 |
| 4-7 | 4 | Lote de Serviço | Num | G002 |
| 8 | 1 | Tipo de Registro (`3`) | Num | G003 |
| 9-13 | 5 | Nº Sequencial no Lote | Num | G038 |
| 14 | 1 | Código de Segmento (`C`) | Alfa | G039 |
| 15-17 | 3 | Uso Exclusivo FEBRABAN/CNAB | Alfa | G004 |
| 18-32 | 15 | Valor do IR | Num | G050 |
| 33-47 | 15 | Valor do ISS | Num | G051 |
| 48-62 | 15 | Valor do IOF | Num | G052 |
| 63-77 | 15 | Valor Outras Deduções | Num | G053 |
| 78-92 | 15 | Valor Outros Acréscimos | Num | G054 |
| 93-97 | 5 | Agência Substituta | Num | G008 |
| 98 | 1 | DV da Agência Substituta | Alfa | G009 |
| 99-110 | 12 | Conta Corrente Substituta | Num | G010 |
| 111 | 1 | DV da Conta | Alfa | G011 |
| 112 | 1 | DV Agência/Conta | Alfa | G012 |
| 113-127 | 15 | Valor do INSS | Num | G055 |
| 128-147 | 20 | Número Conta Pagamento Creditada | Num | P016 |
| 148-240 | 93 | Uso Exclusivo FEBRABAN/CNAB | Alfa | G004 |

---

## Segmento 5 — Uso Bradesco (Tipo 3) — pág. 27

| Pos. | Tam. | Campo | Fmt | Desc. |
|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | G001 |
| 4-7 | 4 | Lote de Serviço | Num | G002 |
| 8 | 1 | Tipo de Registro (`3`) | Num | G003 |
| 9-13 | 5 | Nº Sequencial no Lote | Num | G038 |
| 14 | 1 | Código de Segmento (`5`) | Alfa | G039 |
| 15-17 | 3 | Uso Exclusivo Bradesco | Alfa | G004 |
| 18-26 | 9 | Número da Lista de Débito | Num | 5001 |
| 27-32 | 6 | Horário do Débito do Pagamento | Num | 5002 |
| 33-37 | 5 | Mensagem da 1ª Linha de Extrato | Num | 5003 |
| 38-42 | 5 | Mensagem da 2ª Linha de Extrato | Num | 5004 |
| 43-92 | 50 | Uso da Empresa | Alfa | 5005 |
| 93-95 | 3 | Tipo de Documento | Num | 5006 |
| 96-110 | 15 | Número do Documento | Num | 5007 |
| 111-112 | 2 | Série do Documento | Alfa | 5008 |
| 113-127 | 15 | Uso Exclusivo Bradesco | Alfa | G004 |
| 128-135 | 8 | Data de Emissão do Documento | Num | 5010 |
| 136-165 | 30 | Nome Reclamante TED Dep. Judicial | Alfa | 5011 |
| 166-190 | 25 | Número Proc. TED Dep. Judicial | Alfa | 5011 |
| 191-205 | 15 | PIS/PASEP TED Dep. Judicial | Num | 5011 |
| 206-230 | 25 | Uso Exclusivo Bradesco | Alfa | G004 |
| 231-240 | 10 | Códigos das Ocorrências | Alfa | G059 |

---

## Segmento Z — Autenticação (Tipo 3, só retorno) — pág. 28

| Pos. | Tam. | Campo | Fmt | Desc. |
|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | G001 |
| 4-7 | 4 | Lote de Serviço | Num | G002 |
| 8 | 1 | Tipo de Registro (`3`) | Num | G003 |
| 9-13 | 5 | Nº Sequencial no Lote | Num | G038 |
| 14 | 1 | Código de Segmento (`Z`) | Alfa | G039 |
| 15-78 | 64 | Autenticação / Identificador EndToEnd Pix | Alfa | Z001 |
| 79-103 | 25 | Autenticação Bancária / Protocolo | Alfa | Z002 |
| 104-106 | 3 | Indicador de conversão TED/DOC → Pix | Alfa | Z003 |
| 107-230 | 124 | Reservado CNAB/FEBRABAN | Alfa | G004 |
| 231-240 | 10 | Códigos das Ocorrências | Alfa | G059 |

---

## Trailer de Lote (Tipo 5) — pág. 29

| Pos. | Tam. | Campo | Fmt | Default | Obr. | Desc. |
|---|---|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | `237` | | G001 |
| 4-7 | 4 | Lote de Serviço | Num | | * | G002 |
| 8 | 1 | Tipo de Registro | Num | `5` | * | G003 |
| 9-17 | 9 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 18-23 | 6 | Quantidade de Registros do Lote | Num | | * | G057 |
| 24-41 | 18 | Somatória de Valores (16 int + 2 dec) | Num | | | P007 |
| 42-59 | 18 | Somatória de Quantidade de Moedas (13 int + 5 dec) | Num | | | G058 |
| 60-65 | 6 | Número do Aviso de Débito | Num | | | G066 |
| 66-230 | 165 | Uso Exclusivo FEBRABAN/CNAB | Alfa | Brancos | | G004 |
| 231-240 | 10 | Códigos das Ocorrências p/ Retorno | Alfa | | * | G059 |

---

## Header de Lote — Pagamento de Títulos de Cobrança — pág. 31

Idêntico ao header de lote de Pagamento Fornecedor, com duas diferenças:

- Posições 14-16 (Versão do Layout do Lote) = **`040`**, não `045`.
- Posições 223-230 = Uso Exclusivo FEBRABAN/CNAB (brancos, 8 posições). Não há o campo
  Indicativo de Forma de Pagamento.

---

## Segmento J — Pagamento de Títulos (Tipo 3) — pág. 32

| Pos. | Tam. | Campo | Fmt | Obr. | Desc. |
|---|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | | G001 |
| 4-7 | 4 | Lote de Serviço | Num | * | G002 |
| 8 | 1 | Tipo de Registro (`3`) | Num | * | G003 |
| 9-13 | 5 | Nº Sequencial no Lote | Num | * | G038 |
| 14 | 1 | Código de Segmento (`J`) | Alfa | * | G039 |
| 15 | 1 | Tipo de Movimento | Num | * | G060 |
| 16-17 | 2 | Código da Instrução p/ Movimento | Num | | G061 |
| 18-61 | 44 | Código de Barras | Num | * | G063 |
| 62-91 | 30 | Nome do Beneficiário | Alfa | | G013 |
| 92-99 | 8 | Data do Vencimento (nominal) | Num | | G044 |
| 100-114 | 15 | Valor do Título (nominal) | Num | | G042 |
| 115-129 | 15 | Valor do Desconto + Abatimento | Num | | L002 |
| 130-144 | 15 | Valor da Mora + Multa | Num | | L003 |
| 145-152 | 8 | Data do Pagamento | Num | | P009 |
| 153-167 | 15 | Valor do Pagamento | Num | | P010 |
| 168-182 | 15 | Quantidade da Moeda | Num | | G041 |
| 183-202 | 20 | Referência do Pagador (Seu Número) | Alfa | | G064 |
| 203-222 | 20 | Nosso Número | Alfa | * | G043 |
| 223-224 | 2 | Código da Moeda | Num | * | G065 |
| 225-230 | 6 | Uso Exclusivo FEBRABAN/CNAB | Alfa | | G004 |
| 231-240 | 10 | Códigos das Ocorrências | Alfa | * | G059 |

---

## Segmento J-52 — Entes do Pagamento (Tipo 3) — pág. 33

Obrigatório para pagamento de títulos de cobrança, independentemente do valor, com transferência
para o beneficiário.

| Pos. | Tam. | Campo | Fmt | Desc. |
|---|---|---|---|---|
| 1-3 | 3 | Código do Banco | Num | G001 |
| 4-7 | 4 | Lote de Serviço | Num | G002 |
| 8 | 1 | Tipo de Registro (`3`) | Num | G003 |
| 9-13 | 5 | Nº Sequencial no Lote | Num | G038 |
| 14 | 1 | Código de Segmento (`J`) | Alfa | G039 |
| 15 | 1 | Uso Exclusivo FEBRABAN/CNAB | Alfa | G004 |
| 16-17 | 2 | Código de Movimento Remessa | Num | C004 |
| 18-19 | 2 | Identificação Registro Opcional (`52`) | Num | G067 |
| 20 | 1 | Tipo de Inscrição do Pagador | Num | G005 |
| 21-35 | 15 | Número de Inscrição do Pagador | Num | G006 |
| 36-75 | 40 | Nome do Pagador | Alfa | G013 |
| 76 | 1 | Tipo de Inscrição do Beneficiário | Num | G005 |
| 77-91 | 15 | Número de Inscrição do Beneficiário | Num | G006 |
| 92-131 | 40 | Nome do Beneficiário | Alfa | G013 |
| 132 | 1 | Tipo de Inscrição do Sacador Avalista | Num | G005 |
| 133-147 | 15 | Número de Inscrição do Sacador Avalista | Num | G006 |
| 148-187 | 40 | Nome do Sacador Avalista | Alfa | G013 |
| 188-240 | 53 | Uso Exclusivo FEBRABAN/CNAB | Alfa | G004 |

---

## Segmento J-52 para Pix (Tipo 3) — pág. 42

Igual ao J-52 até a posição 131, depois:

| Pos. | Tam. | Campo | Fmt | Desc. |
|---|---|---|---|---|
| 132-210 | 79 | URL / Chave de Endereçamento de Pagamento | Alfa | G102 |
| 211-240 | 30 | TXID — Código de Identificação do QR-Code | Alfa | |

Nas posições 20-75 fica a Identificação do Devedor e em 76-131 a Identificação do Favorecido.

---

## Retorno — não existe layout separado

**O retorno usa os MESMOS registros da remessa.** Não há uma seção "layout de retorno" no manual, e
procurar por uma custa tempo: o que muda é o preenchimento, não a estrutura.

O campo que carrega a resposta do banco está declarado **dentro do layout de cada registro**:

| Campo | Posições | Tam. | Fmt | Código |
| --- | --- | --- | --- | --- |
| Códigos das Ocorrências p/ Retorno | **231-240** | 10 | Alfa | `*G059` |

São **até 5 ocorrências de 2 dígitos cada**, concatenadas e alinhadas à esquerda. Na **remessa** as
dez posições vão em **branco**; no **retorno** o banco as preenche. O asterisco é do manual — é
campo de crítica.

Registros que declaram o campo, com a numeração do manual (todas as seções de modalidade):

| Registro | Nº do campo | Registro | Nº do campo |
| --- | --- | --- | --- |
| Header de Lote | `28.1` / `27.1` | Segmento J | `21.3J` |
| Segmento A | `30.3A` | Segmento O | `16.3O` |
| Segmento B | — (o B complementa o A) | Segmento N | `14.3N` |
| Trailer de Lote | `10.5` | Segmento W | `12.3W` |
| Registro tipo 5 (opcional) | `18.5` | Segmento Z | `09.3Z` |

⚠️ **Consequência prática:** um mesmo pagamento pode voltar com ocorrência no Segmento A **e** no
header do lote — a crítica de lote e a de detalhe são independentes. Ler só uma delas dá diagnóstico
parcial.

**No código:** as posições vivem em `positional-read.ts`, compartilhadas entre escrita e leitura
exatamente por isso — _"o Segmento A é o mesmo registro nas duas direções, e duas cópias das
posições divergem no dia em que o layout mudar"_. O parser é `return-file.ts`.

Para o significado de cada código, ver [`04-ocorrencias-g059.md`](./04-ocorrencias-g059.md); para a
página de cada um no PDF, [`00-indice-campos.md`](./00-indice-campos.md) §Ocorrências.
