import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: a aptidão da conta-cedente à remessa ainda não é verificável.
import {
  checkCedenteAgency,
  checkCedenteConvenio,
  checkCedenteInscription,
  checkCedenteRemittanceReadiness,
} from '#src/modules/financial/domain/cedente/remittance-eligibility.ts';

/**
 * A conta-cedente está apta a GERAR remessa? (#722)
 *
 * O convênio é opcional no cadastro — a conta serve à conciliação sem ele — e obrigatório para a
 * remessa, porque é dele que sai o nome do arquivo pelo qual o banco identifica a fila de destino.
 *
 * Sem esta verificação a falha acontece três camadas adiante, no montador do nome, e chega ao
 * operador como 503 genérico: nada indica que falta um campo, nem em qual tela preenchê-lo.
 */

// Agência e inscrição sintéticas e VÁLIDAS em todos os casos de convênio: desde a #856 a readiness
// olha os três campos, e um fixture inválido faria os casos de convênio passarem pelo motivo errado.
const account = (convenio: string) => ({
  convenio,
  agency: '01234',
  document: '12345678000199',
});

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

/**
 * A AGÊNCIA do cedente — posições 053-057 (#856, herdado da #859).
 *
 * O que torna este bloco diferente do de cima: o convênio ausente tem uma barreira adiante (o
 * montador do nome do arquivo); a agência corrompida NÃO TEM NENHUMA. `digits()` remove o separador
 * e o resultado cabe no campo, então nem `numeric-field-overflow` nem o `remittance-inspector` —
 * que valida forma, e a forma fica perfeita — enxergam o defeito. O arquivo vai ao banco apontando
 * outra agência, em toda remessa daquela conta.
 */
describe('Aptidão da conta-cedente à remessa — a agência (#856)', () => {
  const withAgency = (agency: string) => ({
    convenio: '000000',
    agency,
    document: '12345678000199',
  });

  it('agência de até 5 dígitos está apta', () => {
    for (const agency of ['1', '1234', '01234', '99999']) {
      assert.ok(isOk(checkCedenteAgency({ agency })), agency);
    }
  });

  it('agência ausente é lacuna NOMEADA', () => {
    for (const blank of ['', ' ', '\t']) {
      const r = checkCedenteAgency({ agency: blank });
      assert.ok(isErr(r), JSON.stringify(blank));
      assert.equal(r.error, 'cedente-agency-missing');
    }
  });

  // ⚠️ O CASO QUE ESTE BLOCO EXISTE PARA FIXAR. O operador digita a agência COM o DV na tela; se o separador
  // sobreviver até o cadastro, `digits('01234-5', 5)` devolve `12345` — cinco dígitos, cabe, ninguém
  // reclama — onde o banco espera `01234`. Recusar é a única saída que não adivinha qual metade é a
  // agência: `12345` é `1234`+`5` ou `12345` sem DV? A #708 já decidiu que isso não se resolve por
  // palpite, e sim com campo próprio — o `agencyDigit`.
  it('agência com separador é RECUSADA, nunca truncada em silêncio', () => {
    for (const agency of ['01234-5', '0123/4', '1.234']) {
      const r = checkCedenteAgency({ agency });
      assert.ok(isErr(r), agency);
      assert.equal(r.error, 'cedente-agency-malformed', agency);
    }
  });

  it('agência acima de 5 posições é recusada ANTES do NSA, e não no montador', () => {
    const r = checkCedenteAgency({ agency: '123456' });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-agency-malformed');
  });

  /*
   * ⚠️ O DV DA AGÊNCIA — a recusa que impede este PR de reintroduzir o defeito que ele fecha.
   *
   * `alpha()` faz `.slice(0, size)`, e a 058 tem UMA posição: `text('12', 1)` descarta o segundo
   * caractere e `text('-2', 1)` grava um `-` literal — os dois em silêncio, num campo de
   * identificação bancária. O alfabeto vem do manual, não de palpite: dígito, `X` para resto 10, e
   * `P` no Bradesco quando o resto é 1 (4008-523-0096 v16, p. 30).
   */
  it('aceita os DVs que o manual admite — dígito, X e P, em qualquer caixa', () => {
    for (const digit of ['0', '9', 'X', 'P', 'p', 'x']) {
      assert.ok(isOk(checkCedenteAgency({ agency: '01234', agencyDigit: digit })), digit);
    }
  });

  it('DV ausente é legítimo — a agência pode não ter dígito, e a 058 sai em branco', () => {
    assert.ok(isOk(checkCedenteAgency({ agency: '01234' })));
    assert.ok(isOk(checkCedenteAgency({ agency: '01234', agencyDigit: '' })));
    assert.ok(isOk(checkCedenteAgency({ agency: '01234', agencyDigit: '  ' })));
  });

  it('DV de dois caracteres é RECUSADO, em vez de gravado pela metade', () => {
    const r = checkCedenteAgency({ agency: '01234', agencyDigit: '5X' });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-agency-digit-malformed');
  });

  it('DV fora do alfabeto do manual é recusado — inclusive o que viraria caractere literal', () => {
    for (const digit of ['-', 'Z', 'ç', '/']) {
      const r = checkCedenteAgency({ agency: '01234', agencyDigit: digit });
      assert.ok(isErr(r), digit);
      assert.equal(r.error, 'cedente-agency-digit-malformed', digit);
    }
  });

  // A ordem importa para quem lê a mensagem: sem agência não há dígito de que falar.
  it('o número da agência é cobrado ANTES do dígito', () => {
    const r = checkCedenteAgency({ agency: '', agencyDigit: '5X' });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-agency-missing');
  });

  it('a readiness completa cobra as duas coisas — convênio bom não absolve agência ruim', () => {
    const r = checkCedenteRemittanceReadiness(withAgency('01234-5'));
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-agency-malformed');
  });

  // O contrato que a edição de conta-cedente depende: perguntar pelo convênio NÃO pode responder
  // sobre a agência. Sem esta separação, uma conta de agência malformada destravaria a troca de um
  // convênio perfeito — que é o invariante do #722.
  it('a régua do convênio ignora a agência, e é por isso que ela existe separada', () => {
    assert.ok(isOk(checkCedenteConvenio({ convenio: '000000' })));
  });
});

