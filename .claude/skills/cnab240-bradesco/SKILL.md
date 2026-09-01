---
name: cnab240-bradesco
description: Norma do CNAB 240 Multipag Bradesco (banco 237) — como localizar e citar o layout no manual oficial, a regra de precedência entre a tabela de layout e a tabela de ocorrências G059, e as armadilhas verificadas do dialeto. Use sempre que a tarefa envolver arquivo remessa .REM, CNAB 240, FEBRABAN 240 posições, Multipag, PAGFOR, segmento A/B/C/J/O/N/Z, header ou trailer de lote, pagamento a fornecedor, TED, DOC, Pix por arquivo, ou quando um validador bancário recusar um arquivo de pagamento.
when_to_use: Ao montar, editar, revisar ou diagnosticar qualquer registro CNAB 240 do Bradesco. Também antes de afirmar que um campo é opcional — a tabela de layout e a de ocorrências discordam, e só uma delas é implementada pelo validador.
argument-hint: '[caminho-do-arquivo.REM]'
---

# CNAB 240 — Multipag Bradesco

## Fonte primária, e só ela

**Manual de Procedimentos Multipag Bradesco — Layout CNAB 240 Posições Bradesco**
Nº 4008.523.687, **Versão 08**, revisado em **julho/2025**. 139 páginas.

```
handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf
```

O nome do arquivo diz `jun-19` e engana: o conteúdo é a Versão 08 de julho/2025. Confira na capa.

⚠️ **Citação vinda de outra edição não converte por fórmula.** Uma revisão anterior destas
referências citava a "Versão 6 – julho/2023"; contra o PDF acima, `G009` estava 13 páginas adiante e
`G059`, 17. Se um número de página não bater com o índice, ele veio de outra edição — **reancore,
não ajuste**.

## Como achar a página: o índice derivado

[`referencias/00-indice-campos.md`](./referencias/00-indice-campos.md) mapeia **115 campos** (`G001`…
`P016`) e **136 ocorrências G059** para a página do PDF. É gerado por `pnpm run cnab:index` a partir
do próprio PDF — não editar à mão.

**O índice localiza; o PDF normatiza.** Abra a página antes de afirmar posição, domínio ou
obrigatoriedade. Nenhum arquivo deste diretório reproduz o manual, e isso é deliberado:
`handbook/guidelines/` está no `.gitignore` por restrição de redistribuição, e `.claude/` é
commitável num repositório público.

## A regra de precedência

O manual se contradiz consigo mesmo: a **tabela de layout** marca campos sem asterisco de
obrigatoriedade que a **tabela de ocorrências G059** trata como crítica de recusa.

> **Quando divergirem, o G059 vence.** É a tabela que o validador do banco implementa.

Caso canônico: o endereço do favorecido no Segmento B não leva asterisco no layout, e tem **cinco**
códigos de recusa dedicados (`AU`, `AV`, `AW`, `AX`, `AY`). Endereço em branco é recusado.

⚠️ E há um degrau acima do G059: **o validador do banco recusa campo aderente ao PDF**. Quando o
Validador Universal e o layout discordarem, quem manda é o validador — registre a divergência,
não escolha o texto mais bonito.

### A hierarquia completa, do mais forte ao mais fraco

