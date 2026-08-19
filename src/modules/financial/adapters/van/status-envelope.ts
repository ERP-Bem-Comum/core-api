// Leitura do prefixo `status/` da VAN — o único canal pelo qual o backend sabe o que aconteceu
// com uma remessa depois que ela foi depositada no bucket (ADR-0060).
//
// Contrato acordado com a infra em 2026-08-10 (comentário 81 do chamado): o agente que roda na
// instância Windows publica, por execução, um envelope JSON com o veredito dele mais as linhas
// cruas do log de transferência do STCPCLT.
//
// Três coisas do contrato que NÃO são detalhe de implementação:
//
//   1. A chave do DUPLICADO é distinta de propósito. Se sobrescrevesse o status original, uma
//      remessa já transmitida passaria a constar como não transmitida — a conclusão oposta.
//   2. A AUSÊNCIA de um objeto `recepcao-*` significa "o agente rodou e não havia nada a receber",
//      não "o agente não rodou". Ele roda a cada 5 minutos; publicar sempre geraria centenas de
//      objetos vazios por dia. Quem consumir não pode ler silêncio como falha.
//   3. O veredito do agente vem de EVIDÊNCIA FÍSICA — o arquivo sair da pasta de saída e aparecer
//      em BACKUP —, que é mais forte que código de retorno. Por isso `situacao` manda, não `exitCode`.
//
// Latência esperada: até 5 minutos para a execução começar, mais o tempo da transmissão.
import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  VanReceptionProvenance,
  VanStatus,
  VanStatusError,
  VanStatusKind,
  VanStatusReader,
  VanStatusSituation,
} from '../../application/ports/van-status-reader.ts';

// Os tipos vivem no port (a seta aponta para dentro). Reexportados aqui porque este arquivo é o
// lugar onde o contrato do agente está DOCUMENTADO — quem abre o parser encontra o vocabulário.
//
// Detalhes do contrato que o tipo sozinho não carrega:
//   - `exitCode` é `null` quando o STCPCLT NÃO chegou a ser executado — é o que o agente publica no
//     caso de duplicidade, e é semanticamente correto: sem execução, não existe código de saída.
//     Trocar por `0` seria pior, porque `0` significa "executou e deu certo". O agente também pode
//     publicar `null` por um gotcha do PowerShell 5.1 (`Start-Process -PassThru` sem handle cacheado).
//   - `logLines` fica CRU de propósito. O log de transferência é posicional (manual §12), mas a
//     amostra que temos veio truncada — decodificar offsets a partir de exemplo incompleto é o erro
//     que este projeto já pagou caro duas vezes. Decodificação vira fatia própria quando houver
//     amostra real e íntegra.
export type {
  VanReceptionProvenance,
  VanStatus,
  VanStatusError,
  VanStatusKind,
  VanStatusSituation,
};

const SITUATIONS: readonly VanStatusSituation[] = ['transmitido', 'falha', 'revisao', 'recepcao'];

const STATUS_PREFIX = 'status/';
const RECEPTION_PREFIX = 'recepcao-';
const DUPLICATE_MARKER = '.duplicado-';

export const classifyKey = (key: string): Result<VanStatusKind, VanStatusError> => {
  if (!key.startsWith(STATUS_PREFIX) || !key.endsWith('.json')) {
    return err('van-status-unknown-key');
  }

  const name = key.slice(STATUS_PREFIX.length);
  if (name.startsWith(RECEPTION_PREFIX)) return ok('reception');
  // Antes do caso normal: a chave do duplicado também termina em `.json`.
  if (name.includes(DUPLICATE_MARKER)) return ok('duplicate');
  return ok('remittance');
};

const isSituation = (value: unknown): value is VanStatusSituation =>
  typeof value === 'string' && SITUATIONS.includes(value as VanStatusSituation);

