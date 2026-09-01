// Registros de DETALHE do CNAB 240 Multipag (Bradesco): Segmentos A e B do pagamento por crédito
// em conta / TED / transferência.
//
// Fonte primária: `jun-19-layout-multipag.pdf` (local-only) — Segmento A na p. 24, Segmento B na
// p. 25. Ambos declarados **Obrigatório – Remessa / Retorno** pelo layout: um pagamento é o PAR
// A+B, nunca o A sozinho. Por isso `paymentRecords` existe e é o ponto de entrada preferido — quem
// chamar `segmentA` isolado consegue montar um arquivo que o banco recusa.
//
// Esta camada é ACL (ADR-0006): recebe dados já resolvidos e não conhece agregado nem repositório.
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';
import {
  alpha,
  blanks,
  cents,
  dateDDMMYYYY,
  digits,
  joinFields,
  num,
  text,
  type PositionalFieldError,
} from './positional.ts';

// Um bloco de identificação do Segmento J-52 saiu sem quem ele identifica. Erro PRÓPRIO, e não o
// `numeric-field-invalid` reusado no P011/P013 do Segmento A, porque a ação de quem corrige é outra
// e é a distinção que o convênio já estabeleceu neste módulo: `numeric-field-invalid` ali significa
// "defeito do emissor, abra o código", porque nenhum valor externo alimenta aqueles campos. Aqui o
// valor vem do CADASTRO — o nome e a inscrição de quem emitiu o boleto —, e a ação é cadastrar.
// Achatar os dois mandaria o operador abrir um chamado de código para um dado que só ele tem.
export type CnabSegmentError = PositionalFieldError | 'billet-party-unidentified';

const DETAIL_RECORD_TYPE = 3;
const MOVEMENT_INCLUSION = '0'; // G060 — 0 = inclusão (remessa)

// G061, colunas 016-017 — a INSTRUÇÃO, campo distinto do tipo de movimento (G060, coluna 015).
//
// `09` = "Inclusão do Registro Detalhe Bloqueado": o pagamento entra retido, aguardando liberação
// dos usuários master no Net Empresa. É exigência de governança da P.O. (#804), e não sintaxe: é o
// controle que separa quem MONTA a remessa de quem AUTORIZA o pagamento. Com `00` — inclusão
// liberada — o arquivo pagaria direto, sem a dupla checagem que o cliente contratou.
//
// ⚠️ Os dois campos são vizinhos e têm larguras diferentes, e confundi-los é caro: o laudo pediu
// esta mudança como "[015-016]", coordenada que não existe no layout. Escrever ali encostaria em
// G060, cujo domínio inclui o valor que significa EXCLUSÃO — trocando "retido para aprovação" por
// outra operação. Conferido no layout, p. 24, campos 06.3A e 07.3A.
//
// A instrução vale para TODO pagamento — Segmento A (transferência) e Segmento J (boleto). É a
// decisão da P.O. em 24/08/2026 (#805): não existe rota que saia liberada. A liberação master no
// Net Empresa passa a cobrir boleto também, um passo a mais por remessa — preço escolhido para não
// existir porta lateral.
//
// Até então o J saía com `00` — "Inclusão de Registro Detalhe Liberado" —, e pagar por boleto
// contornava a dupla checagem que a transferência exige: mesmo dinheiro, mesma conta, sem o
// segundo par de olhos. O que impede a porta de voltar a abrir é o teste que lê A e J da MESMA
// remessa e cobra a instrução dos dois (`remittance-file.test.ts`, #805); enquanto os dois forem
// medidos juntos, a divergência aparece aqui, e não no extrato.
const MOVEMENT_INSTRUCTION_BLOCKED = '09';

const CURRENCY_BRL = 'BRL'; // G040

export type Payee = Readonly<{
  name: string;
  documentType: '1' | '2'; // 1 = CPF, 2 = CNPJ
  document: string;
  bankCode: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  // `accountAgencyDigit` NÃO existe aqui de propósito — ver a coluna 043 em `segmentA` (#754).
}>;

export type PayeeAddress = Readonly<{
  street?: string;
  number?: number;
  complement?: string;
  district?: string;
  city?: string;
  zipCode?: string;
  zipSuffix?: string;
  state?: string;
}>;

