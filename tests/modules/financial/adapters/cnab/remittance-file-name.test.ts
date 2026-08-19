import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: o gerador de nome do arquivo de remessa ainda não existe.
import {
  buildRemittanceFileName,
  MAX_FILE_NAME_LENGTH,
  REMITTANCE_EXTENSION,
} from '#src/modules/financial/adapters/cnab/remittance-file-name.ts';

const AT = new Date(Date.UTC(2026, 7, 11, 14, 26, 5));

const name = (over: Partial<Parameters<typeof buildRemittanceFileName>[0]> = {}) => {
  const r = buildRemittanceFileName({
    convenio: '000000',
    nsa: 7,
    generatedAt: AT,
    ...over,
  });
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

describe('Nome da remessa — espelha o padrão observado nos arquivos do banco', () => {
  // O banco já nos envia arquivos como `PAG_000000.01072026070705_0001.RET` por este mesmo perfil.
  // A remessa espelha a forma, trocando a extensão. ⚠️ PROVISÓRIO: o padrão definitivo depende de
  // confirmação do Bradesco — é pelo nome que ele identifica tipo de arquivo e fila de destino.
  //
  // ⚠️ O CONVÊNIO ESTÁ MASCARADO com zeros, e precisa continuar assim. Ele identifica o contrato
  // junto ao banco (ADR-0061) e este repositório é PÚBLICO — a higiene do épico #756 proíbe dado
  // real de cadastro em arquivo versionado. `000000` é a mesma máscara que o `van-agent` usa no
  // golden compartilhado; os dois lados do contrato mascaram o mesmo campo do mesmo jeito.
  // Substituir por um número real "para ficar fiel" reintroduz a exposição que isto corrige.
  it('monta PAG_<convenio>.<DDMMAAAAHHMMSS>_<NSA>.REM', () => {
    assert.equal(name(), 'PAG_000000.11082026142605_000007.REM');
  });

  it('usa a extensão de remessa, não a de retorno', () => {
    assert.ok(name().endsWith(REMITTANCE_EXTENSION));
    assert.equal(REMITTANCE_EXTENSION, '.REM');
  });

  it('carimba a data em UTC, como o resto do arquivo', () => {
    const n = name({ generatedAt: new Date(Date.UTC(2026, 0, 2, 3, 4, 5)) });
    assert.ok(n.includes('02012026030405'));
  });

  it('o NSA vai zero-preenchido, para o nome não mudar de tamanho com o número', () => {
    assert.ok(name({ nsa: 1 }).includes('_000001.'));
    assert.ok(name({ nsa: 999999 }).includes('_999999.'));
  });
});

describe('Nome da remessa — o que o protocolo recusa', () => {
  // Erro 1102 do STCPCLT: nome com espaço ou caractere inválido é rejeitado na transmissão.
  it('nunca produz espaço nem caractere fora de [A-Z0-9._]', () => {
    for (const convenio of ['000000', '000001']) {
      assert.ok(/^[A-Z0-9._]+$/.test(name({ convenio })));
    }
  });

  it('recusa convênio com caractere que não é dígito, em vez de sanear calado', () => {
    assert.ok(isErr(buildRemittanceFileName({ convenio: '49 19', nsa: 1, generatedAt: AT })));
    assert.ok(isErr(buildRemittanceFileName({ convenio: 'ABC', nsa: 1, generatedAt: AT })));
    assert.ok(isErr(buildRemittanceFileName({ convenio: '', nsa: 1, generatedAt: AT })));
  });

  it('recusa NSA fora da faixa do campo', () => {
    assert.ok(isErr(buildRemittanceFileName({ convenio: '000000', nsa: 0, generatedAt: AT })));
    assert.ok(
      isErr(buildRemittanceFileName({ convenio: '000000', nsa: 1_000_000, generatedAt: AT })),
    );
  });

  // O teto de 26 caracteres do erro 1101 NÃO se aplica: o perfil está configurado com 128, e os
  // arquivos que o banco já envia têm 34. Mas o teto existe, e o gerador o respeita.
  it('respeita o limite de 128 caracteres do perfil', () => {
    assert.equal(MAX_FILE_NAME_LENGTH, 128);
    assert.ok(name().length <= MAX_FILE_NAME_LENGTH);

    const tooLong = buildRemittanceFileName({
      convenio: '9'.repeat(120),
      nsa: 1,
      generatedAt: AT,
    });
    assert.ok(isErr(tooLong));
    assert.equal(tooLong.error, 'file-name-too-long');
  });
});

describe('Nome da remessa — dois arquivos nunca colidem', () => {
  // O nome é a chave de idempotência do agente: nome repetido NÃO é retransmitido. Se dois arquivos
  // distintos recebessem o mesmo nome, o segundo seria silenciosamente descartado — uma remessa
  // legítima que nunca chega ao banco.
  it('NSA diferente produz nome diferente, mesmo no mesmo instante', () => {
    assert.notEqual(name({ nsa: 1 }), name({ nsa: 2 }));
  });

  it('o mesmo NSA no mesmo instante produz o mesmo nome — geração é determinística', () => {
    assert.equal(name({ nsa: 42 }), name({ nsa: 42 }));
  });
});