/**
 * A INSCRIÇÃO do cedente — 019-032, `G006` (#856, CA3).
 *
 * O que este bloco impede é a mesma classe de defeito da agência, num campo mais grave: o emissor
 * grava a inscrição com um helper que remove tudo que não é dígito. Sobre `12ABC34501DE35` isso não
 * tira máscara — destrói conteúdo, e devolve `00000123450135`: catorze dígitos, campo `Num` válido,
 * arquivo aceito, cedente declarado que não é o titular da conta que paga.
 *
 * O CNPJ alfanumérico é emitido pela Receita desde 07/2026 (ADR-0044); o layout do banco é de
 * jul/2025 e declara o campo `Num`. Recusar com nome próprio é a única saída que não inventa layout.
 */
describe('Aptidão da conta-cedente à remessa — a inscrição (#856 CA3)', () => {
  it('CNPJ e CPF numéricos estão aptos', () => {
    assert.ok(isOk(checkCedenteInscription({ document: '12345678000199' })));
    assert.ok(isOk(checkCedenteInscription({ document: '12345678909' })));
  });

  it('máscara não é defeito — ela é tirada, não recusada', () => {
    assert.ok(isOk(checkCedenteInscription({ document: '12.345.678/0001-99' })));
  });

  // ⚠️ O caso central: RECUSA, jamais zero-padding do que sobrou das letras.
  it('CNPJ alfanumérico é RECUSADO com slug próprio, nunca truncado em silêncio', () => {
    const r = checkCedenteInscription({ document: '12ABC34501DE35' });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-inscription-alphanumeric');
  });

  it('inscrição ausente é lacuna distinta — o operador preenche, e é outra ação', () => {
    for (const blank of ['', '   ']) {
      const r = checkCedenteInscription({ document: blank });
      assert.ok(isErr(r), JSON.stringify(blank));
      assert.equal(r.error, 'cedente-inscription-missing');
    }
  });

  // ⚠️ `'---'` sobrevive ao `trim()` e normaliza para vazio. Uma régua que perguntasse pelo trim o
  // veria como inscrição PRESENTE e — não sendo numérico — o chamaria de alfanumérica, mandando
  // escalar ao Bradesco um cadastro que só está incompleto.
  it('só-pontuação é AUSENTE, não alfanumérico — a distinção decide para quem o chamado vai', () => {
    for (const punctuation of ['---', '.', './-']) {
      const r = checkCedenteInscription({ document: punctuation });
      assert.ok(isErr(r), punctuation);
      assert.equal(r.error, 'cedente-inscription-missing', punctuation);
    }
  });

  it('a readiness completa cobra a inscrição junto com o resto', () => {
    const r = checkCedenteRemittanceReadiness({
      convenio: '000000',
      agency: '01234',
      document: '12ABC34501DE35',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-inscription-alphanumeric');
  });
});