export type SegmentAInput = Readonly<{
  bankCode: string; // banco do CEDENTE (posições 1-3); o do favorecido vai em 21-23
  batchNumber: number;
  recordNumber: number;
  payee: Payee;
  paymentDate: Date;
  valueCents: number;
  // P001, colunas 018-020. OBRIGATÓRIO, e sem default de propósito (#751): o valor depende da forma
  // de lançamento, e quem monta o registro não tem como adivinhá-la. Quem deriva é
  // `clearingHouseFor`, em `batch-profile.ts`.
  clearingHouse: string;
  // G064 "Seu Número" — a referência do pagador, e a CHAVE DE CASAMENTO do retorno (#752).
  // Obrigatória, e sem default: o `?? ''` que existia aqui emitia arquivo válido, aceito pelo banco,
  // cujo retorno chegava sem nada a que se ligar. Quem deriva é `referenceFor`, no montador.
  yourNumber: string;
  // P011, colunas 220-224. OBRIGATÓRIO e JÁ RESOLVIDO, pelo mesmo motivo que a câmara e o "Seu
  // Número" (#813): enquanto foi opcional com `?? ''`, nenhum chamador o preencheu e toda remessa
  // saiu com as cinco posições em branco — TED inclusive, que é o arquivo que o banco recusou.
  //
  // `null` NÃO é "sem valor": é "esta rota não tem o campo", e sai em branco. Quem deriva a
  // finalidade da forma de lançamento é `tedPurposeFor`, em `batch-profile.ts`; este segmento
  // escreve o que recebeu e não tem opinião sobre qual finalidade é a certa.
  tedPurpose: string | null;
  // P013, colunas 225-226 — tipo da conta do favorecido (`CC`/`PP`). Mesma semântica do `tedPurpose`
  // acima e pelo mesmo motivo: `null` é "esta rota não tem o campo", e sai em branco. Quem deriva da
  // forma do lote é `complementPurposeFor`, em `batch-profile.ts`; este segmento escreve o que
  // recebeu e não tem opinião sobre qual tipo de conta é o certo.
  complementPurpose: string | null;
  message?: string; // G031 "Informação 2"
}>;

export type SegmentBInput = Readonly<{
  bankCode: string;
  batchNumber: number;
  recordNumber: number;
  payee: Payee;
  // G044 e G042, colunas 128-135 e 136-150 — o VENCIMENTO e o VALOR NOMINAIS do título, no grupo
  // "Dados Complementares – Pagamento" (layout p.25, campos 17.3B e 18.3B; descrições na p.103).
  // Ambos declarados **Obrigatório – Remessa / Retorno**, e ambos saíam zerados: é o defeito 5 da
  // #804 — a única recusa da fila confirmada POR ESCRITO pelo banco, com as frases literais "Data
  // de vencimento (nominal) não informada ou inválida" e "Valor do documento (nominal) não
  // informado ou inválido". G059 §'AP' (p.107) enumera o caso do campo de data ZERADO.
  //
  // OBRIGATÓRIOS: sem `?`, sem default. Um `dueDate?` com `?? 0` compilaria em todo chamador e
  // reproduziria o defeito que esta mudança corrige — é o padrão que a rule `cnab.md` registra em
  // cinco casos, e o quarto deles (`address?`, logo abaixo) segue aberto na #858, emitindo branco em
  // 100% das remessas. Aqui o compilador cobra quem esquecer.
  //
  // Os nomes espelham `SegmentJInput`: mesmos códigos G, mesmo significado, mesmo nome. A rota de
  // BOLETO sempre distinguiu `dueDate`/`titleValueCents` de `paymentDate`/`paymentValueCents` — a
  // assimetria era a transferência não declarar o que o layout separa por desenho.
  dueDate: Date;
  titleValueCents: number;
  address?: PayeeAddress;
}>;

export type PaymentRecordsInput = Readonly<{
  bankCode: string;
  batchNumber: number;
  firstRecordNumber: number;
  payee: Payee;
  paymentDate: Date;
  valueCents: number;
  address?: PayeeAddress;
  clearingHouse: string; // P001 — ver `SegmentAInput`
  yourNumber: string; // ver `SegmentAInput` — obrigatório desde a #752
  tedPurpose: string | null; // P011 — ver `SegmentAInput`; obrigatório desde a #813
  complementPurpose: string | null; // P013 — ver `SegmentAInput`; obrigatório desde a inquiry-0033
  message?: string;
}>;

// P011 tem 5 posições, e a rota SEM finalidade sai em branco — `null` traduzido aqui, no único
// lugar que conhece a largura do campo. O valor, quando existe, vai LITERAL: `text` alinha à
// esquerda e não completa com zeros, então quem produz o valor é quem responde pelo formato.
const TED_PURPOSE_WIDTH = 5;

