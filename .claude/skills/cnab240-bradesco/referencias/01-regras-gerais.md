# 01 — Regras gerais

Fonte: Manual de Procedimentos Multipag Bradesco, Nº 4008.523.687, **Versão 08** – julho/2025
(`handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf`).

⚠️ As páginas citadas neste arquivo vieram de uma **edição anterior** e não conferem com o PDF
acima — o deslocamento varia por seção. Para localizar um campo, use
[`00-indice-campos.md`](./00-indice-campos.md), derivado do PDF vigente.

## Tamanho e terminador

- Todo registro tem **exatamente 240 bytes** (pág. 10).
- Terminador `CRLF` (`\r\n`) em todas as linhas, incluindo a última.
- Arquivo de N linhas ocupa `N × 242` bytes.
- Encoding ASCII / latin-1. **Sem acentuação.** Texto em **CAIXA ALTA**.

## Alinhamento de campos (pág. 10)

> Campos Numéricos (Num) = sempre à direita e preenchidos com **zeros** à esquerda.
> Campos Alfanuméricos (Alfa) = sempre à esquerda e preenchidos com **brancos** à direita.

Consequências práticas:

- Campo Alfa vazio → **brancos**, nunca zeros. Enviar `00000` num campo Alfa é violação de
  alinhamento mesmo que o validador não tenha código específico.
- Campo Num vazio → **zeros**, nunca brancos.
- CPF em campo de 14 posições → 3 zeros à esquerda + 11 dígitos.
- Valores monetários são Num com 2 decimais implícitos, sem separador. R$ 3.398,12 → `339812`.
- Quantidade de moeda tem 5 decimais implícitos (10 inteiros + 5 decimais em 15 posições).

## Estrutura hierárquica (págs. 8-9)

```
Registro Header de Arquivo   (Tipo = 0)
  Registro Header de Lote    (Tipo = 1)
    Registros Iniciais do Lote (Tipo = 2)  [opcional]
    Registros de Detalhe     (Tipo = 3)    [um ou mais segmentos]
    Registros Finais do Lote (Tipo = 4)    [opcional]
  Registro Trailer de Lote   (Tipo = 5)
  [ ... outros lotes ... ]
Registro Trailer de Arquivo  (Tipo = 9)
```

Regras:

- Um arquivo pode conter vários lotes, mas **um lote só pode conter um único tipo de
  serviço/produto**.
- Lote de serviço = header de lote + um ou mais detalhes + trailer de lote.
- Registro de detalhe é composto de um ou mais **segmentos**.

## Numeração de lote (G002, pág. 82)

- Header de Arquivo → `0000`
- Primeiro lote → `0001`; demais → anterior + 1
- Trailer de Arquivo → `9999`
- Número de lote **não pode se repetir** dentro do arquivo.

## Numeração de registro no lote (G038, pág. 88)

Posições 9-13 de todo segmento de detalhe. Sequência numérica crescente, **reinicializada em
`00001` a cada novo lote**. Cada segmento conta como um registro (um pagamento com segmentos A+B
ocupa dois sequenciais).

## Tipo de registro (G003, pág. 82) — posição 8

| Valor | Registro |
|---|---|
| `0` | Header de Arquivo |
| `1` | Header de Lote |
| `2` | Registros Iniciais do Lote |
| `3` | Detalhe |
| `4` | Registros Finais do Lote |
| `5` | Trailer de Lote |
| `9` | Trailer de Arquivo |

## Segmentos por modalidade (pág. 9)

| Lote / Produto | Remessa | Retorno |
|---|---|---|
| Crédito em C/C, Cheque, OP, DOC, Pagamento com Autenticação | A (obrig.), B (obrig.), C (opc.), 5 (opc.) | idem |
| Pagamento de Títulos de Cobrança | J (obrig.), 5 (opc.) | idem |
| **Pix** | A (obrig.), B (obrig.), J (obrig.), 5 (opc.) | idem |
| Pagamento de Contas e Tributos com Código de Barras | O (obrig.), W (opc.*), Z (opc.), B (opc.), 5 (opc.) | idem |
| Bloqueto Eletrônico | — | G (obrig.), H (opc.), Y (opc.) |
| Alegação do Pagador | Y (obrig.) | Y (obrig.) |

\* Segmento W é obrigatório para pagamento de FGTS nos convênios 0181 e 0182.

## Totalizadores

**Trailer de Lote:**
- Posições 18-23 — Quantidade de Registros do Lote (G057, pág. 89): somatória dos registros de
  tipo 1, 2, 3, 4 e 5. Ou seja, **header de lote + todos os detalhes + trailer de lote**.
- Posições 24-41 — Somatória dos Valores (P007, pág. 106): soma dos valores de crédito dos
  registros de detalhe com segmento `A`.
- Posições 42-59 — Somatória de Quantidade de Moedas (G058, pág. 89): soma das quantidades de
  moeda dos detalhes com segmento `A` ou `J`.

**Trailer de Arquivo:**
- Posições 18-23 — Quantidade de Lotes (G049, pág. 88): somatória dos registros de tipo 1.
- Posições 24-29 — Quantidade de Registros do Arquivo (G056, pág. 89): somatória dos registros de
  tipo 0, 1, 3, 5 e 9.
- Posições 30-35 — Quantidade de Contas para Conciliação (G037, pág. 88): registros de tipo 1 com
  Tipo de Operação `E`. Zeros nas demais modalidades.

## Datas e horas

- Datas: formato `DDMMAAAA` (G016, G044, G068, P003, P009).
- Horas: formato `HHMMSS` (G017).

## Modalidade Pix — regra estrutural (G021, pág. 83)

> As novas formas de lançamento Pix, obrigatoriamente, deverão ser enviadas em **arquivos
> separados** das demais formas de pagamento.
> No header do Arquivo posições 172 à 174 deverá conter a literal `PIX` em caixa alta.

Fora da modalidade Pix, as posições 172-174 vão em **branco**.
