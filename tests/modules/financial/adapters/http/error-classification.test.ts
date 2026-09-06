/**
 * FIN-HTTP-ERROR-PUBLIC-CODE — W0 RED (#52, OWASP API8:2023).
 *
 * Classificação de erro de domínio → status HTTP + code público + mensagem PT-BR.
 * RED enquanto `error-mapping.ts` não existir (a lógica vive hoje inline no plugin).
 * Cobre os 2 bugs de mapeamento: `partner-ref-invalid` (deve 400) e
 * `timeline-document-not-found` (deve 404) — hoje ambos caem em 422.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  writeErrorStatus,
  toPublicCode,
  toPublicMessage,
} from '#src/modules/financial/adapters/http/error-mapping.ts';

describe('error-mapping — status HTTP por slug (#52)', () => {
  const cases: readonly (readonly [string, number])[] = [
    ['document-not-found', 404],
    ['timeline-document-not-found', 404], // bug-fix (hoje 422)
    ['document-version-conflict', 409],
    ['invalid-state-transition', 409],
    ['partner-ref-invalid', 400], // bug-fix (hoje 422)
    ['user-ref-invalid', 400], // W2-F3: ref inválida é bad-request
    ['financial-ref-invalid', 400],
    ['document-id-invalid', 400],
    ['net-value-not-positive', 422],
    ['document-incomplete', 422],
    ['document-repository-failure', 503],
    ['timeline-repository-failure', 503], // W2-F2: falha de infra é 503, não 422
    ['outbox-append-failed', 503],
  ];
  for (const [slug, status] of cases) {
    it(`${slug} → ${status}`, () => {
      assert.equal(writeErrorStatus(slug), status);
    });
  }
});

describe('error-mapping — code público (#52)', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['document-not-found', 'not-found'],
    ['timeline-document-not-found', 'not-found'],
    ['document-version-conflict', 'conflict'],
    ['invalid-state-transition', 'conflict'],
    ['partner-ref-invalid', 'bad-request'],
    ['user-ref-invalid', 'bad-request'],
    ['document-id-invalid', 'bad-request'],
    ['net-value-not-positive', 'unprocessable'],
    ['document-incomplete', 'unprocessable'],
    ['document-repository-failure', 'internal'],
    ['timeline-repository-failure', 'internal'],
  ];
  for (const [slug, code] of cases) {
    it(`${slug} → ${code}`, () => {
      assert.equal(toPublicCode(slug), code);
    });
  }
});

describe('error-mapping — mensagem PT-BR nunca vaza o slug (#52)', () => {
  const slugs = [
    'document-version-conflict',
    'document-not-found',
    'invalid-state-transition',
    'document-incomplete',
    'partner-ref-invalid',
    'net-value-not-positive',
  ];
  for (const slug of slugs) {
    it(`${slug} tem mensagem PT-BR ≠ slug`, () => {
      const msg = toPublicMessage(slug);
      assert.ok(msg.length > 0, 'mensagem não pode ser vazia');
      assert.notEqual(msg, slug, 'mensagem não pode ser o slug interno');
    });
  }
});

/*
 * As lacunas da conta-cedente (#856) — e por que elas precisam de bloco próprio.
 *
 * ⚠️ O mapa de mensagens é `ReadonlySet` + objeto, NÃO união exaustiva: o compilador não cobra a
 * linha, e um slug sem entrada sai no fallback genérico. Quem gerar remessa com a agência
 * malformada leria "erro interno" para um dado que ele mesmo corrige na tela — que é exatamente o
 * defeito de UX que a #722 fechou para o convênio e que estes slugs poderiam reintroduzir.
 *
 * O bloco também vigia a DISTINÇÃO: os dois da inscrição terminam em ações opostas — o ausente se
 * resolve no cadastro, o alfanumérico não se resolve em lugar nenhum do ERP e manda escalar ao
 * banco. Uma mensagem só serviria mal às duas.
 */
describe('error-mapping — as lacunas da conta-cedente têm mensagem própria (#856)', () => {
  const slugs = [
    'cedente-agency-missing',
    'cedente-agency-malformed',
    'cedente-agency-digit-malformed',
    'cedente-inscription-missing',
    'cedente-inscription-alphanumeric',
  ];

  for (const slug of slugs) {
    it(`${slug} tem mensagem PT-BR ≠ slug`, () => {
      const msg = toPublicMessage(slug);
      assert.ok(msg.length > 0, 'mensagem não pode ser vazia');
      assert.notEqual(msg, slug, 'mensagem não pode ser o slug interno');
      assert.notEqual(
        msg,
        toPublicMessage('slug-que-nao-existe-no-mapa'),
        'slug sem entrada cai no fallback genérico e não diz o que corrigir',
      );
    });
  }

  it('as mensagens são DISTINTAS entre si', () => {
    const messages = new Set(slugs.map((s) => toPublicMessage(s)));
    assert.equal(messages.size, slugs.length);
  });
});

// Os dois conflitos de CAS por título nasceram como UM slug só, e a mensagem — escrita para a baixa
// — chegava a quem tinha tentado reagendar. O gate não pegou: os testes da borda asseram
// `error.code`, e é a decisão certa (acoplar teste a string de UX é frágil). O efeito colateral é
// que NADA neste repositório verifica se o texto ao humano corresponde à operação que ele descreve.
//
// Este bloco é a rede mínima dessa classe: não assere o CONTEÚDO das frases — que pode ser
// reescrito à vontade —, e sim que elas continuam SENDO DUAS. Colapsar os slugs, apagar uma das
// mensagens (as duas cairiam no mesmo fallback genérico) ou copiar uma sobre a outra falha aqui.
describe('error-mapping — os dois conflitos de título falam de operações diferentes', () => {
  const PAYMENT = 'payable-payment-conflict';
  const RESCHEDULE = 'payable-reschedule-conflict';

  it('ambos são 409 — conflito de estado, não erro de dado', () => {
    assert.equal(writeErrorStatus(PAYMENT), 409);
    assert.equal(writeErrorStatus(RESCHEDULE), 409);
  });

  it('ambos expõem o mesmo code público — o front distingue pelo fluxo, não pelo code', () => {
    assert.equal(toPublicCode(PAYMENT), toPublicCode(RESCHEDULE));
  });

  it('as mensagens ao operador são DISTINTAS', () => {
    const paymentMsg = toPublicMessage(PAYMENT);
    const rescheduleMsg = toPublicMessage(RESCHEDULE);

    assert.notEqual(
      paymentMsg,
      rescheduleMsg,
      'baixa e reagendamento pedem ações diferentes do operador; uma frase só não diz o que fazer em nenhuma',
    );
  });

  it('nenhuma das duas caiu no fallback genérico do code', () => {
    // Se a entrada de um slug for removida do mapa, `toPublicMessage` devolve o fallback do code
    // público — e como os dois compartilham o code, as duas mensagens voltariam a ser iguais. Este
    // caso nomeia esse modo de falha para que a mensagem de erro aponte a causa, não o sintoma.
    const genericForConflict = toPublicMessage('slug-que-nao-existe-no-mapa-de-conflito');
    assert.notEqual(toPublicMessage(PAYMENT), genericForConflict);
    assert.notEqual(toPublicMessage(RESCHEDULE), genericForConflict);
  });
});
