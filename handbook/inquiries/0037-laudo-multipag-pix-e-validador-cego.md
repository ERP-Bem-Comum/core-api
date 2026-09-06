---
inquiry: 0037
title: "O laudo do Multipag Pix — os 6 pontos confirmados, e a descoberta de que o Validador Universal é cego para a modalidade"
state: decided
opened: 2026-09-02
last_reviewed: 2026-09-05
---

# Inquiry-0037: O laudo do Multipag Pix, e o Validador Universal cego para a modalidade

- **Status:** Decided
- **Opened:** 2026-09-02 (envio do arquivo de teste)
- **Closed/Decided:** 2026-09-05 (resposta do banco)
- **Opened by:** A P.O., por e-mail ao Bradesco
- **Asked to:** **equipe Multipag Pix/VAN do Bradesco**, via gerente da conta
- **Impact:** #923 · #945 · #948 · #980 · #863 · PRs #981/#982/#983 · web-app#399

---

## 1. Por que esta inquiry existe

A frente Pix chegou em 02/09 com **seis decisões de layout sem fonte primária**. Nenhuma delas era
inferência frouxa — todas tinham golden do banco ou leitura de manual por trás —, mas nenhuma tinha
resposta escrita, e três estavam segurando código:

- o **ISPB** vinha de uma tabela de-para embarcada (#934), enquanto a orientação verbal do gerente
  em 01/09 dizia que não era necessário;
- o **bloco bancário do favorecido** era exigido no pré-voo (#838) com base no golden, contra a
  premissa da modalidade (#708/#945);
- e a **câmara `009`** não ocorre uma única vez no manual inteiro.

⚠️ E havia um obstáculo de método: **o Validador Universal não tem formulário de Pix.** A única
régua disponível era submeter o arquivo pelo formulário Multipag — o que, como esta inquiry
descobriu, é justamente o que não funciona.

## 2. O que foi enviado

Arquivo `TESTE_PIX_BLOQUEADO_CNAB240_REV2.REM` ([anexo](assets/0037/TESTE_PIX_BLOQUEADO_CNAB240_REV2.REM)),
enviado em 02/09/2026. **Dados fictícios** — CNPJ `12345678/0001-95`, empresa `EMPRESA TESTE PIX`,
favorecido `FORNECEDOR TESTE PIX`, chave aleatória sintética.

Um pagamento Pix por chave aleatória, modalidade `45`, com inclusão bloqueada para posterior
autorização. Seis registros: header de arquivo, header de lote, par A+B, trailer de lote, trailer de
arquivo.

Junto foi o relatório do Validador Universal
([anexo](assets/0037/validador-universal-relatorio-02092026.pdf)), submetido em 02/09 às 19:03 —
enviado **como referência**, com a hipótese declarada de que suas críticas de Pix decorriam de o
validador não aplicar o layout da modalidade.

### As seis perguntas

1. modalidade `45` para Pix Transferência;
2. câmara `009`;
3. forma de iniciação `G100 = 04` para chave aleatória;
4. ISPB preenchido com `00000000`;
5. movimento `0` + instrução `09`, para inclusão de pagamento bloqueado;
6. possibilidade de enviar banco, agência e conta do favorecido **zerados** quando o Pix é iniciado
   por chave.

Foi pedido também o **arquivo modelo / Golden Test homologado** de Multipag Pix. **Não veio.**

## 3. A resposta (05/09/2026)

> *"O arquivo foi validado e não necessita de ajustes em sua estrutura, estando apto para
> transmissão. Os questionamentos encaminhados abaixo também estão corretos e em conformidade com o
> layout. Em relação ao sexto questionamento, é possível enviar os campos referentes ao banco,
> agência e conta do favorecido preenchidos com zeros."*

Os seis pontos confirmados. ⚠️ **O sexto é PERMISSIVO** — *"é possível enviar"* autoriza, não
obriga —, e é o suficiente: se zeros são aceitos, o bloco bancário deixa de ser dado necessário para
pagar por chave.

## 4. ⚠️ A descoberta que vale mais que as seis confirmações

**O Validador Universal não aplica o layout de Pix.** O portal do Bradesco lista **Pix como layout
separado de Multipag**, e o arquivo foi validado pela régua Multipag convencional. O relatório não
esconde: o resumo do lote imprime `45-Modalidade não localizada`.

Dos **21 achados** do relatório, **17 são falsos positivos da modalidade** — refutados um a um pela
resposta:

| linha | colunas | o validador diz | a verdade do layout Pix |
| :--- | :--- | :--- | :--- |
| resumo | — | `45-Modalidade não localizada` | `45` = Pix Transferência |
| 1 | 172-191 | *reservado ao banco, deixar em branco* | literal `PIX` em 172-174 (`G021`) |
| 2 | 012-013 | *forma de lançamento inválida* (×2) | `45` |
| 3 | 018-020 | *câmara centralizadora inválida* | `009` (SPI) |
| 3 | 021-023 | *código do banco inválido* | zeros |
| 3 | 024-028 | *agência do favorecido inválida* | zeros |
| 3 | 178-217 | *campo destinado a informações SIAPE* | `G031` na formatação Pix: inscrição(14) + ISPB(8) + tipo de conta(2) |
| 4 | 015-017 | *exclusivo Febraban, deixar em branco* | `G100`, forma de iniciação — `'04 '` |
| 4 | 118-125 … 226 (9 achados) | CEP / vencimento / valor / abatimento / desconto / mora / multa / aviso | na modalidade Pix o bloco 033-226 carrega **TXID, identificação e a chave** |

**Os 4 restantes** — linhas 1 e 2, colunas 058 e 071, DV da agência e da conta do **cedente** — não
são falsos positivos da modalidade **e também não estão validados**: os dados são fictícios, então
os DVs não fecham por construção. Não servem de evidência em direção nenhuma para #816 nem #856.

### Consequência para a hierarquia de fontes

A skill `cnab240-bradesco` ordena *laudo do validador > golden > G059 > tabela de layout*. Aplicada a
um arquivo de Pix, essa ordem manda desfazer `45`, `009`, `G100`, a literal `PIX` e o bloco da chave.

**Na modalidade Pix o Validador Universal é FONTE INVÁLIDA.** A régua é o laudo técnico da equipe
Multipag Pix/VAN. Rastreado na **#980**; o risco não é hipotético — a nota de `CLEARING_PIX` em
`batch-profile.ts` já existia justamente porque o `009` "parece errado" para quem lê o manual.

## 5. O que mudou no código

| decisão | onde | PR |
| :--- | :--- | :--- |
| ISPB = `00000000` nos dois lugares (`P015` e o complemento do `G031`) | `multipag-segments.ts` | #981 |
| bloco bancário do favorecido zerado na forma `45` | `PIX_ZEROED_PAYEE_ACCOUNT` | #981 |
| pré-voo do Pix deixa de exigir conta | `payout-readiness.ts` | #981 |
| `45`, `009`, `09`, `G100`, literal `PIX` | já corretos — **sobem de golden para laudo** | — |

⚠️ **A coluna 043 (`G012`, DV agência/conta) continua em BRANCO.** O laudo nomeia **cinco** campos e
este não é um deles; zerar o bloco "inteiro" por simetria preencheria a posição que o validador
oficial recusa (#754). É a armadilha de uma leitura rápida da resposta.

## 6. Enquadramento — duas etapas do mesmo pré-voo

Esclarecimento da P.O. em 05/09, registrado aqui porque é onde a confusão custaria mais caro:

- **TED · transferência Bradesco · boleto** — o pré-voo da VAN **já foi habilitado e validado com
  arquivo CNAB real, em produção, pelo cliente**. O formato dessas três está **fechado**.
- **Pix** — em construção, para transações **exclusivamente Pix**, porque o Pix sai em **remessa
  separada** (arquivo e NSA próprios — layout p. 15). Validado por este laudo, **ainda não em
  produção**.

É **um** `checkPayoutReadiness` só, e tem de continuar sendo. O que difere não é o mecanismo, é a
maturidade.

> **Regra de trabalho:** mudança da frente Pix não altera o arquivo das outras três. Onde for
> inevitável tocar código compartilhado, a saída para dado **numérico** tem de ser byte a byte
> idêntica — e isso se **demonstra**, não se presume.

## 7. Premissa de negócio fixada pela P.O. (05/09)

> **A chave Pix cadastrada tem de corresponder à inscrição (CPF/CNPJ) do fornecedor ou colaborador
> do título.**

Não é preferência: é o que o arquivo **afirma**. A inscrição viaja em dois lugares na modalidade —
`G005`/`G006` no Segmento B e o bloco `G031` no Segmento A — e o PSP do recebedor a confere contra o
titular da chave no DICT.

**O ERP não pode validar isso** (o DICT é dos participantes do Pix). Quem cobra é o banco, no
retorno, pela família `P*` do `G059`: `PF` (*CPF/CNPJ do recebedor não consistente com o titular da
conta transacional*), `PG`, `PJ`, `PM`, `PN`, `PL`.

⚠️ **Hoje essa recusa chega ilegível:** a régua de rejeição em `domain/bank-return/occurrence.ts`
(`/^[ABCH][A-Z]$/`) não alcança a família `P*` — o `PF` volta classificado como `unknown`. Rastreado
na **#984**.

## 8. O que segue em aberto com o banco

**O Bradesco aceita CNPJ alfanumérico no CNAB 240, e em que forma?** (#863). O layout v08 (jul/2025)
declara o campo `Num`; a Receita emite CNPJ com letras desde 07/2026 (ADR-0044). A P.O. levará na
próxima rodada com o gerente.

Enquanto não houver resposta, o emissor **recusa com nome próprio**
(`inscription-alphanumeric-unsupported`, PR #983) em vez de deformar em silêncio — as três saídas
possíveis foram consideradas, e converter pelo `ASCII − 48` da RFB **não serve**: aquela regra é para
calcular o dígito verificador, não para transmitir.

## 9. Anexos

| arquivo | o que é |
| :--- | :--- |
| [`TESTE_PIX_BLOQUEADO_CNAB240_REV2.REM`](assets/0037/TESTE_PIX_BLOQUEADO_CNAB240_REV2.REM) | o arquivo que o banco validou. **Primeira base de diff que existe para Pix**, no papel que o `PAG-GOLDEN_TESTE_AJUSTADO.REM` cumpre para as outras formas (inquiry-0033). Dados fictícios. |
| [`validador-universal-relatorio-02092026.pdf`](assets/0037/validador-universal-relatorio-02092026.pdf) | o relatório do Validador, 02/09 às 19:03. Vale como **prova dos 17 falsos positivos**, não como laudo. |

⚠️ Estes dois arquivos existiam **só na máquina da P.O.** até 05/09. As issues os citavam pelo nome
sem que nada os guardasse — versioná-los aqui é o que impede a evidência primária de sumir com uma
pasta de Downloads.

<sub>Registro assistido por IA (Claude Code), a partir do e-mail do banco e da conferência posicional do arquivo aprovado.</sub>
