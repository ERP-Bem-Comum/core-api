// O exercício da VAN, provado contra o emissor REAL.
//
// Um fake de tradutor aqui não valeria nada: o que este teste existe para cobrar é justamente que
// os dados sintéticos do arquivo de exercício atravessam o Multipag de verdade — inclusive a
// inspeção estrutural que o `CnabRemittanceTranslator` faz antes de devolver. Com um tradutor
// falso, o teste ficaria verde no dia em que o cedente fictício deixasse de ser aceito.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { uploadSandboxRemittance } from '#src/modules/financial/application/use-cases/upload-sandbox-remittance.ts';
import { createBradescoMultipagTranslator } from '#src/modules/financial/adapters/cnab/bradesco-multipag-translator.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';

const AT = new Date('2026-08-26T13:45:07Z');

const build = () => {
  const storage = createInMemoryVanStorage();
  const run = uploadSandboxRemittance({
    translator: createBradescoMultipagTranslator(),
    putSandbox: storage.putSandbox,
    now: () => AT,
  });
  return { storage, run };
};

describe('exercício da VAN — sobe .REM fictício em sandbox/', () => {
  it('gera arquivo aceito pelo emissor real e grava sob o prefixo de exercício', async () => {
    const { run } = build();

    const result = await run();

    assert.ok(isOk(result), `emissor recusou o arquivo de exercicio: ${JSON.stringify(result)}`);
    // O prefixo é o contrato inteiro desta rota: em `saida/`, o mesmo arquivo seria pagamento.
    assert.ok(
      result.value.key.startsWith('sandbox/'),
      `gravou fora de sandbox/: ${result.value.key}`,
    );
    assert.ok(result.value.lineCount > 0);
    assert.equal(result.value.batchCount, 1);
    assert.equal(result.value.totalCents, 12_345);
  });

  it('nomeia o arquivo com o convênio mascarado e o NSA fixo', async () => {
    const { run } = build();

    const result = await run();

    assert.ok(isOk(result));
    // `PAG_<convenio>.<DDMMAAAAHHMMSS>_<NSA>.REM` — o convênio `000000` é o reservado, e o NSA
    // constante é o que prova que nada foi alocado da sequência real.
    assert.ok(
      result.value.fileName.startsWith('PAG_000000.'),
      `convenio inesperado: ${result.value.fileName}`,
    );
    assert.ok(result.value.fileName.endsWith('_999999.REM'), result.value.fileName);
  });

  it('o conteúdo GRAVADO é ASCII imprimível — o emissor recusa o resto, sem apontar o campo', async () => {
    // O storage é o MESMO da execução: consultar um storage novo devolveria "não encontrado" e o
    // teste passaria sem ler byte nenhum — verde por vacuidade, que é o modo de falha desta suíte.
    const { storage, run } = build();

    const result = await run();
    assert.ok(isOk(result));

    const stored = await storage.getText(result.value.key);
    assert.ok(
      isOk(stored),
      'o arquivo nao foi encontrado no prefixo em que a gravacao disse gravar',
    );

    // Varre o conteúdo inteiro em vez de confiar que `alpha()` normalizou: `º ª – ½` atravessaram
    // meses porque não têm decomposição canônica em NFD (#862). `\r\n` é o terminador de registro.
    const offending = stored.value.match(/[^\x20-\x7E\r\n]/gu) ?? [];
    assert.deepEqual(offending, [], `caracteres fora de ASCII: ${offending.join(',')}`);

    // Todo registro termina em CRLF, o trailer de arquivo inclusive — `join` deixaria o último sem,
    // e o Validador Universal recusou exatamente isso (#804, defeito 6).
    assert.ok(stored.value.endsWith('\r\n'), 'o ultimo registro nao termina em CRLF');
  });
});
