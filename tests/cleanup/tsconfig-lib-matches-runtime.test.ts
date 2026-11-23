/**
 * TSCONFIG-LIB-MATCHES-RUNTIME — o `lib` do tsconfig só tipa o que o Node do `.nvmrc` executa.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * O `tsc` aprova qualquer API que o `lib` declare, e o runtime é o type stripping do Node, que não
 * transpila nem faz polyfill. Lib à frente do runtime vira TypeError em produção com typecheck verde;
 * lib atrás do runtime esconde API nativa e empurra o código para reimplementá-la à mão — foi o
 * caso do `ES2024` mantido durante a subida para o Node 26, que deixava fora de alcance os métodos
 * de Set, os iterator helpers, `RegExp.escape`, `Error.isError` e o Temporal.
 *
 * Por isso o `lib` é ES2025 inteiro mais fatias nomeadas de ESNext — nunca `ESNext` em bloco, que
 * tipa o que o Node 26.13 ainda não tem (`Math.sumPrecise`, medido em 2026-11-23). Cada fatia tem
 * aqui uma sonda que roda no MESMO processo do gate, ou seja, no Node do `.nvmrc`. Fatia nova sem
 * sonda reprova: subir o `lib` exige provar que o runtime acompanha.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readSource } from '../support/source-scan.ts';

type Probe = Readonly<{ api: string; present: () => boolean }>;

const PROBES: Readonly<Record<string, readonly Probe[]>> = {
  es2025: [
    { api: 'Set.prototype.union', present: () => typeof Set.prototype.union === 'function' },
    { api: 'Iterator.prototype.map', present: () => typeof Iterator.prototype.map === 'function' },
    { api: 'RegExp.escape', present: () => typeof RegExp.escape === 'function' },
    { api: 'Promise.try', present: () => typeof Promise.try === 'function' },
    { api: 'Float16Array', present: () => typeof Float16Array === 'function' },
  ],
  'esnext.collection': [
    {
      api: 'Map.prototype.getOrInsert',
      present: () => typeof Map.prototype.getOrInsert === 'function',
    },
    {
      api: 'Map.prototype.getOrInsertComputed',
      present: () => typeof Map.prototype.getOrInsertComputed === 'function',
    },
  ],
  'esnext.disposable': [
    { api: 'Symbol.dispose', present: () => typeof Symbol.dispose === 'symbol' },
    { api: 'Symbol.asyncDispose', present: () => typeof Symbol.asyncDispose === 'symbol' },
    { api: 'DisposableStack', present: () => typeof DisposableStack === 'function' },
    { api: 'AsyncDisposableStack', present: () => typeof AsyncDisposableStack === 'function' },
  ],
  'esnext.error': [{ api: 'Error.isError', present: () => typeof Error.isError === 'function' }],
  'esnext.temporal': [
    { api: 'Temporal.PlainDate', present: () => typeof Temporal.PlainDate === 'function' },
    { api: 'Temporal.ZonedDateTime', present: () => typeof Temporal.ZonedDateTime === 'function' },
    { api: 'Temporal.Now', present: () => typeof Temporal.Now.instant === 'function' },
  ],
  'esnext.typedarrays': [
    {
      api: 'Uint8Array.prototype.toHex',
      present: () => typeof Uint8Array.prototype.toHex === 'function',
    },
    { api: 'Uint8Array.fromBase64', present: () => typeof Uint8Array.fromBase64 === 'function' },
  ],
};

const LIB_ARRAY = /"lib"\s*:\s*\[([^\]]*)\]/;

const declaredLibs = (): readonly string[] => {
  const match = LIB_ARRAY.exec(readSource('tsconfig.json'));
  assert.ok(
    match?.[1] !== undefined,
    'tsconfig.json sem "lib" — o default do target esconde o que é tipado',
  );
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => (m[1] ?? '').toLowerCase());
};

describe('TSCONFIG-LIB-MATCHES-RUNTIME — o lib tipa só o que o Node do .nvmrc executa', () => {
  it('o lib não usa ESNext em bloco', () => {
    assert.ok(
      !declaredLibs().includes('esnext'),
      '"ESNext" tipa APIs que o Node do .nvmrc ainda não tem. Liste as fatias (ESNext.Temporal, …).',
    );
  });

  it('toda fatia declarada tem sonda neste teste', () => {
    const unprobed = declaredLibs().filter((lib) => PROBES[lib] === undefined);
    assert.deepEqual(
      unprobed,
      [],
      `fatia de lib sem sonda de runtime: ${unprobed.join(', ')}. Adicione em PROBES a API que ela tipa.`,
    );
  });

  it('cada API tipada pelas fatias declaradas existe no runtime do gate', () => {
    const missing = declaredLibs()
      .flatMap((lib) => (PROBES[lib] ?? []).map((probe) => ({ lib, probe })))
      .filter(({ probe }) => !probe.present())
      .map(({ lib, probe }) => `${lib}: ${probe.api}`);
    assert.deepEqual(
      missing,
      [],
      `o tsconfig tipa API ausente em Node ${process.version}:\n${missing.join('\n')}`,
    );
  });

  it('a varredura enxerga o lib (guarda contra verde por vacuidade)', () => {
    assert.ok(declaredLibs().includes('es2025'));
    assert.ok(declaredLibs().length > 1);
  });
});
