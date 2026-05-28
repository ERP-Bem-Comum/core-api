/**
 * Formatter de erros da CLI do módulo Financial.
 *
 * Dicionário PT-BR mínimo cobrindo os erros gerados pelo scaffold:
 *   - `cli-driver-*` (parser de flags globais)
 *   - `cli-flag-*` (helper genérico parse-flags)
 *   - `state-*` (state file + lock)
 *   - `cli-driver-not-supported-yet` (buildContext rejeita `--driver mysql`
 *     até `FIN-ADAPTER-DRIZZLE-PAYABLE` entregar o adapter Drizzle).
 *
 * Pattern espelha `src/modules/contracts/cli/formatters/error.ts` (versão
 * enxuta — sem erros de domínio do Payable; esses entrarão com
 * `FIN-CLI-APROVAR-TITULO`).
 */

const ERROR_DICTIONARY: Readonly<Record<string, string>> = {
  // ─── Driver flag parsing ──────────────────────────────────────────────────
  'cli-driver-unknown': 'Driver desconhecido. Use: memory ou mysql.',
  'cli-driver-flag-conflict':
    'Flags incompatíveis. Regras: --state e --no-state só valem com --driver memory. Quando --driver mysql for habilitado (ver FIN-ADAPTER-DRIZZLE-PAYABLE), --connection-string ficará exclusivo a ele.',
  'cli-driver-missing-value':
    'Flag requer valor (ex.: --driver memory, --state ./fin-cli-state.json).',
  'cli-driver-not-supported-yet':
    'Driver mysql ainda não está disponível para o módulo Financial. Será adicionado quando o adapter Drizzle do PayableRepository existir (ver ticket FIN-ADAPTER-DRIZZLE-PAYABLE). Use --driver memory por enquanto.',

  // ─── Flag genérica (parse-flags helpers) ──────────────────────────────────
  'cli-flag-duplicated': 'Flag duplicada — esta flag foi informada mais de uma vez.',
  'cli-flag-unknown': 'Flag desconhecida.',

  // ─── State file + lock ────────────────────────────────────────────────────
  'state-file-not-readable':
    'Não foi possível ler o arquivo de estado (verifique permissões ou se o caminho aponta para um diretório).',
  'state-file-corrupted':
    'Arquivo de estado corrompido (JSON inválido). Restaure de um backup ou rode com --no-state.',
  'state-schema-invalid': 'Arquivo de estado tem schema inválido (faltando `payables` como array).',
  'state-entity-invalid':
    'Arquivo de estado contém Payable com schema inválido (status fora do enum, UUID inválido, data inválida, etc.). Restaure de um backup ou rode com --no-state.',
  'state-concurrent-lock':
    'Outro processo está gravando o mesmo arquivo de estado. Tente novamente em alguns segundos ou rode com --no-state.',
  'state-file-not-writable':
    'Não foi possível escrever o arquivo de estado (verifique permissões ou se o diretório pai existe).',

  // ─── Use case errors (FIN-CLI-APROVAR-TITULO) ─────────────────────────────
  'approve-payable-invalid-id': 'ID do título inválido (formato UUID v4 esperado).',
  'approve-payable-not-found': 'Título não encontrado.',
  'user-ref-invalid': 'ID de usuário inválido (formato UUID v4 esperado).',

  // ─── Use case errors (FIN-CLI-MOSTRAR-TITULO) ─────────────────────────────
  'payable-id-invalid': 'ID do título inválido (formato UUID v4 esperado).',
  'payable-not-found': 'Título não encontrado.',

  // ─── Payable domain errors (tagged, lookup-only — interpolação inline no comando) ─
  PayableNotOpen: 'Título não está em estado Aberto.',
  PayableInvalidApprovalDate: 'Data de aprovação inválida.',
  PayableApprovalDateBeforeOpenedAt: 'Data de aprovação anterior à data de abertura do título.',
};

type ErrorCode = string | Readonly<{ tag: string }>;

const isTagged = (e: ErrorCode): e is Readonly<{ tag: string }> =>
  typeof e === 'object' && typeof e.tag === 'string';

export const formatErrorCode = (code: ErrorCode): string => {
  const lookupKey = isTagged(code) ? code.tag : code;
  const known = ERROR_DICTIONARY[lookupKey];
  if (known !== undefined) return known;
  return `Erro desconhecido (código interno: ${lookupKey}).`;
};
