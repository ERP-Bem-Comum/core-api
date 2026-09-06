import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isCnabEmittableInscription, normalizeInscription } from '../payout/inscription.ts';

// A conta-cedente está apta a GERAR remessa? (#722)
//
// O convênio é OPCIONAL no cadastro e OBRIGATÓRIO na remessa, e essa assimetria não é descuido: a
// conta serve à conciliação bancária sem ele. Mas é do convênio que sai o nome do arquivo, e é pelo
// nome que o banco identifica o tipo e a fila de destino.
//
// Sem esta verificação, a falha acontece três camadas adiante — no montador do nome — e chega ao
// operador como 503 genérico. Ele não descobre que falta um campo, nem em qual tela preenchê-lo, e
// abre chamado para um dado que preencheria sozinho.
//
// ⚠️ Onde ela é chamada importa tanto quanto o que ela verifica: **antes de alocar o NSA**. O número
// não volta depois de consumido, então validar depois queimaria um da sequência a cada tentativa
// frustrada — e a sequência é o que o banco usa para detectar retransmissão.
//
// Isto NÃO substitui a validação do montador do nome (`remittance-file-name.ts`), que segue como
// última barreira. São camadas com propósitos distintos: aqui, dizer ao operador o que corrigir;
// lá, impedir que um nome inválido chegue ao banco. É a mesma dupla verificação que o ADR-0027
// declara intencional na borda HTTP.
//
// ⚠️ A #856 acrescentou a AGÊNCIA, e ela quebra a simetria acima: o convênio ausente tem uma última
// barreira adiante — o montador do nome —, a agência corrompida NÃO TEM NENHUMA. Aqui é a única
// barreira entre uma agência digitada com o DV junto e um arquivo que credita outra agência.

export type CedenteConvenioGap =
  | 'cedente-convenio-missing'
  | 'cedente-convenio-malformed'
  // #804. Terceiro desfecho, e a ação do operador é de novo outra: não falta o convênio nem ele
  // está ilegível — ele está LONGO, e quem o corrige precisa conferir junto ao banco o que foi
  // efetivamente contratado. Achatá-lo em `malformed` mandaria arrumar o formato de um número que
  // está bem formado.
  | 'cedente-convenio-too-long';

// #856 · #859. A AGÊNCIA é o segundo campo do cedente que o arquivo lê da conta, e o único cuja
// falha é SILENCIOSA: o convênio ausente estoura no montador do nome, a agência corrompida não
// estoura em lugar nenhum. Ver a constante `AGENCY_WIDTH` abaixo para o mecanismo.
export type CedenteAgencyGap =
  | 'cedente-agency-missing'
  | 'cedente-agency-malformed'
  // O DV, quando existe, tem de caber na 058 — UMA posição, e do alfabeto do manual. Desfecho
  // separado porque o campo que o operador corrige é OUTRO: um é o número, outro é o dígito, e são
  // duas caixas distintas na tela.
  | 'cedente-agency-digit-malformed';

// #856 CA3. A INSCRIÇÃO do cedente — 019-032, `G006`. Os dois desfechos terminam em ações opostas, e
// é por isso que não se juntam: o ausente o operador preenche no cadastro; o alfanumérico ninguém
// preenche, porque o dado está CERTO — quem não acompanhou foi o layout do banco, e a saída é
// escalar. Achatá-los mandaria o operador procurar no cadastro um defeito que não existe lá.
export type CedenteInscriptionGap =
  | 'cedente-inscription-missing'
  | 'cedente-inscription-alphanumeric';

export type CedenteRemittanceGap = CedenteConvenioGap | CedenteAgencyGap | CedenteInscriptionGap;

// O convênio identifica o contrato de prestação de serviço junto ao banco e é numérico. Ausente e
// malformado são desfechos separados porque a ação do operador difere: um pede preenchimento, o
// outro pede correção do que já está lá — a mesma distinção que `PayoutGapReason` faz no payout.
const NUMERIC_ONLY = /^\d+$/;

// O Validador Universal lê o convênio apenas nas posições 033-038 do header, e exige 039-052 em
// branco. Acima de 6 dígitos o banco NÃO recusa o arquivo: ele descarta o excedente e processa a
// remessa sob o convênio truncado — outro contrato, sem nada no retorno indicando a troca.
//
// ⚠️ O layout declara o campo com 20 posições (p. 15, campo 07.0/G007), e o emissor era aderente a
// ele. Esta constante não contradiz o manual: ela registra a regra de PREENCHIMENTO que o validador
// impõe e o manual não escreve. Layout e validador divergem, e é o validador quem paga.
const CONVENIO_MAX_LENGTH = 6;

// ⚠️ SEPARADA DA READINESS COMPLETA, e a separação não é organização de código (#856). A edição de
// conta-cedente pergunta "o convênio que está lá serve?" para decidir se aceita TROCÁ-LO (#722), e
// perguntava isso chamando a readiness inteira. Enquanto a readiness só olhava o convênio, as duas
// perguntas coincidiam; com a agência dentro dela, uma conta de agência malformada passaria a
// responder "convênio não serve" — e destravaria a troca de um convênio que está perfeito.
//
// A regra é a de sempre: quem pergunta uma coisa chama a função daquela coisa.
export const checkCedenteConvenio = (
  account: Readonly<{ convenio: string }>,
): Result<void, CedenteConvenioGap> => {
  // Espaço em volta não é erro do operador: o cadastro aceita e o dado continua legível.
  const convenio = account.convenio.trim();

  if (convenio === '') return err('cedente-convenio-missing');
  if (!NUMERIC_ONLY.test(convenio)) return err('cedente-convenio-malformed');
  if (convenio.length > CONVENIO_MAX_LENGTH) return err('cedente-convenio-too-long');

  return ok(undefined);
};

