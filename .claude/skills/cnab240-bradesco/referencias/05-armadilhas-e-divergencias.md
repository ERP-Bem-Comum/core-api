# 05 — Armadilhas e divergências internas do manual

O manual Multipag Bradesco se contradiz em vários pontos. Cada item abaixo é uma contradição
verificada entre a tabela de layout e a tabela de ocorrências G059, ou um erro de implementação
observado em campo.

Fonte: Nº 4008.523.687, **Versão 08** – julho/2025. **Páginas reancoradas em 01/09/2026** (#924) e
cobradas por `tests/cleanup/cnab-reference-pages.test.ts`.

**Regra de ouro: quando a tabela de layout divergir do G059, o G059 vence.** É ele que o validador
do banco implementa. E acima dos dois está o **Validador Universal do banco**, que já recusou campo
aderente ao PDF — quando ele discordar, ele manda.

---

## 1. Endereço do favorecido no Segmento B parece opcional e não é

**Sintoma:** arquivo estruturalmente perfeito, totais fechando, rejeitado sem explicação clara.

**A contradição:** na tabela de layout do Segmento B (pág. 25), as Informações 10/11/12 não levam
asterisco de obrigatoriedade. Mas o G059 tem **cinco códigos de rejeição dedicados** a esse bloco:

| Cód. | Campo | Posições |
|---|---|---|
| `AU` | Logradouro do Favorecido | 33-62 |
| `AV` | Nº do Local | 63-67 |
| `AW` | Cidade | 98-117 |
| `AX` | CEP e complemento | 118-122 e 123-125 |
| `AY` | Sigla do Estado | 126-127 |

**Regra:** em modalidade não-Pix, os cinco devem vir preenchidos com dados reais. Zeros e brancos
disparam as críticas.

---

## 2. DV da agência: o manual diz "opcional" e o validador exige

**A contradição:**

- **G009 (pág. 95)**: "Dígito Verificador da Agência […] Campo Não Obrigatório – Informação
  Opcional".
- **G059 `AG` (pág. 107)**: "o dígito da agência **deve ser informado na posição 58**".
- **G059 `AM` (pág. 107)**: mesma exigência para a posição **29** do Segmento A (agência do
  favorecido).
- **G059 `HD` (pág. 111)**: repete a exigência da posição 58.

**Regra:** preencher DV da agência nas posições 58 (header de arquivo e de lote) e 29 (segmento A).
Campo Alfa — se o DV for `0`, enviar `0`; se a agência realmente não tiver DV, enviar branco.
Nunca zero por padrão sem confirmar.

---

## 3. Quantidade da Moeda zerada

**G059 `AQ` (pág. 107)** descreve a crítica como "quantidade de moeda não numérica **ou zerada**",
referindo-se ao segmento A, posições 105-119.

Na prática, pagamentos em BRL costumam passar com o campo zerado. Mas o texto normativo é esse.

**Regra:** manter configurável por flag. Padrão zeros; se o validador reclamar de `AQ` e o tipo de
moeda estiver correto, testar `000000000100000` (= 1,00000, campo com 10 inteiros + 5 decimais).

---

## 4. Convênio: 33-52 na tabela, 33-38 nas ocorrências

**A contradição:**

- Tabela de layout (págs. 10 e 17): Código do Convênio no Banco ocupa **33-52** (20 posições).
- G059 `HB` e `HC` (pág. 111): mandam verificar o convênio nas posições **33 a 38**.

**Interpretação:** o código de convênio efetivo do Bradesco vive nas 6 primeiras posições do campo;
o restante é preenchimento. Alinhamento à esquerda com brancos à direita (campo Alfa).

---

## 5. Código de instrução `09` — retenção DELIBERADA neste projeto

`09` no segmento A, posições **16-17**, significa **"Inclusão do Registro Detalhe Bloqueado"**
(`G061` — ver índice). O arquivo é aceito, o pagamento é agendado, e fica retido esperando liberação
dos usuários master no Net Empresa. Em outro projeto isso seria o clássico "o arquivo passou e nada
aconteceu", e a correção seria `00`.

⚠️ **Aqui é feature, não armadilha — não "corrija" para `00`.** É decisão da P.O. (issues
[#804](https://github.com/ERP-Bem-Comum/core-api/issues/804) e
[#805](https://github.com/ERP-Bem-Comum/core-api/issues/805)): quem **monta** a remessa não é quem
**autoriza** o pagamento, e a dupla checagem é o que o cliente contratou. Vale para **todo**
pagamento — Segmento A e Segmento J. Até 24/08/2026 o J saía com `00`, e pagar por boleto
contornava a checagem que a transferência exige: mesmo dinheiro, mesma conta, sem o segundo par de
olhos.

O que impede a porta de reabrir é `tests/modules/financial/adapters/cnab/remittance-file.test.ts`,
que lê A e J da **mesma** remessa e cobra a instrução dos dois. Um PR que troque `09` por `00` fica
vermelho ali — e esse vermelho é a decisão de produto falando, não um teste frágil.

⚠️ **Não confunda com o campo vizinho.** `G060` (Tipo de Movimento) vive na posição **15**, sozinho;
`G061` (Instrução) nas **16-17**. As larguras diferem, e o domínio de G060 inclui o valor que
significa **exclusão** — escrever na coordenada errada troca "retido para aprovação" por outra
operação.

---

## 6. Reenvio em homologação dispara duplicidade

Duas armadilhas ao reprocessar o mesmo arquivo:

- **`AA` — Controle Inválido**: o manual define arquivo duplicado por **Data e Hora de Gravação**
  iguais a um movimento já processado. Header de arquivo, posições **144-151** (`DDMMAAAA`) e
  **152-157** (`HHMMSS`). Sempre o instante real da geração.
- **`BB` — Seu Número Inválido**: "compromisso em duplicidade". Segmento A, posições **74-93**.
  Precisa ser único por compromisso.
- **`HG` / `HH`**: lote duplicado ou fora de sequência na mesma data de transmissão.

Some a isso o **G018 (pág. 97)**: o NSA (header de arquivo, 158-163) deve evoluir a cada header de
arquivo. Contador persistente, nunca valor fixo.

---

## 7. Confundir modalidade Pix com TED

Um arquivo pode parecer Pix por estar num projeto "Pix" e ser tecnicamente TED. O trio que define
a modalidade real:

| Campo | Posições | TED Outra Titularidade | Pix Transferência |
|---|---|---|---|
| Forma de Lançamento | header lote 12-13 | `41` | `45` |
| Câmara Centralizadora | segmento A 18-20 | `018` | `009` |
| Identificação PIX | header arquivo 172-174 | brancos | `PIX` |

Os três precisam ser coerentes entre si. E o Segmento B muda completamente de layout entre as duas
modalidades — ver as duas tabelas de subdivisão em `02-layout-registros.md`.

Sintoma de confusão: Segmento B com bloco de **83 zeros** entre as posições 128 e 210. Isso é o
layout não-Pix (Vencimento + Valor Documento + Abatimento + Desconto + Mora + Multa) montado num
arquivo que deveria ser Pix. No Pix, essa faixa carrega a chave ou o tipo de conta, e o resto vai
em **brancos**.

---

## 8. Campo Alfa preenchido com zeros

Violação da regra de alinhamento da pág. 14, e nem sempre tem código de ocorrência dedicado — o
arquivo pode ser aceito e o pagamento sair errado.

Campos Alfa que costumam ser preenchidos com zeros por engano: Convênio (33-52), Nosso Número
(segmento A 135-154), Informação 2 (segmento A 178-217), Complemento do Tipo de Serviço (218-219),
Finalidade TED (220-224), Finalidade Complementar (225-226), Código/Documento do Favorecido
(segmento B 211-225).

---

## 9. Finalidade TED e Finalidade Complementar — MEDIDO, e a regra inverte por forma

⚠️ **Esta seção afirmava, até 25/08/2026, que 218-219 era `*P005` e que "o coerente é `07`". As
duas afirmações são falsas, e a segunda produziu recusa real** — um script de bisseção seguiu a
recomendação e cada arquivo que o fez levou 2 críticas
([inquiry-0033](../../../../handbook/inquiries/0033-cnab-multipag-bisseccao-validador.md), 18 submissões).

- **218-219 é `G004` — Uso Exclusivo FEBRABAN/CNAB, default Brancos.** O `P005` foi **excluído do
  manual** junto com a modalidade DOC (fev/2024; o histórico de versões registra a exclusão pelo
  nome). Escrever ali qualquer código do domínio DOC é recusa nomeada: _"Quando TED, não informar
  finalidade complementar DOC"_. **Zeros passam**; só o domínio DOC recusa — mas emitir brancos é
  o que o layout declara.
- **225-226 (`P013`) e 220-224 (`P011`) INVERTEM de regra conforme a forma de lançamento.** É a
  armadilha central deste par, e nenhuma tabela do manual a expressa:

  | | TED (`41`) | Crédito em conta (`01`) |
  | :--- | :--- | :--- |
  | `220-224` `P011` | finalidade obrigatória | **brancos** — zeros é recusa |
  | `225-226` `P013` | `CC` ou `PP` obrigatório | **brancos** — preenchido é recusa |

  Fora de TED o banco devolve _"Código Finalidade Complementar (para TED). Inválido para Crédito
  em Conta"_ e _"Código Finalidade para TED. Inválido para Crédito em Conta"_. `CC` e `PP` foram
  ambos aceitos em TED.

  ⚠️ **É por isso que nenhum dos dois pode ser parâmetro do adapter**: não existe valor certo
  independente da forma. Em `batch-profile.ts`, `tedPurposeFor` já retorna `null` fora de TED — e
  essa decisão, que estava registrada ali como empate sem fonte, foi confirmada pelo validador.

⚠️ **220-224 (Finalidade da TED, `P011`) tem domínio PRÓPRIO — não espelha o P005.** Uma revisão
anterior deste arquivo afirmava o contrário, que `00005` seria "mensalidade escolar" e portanto
incompatível com Pagamento Fornecedor. **É falso, e a afirmação já produziu um falso suspeito num
diagnóstico de recusa real.**

No domínio de TED, `00005` é **Pagamento a fornecedores** — que é justamente o que casa com o Tipo
de Serviço `20`; `07` ali é aluguel. Neste repositório o valor é constante do emissor, derivada da
forma do lote por `tedPurposeFor` (`batch-profile.ts:121`), sob premissa declarada da P.O. em
21/08/2026 ([#813](https://github.com/ERP-Bem-Comum/core-api/issues/813)): **este cliente paga
exclusivamente fornecedor PJ**. O `00008` (duplicatas) e o `00006` (honorários) foram considerados
e recusados por escrito.

O que derruba a premissa e obriga a revê-la: entrar cliente com perfil de pagamento misto, ou o
Bacen/Bradesco passarem a exigir granularidade por título.

**Antes de citar qualquer valor de `P011`, abra o PDF** — o manual não reproduz a tabela do Bacen
por extenso, e foi essa lacuna que a suposição do espelhamento tentou preencher.

---

## 10. Literal `PIX` fora do lugar

As posições 172-174 do header de arquivo só recebem `PIX` na modalidade Pix (G021, pág. 15 — a
tabela-delta do header; a descrição do campo está na pág. 97).
Em TED, DOC ou crédito em conta, vão em **branco**. E lotes Pix devem vir em arquivo separado das
demais formas de pagamento.

---

## Checklist rápido de auto-checagem

Rode antes de gravar o arquivo em disco:

- [ ] Toda linha com exatamente 240 caracteres
- [ ] Terminador CRLF em todas as linhas, inclusive a última
- [ ] Sem caracteres não-ASCII, sem minúsculas
- [ ] Campos Num contendo apenas dígitos; campos Alfa sem zeros de preenchimento
- [ ] `AG`/`HD`: agência 53-57, **DV 58**, conta 59-70, DV 71 — todos preenchidos
- [ ] `AM`/`AN`: segmento A 24-28 + **DV 29**; 30-41 + DV 42
- [ ] `AH`: posições 9-13 crescentes, iniciando em `00001` por lote
- [ ] `AO`: segmento A 44-73 não pode ser todo branco
- [ ] `AT`: tipo de inscrição (18) coerente com o número (19-32), **DV de CPF/CNPJ válido**
- [ ] `AU`/`AV`/`AW`/`AX`/`AY`: os cinco campos de endereço do segmento B preenchidos
- [ ] `AQ`: moeda 102-104 no domínio; 105-119 conforme a flag
- [ ] `AR`: segmento A 120-134 numérico e maior que zero
- [ ] `AP`: segmento A 94-101 em `DDMMAAAA`, não inferior à data de geração
- [ ] `AK`: câmara **derivada** da forma de lançamento — `03`/`41`/`43` (TED) → `018`; `45` (Pix) →
      `009`; **toda outra forma → `000`**, crédito em conta (`01`) inclusive. Nunca um default: um
      valor por omissão só acerta uma das modalidades, e a que ele erra o banco recusa
- [ ] `AB`: header de lote posição 9 = `C`, posições 223-224 = `01`
- [ ] `HK`/`HL`: header de lote 14-16 conforme modalidade; header de arquivo 164-166 = `089`
- [ ] `HJ`: header de arquivo posição 143 = `1`
- [ ] `TA`: os quatro totalizadores conferindo
- [ ] `H1`: última linha com registro tipo `9` na posição 8
- [ ] `AA`/`BB`: data/hora de geração reais, Seu Número único, NSA evoluído
