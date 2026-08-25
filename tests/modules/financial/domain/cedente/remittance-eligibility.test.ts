import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: a aptidão da conta-cedente à remessa ainda não é verificável.
import { checkCedenteRemittanceReadiness } from '#src/modules/financial/domain/cedente/remittance-eligibility.ts';

/**
 * A conta-cedente está apta a GERAR remessa? (#722)
 *
 * O convênio é opcional no cadastro — a conta serve à conciliação sem ele — e obrigatório para a
 * remessa, porque é dele que sai o nome do arquivo pelo qual o banco identifica a fila de destino.
 *
 * Sem esta verificação a falha acontece três camadas adiante, no montador do nome, e chega ao
 * operador como 503 genérico: nada indica que falta um campo, nem em qual tela preenchê-lo.
 */

const account = (convenio: string) => ({ convenio });

describe('Aptidão da conta-cedente à remessa (#722)', () => {
  it('conta com convênio numérico está apta', () => {
    assert.ok(isOk(checkCedenteRemittanceReadiness(account('000000'))));
  });

  // O caso que motivou a issue: cadastro aceito, remessa impossível.
  it('convênio ausente é lacuna NOMEADA, não falha genérica', () => {
    const r = checkCedenteRemittanceReadiness(account(''));
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-convenio-missing');
  });

  it('trata espaço em branco como ausente', () => {
    for (const blank of [' ', '   ', '\t']) {
      const r = checkCedenteRemittanceReadiness(account(blank));
      assert.ok(isErr(r), JSON.stringify(blank));
      assert.equal(r.error, 'cedente-convenio-missing');
    }
  });

  // Ausente e malformado são lacunas DIFERENTES porque a ação do operador é diferente: uma pede
  // preenchimento, a outra pede correção do que já está lá.
  it('convênio não-numérico é malformado, distinto de ausente', () => {
    const r = checkCedenteRemittanceReadiness(account('ABC-123'));
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-convenio-malformed');
  });

  // #804: o Validador Universal lê o convênio só em 033-038, e acima disso o banco não recusa —
  // TRUNCA, e processa a remessa sob outro contrato. A conferência vive aqui, e não apenas no
  // emissor, por causa da ordem: esta função roda ANTES de alocar o NSA, e o número não volta
  // depois de consumido. Descobrir o problema no montador queimaria um da sequência por tentativa.
  it('convênio acima de 6 posições é recusado, em vez de o banco truncar', () => {
    const r = checkCedenteRemittanceReadiness(account('0000001'));
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-convenio-too-long');
  });

  it('aceita convênio no limite de 6 posições', () => {
    assert.ok(isOk(checkCedenteRemittanceReadiness(account('000000'))));
  });

  it('aceita convênio com espaços em volta, sem exigir que o operador os remova', () => {
    assert.ok(isOk(checkCedenteRemittanceReadiness(account('  000000  '))));
  });
});
