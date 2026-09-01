import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { exhaustiveStringUnion } from '#src/shared/primitives/exhaustive.ts';
import { checkPayoutReadiness } from '#src/modules/financial/domain/payout/payout-readiness.ts';
import { hasRemittanceIssuer } from '#src/modules/financial/domain/payout/van-routes.ts';
import type { PayoutCandidate, VanRoute } from '#src/modules/financial/domain/payout/types.ts';
import { batchProfileFor } from '#src/modules/financial/adapters/cnab/batch-profile.ts';
import type { ProfiledPayment } from '#src/modules/financial/adapters/cnab/batch-profile.ts';

/**
 * A PROPRIEDADE QUE PROVA A UNIFICAÇÃO (#837).
 *
 * Duas réguas decidiam o mesmo fato e discordavam: o pré-voo (`checkPayoutReadiness`) aprovava a
 * Guia de Recolhimento porque o código de barras estava válido, e o emissor (`batchProfileFor`) a
 * recusava. O operador conferia a linha como apta e só descobria no clique em Gerar.
 *
 * O que este arquivo fixa NÃO é "a guia é recusada" — isso é o estado de hoje, e caduca. É a
 * BICONDICIONAL, que não caduca:
 *
 *     para toda rota, com cadastro completo:  pré-voo aprova  ⟺  emissor aceita
 *
 * Ligar uma rota num lado só quebra o teste. É por isso que o caso é parametrizado por
 * `hasRemittanceIssuer` — a própria fonte — e não por uma lista escrita aqui: uma segunda lista no
 * teste seria a terceira cópia da verdade, e passaria a concordar consigo mesma enquanto o código
 * divergisse.
 *
 * ⚠️ POR QUE O SLUG DO ERRO É ASSERTADO, e não só `isErr`. `batchProfileFor` falha por TRÊS motivos:
 * `remittance-launch-form-unsupported`, `remittance-payee-bank-unreadable` e
 * `remittance-billet-bank-unreadable`. Uma bicondicional sobre `ok`/`!ok` ficaria verde se o payload
 * falhasse pelo motivo errado — banco ilegível em vez de rota sem emissor —, e quem fosse consertar
 * mexeria no lado errado da régua. É a lição do teste de concorrência da inquiry-0031 §3.7, que
 * passou 100% das vezes em que o defeito acontecia porque só perguntava SE havia erro, nunca QUAL.
 */

// Exaustivo por construção: se `VanRoute` ganhar um membro, o compilador exige que ele entre aqui —
// e o `PAYLOADS` abaixo exige o par de fixtures dele. Uma rota nova não pode passar despercebida por
// esta prova, que é o modo clássico de um gate ficar verde por vacuidade.
const ALL_ROUTES = exhaustiveStringUnion<VanRoute>()([
  'pix',
  'transfer',
  'billet',
  'tax-guide',
] as const);

const CEDENTE_BANK = '237';

// 44 dígitos, o que o Segmento J grava (G063). Sintético: linha digitável real identifica cedente,
// valor e vencimento, e os três repositórios são públicos.
const BARCODE = '23791234500000150000123456789012345678901234';

// ⚠️ Banco `001` no favorecido, e não `237`, por dois motivos que se somam. Ele difere do cedente,
// então a transferência deriva TED de outra titularidade em vez de crédito em conta — e o dígito
// verificador não é verificável para `001` (o algoritmo não está no acervo), então a conta passa por
// FORMA. Usar `237` faria esta prova depender da aritmética do DV, que não é o assunto dela.
const PAYEE_BANK = '001';

// O par de fixtures COMPLETAS de cada rota: o que o cadastro precisa ter, e o que o emissor precisa
// receber. "Completo" aqui significa completo o bastante para os outros dois slugs de erro não
// dispararem — banco legível na transferência, três dígitos iniciais válidos no boleto.
const PAYLOADS: Readonly<
  Record<VanRoute, Readonly<{ candidate: PayoutCandidate; profiled: ProfiledPayment }>>
> = {
  pix: {
    candidate: {
      paymentMethod: 'PIX',
      paymentDetail: null,
      payee: {
        bank: null,
        agency: null,
        accountNumber: null,
        checkDigit: null,
        pixKey: { keyType: 'email', key: 'a@b.com' },
      },
    },
    profiled: { route: 'pix' },
  },
  transfer: {
    candidate: {
      paymentMethod: 'TED',
      paymentDetail: null,
      payee: {
        bank: PAYEE_BANK,
        agency: '1234-5',
        accountNumber: '123456',
        checkDigit: '0',
        pixKey: null,
      },
    },
    profiled: { route: 'transfer', payeeBankCode: PAYEE_BANK },
  },
  billet: {
    candidate: { paymentMethod: 'Boleto', paymentDetail: BARCODE, payee: null },
    profiled: { route: 'billet', barcode: BARCODE },
  },
  'tax-guide': {
    candidate: { paymentMethod: 'GuiaRecolhimento', paymentDetail: BARCODE, payee: null },
    profiled: { route: 'tax-guide' },
  },
};