// O agente grava UTF-8 sem BOM para permitir `JSON.parse` direto. Tolerar o BOM mesmo assim é
// barato: se algo no caminho reencodar o arquivo, falhar a leitura do status deixaria a remessa em
// estado desconhecido por um caractere invisível.
const stripBom = (raw: string): string => (raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

// Borda de adapter: `JSON.parse` lança, e converter exceção em `Result` aqui é exatamente o que a
// rule de adapters permite — e o que impede a exceção de subir para application.
const parseJson = (raw: string): Result<Record<string, unknown>, VanStatusError> => {
  try {
    const parsed: unknown = JSON.parse(stripBom(raw));
    return typeof parsed === 'object' && parsed !== null
      ? ok(parsed as Record<string, unknown>)
      : err('van-status-invalid-json');
  } catch {
    return err('van-status-invalid-json');
  }
};

/**
 * Proveniência da recepção (`recepcao`), quando o envelope a traz.
 *
 * Devolve `undefined` — e não erro — em duas situações que são a mesma coisa para quem consome:
 * o envelope não é de recepção, ou é de uma versão do agente anterior ao PR #12. Nos dois casos
 * **não há proveniência**, e a #753 já sabe o que fazer com isso: quarentena, não processamento.
 *
 * ⚠️ Campo pela metade é DESCARTADO, não aproveitado. Um `sha256` ausente com `chave` presente
 * passaria na conferência de integridade do CA4 por vacuidade — e integridade presumida é
 * exatamente o que aquele critério existe para impedir.
 */
const parseReception = (raw: unknown): VanReceptionProvenance | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  const sha256 = r['sha256'];
  const key = r['chave'];
  const correlated = r['correlacionado'];
  const cycleLogRead = r['logDoCicloLido'];

  if (
    typeof sha256 !== 'string' ||
    sha256 === '' ||
    typeof key !== 'string' ||
    key === '' ||
    typeof correlated !== 'boolean' ||
    typeof cycleLogRead !== 'boolean'
  ) {
    return undefined;
  }

  const duplicate = r['duplicado'];
  const duplicateOf = r['duplicadoDe'];

  return {
    sha256,
    key,
    correlated,
    cycleLogRead,
    // `omitempty` do lado do produtor: ausente significa `false`/vazio, e reproduzir a ausência aqui
    // mantém a assimetria visível para quem inspeciona o objeto.
    ...(typeof duplicate === 'boolean' ? { duplicate } : {}),
    ...(typeof duplicateOf === 'string' && duplicateOf !== '' ? { duplicateOf } : {}),
  };
};

export const parseStatus = (key: string, content: string): Result<VanStatus, VanStatusError> => {
  const kind = classifyKey(key);
  if (!kind.ok) return kind;

  const json = parseJson(content);
  if (!json.ok) return json;
  const body = json.value;

  const fileName = body['arquivo'];
  const executedAt = body['executadoEm'];
  const detail = body['detalhe'];
  const exitCode = body['exitCode'];
  const logLines = body['logTransferencia'];

  // `exitCode` aceita null (ver o tipo). Exigir número aqui rejeitava TODO status de duplicado —
  // justamente o caso que não pode ser mal lido, porque marcar como transmitida uma remessa que não
  // saiu, ou o contrário, muda o que o operador faz.
  if (
    typeof fileName !== 'string' ||
    typeof executedAt !== 'string' ||
    typeof detail !== 'string' ||
    (typeof exitCode !== 'number' && exitCode !== null) ||
    !Array.isArray(logLines)
  ) {
    return err('van-status-missing-field');
  }

  // Situação desconhecida é erro, nunca "trata como falha": um valor novo que o agente passe a
  // publicar precisa de decisão nossa, e silenciá-lo aqui esconderia a mudança de contrato.
  if (!isSituation(body['situacao'])) return err('van-status-unknown-situation');

  // `codigoStcp` (vindo do clcp.err.txt) é declarado pela infra como diagnóstico auxiliar, FORA do
  // contrato — por isso não entra no tipo. Depender dele acoplaria o backend a algo que a própria
  // infra disse que pode sumir.
  const reception = parseReception(body['recepcao']);

  return ok({
    kind: kind.value,
    fileName,
    executedAt,
    situation: body['situacao'],
    detail,
    exitCode,
    // Só entra quando o envelope traz o objeto BEM FORMADO. Proveniência pela metade é pior que
    // ausente: a #753 decide o que processar a partir dela, e um `sha256` vazio aprovaria a
    // conferência de integridade em vez de reprová-la.
    ...(reception !== undefined ? { reception } : {}),
    // Elemento não-string no log é descartado em vez de falhar a leitura — e a assimetria com
    // `situacao` é deliberada: log é DIAGNÓSTICO, `situacao` é DECISÃO. Recusar o envelope por uma
    // linha estranha deixaria a remessa em estado desconhecido por causa de um campo que não decide
    // nada.
    logLines: logLines.filter((l): l is string => typeof l === 'string'),
  });
};

// A ÚNICA leitura que autoriza dar uma remessa por transmitida.
//
// `duplicate` não conta mesmo declarando `transmitido`: significa que o agente reconheceu o nome e
// NÃO acionou o STCPCLT — nada saiu nesta execução. Contar como envio marcaria como transmitida uma
// remessa que não foi, e o efeito prático seria deixar de reenviar algo que o banco nunca recebeu.
export const wasTransmitted = (status: VanStatus): boolean =>
  status.kind === 'remittance' && status.situation === 'transmitido';

// O envelope como PORT — é isto que o use case de confirmação recebe injetado. As funções acima
// seguem exportadas porque são puras e testadas diretamente; a factory apenas as apresenta sob a
// assinatura que a application conhece.
export const createVanStatusEnvelopeReader = (): VanStatusReader => ({
  parse: parseStatus,
  wasTransmitted,
});