// Derivado da largura, e não `^\d{5}$` literal, pelo mesmo motivo de `isBarcode`: quem mudar a
// largura muda a guarda junto, em vez de deixar as duas divergirem em silêncio.
const isTedPurpose = (raw: string): boolean =>
  new RegExp(`^\\d{${String(TED_PURPOSE_WIDTH)}}$`).test(raw);

const tedPurposeField = (purpose: string | null): Result<string, CnabSegmentError> =>
  purpose === null ? blanks(TED_PURPOSE_WIDTH) : text(purpose, TED_PURPOSE_WIDTH);

// P013 tem 2 posições e a rota SEM o campo sai em branco — mesmo molde do P011 acima.
const COMPLEMENT_PURPOSE_WIDTH = 2;

// ⚠️ AQUI a allow-list é legítima, e a diferença para o P011 é a fonte, não o gosto. O domínio do
// P011 vem do dicionário do Bacen, que a própria fonte rotula DECLARADAMENTE PARCIAL — listar os
// doze valores conhecidos recusaria um código legítimo fora deles. O domínio do P013 é FECHADO e o
// banco o enunciou por extenso na crítica de 21/08: "'CC' - Corrente ou 'PP' - Poupança". Dois
// valores, sem terceiro possível.
const COMPLEMENT_PURPOSES: ReadonlySet<string> = new Set(['CC', 'PP']);

const complementPurposeField = (purpose: string | null): Result<string, CnabSegmentError> =>
  purpose === null ? blanks(COMPLEMENT_PURPOSE_WIDTH) : text(purpose, COMPLEMENT_PURPOSE_WIDTH);

export const segmentA = (input: SegmentAInput): Result<string, CnabSegmentError> => {
  const { payee: p } = input;

  // CA3 da #813 — guarda de COERÊNCIA INTERNA do P011, antes de montar a linha.
  //
  // Não é sanitização de input: com a finalidade derivada por `tedPurposeFor`, nenhum valor externo
  // alimenta o campo. O que a guarda protege é o que o próprio emissor produz — e o modo de falha é
  // silencioso. O campo é declarado **Alfa**, mas o domínio é numérico com zeros à esquerda: um
  // valor sem eles (`'5'`) vira `'5    '` alinhado à esquerda, que não é código nenhum do domínio
  // do Bacen e que o banco aceita sem reclamar.
  //
  // ⚠️ SEM allow-list. A tabela do Bacen é declaradamente parcial ("exemplos de algumas das
  // finalidades"), e uma lista dos doze valores conhecidos recusaria um código legítimo fora dela.
  // O que se verifica é o FORMATO — 5 posições, todas dígitos —, nunca a pertinência ao domínio.
  //
  // `null` é legítimo e passa: é a rota que não tem o campo, e ela sai em branco.
  //
  // O molde vive neste arquivo: `isBarcode` + `err(...)` no Segmento J, logo abaixo. E o erro é o
  // mesmo `numeric-field-invalid`, DELIBERADAMENTE reusado em vez de ganhar membro próprio: o
  // convênio ganhou erro próprio porque a ação de quem corrige difere — `missing` manda cadastrar,
  // `overflow` manda conferir o que o banco registrou. Aqui não há nada a corrigir no cadastro,
  // porque nenhum valor externo alimenta o campo: um formato inválido só é alcançável por defeito
  // do próprio emissor, e a ação é abrir o código. Erro próprio nomearia uma distinção que não
  // existe do lado de quem recebe.
  if (input.tedPurpose !== null && !isTedPurpose(input.tedPurpose))
    return err('numeric-field-invalid');

  // Mesma guarda, mesmo motivo, mesmo erro reusado: nenhum valor externo alimenta o P013 — ele vem
  // de `complementPurposeFor` —, então formato inválido só é alcançável por defeito do próprio
  // emissor, e a ação é abrir o código, não o cadastro. O modo de falha é o mesmo do P011: o campo é
  // Alfa, e um valor fora do domínio (`'C'`, `'cc'`) sai alinhado à esquerda e o banco o recusa
  // apontando a coluna, sem dizer o que era esperado.
  if (input.complementPurpose !== null && !COMPLEMENT_PURPOSES.has(input.complementPurpose))
    return err('numeric-field-invalid');

  return joinFields([
    num(input.bankCode, 3), // 001-003 banco do cedente
    num(input.batchNumber, 4), // 004-007 lote
    num(DETAIL_RECORD_TYPE, 1), // 008     tipo de registro (detalhe)
    num(input.recordNumber, 5), // 009-013 nº do registro no lote
    text('A', 1), // 014     segmento
    num(MOVEMENT_INCLUSION, 1), // 015     tipo de movimento (G060)
    num(MOVEMENT_INSTRUCTION_BLOCKED, 2), // 016-017 instrução (G061) — entra BLOQUEADO
    num(input.clearingHouse, 3), // 018-020 câmara centralizadora
    num(p.bankCode, 3), // 021-023 banco do FAVORECIDO
    digits(p.agency, 5), // 024-028 agência do favorecido
    text(p.agencyDigit, 1), // 029     DV agência
    digits(p.accountNumber, 12), // 030-041 conta do favorecido
    text(p.accountDigit, 1), // 042     DV conta
    // 043 — G012, DV agência/conta do FAVORECIDO. Em branco por REGRA DO BANCO: o validador oficial
    // trata a posição preenchida como erro (regra extraída em ERP-Bem-Comum/cnab-validator#2). Por
    // isso `blanks`, e não um campo do `Payee`: o que o banco recusa não deve ser preenchível, e a
    // ausência do campo faz o compilador cobrar quem tentar (#754).
    //
    // ⚠️ NÃO confundir com a coluna 072 de `multipag-records.ts`, que tem nome homônimo e é do
    // CEDENTE, noutro contexto do layout. Os dois campos não compartilham regra.
    blanks(1), // 043     DV ag/conta — sempre em branco
    text(p.name, 30), // 044-073 nome do favorecido
    text(input.yourNumber, 20), // 074-093 seu número
    dateDDMMYYYY(input.paymentDate), // 094-101 data do pagamento
    text(CURRENCY_BRL, 3), // 102-104 tipo da moeda
    num(0, 15), // 105-119 quantidade de moeda (10 + 5)
    cents(input.valueCents, 15), // 120-134 valor do pagamento (13 + 2)
    blanks(20), // 135-154 nosso número — o banco preenche no retorno
    num(0, 8), // 155-162 data real da efetivação — só no retorno
    num(0, 15), // 163-177 valor real — só no retorno
    text(input.message ?? '', 40), // 178-217 informação 2
    blanks(2), // 218-219 CNAB
    tedPurposeField(input.tedPurpose), // 220-224 finalidade da TED (P011)
    complementPurposeField(input.complementPurpose), // 225-226 tipo da conta do favorecido (P013)
    blanks(3), // 227-229 CNAB
    num(0, 1), // 230     aviso ao favorecido (0 = não emite)
    blanks(10), // 231-240 ocorrências — preenchidas no retorno
  ]);
};

