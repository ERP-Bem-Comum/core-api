import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: o parser do envelope de status da VAN ainda não existe.
import {
  classifyKey,
  parseStatus,
  wasTransmitted,
} from '#src/modules/financial/adapters/van/status-envelope.ts';
import { VAN_STATUS_DETAIL_MAX_LENGTH } from '#src/modules/financial/application/ports/van-status-reader.ts';

const envelope = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    arquivo: 'PAG_000000.10082026142600_0007.REM',
    executadoEm: '2026-08-10T20:26:34.1234567Z',
    situacao: 'transmitido',
    detalhe: 'Arquivo transmitido e confirmado em BACKUP',
    exitCode: 0,
    codigoStcp: '0',
    logTransferencia: ['20260810202634 0005 O0055BRADESCO ... 000000 ...'],
    ...over,
  });

describe('status/ — a chave diz de que tipo é o objeto', () => {
  it('reconhece os três formatos combinados', () => {
    const normal = classifyKey('status/PAG_000000.10082026142600_0007.REM.json');
    const dup = classifyKey(
      'status/PAG_000000.10082026142600_0007.REM.duplicado-20260810T2026.json',
    );
    const rec = classifyKey('status/recepcao-20260810T202634.json');

    assert.ok(isOk(normal) && normal.value === 'remittance');
    assert.ok(isOk(dup) && dup.value === 'duplicate');
    assert.ok(isOk(rec) && rec.value === 'reception');
  });

  // A chave do duplicado é distinta de propósito: se sobrescrevesse o status original, uma remessa
  // JÁ TRANSMITIDA passaria a constar como não transmitida — a conclusão exatamente oposta.
  it('não confunde duplicado com resultado normal da mesma remessa', () => {
    const dup = classifyKey('status/X.REM.duplicado-20260810T2026.json');
    assert.ok(isOk(dup));
    assert.notEqual(dup.value, 'remittance');
  });

  it('recusa chave fora do contrato em vez de adivinhar', () => {
    assert.ok(isErr(classifyKey('status/qualquer-coisa.txt')));
    assert.ok(isErr(classifyKey('outro-prefixo/X.json')));
  });
});

