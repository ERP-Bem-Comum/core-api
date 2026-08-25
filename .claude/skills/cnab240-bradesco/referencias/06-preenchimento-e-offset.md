# 06 — Preenchimento, deslocamento e diagnóstico de offset

O erro mais caro em CNAB não é campo com valor errado — é campo com **largura** errada. Um único
campo montado com um caractere a mais empurra todos os seguintes, e a linha continua com 240
posições porque o preenchimento final absorve a diferença. O banco lê tudo deslocado e recusa sem
dizer onde.

Duas partes: **como montar** para que o deslocamento não possa existir, e **como diagnosticar** sem
produzir falso positivo — que aqui é o risco maior, porque laudo confiante e errado custa mais que
laudo ausente.

Fonte: Nº 4008.523.687, Versão 08 – julho/2025. Escalas e larguras desta página foram lidas na
coluna do próprio PDF, não em transcrição. Localize cada campo por
[`00-indice-campos.md`](./00-indice-campos.md).

---

## Parte 1 — Como montar

### Alinhamento e preenchedor

A regra de alinhamento está em [`01-regras-gerais.md`](./01-regras-gerais.md) e a assimetria
truncar/estourar vive documentada em `positional.ts`. O que interessa aqui é a consequência:
**preenchedor errado é deslocamento disfarçado de valor**. Campo Alfa com zeros e campo Num com
brancos nem sempre têm código de ocorrência dedicado — o arquivo pode ser aceito e o pagamento sair
errado.

### Escrita por posição absoluta — a técnica que torna o deslocamento impossível

Montar num buffer de tamanho fixo, escrevendo cada campo na sua posição absoluta, faz um campo com
largura errada **estourar na hora, no campo certo, com a posição no erro** — em vez de virar
deslocamento silencioso:

```ts
const RECORD_LENGTH = 240;

class Record {
  private readonly buf = Array.from({ length: RECORD_LENGTH }, () => ' ');

  /** Num: à direita, zeros à esquerda. Estoura — truncar valor muda o que se paga. */
  num(from: number, to: number, value: number | string): void {
    const width = to - from + 1;
    const raw = String(value ?? 0);
    if (raw.length > width) {
      throw new Error(`Num ${String(from)}-${String(to)}: "${raw}" excede ${String(width)}`);
    }
    this.write(from, to, raw.padStart(width, '0'));
  }

  /** Alfa: à esquerda, brancos à direita. Trunca — nome longo é cortado pelo layout, por desenho. */
  alpha(from: number, to: number, value: string): void {
    const width = to - from + 1;
    this.write(from, to, normalize(value ?? '').slice(0, width).padEnd(width, ' '));
  }

  private write(from: number, to: number, text: string): void {
    for (let i = 0; i < text.length; i += 1) this.buf[from - 1 + i] = text[i] ?? ' ';
  }

  render(): string {
    const line = this.buf.join('');
    if (line.length !== RECORD_LENGTH) throw new Error(`registro com ${String(line.length)}`);
    return line;
  }
}
```

### ⚠️ Por que o `joinFields` deste repositório não desloca

O emissor **não** usa buffer posicional: `positional.ts` concatena com `joinFields`, e isso é
seguro aqui por uma razão específica — **cada peça já tem largura garantida na origem**. `num()`
devolve `err('numeric-field-overflow')` quando não cabe e `padStart(size)` quando cabe; `alpha()`
faz `slice(0, size).padEnd(size)`. Os dois retornam **sempre exatamente `size`**. Largura errada não
é improvável: é impossível.

O que a concatenação não pega é campo **esquecido** — omitido da lista. Aí a linha sai com menos de
240 e o `remittance-inspector.ts` acusa `line-length`.

O que se perde é **diagnóstico**: o erro diz _"235 posições, esperado 240"_, não _"faltou o campo
068-082"_. Com buffer posicional, o campo ausente permaneceria branco e a linha teria 240 —
silenciosa de outro jeito. Nenhuma das duas formas é gratuita; a escolha está registrada, não
resolvida. **Não reescreva o montador por causa desta seção** — se a troca valer, ela é ADR, e o
que sustenta a decisão é medição, não preferência.

