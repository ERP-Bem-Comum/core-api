import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapLegacyProgramRow } from '#scripts/etl/mappers/program.mapper.ts';
import type { LegacyProgramRow } from '#scripts/etl/legacy/rows.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

// Fixtures SINTÉTICOS — nunca PII real. Datas fixas p/ determinismo.
const NOW = new Date('2024-01-01T12:00:00.000Z');
const UPDATED = new Date('2024-01-02T09:30:00.000Z');
const CLOCK_NOW = new Date('2030-06-15T00:00:00.000Z');

// Clock fixo — só é usado como fallback quando a data legada for inválida.
const fixedClock: Clock = {
  now: () => CLOCK_NOW,
  today: () => PlainDate.fromDate(CLOCK_NOW),
};

const base = (over: Partial<LegacyProgramRow> = {}): LegacyProgramRow => ({
  id: 3,
  name: 'Programa Alfa',
  abbreviation: 'ALFA',
  director: 'Diretor Um',
  description: 'Descricao do programa Alfa',
  logo: 'https://legacy.example/logo-alfa.png',
  active: 1,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

describe('mapLegacyProgramRow', () => {
  it('linha ativa válida → ok com agregado ATIVO, legacyId e programNumber = row.id', () => {
    const r = mapLegacyProgramRow(base(), fixedClock);
    assert.ok(r.ok, `esperava ok: ${JSON.stringify(r)}`);
    assert.equal(r.value.legacyId, 3);
    assert.equal(r.value.aggregate.programNumber, 3);
    assert.equal(r.value.aggregate.status, 'ATIVO');
    assert.equal(r.value.aggregate.name, 'Programa Alfa');
    assert.equal(r.value.aggregate.sigla, 'ALFA');
    assert.equal(r.value.aggregate.director, 'Diretor Um');
    assert.equal(r.value.aggregate.generalCharacteristics, 'Descricao do programa Alfa');
    // logoKey nulificado SEMPRE (o `logo` legado é URL, não chave S3).
    assert.equal(r.value.aggregate.logoKey, null);
    // now = createdAt legado.
    assert.equal(r.value.aggregate.createdAt.getTime(), NOW.getTime());
  });

  it('programNumber reusa o int legado (determinístico) — id 42 → programNumber 42', () => {
    const r = mapLegacyProgramRow(base({ id: 42 }), fixedClock);
    assert.ok(r.ok);
    assert.equal(r.value.legacyId, 42);
    assert.equal(r.value.aggregate.programNumber, 42);
  });

  it('linha inativa (active=0) → agregado INATIVO (passa por Program.deactivate)', () => {
    const r = mapLegacyProgramRow(base({ active: 0 }), fixedClock);
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.status, 'INATIVO');
    // deactivate incrementa a version (create=1 → deactivate=2).
    assert.equal(r.value.aggregate.version, 2);
    assert.equal(r.value.aggregate.updatedAt.getTime(), UPDATED.getTime());
  });

  it('director/description em branco → null (trim + colapso de vazio)', () => {
    const r = mapLegacyProgramRow(base({ director: '   ', description: null }), fixedClock);
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.director, null);
    assert.equal(r.value.aggregate.generalCharacteristics, null);
  });

  it('name curto (< 2 chars) → quarentena DomainRejected program-name-required', () => {
    const r = mapLegacyProgramRow(base({ name: 'A' }), fixedClock);
    assert.ok(!r.ok);
    assert.ok(
      r.error.some(
        (e) =>
          e.tag === 'DomainRejected' && e.field === 'name' && e.code === 'program-name-required',
      ),
    );
  });

  it('sigla inválida → quarentena DomainRejected program-sigla-invalid', () => {
    const r = mapLegacyProgramRow(base({ abbreviation: '!!' }), fixedClock);
    assert.ok(!r.ok);
    assert.ok(
      r.error.some(
        (e) =>
          e.tag === 'DomainRejected' && e.field === 'sigla' && e.code === 'program-sigla-invalid',
      ),
    );
  });

  it('acumula múltiplos erros de linha (name curto + sigla inválida) numa única quarentena', () => {
    const r = mapLegacyProgramRow(base({ name: 'A', abbreviation: '!!' }), fixedClock);
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'DomainRejected' && e.field === 'name'));
    assert.ok(r.error.some((e) => e.tag === 'DomainRejected' && e.field === 'sigla'));
    assert.ok(r.error.length >= 2, 'deve acumular ambos os erros');
  });
});