export const segmentB = (input: SegmentBInput): Result<string, CnabSegmentError> => {
  const { payee: p, address: a } = input;
  return joinFields([
    num(input.bankCode, 3), // 001-003 banco do cedente
    num(input.batchNumber, 4), // 004-007 lote
    num(DETAIL_RECORD_TYPE, 1), // 008     tipo de registro (detalhe)
    num(input.recordNumber, 5), // 009-013 nº do registro no lote
    text('B', 1), // 014     segmento
    blanks(3), // 015-017 CNAB
    num(p.documentType, 1), // 018     tipo de inscrição do favorecido
    digits(p.document, 14), // 019-032 nº de inscrição do favorecido
    text(a?.street ?? '', 30), // 033-062 logradouro
    num(a?.number ?? 0, 5), // 063-067 número
    text(a?.complement ?? '', 15), // 068-082 complemento
    text(a?.district ?? '', 15), // 083-097 bairro
    text(a?.city ?? '', 20), // 098-117 cidade
    digits(a?.zipCode ?? '0', 5), // 118-122 CEP
    text(a?.zipSuffix ?? '', 3), // 123-125 complemento do CEP
    text(a?.state ?? '', 2), // 126-127 estado
    dateDDMMYYYY(input.dueDate), // 128-135 vencimento nominal (G044) — DDMMAAAA, p.103
    cents(input.titleValueCents, 15), // 136-150 valor do documento nominal (G042) — 13 + 2
    // 151-210 abatimento, desconto, mora e multa (G045-G048). Zerados por DECISÃO, não por omissão:
    // não se aplicam a crédito em conta, e `RemittanceTransferPayment` não os modela. É a mesma
    // fronteira do parágrafo de `paymentRecords` — o dia em que houver desconto ou mora é o dia em
    // que o Segmento B precisa de fonte própria, e estes quatro campos deixam de ser zero junto.
    num(0, 15), // 151-165 abatimento
    num(0, 15), // 166-180 desconto
    num(0, 15), // 181-195 mora
    num(0, 15), // 196-210 multa
    blanks(15), // 211-225 código/documento do favorecido
    num(0, 1), // 226     aviso
    num(0, 6), // 227-232 código da UG centralizadora (SIAPE)
    num(0, 8), // 233-240 código ISPB
  ]);
};

