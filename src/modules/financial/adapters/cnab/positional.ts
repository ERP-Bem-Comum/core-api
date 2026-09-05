// Primitivas de campo posicional do CNAB 240 (layout Multipag do Bradesco).
//
// O arquivo não tem separador: o que define um campo é a POSIÇÃO. As duas regras de preenchimento
// vêm do próprio layout — numérico alinha à direita com zeros à esquerda; alfanumérico alinha à
// esquerda com brancos à direita.
//
// A assimetria de tratamento no estouro é deliberada:
//   - numérico  → ERRO. Truncar valor, documento ou conta gera arquivo sintaticamente válido e
//                 semanticamente errado — o banco aceita e paga a quem não devia.
//   - alfanum.  → TRUNCA. Nome de empresa/favorecido maior que o campo é cortado pelo layout por
//                 desenho; recusar o arquivo inteiro por causa de um nome longo seria pior.
import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import {
  isCnabEmittableInscription,
  normalizeInscription,
} from '../../domain/payout/inscription.ts';

export type PositionalFieldError =
  | 'numeric-field-overflow'
  | 'numeric-field-invalid'
  // Inscrição (CPF/CNPJ) com letras num campo que o layout declara `Num` (#863). Erro PRÓPRIO, e não
  // `numeric-field-invalid`, porque a ação de quem recebe é OUTRA: não há defeito no emissor nem
  // formato a corrigir no cadastro — o documento está certo, e é o LAYOUT DO BANCO que ainda não o
  // prevê. Achatá-lo no erro genérico mandaria o operador consertar uma inscrição válida.
  | 'inscription-alphanumeric-unsupported';

const DIGITS_ONLY = /^\d+$/;

export const num = (value: number | string, size: number): Result<string, PositionalFieldError> => {
  const raw =
    typeof value === 'number'
      ? Number.isInteger(value) && value >= 0
        ? String(value)
        : ''
      : value.trim();

  if (raw === '' || !DIGITS_ONLY.test(raw)) return err('numeric-field-invalid');
  if (raw.length > size) return err('numeric-field-overflow');

  return ok(raw.padStart(size, '0'));
};

