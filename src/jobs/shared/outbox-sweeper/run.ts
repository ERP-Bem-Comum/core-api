// Entrypoint one-shot do sweep de outbox (ADR-0062 §3).
//
// Marca `processed_at` nas linhas já resolvidas por TODOS os consumidores registrados, devolvendo
// ao claim o predicado que o torna indexável. É OTIMIZAÇÃO: se este job nunca rodar, o claim volta
// a ser o lento de antes e continua CORRETO — o `NOT EXISTS` por consumidor segue garantindo que
// nenhum evento se perde. Nada aqui decide entrega.
//
// Espelha a disciplina one-shot de `src/jobs/contracts/sweeper/run.ts` (ADR-0041): sem loop, sem
// `setInterval`, sem listener de sinal. Conecta → executa → fecha pool → sai. SIGTERM no meio faz
// rollback e o próximo disparo refaz — o sweep é idempotente por construção (`processed_at IS
// NULL` no UPDATE).
//
// As cinco tabelas vivem no MESMO database `core` (compose.yaml: todas as `*_DATABASE_URL`
// apontam para ele), então um pool basta. Se algum dia divergirem, este job passa a precisar de
// um pool por URL — e o `registeredConsumers` já é por outbox, então a fatia é pequena.
//
// Exit codes (sysexits.h):
//   0  — sucesso (mesmo com `marked = 0`: é resultado válido, não erro)
//   78 — EX_CONFIG: env ausente ou mal-formada
//   1  — erro de runtime (conexão, I/O)

import process from 'node:process';

import { withNewCorrelation } from '#src/shared/observability/correlation.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import * as ctrSchema from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import * as parSchema from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';
import * as finSchema from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import * as authSchema from '#src/modules/auth/adapters/persistence/schemas/mysql.ts';
import { createDrizzleOutboxSweeper } from '#src/shared/persistence/outbox-sweeper.drizzle.ts';
import { registeredConsumers, type OutboxName } from '#src/shared/outbox/registered-consumers.ts';
import { runOutboxSweep } from './sweep.ts';

const EX_CONFIG = 78;

/**
 * Lote pequeno de propósito: é o número de registros travados de uma vez (ADR-0062 §3).
 *
 * ⚠️ `batchSize × maxBatches` é o teto por EXECUÇÃO — 10.000 linhas aqui. Um backlog de 50k
 * precisa de cinco execuções, e `reachedLimit` no resultado é o que avisa que sobrou trabalho.
 * Dimensionar frequência do cron contra a taxa de eventos é decisão consciente, não default.
 */
const SWEEP_CONFIG = { batchSize: 500, maxBatches: 20 };

/**
 * As **quatro** URLs que cobrem as **cinco** tabelas de outbox, e que precisam apontar para o
 * mesmo banco. Quatro e não cinco porque `par_email_outbox` vive no módulo `partners`, sob a
 * mesma `PARTNERS_DATABASE_URL` do `par_outbox`.
 */
const DATABASE_URL_VARS = [
  'CONTRACTS_DATABASE_URL',
  'PARTNERS_DATABASE_URL',
  'FINANCIAL_DATABASE_URL',
  'AUTH_DATABASE_URL',
] as const;

/** `host:porta/database` de uma URL de conexão — sem usuário, senha ou query string. */
const targetOf = (raw: string): string | null => {
  try {
    const url = new URL(raw);
    return `${url.hostname}:${url.port}${url.pathname}`;
  } catch {
    return null;
  }
};