### Decimais são implícitos

Não existe separador: o campo carrega só os dígitos, e a escala está na coluna do layout. As quatro
que importam, **conferidas no PDF**:

| Campo | Posições | Int + Dec | Código | R$ 3.398,12 vira |
| :--- | :--- | :--- | :--- | :--- |
| Valor do Pagamento (Seg. A) | 120-134 | 13 + 2 | `P010` | `000000000339812` |
| Quantidade da Moeda (Seg. A) | 105-119 | 10 + 5 | `G041` | 1,00000 → `000000000100000` |
| Somatória dos Valores (Trailer de Lote) | 24-41 | 16 + 2 | `P007` | `000000000000339812` |
| Somatória de Moedas (Trailer de Lote) | 42-59 | 13 + 5 | `G058` | — |

**Calcule em inteiro de centavos, sempre.** Neste repositório isso já é garantido: `Money` é
`bigint` de centavos por [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md),
e `cents()` só reempacota dígitos. O perigo mora em qualquer caminho novo que traga `number` de
reais.

⚠️ **`Math.round(v * 100)` erra**, e não em casos exóticos — medido:

```
1.005 * 100 → 100  (esperado 101)
8.165 * 100 → 816  (esperado 817)
4.475 * 100 → 447  (esperado 448)
```

Cada um desses é um centavo a menos no pagamento. (`3398.12` **acerta** — o que é pior, não melhor:
testar com um valor que passa dá confiança falsa no método.)

### Mapa do Segmento B, modalidade não-Pix

Bloco de 99 posições, 128 a 226. A coluna **Acum.** existe para conferência — não para concatenar:

| Campo | Posições | Largura | Acum. | Tipo | Vazio |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Data do Vencimento | 128-135 | 8 | 8 | Num | `00000000` |
| Valor do Documento | 136-150 | 15 | 23 | Num | zeros |
| Valor do Abatimento | 151-165 | 15 | 38 | Num | zeros |
| Valor do Desconto | 166-180 | 15 | 53 | Num | zeros |
| Valor da Mora | 181-195 | 15 | 68 | Num | zeros |
| Valor da Multa | 196-210 | 15 | 83 | Num | zeros |
| Cód/Doc do Favorecido | 211-225 | 15 | 98 | **Alfa** | **brancos** |
| Aviso ao Favorecido | 226 | 1 | 99 | Num | `0` |

Conferido contra `multipag-segments.ts:224-231`, campo a campo. O registro continua depois: 227-232
(UG centralizadora SIAPE) e 233-240 (ISPB).

**A borda 210/211 é o ponto de verificação.** Os seis primeiros campos são Num, então vazios formam
uma corrida contínua de **83 zeros**; o sétimo é Alfa. A transição de zeros para brancos tem de cair
exatamente entre 210 e 211. Se cair em outro lugar, há deslocamento real — e **só aí** há.

### ⚠️ Vencimento e valor nominal NÃO passam zerados