describe('rotas com emissor — a régua do pré-voo e a do emissor são a mesma (#837)', () => {
  // A prova central. Vale para as quatro rotas de hoje e para qualquer rota futura, sem edição.
  for (const route of ALL_ROUTES) {
    it(`${route}: com cadastro completo, o pré-voo aprova exatamente quando o emissor aceita`, () => {
      const { candidate, profiled } = PAYLOADS[route];

      const readiness = checkPayoutReadiness(candidate);
      const profile = batchProfileFor(profiled, CEDENTE_BANK);

      assert.equal(
        readiness.status === 'ready',
        profile.ok,
        `pré-voo (${readiness.status}) e emissor (${profile.ok ? 'ok' : profile.error}) discordam ` +
          `sobre a rota ${route} — é a divergência que a #837 fechou`,
      );
    });

    it(`${route}: a recusa dos dois lados é "rota sem emissor", não outro defeito`, () => {
      const { candidate, profiled } = PAYLOADS[route];

      const readiness = checkPayoutReadiness(candidate);
      const profile = batchProfileFor(profiled, CEDENTE_BANK);
      const expected = hasRemittanceIssuer(route);

      // O slug EXATO, e não `isErr`: com o payload completo, o único motivo de recusa admissível é a
      // ausência de emissor. Qualquer outro slug significa que a fixture está incompleta e a
      // bicondicional acima ficou verde medindo outra coisa.
      assert.equal(
        profile.ok ? null : profile.error,
        expected ? null : 'remittance-launch-form-unsupported',
        `emissor recusou ${route} pelo motivo errado`,
      );

      // CA2 — as duas mensagens não divergem. O pré-voo diz `no-issuer`, e não `incomplete`: mandar
      // o operador ao cadastro atrás de um dado que não falta é a mensagem errada sobre o fato certo.
      assert.equal(
        readiness.status,
        expected ? 'ready' : 'no-issuer',
        `pré-voo classificou ${route} com status que não corresponde à recusa do emissor`,
      );
    });
  }

  // CA5 — a fonte é uma só, e é ela que ambos os lados consultam.
  //
  // Este caso é o que falha quando alguém liga uma rota escrevendo o `case` no emissor sem tocar
  // `ROUTES_WITH_ISSUER` (ou o inverso): a partição deixaria de descrever o comportamento real dos
  // dois lados, e os dois blocos acima já quebrariam. Aqui a asserção é sobre a PARTIÇÃO em si —
  // toda rota cai de um lado ou do outro, e nenhuma cai nos dois.
  it('a fonte particiona as rotas, e a partição é a que os dois lados praticam', () => {
    const withIssuer = ALL_ROUTES.filter((r) => hasRemittanceIssuer(r));
    const withoutIssuer = ALL_ROUTES.filter((r) => !hasRemittanceIssuer(r));

    assert.equal(
      withIssuer.length + withoutIssuer.length,
      ALL_ROUTES.length,
      'toda rota tem de cair de um lado da partição',
    );

    // Propriedade, não contagem: não se afirma QUANTAS rotas têm emissor — esse número muda quando a
    // #838 entrar, e um teste que o fixasse viraria trabalho de manutenção sem valor. Afirma-se que
    // cada lado da partição se comporta como o seu nome diz, nos DOIS consumidores.
    for (const route of withIssuer) {
      assert.ok(
        batchProfileFor(PAYLOADS[route].profiled, CEDENTE_BANK).ok,
        `${route} está na fonte como tendo emissor, mas o emissor a recusa`,
      );
      assert.equal(
        checkPayoutReadiness(PAYLOADS[route].candidate).status,
        'ready',
        `${route} está na fonte como tendo emissor, mas o pré-voo não a aprova`,
      );
    }

    for (const route of withoutIssuer) {
      assert.equal(
        checkPayoutReadiness(PAYLOADS[route].candidate).status,
        'no-issuer',
        `${route} não tem emissor na fonte, mas o pré-voo não diz isso ao operador`,
      );
    }
  });

  // CA4 — os dois motivos coexistem e não se confundem. A ordem das perguntas é a decisão: o DADO é
  // julgado primeiro, e só cadastro completo chega a ser recusado por falta de emissor.
  //
  // Invertida, a ordem esconderia a pendência de cadastro atrás de um `no-issuer` temporário — e ela
  // reapareceria inteira no dia em que o emissor entrasse, sem ninguém ter sido avisado enquanto
  // havia tempo de corrigir.
  it('rota sem emissor E sem dado aponta o dado que falta, não a ausência de emissor', () => {
    const semChave = checkPayoutReadiness({
      paymentMethod: 'PIX',
      paymentDetail: null,
      payee: { bank: null, agency: null, accountNumber: null, checkDigit: null, pixKey: null },
    });

    assert.equal(semChave.status, 'incomplete');
    assert.deepEqual(
      semChave.status === 'incomplete' ? semChave.gaps.map((g) => g.field) : [],
      ['pix-key'],
      'a lacuna de cadastro tem de sobreviver à ausência de emissor: ela não caduca, a outra sim',
    );
  });

  // Fora da VAN é outra coisa, e a distinção é a razão de `no-issuer` existir como valor próprio.
  // `out-of-van` é definitivo — o layout contratado não transporta câmbio, e nenhum emissor futuro
  // muda isso. `no-issuer` cai sozinho quando a rota ganhar emissor.
  it('fora da VAN não vira "sem emissor" — um é definitivo, o outro é transitório', () => {
    const cambio = checkPayoutReadiness({
      paymentMethod: 'Cambio',
      paymentDetail: null,
      payee: null,
    });
    assert.equal(cambio.status, 'out-of-van');
  });
});