// As posições 053-057 do header, e são SÓ a agência — o DV mora na 058, em campo próprio.
//
// ⚠️ ESTE É O CAMPO QUE FALHA SEM FAZER BARULHO, e por isso a recusa existe (#856, herdada da #859).
// O emissor escreve `digits(agency, 5)`, e `digits()` faz `replace(/\D/g,'')` ANTES do pad:
//
//     digits('1487-2', 5)  →  num('14872', 5)  →  '14872'
//
// O banco espera `01487` ali. O resultado tem cinco dígitos, cabe no campo, não estoura o
// `numeric-field-overflow`, atravessa o `remittance-inspector` — que valida forma, e a forma está
// perfeita — e vai ao banco em TODA remessa daquela conta apontando outra agência. É a mesma classe
// do convênio truncado da #804: o banco não recusa, processa sob identidade errada.
//
// Recusar é a única saída que não inventa dado. Separar o DV por conta própria seria adivinhar qual
// metade é a agência (`12345` é `1234`+`5` ou `12345` sem DV?), e a #708 já estabeleceu que essa
// ambiguidade não se resolve por palpite — resolve-se com campo próprio, que é o `agencyDigit`.
const AGENCY_WIDTH = 5;

// O DV cabe em UMA posição (058), e o alfabeto é o que `payee-account.ts` documenta contra o manual:
// dígito, `X` onde o módulo 11 dá resto 10, e `P` no Bradesco quando o resto é 1 — "o dígito poderá
// ser igual a zero ou 'P'" (Manual de Procedimentos 4008-523-0096 v16, p. 30).
//
// ⚠️ A RECUSA EXISTE PORQUE `alpha()` NÃO RECUSA: ele faz `.slice(0, size)`, então um DV de dois
// caracteres é gravado pela metade e um `-2` grava um `-` literal na 058 — as duas coisas em
// silêncio, num campo de identificação bancária. A borda barra o comprimento (`schemas.ts`); esta é
// a régua para quem NÃO passa por ela: o ETL e a linha re-hidratada, que não vê construtor.
const AGENCY_CHECK_DIGIT_RE = /^[0-9XP]$/;

export const checkCedenteAgency = (
  account: Readonly<{ agency: string; agencyDigit?: string }>,
): Result<void, CedenteAgencyGap> => {
  const agency = account.agency.trim();

  if (agency === '') return err('cedente-agency-missing');
  // Não-numérico é, na prática, agência com separador — o caso que o front descreve na #859, em que
  // o operador digita a agência com o dígito e os dois acabam no mesmo campo.
  if (!NUMERIC_ONLY.test(agency)) return err('cedente-agency-malformed');
  // Estouro tem o mesmo desfecho de propósito: `num()` já o recusaria no montador, mas lá o NSA já
  // foi queimado. Aqui é antes, e a ação do operador — conferir a agência no cadastro — é a mesma.
  if (agency.length > AGENCY_WIDTH) return err('cedente-agency-malformed');

  // O DV vem DEPOIS do número, e a ordem é a que o operador precisa: sem agência não há dígito de
  // que falar, e reportar o acessório antes do principal manda corrigir a caixa errada.
  //
  // Ausente é legítimo — a agência pode não ter DV, e a 058 sai em branco (layout p. 14). Só o que
  // ESTÁ lá é conferido.
  const agencyDigit = account.agencyDigit?.trim() ?? '';
  if (agencyDigit !== '' && !AGENCY_CHECK_DIGIT_RE.test(agencyDigit.toUpperCase())) {
    return err('cedente-agency-digit-malformed');
  }

  return ok(undefined);
};

// A inscrição do cedente — 019-032, `G006` (#856, CA3).
//
// ⚠️ A RECUSA VIVE AQUI, e não só no emissor, pela ordem: o emissor monta DEPOIS do `allocateNsa`, e
// o número não volta. Sem esta barreira, um cedente de CNPJ alfanumérico queimaria um da sequência a
// cada tentativa — e chegaria ao operador como falha de montagem, sem apontar campo nenhum.
export const checkCedenteInscription = (
  account: Readonly<{ document: string }>,
): Result<void, CedenteInscriptionGap> => {
  // ⚠️ A pergunta é `hasInscription`, não `trim() === ''`, e a diferença não é preciosismo: `'---'`,
  // `'.'` e `'./-'` sobrevivem ao `trim()` e normalizam para vazio. Perguntando pelo trim, eles
  // seriam vistos como inscrição PRESENTE e — não sendo numéricos — classificados como
  // "alfanumérica", mandando escalar ao banco um cadastro que só está incompleto.
  if (normalizeInscription(account.document) === '') return err('cedente-inscription-missing');
  if (!isCnabEmittableInscription(account.document)) {
    return err('cedente-inscription-alphanumeric');
  }

  return ok(undefined);
};

export const checkCedenteRemittanceReadiness = (
  account: Readonly<{ convenio: string; agency: string; document: string }>,
): Result<void, CedenteRemittanceGap> => {
  const convenio = checkCedenteConvenio(account);
  if (!convenio.ok) return convenio;

  const agency = checkCedenteAgency(account);
  if (!agency.ok) return agency;

  return checkCedenteInscription(account);
};
