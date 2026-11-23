import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { inDateWindow } from '#src/modules/financial/adapters/persistence/repos/in-date-window.ts';

const FROM = new Date('2026-03-10');
const TO = new Date('2026-05-20');
const day = (iso: string): Date => new Date(iso);

describe('financial/adapters/persistence — inDateWindow', () => {
  it('sem nenhum extremo aceita qualquer data', () => {
    assert.equal(inDateWindow(day('1999-01-01'), undefined, undefined), true);
  });

  it('sem nenhum extremo aceita valor nulo', () => {
    assert.equal(inDateWindow(null, undefined, undefined), true);
  });

  it('com qualquer extremo ativo recusa valor nulo', () => {
    assert.equal(inDateWindow(null, FROM, undefined), false);
    assert.equal(inDateWindow(null, undefined, TO), false);
    assert.equal(inDateWindow(null, FROM, TO), false);
  });

  it('só o extremo inicial vale sozinho e é inclusivo', () => {
    assert.equal(inDateWindow(day('2026-03-09'), FROM, undefined), false);
    assert.equal(inDateWindow(day('2026-03-10'), FROM, undefined), true);
    assert.equal(inDateWindow(day('2030-01-01'), FROM, undefined), true);
  });

  it('só o extremo final vale sozinho e é inclusivo', () => {
    assert.equal(inDateWindow(day('2000-01-01'), undefined, TO), true);
    assert.equal(inDateWindow(day('2026-05-20'), undefined, TO), true);
    assert.equal(inDateWindow(day('2026-05-21'), undefined, TO), false);
  });

  it('os dois extremos aceitam só o intervalo fechado', () => {
    assert.equal(inDateWindow(day('2026-03-09'), FROM, TO), false);
    assert.equal(inDateWindow(day('2026-03-10'), FROM, TO), true);
    assert.equal(inDateWindow(day('2026-04-15'), FROM, TO), true);
    assert.equal(inDateWindow(day('2026-05-20'), FROM, TO), true);
    assert.equal(inDateWindow(day('2026-05-21'), FROM, TO), false);
  });

  it('extremos iguais aceitam só aquele dia', () => {
    assert.equal(inDateWindow(day('2026-03-10'), FROM, FROM), true);
    assert.equal(inDateWindow(day('2026-03-11'), FROM, FROM), false);
  });

  it('extremos invertidos não aceitam nada', () => {
    assert.equal(inDateWindow(day('2026-04-15'), TO, FROM), false);
  });
});
