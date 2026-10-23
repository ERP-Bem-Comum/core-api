import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Pwd from '#src/modules/partners/domain/collaborator/pwd.ts';

// Spec 131 do web-app (P.O., 23/10/2026) — Pessoa com Deficiência no formato do cliente.

describe('Pwd.parsePwd — resposta nova chega completa', () => {
  it('"Não" e "Prefiro não responder" não levam tipo nem texto', () => {
    assert.deepEqual(Pwd.parsePwd({ answer: 'NAO' }), { ok: true, value: { answer: 'NAO' } });
    assert.deepEqual(Pwd.parsePwd({ answer: 'PREFIRO_NAO_RESPONDER' }), {
      ok: true,
      value: { answer: 'PREFIRO_NAO_RESPONDER' },
    });
    assert.deepEqual(Pwd.parsePwd({ answer: 'NAO', types: ['VISUAL'] }), {
      ok: false,
      error: 'collaborator-pwd-details-require-yes',
    });
    assert.deepEqual(Pwd.parsePwd({ answer: 'NAO', otherDescription: 'x' }), {
      ok: false,
      error: 'collaborator-pwd-details-require-yes',
    });
  });

  it('"Sim" pede ao menos um tipo; tipos repetidos e fora de ordem viram a ordem do formulário', () => {
    assert.deepEqual(Pwd.parsePwd({ answer: 'SIM', types: [] }), {
      ok: false,
      error: 'collaborator-pwd-type-required',
    });
    assert.deepEqual(Pwd.parsePwd({ answer: 'SIM', types: ['TEA', 'FISICA', 'TEA'] }), {
      ok: true,
      value: { answer: 'SIM', types: ['FISICA', 'TEA'], otherDescription: null },
    });
  });

  it('"Outra" pede o texto; texto sem "Outra" é recusado; texto é aparado', () => {
    assert.deepEqual(Pwd.parsePwd({ answer: 'SIM', types: ['OUTRA'] }), {
      ok: false,
      error: 'collaborator-pwd-other-description-required',
    });
    assert.deepEqual(Pwd.parsePwd({ answer: 'SIM', types: ['OUTRA'], otherDescription: '   ' }), {
      ok: false,
      error: 'collaborator-pwd-other-description-required',
    });
    assert.deepEqual(
      Pwd.parsePwd({ answer: 'SIM', types: ['VISUAL'], otherDescription: 'baixa visão' }),
      { ok: false, error: 'collaborator-pwd-description-requires-other' },
    );
    assert.deepEqual(
      Pwd.parsePwd({ answer: 'SIM', types: ['OUTRA'], otherDescription: '  fibromialgia ' }),
      { ok: true, value: { answer: 'SIM', types: ['OUTRA'], otherDescription: 'fibromialgia' } },
    );
  });

  it('código desconhecido e texto longo são recusados', () => {
    assert.deepEqual(Pwd.parsePwd({ answer: 'TALVEZ' }), {
      ok: false,
      error: 'invalid-pwd-answer',
    });
    assert.deepEqual(Pwd.parsePwd({ answer: 'SIM', types: ['CEGUEIRA'] }), {
      ok: false,
      error: 'invalid-pwd-type',
    });
    assert.deepEqual(
      Pwd.parsePwd({
        answer: 'SIM',
        types: ['OUTRA'],
        otherDescription: 'x'.repeat(Pwd.PWD_OTHER_DESCRIPTION_MAX_LENGTH + 1),
      }),
      { ok: false, error: 'collaborator-pwd-other-description-too-long' },
    );
  });
});

describe('Pwd.isComplete — aberto enquanto vazio ou incompleto', () => {
  it('vazio, "Sim" sem tipo e "Outra" sem texto são incompletos', () => {
    assert.equal(Pwd.isComplete(null), false);
    assert.equal(Pwd.isComplete({ answer: 'SIM', types: [], otherDescription: null }), false);
    assert.equal(
      Pwd.isComplete({ answer: 'SIM', types: ['OUTRA'], otherDescription: null }),
      false,
    );
  });

  it('"Não", "Prefiro não responder" e "Sim" com tipo são completos', () => {
    assert.equal(Pwd.isComplete({ answer: 'NAO' }), true);
    assert.equal(Pwd.isComplete({ answer: 'PREFIRO_NAO_RESPONDER' }), true);
    assert.equal(
      Pwd.isComplete({ answer: 'SIM', types: ['AUDITIVA'], otherDescription: null }),
      true,
    );
    assert.equal(
      Pwd.isComplete({ answer: 'SIM', types: ['OUTRA'], otherDescription: 'fibromialgia' }),
      true,
    );
  });
});

