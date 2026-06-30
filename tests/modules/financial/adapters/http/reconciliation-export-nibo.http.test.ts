/**
 * W0 RED — borda HTTP do export CSV-Nibo (#146).
 *
 * Espelha o setup de financial-period.http.test.ts (driver memory, buildApp, inject,
 * permissão reconciliation:read). Prova que:
 *
 *   CA1: GET .../:id/export?format=csv-nibo em período vazio → 200, content-type text/csv,
 *        primeira linha após BOM = cabeçalho Nibo com 15 colunas.
 *   CA2: format=xml (inválido) → 400 (schema rejeita).
 *
 * Cobertura de enriquecimento (1 título conciliado → linha de dados) é omitida aqui: o
 * setup de seed (documento + payable + statement + conciliação + fechamento de período) é
 * desproporcional para este nível HTTP. A pirâmide cobre esse caminho nos 10 testes unit
 * do use-case (tests/modules/financial/application/use-cases/export-reconciliation-nibo.test.ts).
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';

const READER = 'reconciliation:read';
const CLOSER = 'reconciliation:close,reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const ACCOUNT = 'a1111111-1111-4111-8111-111111111111';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = TEST_USER_ID;
  return undefined;
};
const authorize =
  (permission: string): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const perms = (req.headers.authorization ?? '').replace('Bearer ', '').split(',');
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissão' } });
    }
    return undefined;
  };

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  periodId: string;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });

  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(base, { requireAuth, authorize })],
  });

  // Fecha um período vazio (junho/2024) para ter um periodId válido + status Closed.
  const closed = await app.inject({
    method: 'POST',
    url: '/api/v2/financial/reconciliation-periods/close',
    headers: { authorization: `Bearer ${CLOSER}` },
    payload: {
      debitAccountRef: ACCOUNT,
      periodStart: '2024-06-01',
      periodEnd: '2024-06-30',
    },
  });
  if (closed.statusCode !== 200) {
    throw new Error(`setup: close falhou com ${closed.statusCode} — ${closed.body}`);
  }
  const body = closed.json() as { periodId: string; status: string };

  handle = {
    app,
    periodId: body.periodId,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

// Cabeçalho Nibo: 15 colunas, separador ';' (CA1 do nibo-csv.ts).
const NIBO_HEADER =
  'Tipo de transação;Nome do contato;Descrição;Categoria;Valor;Vencimento;Previsto para;Competência;Centro de custo;Favorito;Tipo de contato;Referência;Conta;Data pag/rec/transferência;Anotação';

describe('financial/http — reconciliation export Nibo CSV (#146)', () => {
  it('CA1: GET export?format=csv-nibo (período vazio) → 200 + text/csv + cabeçalho Nibo 15 colunas', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/reconciliation-periods/${handle.periodId}/export?format=csv-nibo`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, `esperado 200, obtido ${res.statusCode}: ${res.body}`);
    assert.match(
      res.headers['content-type'] ?? '',
      /text\/csv/,
      `content-type deve conter text/csv; obtido: ${String(res.headers['content-type'])}`,
    );
    assert.match(
      res.headers['content-type'] ?? '',
      /charset=utf-8/,
      `content-type deve conter charset=utf-8; obtido: ${String(res.headers['content-type'])}`,
    );
    // BOM = 3 bytes EF BB BF; primeira linha após ele é o cabeçalho Nibo.
    const bodyStr = res.body;
    // Remove BOM se presente (UTF-8 BOM como string = U+FEFF no início).
    const withoutBom = bodyStr.startsWith('﻿') ? bodyStr.slice(1) : bodyStr;
    const firstLine = withoutBom.split(/\r?\n/)[0] ?? '';
    assert.equal(firstLine, NIBO_HEADER, `primeira linha deve ser o cabeçalho Nibo com 15 colunas`);
    // Confirma as 15 colunas.
    assert.equal(firstLine.split(';').length, 15, 'cabeçalho deve ter 15 colunas');
  });

  it('CA2: GET export?format=xml → 400 (schema rejeita formato inválido)', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/reconciliation-periods/${handle.periodId}/export?format=xml`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 400, `esperado 400, obtido ${res.statusCode}: ${res.body}`);
  });
});