| # | Fonte | O que ela responde |
| :-- | :--- | :--- |
| 1 | **Laudo do Validador Universal** ([#804](https://github.com/ERP-Bem-Comum/core-api/issues/804)) | o que o banco **recusa**, com a mensagem literal |
| 2 | **Golden do banco** (`GOLDEN_TEST_MULTIPAG_*`) | que forma o banco **espera** — posição, presença, domínio estrutural |
| 3 | **Tabela G059** do manual | crítica de recusa documentada |
| 4 | **Tabela de layout** do manual | largura, formato, obrigatoriedade nominal |
| 5 | Referências deste diretório | onde procurar no manual — **mapa, nunca território** |

**Os goldens valem como verdade** — decisão do dono do repositório em 01/09/2026, sobre os arquivos
que a P.O. forneceu em 29/08. Onde um golden e o manual divergem, a lacuna é do manual: a câmara
`009` da forma `45` (Pix) está no golden e **não ocorre uma única vez** no PDF.

⚠️ **Mas o golden é norma sobre a FORMA, não sobre a ESCOLHA.** Ele diz que forma o banco espera;
não diz que valor este pagador deve escrever, porque essa pergunta é do negócio de quem paga. O
golden de TED traz `P011 = 00010` (_"Repasses da Lei 8727"_) onde este repositório escreve `00005`
(_"Pagamento a Fornecedor"_, decisão da P.O. na [#813](https://github.com/ERP-Bem-Comum/core-api/issues/813))
— e aqui **o código está certo e o golden não**. Copiar valor de negócio do golden produz arquivo
que passa em qualquer validador declarando ao Banco Central a finalidade errada.

## Mapa das referências

| Arquivo | Quando abrir |
| :--- | :--- |
| [`00-indice-campos.md`](./referencias/00-indice-campos.md) | **Sempre**, primeiro. É como você acha a página. |
| [`01-regras-gerais.md`](./referencias/01-regras-gerais.md) | **Sempre.** Estrutura, alinhamento, encoding, totalizadores. |
| [`02-layout-registros.md`](./referencias/02-layout-registros.md) | Ao tocar em qualquer registro. Posições por tipo. |
| [`03-dominios-campos.md`](./referencias/03-dominios-campos.md) | Ao preencher campo com domínio fechado. |
| [`04-ocorrencias-g059.md`](./referencias/04-ocorrencias-g059.md) | Ao investigar recusa, **e** antes de dizer que um campo é opcional. |
| [`05-armadilhas-e-divergencias.md`](./referencias/05-armadilhas-e-divergencias.md) | **Sempre.** Contradições verificadas e erros recorrentes. |
| [`06-preenchimento-e-offset.md`](./referencias/06-preenchimento-e-offset.md) | Ao montar campo, calcular decimal, ou **antes de afirmar que há deslocamento**. |

Nenhuma delas dispensa o PDF. São mapa, não território.

⚠️ **Antes de diagnosticar offset, abra o [`06`](./referencias/06-preenchimento-e-offset.md).** Contar
caractere dentro de uma corrida de zeros ou brancos não mede nada — a fronteira só existe na borda,
onde a classe de caractere muda. É o falso positivo mais caro deste domínio, e já produziu um laudo
confiante e errado sobre um Segmento B que estava correto.

## Tabela de Domínio do SPB — consulta local

⚠️ **Não é o Multipag, e confundir os dois já custou caro neste repositório.** É o *Dicionário de
Domínios* do **SPB/Bacen** — 9.474 domínios em 476 tipos, de `tabela_de_dominio_20260724.xls`. Ele
normatiza a mensageria do SPB (STR/SILOC), não o layout CNAB. **Nenhum domínio daqui é posição do
manual Bradesco**; citá-lo como se fosse repete o erro de propagar tabela de um universo para outro.

Onde os dois de fato se tocam — campos do CNAB que carregam código do Bacen:

| Tipo | Campo no CNAB |
| :--- | :--- |
| `FinlddIF`, `FinlddTES` | Finalidade da TED (`P011`) |
| `CodMoedaISO`, `CodPaisISO` | moeda e país |
| `CanPgto`, `MeioPgto` | canal e meio de pagamento |

```bash
bun .claude/skills/cnab240-bradesco/dominios/dominio.ts FinlddIF 1
# {"desc":"Operação de Câmbio - Mercado Interbancário","vig":"vigente","prod":"2002-04-22"}
```

| Forma | O que faz |
| :--- | :--- |
| `<tipo> <dominio>` | uma entrada; `--full` traz todas as colunas |
| `<tipo>` | os vigentes do tipo; `--todos` inclui os extintos |
| `--busca "<texto>"` | FTS5 na descrição, insensível a acento |
| `--tipos [filtro]` | tipos disponíveis e quantos domínios cada um tem |
| `--meta` | proveniência da edição — cite daqui, não de memória |
| `--em aaaa-mm-dd` | avalia a vigência numa data específica |

⚠️ **Leia o `vig` antes de usar o código.** `4.043 dos 9.474 (43%) já foram desativados`, e há
domínios que só entram em produção adiante — `FinlddTES/254` só vale a partir de `2026-10-24`. Só
`vig: "vigente"` pode ir num arquivo: um código extinto produz arquivo bem formado que o banco
recusa, e o `remittance-inspector.ts` não pega, porque não é defeito de forma.

O banco é artefato derivado; reconstrói com `bun .claude/skills/cnab240-bradesco/dominios/build.ts`.
Na hierarquia de fontes ele é primário **para o que cobre** (é publicação do Bacen), e não diz nada
sobre o resto do layout.

## O que a norma exige, sempre

- **240 posições** por registro. Terminador `CRLF` em **todas** as linhas, a última inclusive — um
  arquivo de N registros ocupa `N × 242` bytes.
- Encoding ASCII/latin-1, **sem acento**, **CAIXA ALTA**.
- Alinhamento: **Num** à direita com zeros à esquerda; **Alfa** à esquerda com brancos à direita.
  Campo Alfa preenchido com zeros é violação mesmo sem código de ocorrência dedicado.
- Numeração de lote única no arquivo; sequencial do detalhe reiniciando em `00001` a cada lote.
- Totalizadores dos trailers **derivados** das linhas emitidas, nunca informados por quem chama.

## Identificar a modalidade real

Muita recusa "inexplicável" é o arquivo estar numa modalidade diferente da pretendida. O trio que a
define:

| Campo | Onde | TED Outra Titularidade | Pix Transferência |
| :--- | :--- | :--- | :--- |
| Forma de Lançamento (`G029`) | header de lote 12-13 | `41` | `45` |
| Câmara Centralizadora (`P001`) | segmento A 18-20 | `018` | `009` |
| Identificação Pix (`G021`) | header de arquivo 172-174 | brancos | `PIX` |

Os três precisam concordar. **A câmara é função da forma**, nunca escolha de quem monta: o G059
`AK` manda `018` para TED e **zeros para as demais modalidades** — crédito em conta corrente (`01`)
não transita por câmara alguma. E lotes Pix vão em **arquivo separado** das demais formas.

## Diagnosticar uma recusa

1. **Fatie por posição com script**, imprimindo `[conteúdo]` entre colchetes — brancos precisam ser
   visíveis. Nunca a olho.
2. Confira os fundamentos: 240 caracteres, `CRLF`, ASCII, caixa alta, bytes totais.
3. Identifique a modalidade real pelo trio acima.
4. Percorra a tabela G059 inteira e liste **todos** os códigos que o arquivo dispararia — não pare
   no primeiro.
5. Liste **separadamente o que está correto**, para não ser alterado por engano.

Reporte cada achado com código, registro, linha, posições, esperado, encontrado e âncora:

```
[AK] Código da Câmara de Compensação Inválido
  Registro: segmento A   Linha: 3   Posições: 18-20
  Esperado: 000 (crédito em conta corrente não transita por câmara)
  Encontrado: [018]
  Fonte: G059 §'AK' — manual p.107
```

---

**Este é o manual. Como aplicá-lo neste repositório — onde o gerador vive, o que nele é decisão de
produto e não pode ser "corrigido", e qual gate roda antes de fechar — é o agente
[`cnab240-bradesco`](../../agents/cnab240-bradesco.md).**