// ─── Segmento J — Pagamento de Títulos de Cobrança (boleto) ──────────────────────────────────
//
// Fonte primária: `jun-19-layout-multipag.pdf` p. 32 (local-only), campos 01.3J a 21.3J, declarado
// **Obrigatório – Remessa / Retorno**. Posições conferidas no PDF, não em transcrição.
//
// ⚠️ Este registro NÃO tem banco, agência nem conta do FAVORECIDO — quem identifica o beneficiário
// é o código de barras. É a razão pela qual o boleto não depende do cadastro bancário, e a
// confirmação na fonte do CA5 da #708.
//
// O `Nome do Cedente` (62-091) é de quem RECEBE, não do pagador: cedente, no vocabulário de
// cobrança, é quem emitiu o título. A mesma posição, na seção de PIX do manual (p. 41), aparece
// nomeada "Nome do Beneficiário" — é a leitura que desfaz a ambiguidade do termo. Isso não
// contradiz o parágrafo acima: o que o registro não carrega é o DADO BANCÁRIO do favorecido; o
// nome dele viaja, e é informativo.
export type SegmentJInput = Readonly<{
  bankCode: string; // banco do CEDENTE do arquivo, isto é, o pagador (posições 001-003)
  batchNumber: number;
  recordNumber: number;
  // G063 — 44 posições numéricas. É o CÓDIGO DE BARRAS (Carta-Circular Bacen 2.926), não a linha
  // digitável de 47: são representações diferentes, e a linha traz DVs que o código não tem.
  barcode: string;
  beneficiaryName: string; // G013 — nome do cedente do título: quem RECEBE
  dueDate: Date; // G044
  titleValueCents: number; // G042
  paymentDate: Date; // P009
  paymentValueCents: number; // P010
  discountCents?: number; // L002
  surchargeCents?: number; // L003 — mora + multa
  yourNumber?: string; // G064 — referência do pagador
}>;

const CURRENCY_REAL = '09'; // G065 — domínio do layout: '09' = Real

// 44 é comprimento EXATO, não máximo — e a diferença importa.
//
// `num()` alinha à direita com zeros à esquerda, que é o certo para agência (`1234` → `01234`,
// mesma agência). Para código de barras não é: os 44 dígitos são posicionais e cada um significa
// algo — banco, moeda, DV, fator de vencimento, valor. Preencher `123` com 41 zeros produz um
// código sintaticamente válido e semanticamente outro, que o banco aceita e paga errado.
const BARCODE_LENGTH = 44;
const isBarcode = (raw: string): boolean =>
  new RegExp(`^\\d{${String(BARCODE_LENGTH)}}$`).test(raw);

export const segmentJ = (input: SegmentJInput): Result<string, CnabSegmentError> => {
  if (!isBarcode(input.barcode)) return err('numeric-field-invalid');

  return joinFields([
    num(input.bankCode, 3), // 001-003 banco do cedente
    num(input.batchNumber, 4), // 004-007 lote
    num(DETAIL_RECORD_TYPE, 1), // 008     tipo de registro (detalhe)
    num(input.recordNumber, 5), // 009-013 nº do registro no lote
    text('J', 1), // 014     segmento
    num(MOVEMENT_INCLUSION, 1), // 015     tipo de movimento (G060)
    num(MOVEMENT_INSTRUCTION_BLOCKED, 2), // 016-017 instrução (G061) — entra BLOQUEADO, como o A
    num(input.barcode, 44), // 018-061 código de barras
    text(input.beneficiaryName, 30), // 062-091 nome do cedente (quem recebe)
    dateDDMMYYYY(input.dueDate), // 092-099 vencimento do título
    cents(input.titleValueCents, 15), // 100-114 valor do título (13 + 2)
    cents(input.discountCents ?? 0, 15), // 115-129 desconto + abatimento
    cents(input.surchargeCents ?? 0, 15), // 130-144 mora + multa
    dateDDMMYYYY(input.paymentDate), // 145-152 data do pagamento
    cents(input.paymentValueCents, 15), // 153-167 valor do pagamento
    num(0, 15), // 168-182 quantidade da moeda (10 + 5)
    text(input.yourNumber ?? '', 20), // 183-202 referência do sacado
    blanks(20), // 203-222 nosso número — o banco preenche no retorno
    num(CURRENCY_REAL, 2), // 223-224 código da moeda
    blanks(6), // 225-230 CNAB
    blanks(10), // 231-240 ocorrências — preenchidas no retorno
  ]);
};