describe('status/ — envelope JSON', () => {
  it('lê os campos do contrato', () => {
    const r = parseStatus('status/PAG_X.REM.json', envelope());
    assert.ok(isOk(r));

    assert.equal(r.value.kind, 'remittance');
    assert.equal(r.value.fileName, 'PAG_000000.10082026142600_0007.REM');
    assert.equal(r.value.situation, 'transmitido');
    assert.equal(r.value.exitCode, 0);
    assert.equal(r.value.logLines.length, 1);
  });

  it('aceita as quatro situações do contrato e recusa qualquer outra', () => {
    for (const situacao of ['transmitido', 'falha', 'revisao', 'recepcao']) {
      assert.ok(isOk(parseStatus('status/X.REM.json', envelope({ situacao }))));
    }
    const r = parseStatus('status/X.REM.json', envelope({ situacao: 'concluido' }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'van-status-unknown-situation');
  });

  it('recusa JSON malformado e campo faltando, sem inventar default', () => {
    assert.ok(isErr(parseStatus('status/X.REM.json', 'nao é json')));

    const missing = parseStatus('status/X.REM.json', JSON.stringify({ arquivo: 'X' }));
    assert.ok(isErr(missing));
    assert.equal(missing.error, 'van-status-missing-field');
  });

  // O agente grava UTF-8 sem BOM justamente para permitir JSON.parse direto. Se um BOM aparecer,
  // é sinal de que algo no caminho reencodou o arquivo — melhor tolerar que falhar a remessa.
  it('tolera BOM, caso algo no caminho reencodifique o arquivo', () => {
    const r = parseStatus('status/X.REM.json', `\uFEFF${envelope()}`);
    assert.ok(isOk(r));
  });

  // O agente publica `exitCode: null` quando o STCPCLT NÃO chegou a ser executado — é o caso do
  // duplicado. Exigir número rejeitava esse envelope inteiro, e duplicado é justamente o status que
  // não pode ficar ilegível: dele depende saber se a remessa saiu ou não.
  it('aceita exitCode nulo — sem execução não existe código de saída', () => {
    const r = parseStatus(
      'status/X.REM.duplicado-20260811T1200.json',
      envelope({ exitCode: null, situacao: 'revisao', codigoStcp: null }),
    );
    assert.ok(isOk(r));
    assert.equal(r.value.exitCode, null);
    assert.equal(r.value.kind, 'duplicate');
    assert.equal(wasTransmitted(r.value), false);
  });

  it('continua recusando exitCode que não é número nem nulo', () => {
    const r = parseStatus('status/X.REM.json', envelope({ exitCode: 'zero' }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'van-status-missing-field');
  });

  it('preserva as linhas do log cruas, sem decodificar', () => {
    const raw = ['linha um', 'linha dois'];
    const r = parseStatus('status/X.REM.json', envelope({ logTransferencia: raw }));
    assert.ok(isOk(r));
    assert.deepEqual(r.value.logLines, raw);
  });
});

describe('status/ — só uma coisa conta como transmissão', () => {
  const parse = (over: Record<string, unknown>, key = 'status/X.REM.json') => {
    const r = parseStatus(key, envelope(over));
    assert.ok(isOk(r));
    return r.value;
  };

  it('transmitido é transmitido', () => {
    assert.equal(wasTransmitted(parse({ situacao: 'transmitido' })), true);
  });

  it('falha, revisão e recepção não são', () => {
    assert.equal(wasTransmitted(parse({ situacao: 'falha' })), false);
    assert.equal(wasTransmitted(parse({ situacao: 'revisao' })), false);
    assert.equal(wasTransmitted(parse({ situacao: 'recepcao' })), false);
  });

  // Duplicado significa "o agente reconheceu o nome e NÃO acionou o STCPCLT". Tratar como
  // transmissão marcaria como enviada uma remessa que não saiu nesta execução.
  it('duplicado nunca conta como transmissão, qualquer que seja a situação declarada', () => {
    const dup = parse({ situacao: 'transmitido' }, 'status/X.REM.duplicado-20260810T2026.json');
    assert.equal(dup.kind, 'duplicate');
    assert.equal(wasTransmitted(dup), false);
  });
});

// O teto do `detalhe` (#781). O produtor mediu: o desfecho de evidência física ilegível interpola
// DOIS erros de sistema operacional com o caminho completo, e um caminho de pasta de 102 caracteres
// já produz 513. A coluna é `varchar(512)` — e no MySQL estrito exceder é erro 1406, não
// truncamento: o INSERT falharia e o DESFECHO da remessa se perderia por causa de um campo de
// diagnóstico.
describe('status/ — o `detalhe` é diagnóstico: cortado, nunca causa de recusa', () => {
  const parse = (detalhe: string): { detail: string } => {
    const r = parseStatus('status/X.REM.json', envelope({ detalhe }));
    assert.ok(isOk(r));
    return r.value;
  };

  it('o que cabe passa intacto — inclusive no limite exato', () => {
    const noLimite = 'á'.repeat(VAN_STATUS_DETAIL_MAX_LENGTH);

    const detail = parse(noLimite).detail;

    assert.equal(detail, noLimite, 'a fronteira é <=, não <');
    assert.equal(Array.from(detail).length, VAN_STATUS_DETAIL_MAX_LENGTH);
  });

  it('o que excede é cortado ao teto, e o resultado CABE na coluna', () => {
    const detail = parse('x'.repeat(900)).detail;

    assert.equal(Array.from(detail).length, VAN_STATUS_DETAIL_MAX_LENGTH);
  });

  it('o corte é marcado — diagnóstico cortado em silêncio parece completo', () => {
    const detail = parse('x'.repeat(900)).detail;

    assert.match(detail, /\[truncado\]$/, 'sem a marca, quem lê conclui que o erro terminou ali');
  });

  it('preserva o COMEÇO, que é onde mora a instrução ao operador', () => {
    const instrucao = 'ARQUIVO PODE TER SAÍDO — conferir com o banco antes de reenviar. ';

    const detail = parse(instrucao + 'caminho longo '.repeat(60)).detail;

    assert.ok(detail.startsWith(instrucao), 'cortar por trás sacrificaria o que dizer ao humano');
  });

  // Um `detalhe` acima do teto NÃO pode virar `van-status-missing-field`: o caminho que estoura é
  // justamente o desfecho AMBÍGUO — "pode ter saído, ninguém sabe, chame um humano" —, e recusar o
  // envelope perderia exatamente o desfecho que mais precisa de humano.
  it('não vira erro: campo de diagnóstico não derruba o registro do desfecho', () => {
    const r = parseStatus('status/X.REM.json', envelope({ detalhe: 'x'.repeat(5000) }));

    assert.ok(isOk(r));
    assert.equal(r.value.situation, 'transmitido', 'a DECISÃO sobrevive ao corte do diagnóstico');
  });

  // A conta do MySQL é por CARACTERE. Medir por `length` de JS (unidades UTF-16) daria um número
  // maior num texto com par substituto, e o corte cairia no lugar errado — partindo o par.
  it('conta pontos de código, não unidades UTF-16', () => {
    const detail = parse('😀'.repeat(400)).detail;

    assert.ok(Array.from(detail).length <= VAN_STATUS_DETAIL_MAX_LENGTH);
    assert.ok(!detail.includes('�'), 'nenhum par substituto partido ao meio');
  });
});