// Acento não sobrevive ao trânsito até o mainframe do banco; a normalização acontece aqui, na
// fronteira, e não no domínio — que continua guardando o nome como o humano escreveu.
//
// ⚠️ POR QUE `NFD` SOZINHO NÃO BASTAVA (#862), e por que "simplificar" de volta reintroduz o
// defeito: `normalize('NFD')` aplica equivalência CANÔNICA — separa letra e DIACRÍTICO COMBINANTE
// (faixa U+0300–U+036F), que o `replace` abaixo apaga. Isso resolve `Á`, `Ç`, `Ñ`, e só isso. `º`,
// `ª`, `–`, `—`, `½`, `“`, `”` NÃO são letra com acento: são caracteres PRÓPRIOS, sem decomposição
// canônica. O `NFD` os devolve intactos, e eles atravessavam `alpha()` inteiros.
//
// O custo de deixá-los passar não era o banco recusar — era `remittance-inspector.ts` acusar
// `non-ascii-character` DEPOIS de `generate-remittance.ts` ter consumido o NSA sob lock, que por
// desenho não volta. Um `Nº` no logradouro queimava um número de sequência de arquivo, e o operador
// recebia uma recusa que não aponta campo nenhum.
//
// E `NFKD` (equivalência de COMPATIBILIDADE) não é a correção mais curta que parece: resolveria
// `º`→`o`, mas devolve `½` como `1⁄2` — com U+2044, ainda não-ASCII — e reescreve o que ninguém
// pediu (`㎏`→`kg`, `Ⅻ`→`XII`). Para um arquivo cuja única validação real é produção, tabela
// explícita e auditável vale mais que regra genérica com efeito colateral.
const stripCombiningMarks = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Preenchedor do que não tem transliteração legível — `€`, `→`, emoji, ideograma (CA5 da #862).
//
// É BRANCO, e a escolha é declarada: o campo alfanumérico do layout já é preenchido com brancos em
// toda posição não usada (o `padEnd` de `alpha`), então é o único caractere comprovadamente aceito
// em qualquer posição alfa deste arquivo. `?` também é ASCII e passaria o inspetor, mas seria um
// caractere ESTREANDO num arquivo que só se valida em produção — e aqui já se viu campo aderente ao
// layout ser recusado pelo Validador Universal (#804). Não se estreia caractere sem evidência.
const UNTRANSLITERABLE = ' ';

// Transliteração do não-ASCII que o `NFD` não decompõe. O critério de entrada é o CA2 da #862: o
// campo é lido por HUMANO na outra ponta, então `RUA 1º DE MAIO` tem de chegar `RUA 1O DE MAIO` —
// legível, não um branco nem um `?` no lugar do caractere.
//
// Cobre o que de fato aparece em cadastro brasileiro: ordinal (`Nº`, `1ª`), travessão e aspas
// tipográficas — que entram por copiar-e-colar de editor de texto —, fração, e as poucas letras
// latinas que não são base + acento. O que não estiver aqui vira `UNTRANSLITERABLE`.
//
// Escrita em CAIXA ALTA de propósito: `toUpperCase()` roda ANTES da tabela, então minúscula nunca
// chega até aqui — e `ß`→`SS`, `ﬁ`→`FI`, `æ`→`Æ` já são resolvidos pela própria conversão de caixa.
const TRANSLITERATIONS: ReadonlyMap<string, string> = new Map([
  // Ordinal e grau. O grau entra porque o teclado produz `°` no lugar de `º` o tempo todo.
  ['º', 'O'], // º ordinal masculino
  ['ª', 'A'], // ª ordinal feminino
  ['°', 'O'], // ° sinal de grau
  ['№', 'NO'], // № abreviatura de número
  // Traços que não são o hífen ASCII.
  ['‐', '-'], // ‐ hífen
  ['‑', '-'], // ‑ hífen não-quebrável
  ['‒', '-'], // ‒ traço de dígito
  ['–', '-'], // – meia-risca
  ['—', '-'], // — travessão
  ['―', '-'], // ― barra horizontal
  ['−', '-'], // − sinal de menos
  // Aspas e apóstrofos tipográficos.
  ['‘', "'"], // ‘
  ['’', "'"], // ’
  ['‚', "'"], // ‚
  ['‛', "'"], // ‛
  ['´', "'"], // ´ acento agudo solto
  ['“', '"'], // “
  ['”', '"'], // ”
  ['„', '"'], // „
  ['‟', '"'], // ‟
  ['«', '"'], // «
  ['»', '"'], // »
  // Espaços que não são o branco ASCII — invisíveis no cadastro e no diff, e por isso os piores de
  // diagnosticar: o defeito aparece como "acento" numa posição que parece vazia.
  //
  // Declarados por CODE POINT, e não pelo caractere. Escrito literalmente, qualquer normalização de
  // whitespace — editor, formatador, um copiar-e-colar — converteria a chave em branco ASCII em
  // silêncio, desligando a linha sem quebrar nada que o gate perceba. `tests/…/positional.test.ts`
  // cobra o caso do não-quebrável justamente porque a regressão seria invisível na revisão.
  [String.fromCodePoint(0x00a0), ' '], // espaço não-quebrável
  [String.fromCodePoint(0x2007), ' '], // espaço de figura
  [String.fromCodePoint(0x2009), ' '], // espaço fino
  [String.fromCodePoint(0x202f), ' '], // espaço estreito não-quebrável
  [String.fromCodePoint(0x3000), ' '], // espaço ideográfico
  // Pontuação.
  ['…', '...'], // …
  ['·', '.'], // ·
  ['•', '.'], // •
  // Frações.
  ['½', '1/2'], // ½
  ['¼', '1/4'], // ¼
  ['¾', '3/4'], // ¾
  ['⅓', '1/3'], // ⅓
  ['⅔', '2/3'], // ⅔
  // Letras latinas sem decomposição canônica — o traço é parte do desenho, não sobreposto.
  ['Ø', 'O'], // Ø
  ['Æ', 'AE'], // Æ
  ['Œ', 'OE'], // Œ
  ['Ð', 'D'], // Ð
  ['Đ', 'D'], // Đ
  ['Þ', 'TH'], // Þ
  ['Ł', 'L'], // Ł
  // Símbolos que aparecem em razão social.
  ['×', 'X'], // ×
  ['÷', '/'], // ÷
  ['©', '(C)'], // ©
  ['®', '(R)'], // ®
  ['™', 'TM'], // ™
]);

const ASCII_PRINTABLE = /^[\x20-\x7E]$/;

// Varre por CODE POINT, não por unidade UTF-16 — e as duas flags do regex são o que garante isso:
//
//   · `u` faz `.` casar o par substituto inteiro. Sem ela, um caractere fora do BMP viraria DOIS
//     preenchedores, e o campo cresceria uma posição — num arquivo posicional, isso desloca tudo
//     o que vem depois.
//   · `s` faz `.` casar quebra de linha. Sem ela, `\n` e `\r` passariam INTACTOS, que é o pior
//     resultado possível aqui: um `\n` colado num nome de cadastro parte o registro em duas linhas
//     de comprimento errado, e o defeito chega como `line-length` — longe do campo que o causou.
//
// `[...value]` daria a mesma granularidade e é barrado por `no-misused-spread`, com razão: ele
// decompõe emoji composto por ZWJ em seus componentes. Aqui o efeito seria inofensivo — cada
// componente vira um branco e o `padEnd` recompõe o tamanho —, mas não vale gastar a exceção.
const toPrintableAscii = (value: string): string =>
  value.replace(
    /./gsu,
    (char) => TRANSLITERATIONS.get(char) ?? (ASCII_PRINTABLE.test(char) ? char : UNTRANSLITERABLE),
  );

// A ordem das três etapas é o que mantém a tabela pequena: tirar o combinante primeiro (`Á`→`A`),
// subir a caixa depois (`ß`→`SS`, `ﬁ`→`FI`), e só então transliterar o que sobrou.
export const alpha = (value: string, size: number): string =>
  toPrintableAscii(stripCombiningMarks(value).toUpperCase()).slice(0, size).padEnd(size, ' ');

// Money no domínio já é bigint/number de centavos (ADR-0020); aqui só vira dígito sem separador.
export const cents = (valueCents: number, size: number): Result<string, PositionalFieldError> =>
  num(valueCents, size);

const two = (value: number): string => String(value).padStart(2, '0');

// Datas do arquivo são sempre em UTC: a geração é de máquina, não de fuso do operador.
export const dateDDMMYYYY = (at: Date): Result<string, PositionalFieldError> =>
  num(`${two(at.getUTCDate())}${two(at.getUTCMonth() + 1)}${String(at.getUTCFullYear())}`, 8);

export const timeHHMMSS = (at: Date): Result<string, PositionalFieldError> =>
  num(`${two(at.getUTCHours())}${two(at.getUTCMinutes())}${two(at.getUTCSeconds())}`, 6);

// Campo que o domínio pode guardar COM máscara — documento, agência, conta, CEP. Tirar a pontuação
// é tradução de formato, papel legítimo da ACL: "12.345.678/0001-99" e "12345678000199" são o mesmo
// CNPJ. A borda HTTP já normaliza na entrada (`adapters/http/schemas.ts`), mas dado vindo de ETL
// legado não passa por ela — e falhar a remessa inteira por causa de um ponto seria defeito bobo.
// Continua sendo erro o que sobrar vazio ou não couber: normalizar não é engolir.
export const digits = (value: string, size: number): Result<string, PositionalFieldError> =>
  num(value.replace(/\D/g, ''), size);

// ⚠️ INSCRIÇÃO (CPF/CNPJ) NÃO USA `digits()` — e este parágrafo é a razão de existir um campo
// próprio, porque a diferença entre os dois é invisível na linha de chamada (#863).
//
// Para agência, conta e CEP, `digits()` faz o certo: o que ela remove é máscara, e máscara não é
// conteúdo. Para inscrição, desde que a Receita passou a emitir CNPJ alfanumérico (ADR-0044), o que
// ela remove pode ser CONTEÚDO — e o resultado é o pior desfecho possível, porque continua sendo um
// número de 14 posições perfeitamente bem formado:
//
//     digits('12ABC34501DE35', 14)  →  '00000123450135'   ← outra inscrição, e ninguém percebe
//
// O arquivo é aceito, o pagamento sai, e o favorecido chega ao banco identificado por outro
// documento. Nada no caminho reclama: o inspetor de forma aprova, o validador do banco aprova, e o
// erro só aparece na conciliação — ou, no Pix, como recusa `PF` do DICT, sem causa apontada.
//
// A regra de "isto pode ser escrito num campo Num?" vive no DOMÍNIO
// (`domain/payout/inscription.ts`), e não aqui, porque o pré-voo precisa da MESMA régua para recusar
// antes do `allocateNsa`. Este campo é só a metade que sabe escrever.
export const inscription = (value: string, size: number): Result<string, PositionalFieldError> => {
  const normalized = normalizeInscription(value);

  // ⚠️ O VAZIO NÃO É ASSUNTO DESTE ERRO, e a carve-out é obrigatória: sem ela, campo em branco
  // passaria a sair como `inscription-alphanumeric-unsupported`, mandando escalar ao banco um caso
  // que é simplesmente cadastro faltando. Vazio e estouro continuam sendo o que sempre foram — quem
  // os nomeia é `num`, e há teste do Segmento J-52 fixando exatamente isso.
  if (normalized !== '' && !isCnabEmittableInscription(normalized))
    return err('inscription-alphanumeric-unsupported');

  return num(normalized, size);
};

// ── Combinadores de registro ────────────────────────────────────────────────────────────────────
// Vivem aqui, e não no módulo de registros, porque envelope (header/trailer) e detalhe (segmentos)
// montam linha da mesma forma: uma lista de campos posicionais concatenada, com o primeiro erro
// vencendo. Duplicá-los em cada módulo seria a terceira cópia da mesma regra.

export const blanks = (size: number): Result<string, PositionalFieldError> => ok(' '.repeat(size));

export const text = (value: string, size: number): Result<string, PositionalFieldError> =>
  ok(alpha(value, size));

// Propaga o primeiro erro. Sem isto, cada registro viraria uma escada de trinta `if (isErr(...))` —
// e a escada é onde se esquece de checar um.
//
// Genérico no ERRO de propósito (#804): concatenar campos posicionais não depende de qual erro eles
// podem produzir, e fixar `PositionalFieldError` impedia um campo com erro próprio — o convênio —
// de participar do mesmo registro. Com `E` inferido, um registro que mistura campos de erros
// distintos produz a UNIÃO deles, que é exatamente o que o chamador precisa declarar.
export const joinFields = <E>(fields: readonly Result<string, E>[]): Result<string, E> => {
  const parts: string[] = [];
  for (const field of fields) {
    if (!field.ok) return field;
    parts.push(field.value);
  }
  return ok(parts.join(''));
};