describe('Pwd.resolvePwdFill — preenche até completar, depois trava', () => {
  const complete: Pwd.Pwd = { answer: 'SIM', types: ['VISUAL'], otherDescription: null };

  it('ausente ou null mantém o gravado', () => {
    assert.deepEqual(Pwd.resolvePwdFill(complete, undefined), { ok: true, value: complete });
    assert.deepEqual(Pwd.resolvePwdFill(null, null), { ok: true, value: null });
  });

  it('vazio ou incompleto (dado anterior) aceita a resposta', () => {
    assert.deepEqual(Pwd.resolvePwdFill(null, { answer: 'NAO' }), {
      ok: true,
      value: { answer: 'NAO' },
    });
    const migrated: Pwd.Pwd = { answer: 'SIM', types: [], otherDescription: null };
    assert.deepEqual(Pwd.resolvePwdFill(migrated, { answer: 'SIM', types: ['FISICA'] }), {
      ok: true,
      value: { answer: 'SIM', types: ['FISICA'], otherDescription: null },
    });
  });

  it('completo: igual mantém, diferente é recusado', () => {
    assert.deepEqual(Pwd.resolvePwdFill(complete, { answer: 'SIM', types: ['VISUAL'] }), {
      ok: true,
      value: complete,
    });
    assert.deepEqual(Pwd.resolvePwdFill(complete, { answer: 'NAO' }), {
      ok: false,
      error: 'collaborator-personal-data-immutable',
    });
    assert.deepEqual(
      Pwd.resolvePwdFill(complete, { answer: 'SIM', types: ['VISUAL', 'AUDITIVA'] }),
      { ok: false, error: 'collaborator-personal-data-immutable' },
    );
  });

  it('a resposta recebida precisa vir completa mesmo com o gravado aberto', () => {
    assert.deepEqual(Pwd.resolvePwdFill(null, { answer: 'SIM', types: [] }), {
      ok: false,
      error: 'collaborator-pwd-type-required',
    });
  });
});

describe('Pwd — colunas (CSV dos tipos, ADR-0020)', () => {
  it('ida e volta preserva a resposta', () => {
    const pwd: Pwd.Pwd = {
      answer: 'SIM',
      types: ['FISICA', 'OUTRA'],
      otherDescription: 'fibromialgia',
    };
    const cols = Pwd.toColumns(pwd);
    assert.deepEqual(cols, {
      pwdAnswer: 'SIM',
      pwdTypes: 'FISICA,OUTRA',
      pwdDescription: 'fibromialgia',
    });
    assert.deepEqual(Pwd.fromColumns(cols), { ok: true, value: pwd });
    assert.deepEqual(Pwd.toColumns(null), {
      pwdAnswer: null,
      pwdTypes: null,
      pwdDescription: null,
    });
  });

  it('o dado convertido pela migration reidrata: "Sim" sem tipo e "Outra" com o texto antigo', () => {
    assert.deepEqual(Pwd.fromColumns({ pwdAnswer: 'SIM', pwdTypes: null, pwdDescription: null }), {
      ok: true,
      value: { answer: 'SIM', types: [], otherDescription: null },
    });
    assert.deepEqual(
      Pwd.fromColumns({ pwdAnswer: 'SIM', pwdTypes: 'OUTRA', pwdDescription: 'cadeirante' }),
      { ok: true, value: { answer: 'SIM', types: ['OUTRA'], otherDescription: 'cadeirante' } },
    );
  });

  it('"Não" ignora texto antigo na leitura; código desconhecido é erro', () => {
    assert.deepEqual(Pwd.fromColumns({ pwdAnswer: 'NAO', pwdTypes: null, pwdDescription: 'x' }), {
      ok: true,
      value: { answer: 'NAO' },
    });
    assert.deepEqual(Pwd.fromColumns({ pwdAnswer: 'SIM', pwdTypes: 'X', pwdDescription: null }), {
      ok: false,
      error: 'invalid-pwd-type',
    });
  });
});
