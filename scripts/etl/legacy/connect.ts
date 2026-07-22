/**
 * Conexão SELECT-only ao MySQL legado do ETL, por connection string
 * (`ETL_LEGACY_CONNECTION_STRING`). Sem Docker/dump: a URL aponta para o legado
 * (vivo, réplica, ou snapshot restaurado pela infra). Rede privada, SEM TLS
 * (ETL-LEGACY-DIRECT-CONNECTION). Compartilhada por `reader.ts`, `history-archive.ts`
 * e o diagnóstico de duplicatas.
 */

import { createConnection, type Connection } from 'mysql2/promise';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export type LegacyConnectError = 'etl-legacy-connection-string-missing';

export type LegacyConnectOptions = Readonly<{
  uri: string;
  multipleStatements: false;
  dateStrings: false;
  timezone: 'Z';
  decimalNumbers: false;
  // Rede privada sem TLS: se o user do legado usar caching_sha2_password (default MySQL 8),
  // o mysql2 precisa buscar a chave pública RSA no handshake. Aceitável só em rede fechada.
  allowPublicKeyRetrieval: true;
}>;

/** Valida `ETL_LEGACY_CONNECTION_STRING` e monta as opções mysql2 do reader (pura, testável). */
export const resolveLegacyConnectOptions = (
  raw: string | undefined,
): Result<LegacyConnectOptions, LegacyConnectError> => {
  if (raw === undefined || raw.trim() === '') {
    return err('etl-legacy-connection-string-missing');
  }
  const options: LegacyConnectOptions = {
    uri: raw,
    multipleStatements: false,
    dateStrings: false,
    timezone: 'Z',
    decimalNumbers: false,
    allowPublicKeyRetrieval: true,
  };
  return ok(options);
};

/** Abre a conexão SELECT-only com o legado. Lança (fail-fast) se a env estiver ausente. */
export const connectReadonly = async (): Promise<Connection> => {
  const optionsR = resolveLegacyConnectOptions(process.env['ETL_LEGACY_CONNECTION_STRING']);
  if (!optionsR.ok) throw new Error(optionsR.error);
  return createConnection(optionsR.value);
};
