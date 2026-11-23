import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Result } from '#src/shared/index.ts';
import type { BrandOf } from '#src/shared/primitives/brand.ts';
import type {
  UserRef as UserRefFromBarrel,
  UserRefError as UserRefErrorFromBarrel,
} from '#src/shared/kernel/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';

/** UUID v4 válido em caixa baixa. */
const VALID_LOWER = '3f2b8c1e-9a4d-4e7f-8b2c-1d5e6f7a8b9c';

/** Igualdade de tipos em tempo de compilação. */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('UserRef — módulo como namespace', () => {
  it('importado como namespace expõe apenas a função rehydrate', () => {
    assert.deepEqual(Object.keys(UserRef).sort(), ['rehydrate']);
    assert.equal(typeof UserRef.rehydrate, 'function');
  });
});

describe('UserRef.rehydrate — entrada válida', () => {
  it('aceita UUID v4 em caixa baixa e devolve ok com o mesmo texto', () => {
    const r = UserRef.rehydrate(VALID_LOWER);
    assert.deepEqual(r, { ok: true, value: VALID_LOWER });
  });

  it('aceita UUID v4 em caixa alta e preserva a caixa original, sem normalizar', () => {
    const upper = VALID_LOWER.toUpperCase();
    const r = UserRef.rehydrate(upper);
    assert.deepEqual(r, { ok: true, value: upper });
  });

  it('aceita UUID v4 em caixa mista', () => {
    const mixed = '3F2b8C1e-9A4d-4E7f-8B2c-1D5e6F7a8B9c';
    assert.deepEqual(UserRef.rehydrate(mixed), { ok: true, value: mixed });
  });

  it('aceita cada variante RFC 4122 permitida no 17º dígito hexadecimal: 8, 9, a e b', () => {
    for (const variant of ['8', '9', 'a', 'b']) {
      const raw = `3f2b8c1e-9a4d-4e7f-${variant}b2c-1d5e6f7a8b9c`;
      assert.equal(UserRef.rehydrate(raw).ok, true, raw);
    }
  });

  it('aceita as variantes A e B em caixa alta e preserva o texto', () => {
    for (const variant of ['A', 'B']) {
      const raw = `3f2b8c1e-9a4d-4e7f-${variant}b2c-1d5e6f7a8b9c`;
      assert.deepEqual(UserRef.rehydrate(raw), { ok: true, value: raw });
    }
  });

  it('aceita o UUID gerado por crypto.randomUUID', () => {
    const raw = crypto.randomUUID();
    assert.deepEqual(UserRef.rehydrate(raw), { ok: true, value: raw });
  });
});

describe('UserRef.rehydrate — entrada inválida', () => {
  const rejects = (raw: string): void => {
    assert.deepEqual(UserRef.rehydrate(raw), { ok: false, error: 'user-ref-invalid' });
  };

  it("recusa string vazia com 'user-ref-invalid'", () => {
    rejects('');
  });

  it("recusa texto que não é UUID com 'user-ref-invalid'", () => {
    rejects('not-a-uuid');
  });

  it("recusa UUID de versão diferente de 4 (v1, v7) com 'user-ref-invalid'", () => {
    rejects('3f2b8c1e-9a4d-1e7f-8b2c-1d5e6f7a8b9c');
    rejects('3f2b8c1e-9a4d-7e7f-8b2c-1d5e6f7a8b9c');
  });

  it("recusa UUID nulo (todos zeros) com 'user-ref-invalid'", () => {
    rejects('00000000-0000-0000-0000-000000000000');
  });

  it("recusa variante fora de 8, 9, a, b com 'user-ref-invalid'", () => {
    rejects('3f2b8c1e-9a4d-4e7f-cb2c-1d5e6f7a8b9c');
    rejects('3f2b8c1e-9a4d-4e7f-7b2c-1d5e6f7a8b9c');
  });

  it("recusa UUID v4 sem hífens com 'user-ref-invalid'", () => {
    rejects(VALID_LOWER.replaceAll('-', ''));
  });

  it("recusa UUID v4 entre chaves com 'user-ref-invalid'", () => {
    rejects(`{${VALID_LOWER}}`);
  });

  it("recusa UUID v4 com espaço nas bordas com 'user-ref-invalid', sem aparar", () => {
    rejects(` ${VALID_LOWER}`);
    rejects(`${VALID_LOWER} `);
  });

  it("recusa UUID v4 seguido de quebra de linha com 'user-ref-invalid'", () => {
    rejects(`${VALID_LOWER}\n`);
  });

  it("recusa UUID v4 com caractere não hexadecimal com 'user-ref-invalid'", () => {
    rejects('3f2b8c1e-9a4d-4e7f-8b2c-1d5e6f7a8b9g');
  });
});

describe('UserRef — tipos', () => {
  it('UserRef é string marcada com a brand UserRef', () => {
    const brandIsUserRef: Equals<BrandOf<UserRef.UserRef>, 'UserRef'> = true;
    assert.equal(brandIsUserRef, true);
  });

  it('string crua não é atribuível a UserRef sem passar por rehydrate', () => {
    const rawStringIsRejected: Equals<string extends UserRef.UserRef ? true : false, false> = true;
    assert.equal(rawStringIsRejected, true);
  });

  it('UserRef é atribuível a string', () => {
    const r = UserRef.rehydrate(VALID_LOWER);
    const asString: string = r.ok ? r.value : '';
    assert.equal(asString, VALID_LOWER);
  });

  it("UserRefError é exatamente o literal 'user-ref-invalid'", () => {
    const exact: Equals<UserRef.UserRefError, 'user-ref-invalid'> = true;
    assert.equal(exact, true);
  });

  it('rehydrate devolve Result<UserRef, UserRefError>', () => {
    const exact: Equals<
      ReturnType<typeof UserRef.rehydrate>,
      Result<UserRef.UserRef, UserRef.UserRefError>
    > = true;
    assert.equal(exact, true);
  });

  it('o barrel do kernel reexporta os mesmos tipos UserRef e UserRefError', () => {
    const sameRef: Equals<UserRefFromBarrel, UserRef.UserRef> = true;
    const sameError: Equals<UserRefErrorFromBarrel, UserRef.UserRefError> = true;
    assert.equal(sameRef && sameError, true);
  });
});