// ─── Segmento J-52 — identificação do Sacado, do Cedente e do Sacador Avalista ────────────────
//
// Fonte primária: `jun-19-layout-multipag.pdf` p. 33 (local-only), campos 01.4.J52 a 18.4.J52.
// Cabeçalho da página, literal: *"Obrigatório para pagamentos de títulos de Cobrança independente
// do valor com transferência para o Cedente"*. O emissor gravava o J e não gravava este registro —
// arquivo bem-formado, trailer batendo, divergindo do modelo do banco em silêncio (#891).
//
// ⚠️ EXISTEM DOIS SEGMENTOS J-52 NO MANUAL, e eles divergem a partir da posição 132. Este é o de
// COBRANÇA (p. 33), que fecha em Sacador Avalista. O da seção de PIX (p. 42) usa as mesmas posições
// até 131 e depois gasta 132-210 na chave de endereçamento (`G102`) e 211-240 no TXID do QR-Code —
// é da forma `47`, fora do escopo por decisão da P.O. Implementar um por analogia ao outro grava
// nome de pessoa onde o banco lê chave Pix. É a mesma classe de erro que já propagou segmento de
// COBRANÇA para dentro de PAGAMENTO neste repositório.
//
// ⚠️ "CEDENTE" AQUI É O BENEFICIÁRIO, E NÃO O DONO DO ARQUIVO. O vocabulário colide de frente com o
// desta base: `CedenteHeaderData` é a EMPRESA QUE PAGA, e no J-52 a empresa que paga é o **Sacado**.
// No vocabulário de cobrança, cedente é quem emitiu o título e recebe — a mesma pessoa que o
// Segmento J já nomeia em 062-091. O manual desfaz a dúvida na própria página, ao chamar o terceiro
// bloco de "Sacador - Dados sobre o cedente responsável pela emissão do título original".
export type BilletParty = Readonly<{
  documentType: '1' | '2'; // *G005 — 1 = CPF, 2 = CNPJ
  document: string; // *G006
  name: string; // G013
}>;

export type SegmentJ52Input = Readonly<{
  bankCode: string; // banco do dono do arquivo (posições 001-003)
  batchNumber: number;
  recordNumber: number;
  // SACADO (020-075): quem PAGA o título — a própria empresa que emite a remessa.
  payer: BilletParty;
  // CEDENTE (076-131): quem EMITIU o título e recebe. O nome tem de ser o mesmo que o Segmento J
  // grava em 062-091 — são o mesmo campo `G013`, do mesmo participante, no mesmo pagamento.
  beneficiary: BilletParty;
  // O SACADOR AVALISTA (132-187) não entra: ver `SACADOR_AVALISTA_ABSENT` abaixo.
}>;

const J52_OPTIONAL_RECORD_ID = '52'; // G067, colunas 018-019 — default '52' no layout

// C004, colunas 016-017 — "Código de Movimento Remessa", e este campo é uma ARMADILHA nos dois
// sentidos. Vale `00` porque é o que o golden do banco grava
// (`GOLDEN_TEST_MULTIPAG_TED_TRANSFERENCIA_BOLETO`, lote 3, forma `31`), e o golden é norma sobre a
// forma.
//
// ⚠️ NÃO é o `G061` do Segmento J, apesar de ocupar as MESMAS colunas 016-017 daquele registro. São
// campos distintos de dicionários distintos, e o domínio do C004 (p. 118) torna a confusão cara:
//
//   · `09` — o valor que o J grava em 016-017, "Inclusão do Registro Detalhe Bloqueado" (#805) —
//     no domínio do C004 significa **'09' = Protestar**. Propagar a instrução do J para cá por
//     analogia produz arquivo bem-formado mandando PROTESTAR o título que se está pagando.
//   · `01` — "Entrada de Títulos", o default que o manual dá ao homônimo `07.3Y` de outra seção —
//     é movimento de quem EMITE cobrança, não de quem a paga.
//
// E `00` não consta do domínio, que começa em `01`: a lacuna é do manual, e é coerente com o campo
// ser inerte aqui. C004 é vocabulário de COBRANÇA; num arquivo de PAGAMENTO não há movimento de
// cobrança algum a declarar, e o banco escreve zeros no próprio arquivo-modelo. A hierarquia da
// skill resolve — golden (nível 2) vence tabela de layout (nível 4) —, e a divergência fica
// registrada aqui em vez de ser "corrigida" para um código do domínio errado.
const J52_MOVEMENT_CODE = '00';

