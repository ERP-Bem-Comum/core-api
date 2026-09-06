// A CHAVE NATURAL da conta-cedente, na forma CANÔNICA (#995, bloco A).
//
// ## O defeito que isto fecha
//
// A duplicata comparava as quatro colunas como STRING CRUA. A mesma conta bancária, escrita de outro
// jeito, entrava de novo — e foi o que aconteceu em produção em 06/09:
//
//   legado (ETL)              digitado na tela          o sistema via     esta régua
//   bankCode      '7'         bankCode      '007'       diferentes        MESMA
//   agency        '1234-1'    agency        '1234'      diferentes        MESMA
//   accountNumber '0012345'   accountNumber '12345'     diferentes        MESMA
//   accountDigit  ''          accountDigit  '3'         diferentes        ⚠️ ver abaixo
//
// Para o banco é UMA conta. O segundo cadastro passou, e o teste de remessa não processou.
//
// ⚠️ O DÍGITO DA CONTA VAZIO NÃO É UNIFICADO POR SI, e vale dizer o que a régua faz e o que não faz.
// Quando o DV está EMBUTIDO no número (`'0088123-3'` com a coluna vazia), ele é recuperado dali e a
// chave bate com `'88123'` + `'3'`. Mas coluna vazia SEM nada embutido continua diferente de um
// dígito preenchido — e é o certo: colapsar "sem dígito" com "qualquer dígito" faria contas de
// dígitos distintos virarem a mesma. Se existir linha legada assim, unificá-la é decisão de dado,
// não de código: o operador informa o dígito pela tela e as duas escritas passam a coincidir.
//
// ## As formas, definidas pela P.O. (06/09/2026)
//
//   · banco   — SEMPRE 3 dígitos com zeros à esquerda (`'7'` → `'007'`). Não é escolha nossa: é o
//     que o CNAB grava (`num(bankCode, 3)`) e o que a tabela FEBRABAN do front já documenta como
//     forma canônica do código de compensação.
//   · agência — só os dígitos. O DV tem coluna própria desde a #856, então separador aqui é resíduo
//     de cadastro antigo, não informação.
//   · conta   — sem zeros à esquerda. `'0012345'` e `'12345'` são a mesma conta.
//   · dígito  — só o caractere, em caixa alta (o `P` do Bradesco existe — ver `account-check-digit`).
//
// ## Por que a comparação é em TS, e não em SQL
//
// Escrever `LPAD`/`TRIM LEADING` no `where` do adapter Drizzle criaria uma SEGUNDA definição da
// regra, e o fake in-memory precisaria de uma terceira. Duas réguas para o mesmo fato divergem na
// primeira correção feita só numa delas — é a classe de defeito que a #863 e a #837 documentam neste
// módulo. Com a régua aqui, os dois adapters descem até ela.
//
// O custo é varrer as linhas em vez de usar índice. É aceitável e não por descuido: esta tabela
// guarda as contas bancárias DA ORGANIZAÇÃO — unidades, não milhares.
//
// ## ⚠️ Isto NÃO grava nada, e a distinção é deliberada
//
// As colunas continuam com o que o operador digitou: a tela segue mostrando `0288` e a máscara
// `XXXX-DV` do front continua funcionando. A forma canônica existe para COMPARAR.
//
// E não há UNIQUE canônica no banco — ainda. Pôr uma agora reprovaria a migration contra as
// duplicatas que já existem, derrubando o deploy. A régua abaixo impede a duplicata NOVA; a garantia
// no banco entra quando o cadastro estiver saneado, e a CA3 pede que as colisões existentes sejam
// REPORTADAS, não resolvidas pelo código.

import { splitCheckDigit } from '../payout/payee-account.ts';

export type CedenteNaturalKeyParts = Readonly<{
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
}>;

const BANK_CODE_WIDTH = 3;

const digitsOnly = (raw: string): string => raw.replace(/\D/g, '');

// ⚠️ A AGÊNCIA NÃO PODE PASSAR POR `digitsOnly`, e isto foi medido: `digitsOnly('1234-1')` devolve
// `'12341'` — CONCATENA a agência com o DV, que é precisamente a corrupção que o #856 corrigiu no
// emissor. `1234-1` é a agência `1234`; o `1` é dígito, não parte do número.
//
// A gramática é `splitCheckDigit`, do payout — a MESMA que o ETL usa desde o #856 para decompor a
// agência legada. Reescrevê-la aqui criaria a segunda cópia que aquela issue existiu para eliminar.
// Sem separador reconhecível, sobra o que houver de dígito.
const agencyBase = (raw: string): string => {
  const split = splitCheckDigit(raw.trim());
  return split === null ? digitsOnly(raw) : digitsOnly(split.base);
};

// A CONTA sofre do MESMO problema da agência, e a assimetria era defeito — não desenho.
//
// O ETL que embutiu o DV em `agency` embutiu na CONTA também: `'0088123-3'` com `account_digit`
// vazio. `digitsOnly` daria `'00881233'`, concatenando conta e dígito, enquanto o operador digita
// `'88123'` + `'3'` — e as duas escritas da MESMA conta continuariam divergindo.
//
// Quando o número traz o DV embutido E a coluna do dígito está vazia, o dígito é RECUPERADO dali.
// Só nesse caso: com a coluna preenchida, ela manda (o operador é a fonte mais recente); e sem
// separador não há dígito a recuperar — adivinhar onde o número termina é o palpite que a #708
// proibiu.
const accountParts = (
  accountNumber: string,
  accountDigit: string,
): Readonly<{ number: string; digit: string }> => {
  const digit = accountDigit.trim().toUpperCase();
  const split = splitCheckDigit(accountNumber.trim());

  if (split === null) return { number: digitsOnly(accountNumber), digit };
  return {
    number: digitsOnly(split.base),
    digit: digit === '' ? (split.digit ?? '') : digit,
  };
};

// Zeros à esquerda somem, mas o valor inteiro de zeros NÃO vira string vazia: `'000'` é um dado
// presente e mal preenchido, e colapsá-lo em `''` o tornaria indistinguível de campo em branco.
const withoutLeadingZeros = (raw: string): string => raw.replace(/^0+(?=.)/, '');

/**
 * A chave canônica, como string única.
 *
 * O separador `|` não pode aparecer em nenhuma das partes — todas são dígitos ou um caractere de DV
 * —, então não há como duas chaves diferentes colidirem por ambiguidade de junção.
 */
export const canonicalNaturalKey = (parts: CedenteNaturalKeyParts): string => {
  // ⚠️ TIRA os zeros ANTES de completar. `padStart` só completa, nunca corta: sem o
  // `withoutLeadingZeros`, `'0237'` continuaria `'0237'` e não bateria com `'237'` — e a borda
  // aceita os dois (`z.string().min(1).max(10)`). Um extrato legado de largura fixa grava `'0237'`;
  // o operador digita `237`. Era a única parte que só completava, e a assimetria era o defeito.
  const bankCode = withoutLeadingZeros(digitsOnly(parts.bankCode)).padStart(BANK_CODE_WIDTH, '0');
  const agency = withoutLeadingZeros(agencyBase(parts.agency));
  const account = accountParts(parts.accountNumber, parts.accountDigit);

  return `${bankCode}|${agency}|${withoutLeadingZeros(account.number)}|${account.digit}`;
};

/** As duas escritas apontam para a mesma conta bancária? */
export const isSameCedenteAccount = (
  a: CedenteNaturalKeyParts,
  b: CedenteNaturalKeyParts,
): boolean => canonicalNaturalKey(a) === canonicalNaturalKey(b);