const main = async (): Promise<number> => {
  // ⚠️ Este job varre as CINCO tabelas de outbox por um pool só, porque hoje todas as
  // `*_DATABASE_URL` apontam para o mesmo database `core`. Isso NÃO é garantido por construção:
  // no `compose.yaml` cada uma vem de um arquivo de secret independente
  // (`$(cat /run/secrets/<mod>_database_url)`), editável isoladamente — e separar módulos em
  // bancos distintos é justamente o que o isolamento por prefixo permite.
  //
  // Sem esta checagem, uma URL divergente faria o sweeper varrer o banco ERRADO e devolver
  // `marked=0` — indistinguível de "não havia trabalho", com exit 0 e log de sucesso. A
  // otimização se desligaria sozinha, em silêncio. Falhar no boot põe o erro onde ele pertence.
  //
  // Nenhum evento se perde nesse cenário (o `NOT EXISTS` do claim segue correto); o que se perde
  // é a indexabilidade — e ninguém saberia.
  const urlTargets = new Map<string, string>();
  for (const name of DATABASE_URL_VARS) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') continue;
    const target = targetOf(raw);
    if (target === null) {
      process.stderr.write(`[outbox-sweeper] ${name} não é uma URL válida\n`);
      return EX_CONFIG;
    }
    urlTargets.set(name, target);
  }

  const distinct = new Set(urlTargets.values());
  if (distinct.size > 1) {
    const detail = [...urlTargets].map(([name, t]) => `${name}=${t}`).join(' · ');
    process.stderr.write(
      `[outbox-sweeper] as *_DATABASE_URL apontam para bancos DIFERENTES, e este job varre as ` +
        `cinco tabelas por uma conexão só: ${detail}\n` +
        '[outbox-sweeper] com bancos separados, o sweep precisa de um pool por URL — ver ADR-0062 §3\n',
    );
    return EX_CONFIG;
  }

  const connectionString = process.env['CONTRACTS_DATABASE_URL'];
  if (connectionString === undefined || connectionString === '') {
    process.stderr.write('[outbox-sweeper] CONTRACTS_DATABASE_URL ausente\n');
    return EX_CONFIG;
  }

  // O alvo entra no log (sem credencial) para que `marked=0` seja auditável: sem isto, não há
  // como distinguir "nada a marcar" de "marcou no lugar errado".
  process.stderr.write(`[outbox-sweeper] alvo: ${targetOf(connectionString) ?? 'desconhecido'}\n`);

  const handleR = await openMysql({ connectionString, applyMigrations: false });
  if (!handleR.ok) {
    process.stderr.write(`[outbox-sweeper] falha ao abrir MySQL: ${handleR.error}\n`);
    return 1;
  }
  const handle = handleR.value;

  try {
    const clock = ClockReal();
    const consumers = registeredConsumers(process.env);

    // As cinco tabelas, cada uma com a sua lista de consumidores.
    const targets: readonly (readonly [
      OutboxName,
      Parameters<typeof createDrizzleOutboxSweeper>[1],
    ])[] = [
      ['ctr_outbox', ctrSchema.ctrOutbox],
      ['par_outbox', parSchema.parOutbox],
      ['fin_outbox', finSchema.finOutbox],
      ['auth_outbox', authSchema.authOutbox],
      ['par_email_outbox', parSchema.parEmailOutbox],
    ];

    let failed = false;
    for (const [name, table] of targets) {
      const sweeper = createDrizzleOutboxSweeper(handle.db, table);
      const result = await runOutboxSweep({ sweeper, clock }, SWEEP_CONFIG, consumers[name]);

      if (!result.ok) {
        // Um outbox que falha não impede os outros: são independentes, e marcar quatro é melhor
        // que marcar nenhum. O exit code final reflete que houve falha.
        process.stderr.write(`[outbox-sweeper] ${name}: ${result.error.tag}\n`);
        failed = true;
        continue;
      }

      process.stderr.write(
        `[outbox-sweeper] ${name}: marked=${result.value.marked} batches=${result.value.batches}` +
          `${result.value.reachedLimit ? ' (teto de lotes atingido — sobrou trabalho)' : ''}\n`,
      );
    }

    return failed ? 1 : 0;
  } finally {
    await handle.close();
  }
};

process.exitCode = await withNewCorrelation(main);