// G013 — os TRÊS blocos de nome do registro têm a mesma largura, e a constante é uma só de propósito:
// a guarda abaixo mede exatamente o campo que vai ser escrito, e as duas não podem divergir.
const J52_NAME_WIDTH = 40;

// "Identifica" é medido no que VAI PARA O ARQUIVO, não no que chegou — e a diferença é a lição da
// #862. `alpha()` transforma em BRANCO todo caractere sem transliteração legível, então `'€€€'` é
// uma string não-vazia que produz 40 posições em branco. Um `name.trim() !== ''` sobre o valor cru
// aprovaria esse caso e emitiria o registro anônimo que esta guarda existe para impedir.
//
// A inscrição não entra: `digits()` já a recusa vazia, com erro próprio.
const identifies = (party: BilletParty): boolean => alpha(party.name, J52_NAME_WIDTH).trim() !== '';

// O Sacador Avalista (132-187) é o terceiro responsável pelo título original, e o emissor não o
// modela: `RemittanceBilletPayment` conhece o código de barras e quem recebe, e nada mais. Ausente,
// o bloco sai ZERADO no que é `Num` e BRANCO no que é `Alfa` — exatamente como o golden o grava.
//
// ⚠️ A assimetria zero/branco é do FORMATO, não do preenchimento, e o reflexo natural — deixar o
// bloco inteiro em brancos, "porque não tem ninguém ali" — diverge do golden em 16 posições. O
// manual corrobora pelos asteriscos: `*G005`/`*G006` (Num) do sacador levam asterisco de
// obrigatoriedade e saem zerados; `G013` (Alfa) não leva, e sai branco.
const SACADOR_AVALISTA_ABSENT: readonly Result<string, CnabSegmentError>[] = [
  num(0, 1), // 132     tipo de inscrição
  num(0, 15), // 133-147 número de inscrição
  blanks(J52_NAME_WIDTH), // 148-187 nome
];

export const segmentJ52 = (input: SegmentJ52Input): Result<string, CnabSegmentError> => {
  // A guarda de identificação — CA3 da #891, e é DEFESA EM PROFUNDIDADE por decisão do dono
  // (01/09/2026), não porque o caminho esteja aberto.
  //
  // O reader já recusa o título cujo favorecido não resolve, e recusa ANTES de o NSA ser alocado —
  // é lá que o defeito é barrado na prática. Esta guarda existe contra o CHAMADOR NOVO, e a razão é
  // um precedente concreto deste arquivo: `address?: PayeeAddress` fez as duas metades concordarem
  // sobre um arquivo incompleto — o adapter compilava perfeitamente sem o dado que o layout exige, e
  // o `?? ''` virou branco em 100% das remessas (#858). Um montador que aceita input inválido e
  // emite brancos em silêncio é a mesma porta, num registro novo.
  //
  // ⚠️ Consequência de aceitar a redundância: este caminho é INALCANÇÁVEL pela rota completa. Só é
  // coberto por teste que chame `segmentJ52` na unha — e sem esse teste, é código morto que o gate
  // não acusa. Ele existe em `multipag-segment-j52.test.ts`.
  //
  // Guarda o NOME, e só ele, porque a INSCRIÇÃO já falha sozinha: `digits()` recusa string vazia com
  // `numeric-field-invalid`, e recusa também a que não sobra dígito nenhum. Repetir a checagem aqui
  // nomearia uma distinção que não existe do lado de quem recebe.
  if (!identifies(input.payer) || !identifies(input.beneficiary))
    return err('billet-party-unidentified');

  return joinFields([
    num(input.bankCode, 3), // 001-003 banco (G001)
    num(input.batchNumber, 4), // 004-007 lote (*G002)
    num(DETAIL_RECORD_TYPE, 1), // 008     tipo de registro (*G003)
    num(input.recordNumber, 5), // 009-013 nº do registro no lote (*G038)
    text('J', 1), // 014     segmento (*G039) — o J-52 TAMBÉM é 'J'
    // 015 — G004, "Uso Exclusivo FEBRABAN/CNAB", default Brancos no layout. ⚠️ NÃO é o G060 do
    // Segmento J, que ocupa esta mesma coluna e vale `0`: aqui o campo é Alfa e o golden o grava
    // em branco. Repetir o `0` do J por simetria visual é escrever num campo que não existe.
    blanks(1), // 015     CNAB
    num(J52_MOVEMENT_CODE, 2), // 016-017 código de movimento remessa (*C004)
    num(J52_OPTIONAL_RECORD_ID, 2), // 018-019 identificação do registro opcional (G067)
    num(input.payer.documentType, 1), // 020     SACADO — tipo de inscrição (*G005)
    digits(input.payer.document, 15), // 021-035 SACADO — nº de inscrição (*G006)
    text(input.payer.name, J52_NAME_WIDTH), // 036-075 SACADO — nome (G013)
    num(input.beneficiary.documentType, 1), // 076     CEDENTE — tipo de inscrição (*G005)
    digits(input.beneficiary.document, 15), // 077-091 CEDENTE — nº de inscrição (*G006)
    text(input.beneficiary.name, J52_NAME_WIDTH), // 092-131 CEDENTE — nome (G013)
    ...SACADOR_AVALISTA_ABSENT, // 132-187 SACADOR AVALISTA — ausente
    blanks(53), // 188-240 CNAB (G004)
  ]);
};