`128-135` e `136-150` não têm código de ocorrência dedicado no G059. Isso **não** é licença para
zerá-los: o Validador Universal recusou os dois, com estas palavras
([#804](https://github.com/ERP-Bem-Comum/core-api/issues/804)):

> _"Data de vencimento (nominal) não informada ou inválida"_
> _"Valor do documento (nominal) não informado ou inválido"_

É o caso mais limpo da hierarquia que vale neste domínio: **o validador vence o G059, que vence a
tabela de layout**. Ausência de código de ocorrência é ausência de código — nunca permissão.

O emissor ainda escreve `num(0, 8)` e `num(0, 15)` ali
(`multipag-segments.ts:224-225`); a correção está aberta em
[#812](https://github.com/ERP-Bem-Comum/core-api/issues/812). Abatimento, Desconto, Mora e Multa
(151-210) vão zerados quando não houver — esses sim.

---

## Parte 2 — Como diagnosticar deslocamento

### O falso positivo mais comum

**Dentro de uma corrida de caracteres idênticos não existe fronteira observável.**

Oitenta e três zeros seguidos são seis campos Num vazios — visualmente, uma coisa só. Não é possível
olhar para o meio dessa corrida e afirmar onde um campo começa. Qualquer contagem feita no interior
é chute com aparência de medição.

A informação real está nas **bordas**: onde a corrida começa e onde termina. Toda verificação de
deslocamento acontece nas transições entre classes de caractere.

⚠️ **Nunca diagnostique offset a partir do interior de um bloco homogêneo.** Se o raciocínio for
"contei os zeros e sobraram 10", ou a conta está errada ou o campo de referência foi mal
identificado. Foi assim que os 83 zeros corretos do Segmento B viraram um laudo de "offset de 10
posições" que ninguém conseguiu refutar de cabeça.

### O teste da régua: mapa de transições

Extraia as posições onde a **classe de caractere muda** e confronte com as bordas do layout:

```ts
type CharClass = 'B' | 'N' | 'A'; // branco · dígito · alfabético

const classOf = (c: string): CharClass =>
  c === ' ' ? 'B' : c >= '0' && c <= '9' ? 'N' : 'A';

/** Posições (1-indexed) onde a classe muda. É a única testemunha honesta de deslocamento. */
export const transitions = (line: string): readonly [number, CharClass][] => {
  const out: [number, CharClass][] = [];
  let previous: CharClass | null = null;
  for (let i = 0; i < line.length; i += 1) {
    const current = classOf(line[i] ?? ' ');
    if (current !== previous) {
      out.push([i + 1, current]);
      previous = current;
    }
  }
  return out;
};
```

Aplicado ao Segmento B não-Pix sem dados opcionais, o mapa traz `… (128,'N') (211,'B') (226,'N') …`:
zeros de 128 a 210, brancos de 211 a 225, dígito em 226 — exatamente as bordas da tabela acima.
**Não há deslocamento.**

Houvesse offset de 10, os zeros iriam até 220 e restariam 5 brancos antes do Aviso. A borda
denuncia; o interior, não.

### Ancoragem: campos com conteúdo previsível

Bordas de corrida são o sinal mais forte, mas campos de formato reconhecível servem de âncora
independente — e uma âncora que ainda bate **delimita a região** onde procurar:

| Âncora | Onde | Como reconhecer |
| :--- | :--- | :--- |
| `237` | 1-3 de todo registro | código do banco na compensação |
| Tipo de registro | posição 8 | `0`, `1`, `3`, `5` ou `9` |
| Código de segmento | posição 14 dos detalhes | `A`, `B`, `C`, `J`, `O`, `N`, `W`, `Z`, `5` |
| `BRL` | Segmento A, 102-104 | única sequência alfabética da região |
| Data `DDMMAAAA` | Segmento A, 94-101 | dia ≤ 31, mês ≤ 12, ano plausível |
| Nome do favorecido | Segmento A, 44-73 | bloco alfabético cercado de dígitos |

Se `BRL` não estiver exatamente em 102-104, há deslocamento acumulado **antes** disso.

### Rotina

1. Fundamentos: 240 caracteres por linha, `CRLF`, ASCII, caixa alta. O
   `remittance-inspector.ts` já cobre comprimento, ASCII e caixa — rode antes de olhar.
2. Fatie campo a campo pelo layout, imprimindo `nome, posições, [conteúdo]`. Colchetes obrigatórios:
   branco precisa ser visível.
3. Rode o mapa de transições e confronte com as bordas esperadas.
4. Marque como suspeita **apenas** a borda que não cai onde deveria.
5. Para cada suspeita, some as larguras desde a última âncora confirmada.

### Teste de regressão contra offset

Um registro todo zerado **não prova alinhamento nenhum**: duas leituras deslocadas devolvem o mesmo
texto, e a asserção fica verde lendo a coluna errada. O antídoto é dar a cada campo um valor
distinto e reconhecível, de modo que ler a posição vizinha devolva outra coisa.

Já implementado — não escreva outro: `tests/modules/financial/adapters/cnab/remittance-inspector.test.ts`,
caso **"REGISTRO-RÉGUA"**.
