// Nome do arquivo de remessa da VAN Bradesco.
//
// ⚠️ ESTE MÓDULO É PROVISÓRIO, E ISSO É DELIBERADO. O padrão definitivo depende de confirmação do
// banco: é pelo NOME que o Bradesco identifica o tipo do arquivo e a fila de destino, e a pergunta
// está em aberto com o gerente da conta (ADR-0061 §"O que continua em aberto").
//
// A incerteza vive aqui, e só aqui. O montador, o storage e o use case recebem o nome pronto — de
// forma que confirmar o padrão custe a troca de UM arquivo, não uma revisão do fluxo. Foi essa a
// razão de isolar em vez de esperar.
//
// O padrão adotado espelha a forma dos arquivos que o banco JÁ nos envia por este mesmo perfil
// (`PAG_<convenio>.<DDMMAAAAHHMMSS>_<sequencial>.RET`), trocando a extensão. Espelhar o que o banco
// emite é o palpite mais defensável enquanto não há resposta — mas segue sendo palpite.
//
// ⚠️ Divergência conhecida com a amostra: o sequencial dos arquivos recebidos tem QUATRO dígitos
// (`_0001`), e aqui usamos SEIS, para caber o NSA inteiro (o campo do header tem seis — ver o VO
// `Nsa`). Não sabemos se aquele `_0001` é sequência de arquivo do dia ou o próprio NSA. É ponto de
// confirmação junto com o resto da nomenclatura.
import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { MAX as NSA_MAX, MIN as NSA_MIN } from '../../domain/cedente/nsa.ts';

// Do perfil configurado na instância (não os 26 do erro 1101, que só valem sem nome longo).
export const MAX_FILE_NAME_LENGTH = 128;

export const REMITTANCE_EXTENSION = '.REM';

const PREFIX = 'PAG_';
const NSA_WIDTH = 6;

// Erro 1102 do STCPCLT rejeita espaço e caractere inválido no nome. O gerador nunca produz um, mas
// a checagem final existe porque um convênio inesperado não pode virar arquivo recusado no banco.
const SAFE_NAME = /^[A-Z0-9._]+$/;
const DIGITS_ONLY = /^\d+$/;

export type RemittanceFileNameError =
  | 'file-name-convenio-invalid'
  | 'file-name-nsa-out-of-range'
  | 'file-name-too-long'
  | 'file-name-unsafe-characters';

export type RemittanceFileNameInput = Readonly<{
  convenio: string;
  nsa: number;
  generatedAt: Date;
}>;

const two = (value: number): string => String(value).padStart(2, '0');

// DDMMAAAAHHMMSS, em UTC — mesma escolha do conteúdo do arquivo: a geração é de máquina, e um
// arquivo gerado 21h em Fortaleza não deve mudar de data conforme quem roda.
const stamp = (at: Date): string =>
  `${two(at.getUTCDate())}${two(at.getUTCMonth() + 1)}${String(at.getUTCFullYear())}` +
  `${two(at.getUTCHours())}${two(at.getUTCMinutes())}${two(at.getUTCSeconds())}`;

export const buildRemittanceFileName = (
  input: RemittanceFileNameInput,
): Result<string, RemittanceFileNameError> => {
  if (!DIGITS_ONLY.test(input.convenio)) return err('file-name-convenio-invalid');

  if (!Number.isInteger(input.nsa) || input.nsa < NSA_MIN || input.nsa > NSA_MAX) {
    return err('file-name-nsa-out-of-range');
  }

  const name =
    `${PREFIX}${input.convenio}.${stamp(input.generatedAt)}` +
    `_${String(input.nsa).padStart(NSA_WIDTH, '0')}${REMITTANCE_EXTENSION}`;

  if (name.length > MAX_FILE_NAME_LENGTH) return err('file-name-too-long');
  if (!SAFE_NAME.test(name)) return err('file-name-unsafe-characters');

  return ok(name);
};