// O par que representa UM pagamento. O Segmento B é obrigatório no Multipag: emitir só o A produz
// arquivo recusado, e foi exatamente o que a transcrição da knowledge base induzia ao marcá-lo como
// opcional. Manter a numeração sequencial aqui evita que o chamador a calcule errado.
export const paymentRecords = (
  input: PaymentRecordsInput,
): Result<readonly string[], CnabSegmentError> => {
  const a = segmentA({
    bankCode: input.bankCode,
    batchNumber: input.batchNumber,
    recordNumber: input.firstRecordNumber,
    payee: input.payee,
    paymentDate: input.paymentDate,
    valueCents: input.valueCents,
    complementPurpose: input.complementPurpose,
    clearingHouse: input.clearingHouse,
    yourNumber: input.yourNumber,
    tedPurpose: input.tedPurpose,
    ...(input.message !== undefined ? { message: input.message } : {}),
  });
  if (!a.ok) return a;

  // ⚠️ AQUI MORA UMA AFIRMAÇÃO SOBRE O NEGÓCIO, não uma consequência técnica — e ela tem efeito
  // visível: o Segmento B 128-135 sai IDÊNTICO ao Segmento A 094-101, e o B 136-150 idêntico ao A
  // 120-134. Quem ler os dois pares vai achar que é bug. Não é, e o layout separa os dois POR
  // DESENHO: se fossem a mesma coisa, os campos do B não existiriam.
  //
  // O QUE A SUSTENTA, hoje: a remessa é gerada POR VENCIMENTO (decisão da P.O., #711); o reader
  // colapsa vencimento e data de pagamento numa variável só de propósito, para o arquivo citar a
  // mesma data que o operador vê na tela (`remittance-payment-reader.drizzle.ts`, #270); e
  // `RemittanceTransferPayment` não modela desconto, abatimento nem mora. Paga-se o valor do
  // título, no dia do vencimento — logo nominal e pago coincidem.
  //
  // O QUE A DERRUBA: pagamento fora do vencimento (antecipação ou atraso), ou título com desconto
  // ou mora. Nesse dia 094-101 e 128-135 divergem, e manter o repasse faz o arquivo declarar como
  // vencimento uma data que não é a do título. ⚠️ O banco ACEITA esse arquivo — o defeito não seria
  // recusado como este foi, seria pago em silêncio com o título constando errado.
  //
  // O caminho para lá já está aberto: `SegmentBInput` declara os campos SEPARADOS, então basta
  // `PaymentRecordsInput` passar a carregá-los e o port `RemittanceTransferPayment` ganhar
  // `dueDate` — que `RemittanceBilletPayment` já tem. É a opção (B) da #812, deixada de fora do
  // escopo por escolha, não por descuido.
  const b = segmentB({
    bankCode: input.bankCode,
    batchNumber: input.batchNumber,
    recordNumber: input.firstRecordNumber + 1,
    payee: input.payee,
    dueDate: input.paymentDate,
    titleValueCents: input.valueCents,
    ...(input.address !== undefined ? { address: input.address } : {}),
  });
  if (!b.ok) return b;

  return ok([a.value, b.value]);
};
