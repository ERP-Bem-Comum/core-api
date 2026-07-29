/**
 * DEADMAN-AUDIT-FALSE-FIRED — Wave W0 (RED). Issue #368.
 *
 * O auditor (`.github/workflows/deadman-audit.yml`) trata AUSÊNCIA DE QUALQUER PING como MORTE e
 * abre uma issue `priority:p1` a cada execução do cron. Já produziu 14 issues idênticas com o título
 * autocontraditório `sem sinal há 0h (limite 3d)` (#314…#366, #527…#594).
 *
 * Os 3 defeitos, no YAML:
 *   D1 `:83-85`  `else status=DEAD` — bootstrap indistinguível de morte; `age_h` fica no inicial 0.
 *   D2 `:56`     lê só `.default_threshold_days`; não itera `.emitters[]` (sweeper-vps-qa = 2d, não 3d).
 *   D3 `:88-92`  `gh issue create` roda TODA execução com status=DEAD — sem dedup por transição.
 *
 * A régua é do próprio ADR-0042 (`0042-deadman-switch-redundant.md:37`):
 *   "Dispara o payload (scripts de contingência) se `now − last_seen > limite`."
 * Sem `last_seen` a diferença é INDEFINIDA, logo a condição NÃO é satisfeita. O CA1 não afrouxa o
 * auditor — restaura o que o ADR já normatiza.
 *
 * Esta suite é PURA (sem rede, sem S3, sem `gh`, sem Docker — roda em `pnpm test` puro): trava o
 * contrato da DECISÃO, que o W1 extrai do YAML para `scripts/ci/deadman-audit.ts`. O `now` é
 * injetado (padrão `ClockFixed` do projeto), nunca `Date.now()` — decisão de auditor tem de ser
 * determinística.
 *
 * RED por inexistência da API: `#scripts/ci/deadman-audit.ts` não existe; o import falha e a suite
 * inteira fica vermelha até o W1 fechar o GREEN.
 *
 * Assinatura que o W1 implementa (ver 002-tests/REPORT.md §"Assinatura para o W1"):
 *   scripts/ci/deadman-audit.ts
 *     export type EmitterConfig  = { readonly id: string; readonly thresholdDays: number };
 *     export type AuditStatus    = 'alive' | 'dead' | 'bootstrap';
 *     export type EmitterVerdict = {
 *       readonly emitter: string;          // id REAL, nunca '*' (D2)
 *       readonly status: AuditStatus;
 *       readonly ageHours: number | null;  // null quando nunca houve ping (D1)
 *       readonly thresholdDays: number;
 *       readonly firesPayload: boolean;
 *     };
 *     export const parseEmitterConfig = (json: string): readonly EmitterConfig[];
 *     export const auditEmitters = (input: {
 *       readonly emitters: readonly EmitterConfig[];
 *       readonly lastSeenByEmitter: Readonly<Record<string, string>>; // ausente = nunca pingou
 *       readonly now: string;                                          // ISO-8601 UTC
 *       readonly alreadyAlerted: readonly string[];                    // estado persistido (D3)
 *     }) => readonly EmitterVerdict[];
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// RED: este módulo ainda não existe (o W1 o cria). O import falha → toda a suite fica vermelha.
import {
  parseEmitterConfig,
  auditEmitters,
  deriveAlreadyAlerted,
  lastSeenFromPings,
} from '#scripts/ci/deadman-audit.ts';

const WORKFLOW = readFileSync(
  fileURLToPath(new URL('../../.github/workflows/deadman-audit.yml', import.meta.url)),
  'utf-8',
);

const EMITTERS_JSON = readFileSync(
  fileURLToPath(new URL('../../deadman/emitters.json', import.meta.url)),
  'utf-8',
);

const SWEEPER = 'sweeper-vps-qa';
const NOW = '2026-07-28T06:00:00.000Z';

/** Config real do repo — o teste não inventa um emissor fictício. */
const realConfig = (): readonly { readonly id: string; readonly thresholdDays: number }[] =>
  parseEmitterConfig(EMITTERS_JSON);

const verdictFor = (
  emitter: string,
  args: {
    readonly lastSeenByEmitter?: Readonly<Record<string, string>>;
    readonly alreadyAlerted?: readonly string[];
  } = {},
) => {
  const verdicts = auditEmitters({
    emitters: realConfig(),
    lastSeenByEmitter: args.lastSeenByEmitter ?? {},
    now: NOW,
    alreadyAlerted: args.alreadyAlerted ?? [],
  });
  const found = verdicts.find((v) => v.emitter === emitter);
  assert.ok(found, `nenhum veredito para o emissor '${emitter}'`);
  return found;
};

// ─── CA1 — bootstrap NÃO dispara (D1, o defeito que gerou as 14 issues) ────────────────────────
describe('DEADMAN-AUDIT-FALSE-FIRED — CA1: bootstrap não é morte', () => {
  it('nenhum ping jamais registrado → status "bootstrap", NÃO "dead"', () => {
    const v = verdictFor(SWEEPER, { lastSeenByEmitter: {} });
    assert.equal(v.status, 'bootstrap');
  });

  it('nenhum ping jamais registrado → NÃO dispara payload (ADR-0042:37 — condição indefinida)', () => {
    const v = verdictFor(SWEEPER, { lastSeenByEmitter: {} });
    assert.equal(v.firesPayload, false);
  });

  it('nenhum ping jamais registrado → ageHours é null, jamais 0 (o "0h" do título mentiroso)', () => {
    const v = verdictFor(SWEEPER, { lastSeenByEmitter: {} });
    assert.equal(v.ageHours, null, 'age 0 é o que compõe "sem sinal há 0h (limite 3d)"');
  });
});

// ─── CA3 — dedup por transição de estado (D3) ─────────────────────────────────────────────────
describe('DEADMAN-AUDIT-FALSE-FIRED — CA3: dedup por transição', () => {
  const MORTO_HA_5_DIAS = { [SWEEPER]: '2026-07-23T06:00:00.000Z' };

  it('morto e ainda NÃO alertado → dispara (a transição alive→dead)', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: MORTO_HA_5_DIAS,
      alreadyAlerted: [],
    });
    assert.equal(v.status, 'dead');
    assert.equal(v.firesPayload, true);
  });

  it('morto e JÁ alertado → NÃO dispara de novo (1 issue por transição, não por execução do cron)', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: MORTO_HA_5_DIAS,
      alreadyAlerted: [SWEEPER],
    });
    assert.equal(v.status, 'dead', 'segue morto — o dedup suprime o alerta, não o diagnóstico');
    assert.equal(v.firesPayload, false);
  });

  it('re-alerta após ressuscitar e morrer de novo (o dedup não pode ser permanente)', () => {
    // Ressuscitou: ping recente → alive, e sai do conjunto de alertados (o W1 persiste isso).
    const vivo = verdictFor(SWEEPER, {
      lastSeenByEmitter: { [SWEEPER]: '2026-07-28T05:00:00.000Z' },
      alreadyAlerted: [SWEEPER],
    });
    assert.equal(vivo.status, 'alive');
    assert.equal(vivo.firesPayload, false);

    // Morreu de novo, já sem a marca de alertado → dispara.
    const remorto = verdictFor(SWEEPER, {
      lastSeenByEmitter: MORTO_HA_5_DIAS,
      alreadyAlerted: [],
    });
    assert.equal(remorto.firesPayload, true);
  });
});

// ─── CA2 — vivo dentro da janela ───────────────────────────────────────────────────────────────
describe('DEADMAN-AUDIT-FALSE-FIRED — CA2: vivo não alerta', () => {
  it('ping há 1h (janela de 2d) → alive, sem payload', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: { [SWEEPER]: '2026-07-28T05:00:00.000Z' },
    });
    assert.equal(v.status, 'alive');
    assert.equal(v.firesPayload, false);
    assert.equal(v.ageHours, 1);
  });
});

// ─── CA4 — threshold POR EMISSOR, e emitter real no veredito (D2) ─────────────────────────────
describe('DEADMAN-AUDIT-FALSE-FIRED — CA4: threshold do emissor, não o default', () => {
  it('parseEmitterConfig lê threshold_days: 2 do sweeper-vps-qa (não o default 3)', () => {
    const sweeper = realConfig().find((e) => e.id === SWEEPER);
    assert.ok(sweeper, 'sweeper-vps-qa ausente em deadman/emitters.json');
    assert.equal(sweeper.thresholdDays, 2, 'D3 do ADR-0042: o número entra no contrato');
  });

  it('o veredito carrega o threshold do emissor', () => {
    assert.equal(verdictFor(SWEEPER).thresholdDays, 2);
  });

  it('ping há 60h: MORTO pelo threshold do emissor (2d=48h) — estaria vivo sob o default (3d=72h)', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: { [SWEEPER]: '2026-07-25T18:00:00.000Z' },
    });
    assert.equal(v.ageHours, 60);
    assert.equal(v.status, 'dead', 'usar o default 3d aqui esconderia uma morte real');
    assert.equal(v.firesPayload, true);
  });

  it('o veredito identifica o emissor pelo id real, nunca pelo curinga "*"', () => {
    assert.equal(verdictFor(SWEEPER).emitter, SWEEPER);
    assert.ok(
      !auditEmitters({
        emitters: realConfig(),
        lastSeenByEmitter: {},
        now: NOW,
        alreadyAlerted: [],
      }).some((v) => v.emitter === '*'),
      'audit.jsonl grava emitter:"*" hoje — o log não diz QUAL emissor morreu',
    );
  });
});

// ─── CA6 — `last_seen` no veredito (W2 round 1, Issue 1: o contrato de dados exige o campo) ────
// `handbook/infrastructure/07-deadman-switch-data-contracts.md:75` declara `last_seen` como campo
// do audit.jsonl. Sem ele no veredito, o workflow não tem de onde gravá-lo — e `age_h` sozinho é
// relativo ao `run_at`, então uma linha do log não permite reconstruir QUANDO foi o último sinal.
describe('DEADMAN-AUDIT-FALSE-FIRED — CA6: veredito carrega last_seen', () => {
  it('emissor vivo → lastSeen é o ts do ping', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: { [SWEEPER]: '2026-07-28T05:00:00.000Z' },
    });
    assert.equal(v.lastSeen, '2026-07-28T05:00:00.000Z');
  });

  it('emissor morto → lastSeen é o ts do último ping (o dado forense do alerta)', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: { [SWEEPER]: '2026-07-23T06:00:00.000Z' },
    });
    assert.equal(v.status, 'dead');
    assert.equal(v.lastSeen, '2026-07-23T06:00:00.000Z');
  });

  it('bootstrap → lastSeen é null, espelhando ageHours (nunca string vazia)', () => {
    const v = verdictFor(SWEEPER, { lastSeenByEmitter: {} });
    assert.equal(v.lastSeen, null, '"" reintroduziria o `last_seen=` vazio do formato v1');
    assert.equal(v.ageHours, null);
  });
});

// ─── Contrato do enum de status (W2 round 1, Issue 2) ──────────────────────────────────────────
describe('DEADMAN-AUDIT-FALSE-FIRED — status casa com o contrato de dados documentado', () => {
  it('o handbook §3 documenta os 3 valores emitidos, incluindo bootstrap', () => {
    const contrato = readFileSync(
      fileURLToPath(
        new URL(
          '../../handbook/infrastructure/07-deadman-switch-data-contracts.md',
          import.meta.url,
        ),
      ),
      'utf-8',
    );
    for (const status of ['alive', 'dead', 'bootstrap']) {
      assert.ok(
        contrato.includes(`\`"${status}"\``),
        `handbook §3 não documenta o status "${status}" — o contrato vence o código`,
      );
    }
  });

  it('deriveAlreadyAlerted reconhece o "DEAD" maiúsculo dos registros v1', () => {
    const v1 = '{"v":1,"emitter":"sweeper-vps-qa","status":"DEAD","payload_fired":true}';
    assert.deepEqual(
      deriveAlreadyAlerted(v1),
      [SWEEPER],
      'v1 grafa DEAD; ignorá-lo re-alerta em falso',
    );
  });
});

// ─── CA5 — morte real preservada (o ticket não pode produzir um auditor que nunca alerta) ──────
describe('DEADMAN-AUDIT-FALSE-FIRED — CA5: morte real segue disparando', () => {
  it('ping mais antigo que o threshold → dead + payload', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: { [SWEEPER]: '2026-07-20T06:00:00.000Z' },
    });
    assert.equal(v.status, 'dead');
    assert.equal(v.firesPayload, true);
    assert.equal(v.ageHours, 192);
  });
});

// ─── N1/N2 (W2 round 2) — `ts` corrompido não pode derrubar nem silenciar a auditoria ──────────
// `history.jsonl` é APPEND-ONLY (contrato §4). Uma linha com `ts` inválido vence a comparação
// lexicográfica (letra > dígito) e, antes do fix, lançava — matando o step ANTES do keep-alive, em
// TODA execução futura. `ts` no futuro produzia ageHours negativo → `alive` eterno.
describe('DEADMAN-AUDIT-FALSE-FIRED — N1: ts malformado é descartado, não derruba', () => {
  const bom = '{"emitter":"sweeper-vps-qa","seq":1,"ts":"2026-07-23T06:00:00.000Z"}';
  const lixo = '{"emitter":"sweeper-vps-qa","seq":2,"ts":"nao-e-data"}';

  it('ping com ts inválido é ignorado; o ping válido anterior prevalece', () => {
    const seen = lastSeenFromPings(`${bom}\n${lixo}`);
    assert.equal(
      seen[SWEEPER],
      '2026-07-23T06:00:00.000Z',
      'lixo vence o max lexicográfico se não for filtrado',
    );
  });

  it('só ping inválido → emissor sem last_seen (bootstrap), JAMAIS exceção', () => {
    const seen = lastSeenFromPings(lixo);
    assert.equal(seen[SWEEPER], undefined);
    const v = auditEmitters({
      emitters: realConfig(),
      lastSeenByEmitter: seen,
      now: NOW,
      alreadyAlerted: [],
    })[0];
    assert.equal(v?.status, 'bootstrap', 'exceção aqui mata o step antes do keep-alive');
  });

  it('ts sem Z é descartado — seria lido como hora LOCAL, ambígua entre os dois auditores', () => {
    const semZ = '{"emitter":"sweeper-vps-qa","seq":3,"ts":"2026-07-23T06:00:00"}';
    assert.equal(lastSeenFromPings(semZ)[SWEEPER], undefined);
  });

  // Renomeado no round 4: o nome anterior ('sem Z, data impossível') prometia mais do que
  // entregava — só provava `2026-13-45`, que o `Date.parse` rejeita. As datas que o `Date.parse`
  // ACEITA fazendo rollover (30/fev → 02/mar) passavam batido e viravam um ts deslocado e
  // plausível. Agora o caso está coberto, não só renomeado.
  it('ts com data inexistente é descartado, inclusive as que Date.parse aceita por rollover', () => {
    const ping = (ts: string): string => `{"emitter":"${SWEEPER}","ts":${JSON.stringify(ts)}}`;

    assert.equal(
      lastSeenFromPings(ping('2026-13-45T06:00:00.000Z'))[SWEEPER],
      undefined,
      'mês 13 / dia 45 — Date.parse já devolve NaN',
    );
    assert.equal(
      lastSeenFromPings(ping('2026-02-30T00:00:00.000Z'))[SWEEPER],
      undefined,
      '30/fev não existe; Date.parse faz rollover para 02/mar e o ts vira um instante FALSO',
    );
    assert.equal(
      lastSeenFromPings(ping('2025-02-29T00:00:00.000Z'))[SWEEPER],
      undefined,
      '2025 não é bissexto; rollover para 01/mar',
    );
  });

  it('data bissexta REAL não pode ser descartada junto (controle positivo)', () => {
    const ping = `{"emitter":"${SWEEPER}","ts":"2024-02-29T00:00:00.000Z"}`;
    assert.equal(lastSeenFromPings(ping)[SWEEPER], '2024-02-29T00:00:00.000Z');
  });
});

describe('DEADMAN-AUDIT-FALSE-FIRED — N2: ts no futuro não silencia o alerta', () => {
  const antigo = '{"emitter":"sweeper-vps-qa","seq":1,"ts":"2026-07-23T06:00:00.000Z"}';
  const futuro = '{"emitter":"sweeper-vps-qa","seq":2,"ts":"2099-01-01T00:00:00.000Z"}';

  it('ping muito no futuro é descartado; o real prevalece e a morte é detectada', () => {
    const seen = lastSeenFromPings(`${antigo}\n${futuro}`, NOW);
    assert.equal(seen[SWEEPER], '2026-07-23T06:00:00.000Z');
    const v = auditEmitters({
      emitters: realConfig(),
      lastSeenByEmitter: seen,
      now: NOW,
      alreadyAlerted: [],
    })[0];
    assert.equal(v?.status, 'dead', 'ts futuro mascarava a morte com ageHours negativo');
    assert.equal(v?.firesPayload, true);
  });

  it('clock skew pequeno (futuro dentro da tolerância) é aceito e clampado, nunca negativo', () => {
    const skew = '{"emitter":"sweeper-vps-qa","seq":1,"ts":"2026-07-28T06:30:00.000Z"}'; // 30min à frente
    const seen = lastSeenFromPings(skew, NOW);
    assert.equal(
      seen[SWEEPER],
      '2026-07-28T06:30:00.000Z',
      'skew legítimo não pode ser descartado',
    );
    const v = auditEmitters({
      emitters: realConfig(),
      lastSeenByEmitter: seen,
      now: NOW,
      alreadyAlerted: [],
    })[0];
    assert.equal(v?.ageHours, 0, 'age_h negativo violaria o contrato (idade não é negativa)');
    assert.equal(v?.status, 'alive');
  });
});

// ─── R1 (W2 round 4) — id de emissor que colide com propriedade herdada ────────────────────────
// `lastSeenByEmitter` é um objeto comum, logo herda `Object.prototype`. Ler uma chave que o
// emissor nunca gravou NÃO devolve `undefined` quando o nome coincide com um membro do protótipo:
// devolve a FUNÇÃO. O guard `lastSeen === undefined || lastSeen === ''` não a reconhecia, ela
// chegava em `hoursBetween`, e `Date.parse(fn)` = NaN → exceção. Reproduzido:
//   Error: last_seen inválido: function toString() { [native code] }
// A exceção mata o step ANTES do commit de keep-alive — a mesma falha que o round 2 fechou pelo
// lado do `ts` corrompido, reaberta pelo lado do NOME do emissor.
describe('DEADMAN-AUDIT-FALSE-FIRED — R1: nome de emissor herdado do protótipo não derruba', () => {
  const NOMES_HERDADOS = ['toString', 'constructor', 'valueOf'] as const;

  const veredito = (emitterId: string, lastSeenByEmitter: Readonly<Record<string, string>>) =>
    auditEmitters({
      emitters: [{ id: emitterId, thresholdDays: 2 }],
      lastSeenByEmitter,
      now: NOW,
      alreadyAlerted: [],
    })[0];

  for (const nome of NOMES_HERDADOS) {
    it(`emissor '${nome}' sem NENHUM ping → bootstrap, JAMAIS exceção`, () => {
      // `{}` herda `Object.prototype`; é exatamente o que `lastSeenFromPings` devolve sem pings.
      const v = veredito(nome, {});
      assert.equal(v?.status, 'bootstrap', 'a função herdada não é um last_seen');
      assert.equal(v?.lastSeen, null);
      assert.equal(v?.ageHours, null);
      assert.equal(v?.firesPayload, false);
    });
  }

  it('o objeto vindo de lastSeenFromPings (sem pings) também não derruba', () => {
    const v = veredito('toString', lastSeenFromPings(''));
    assert.equal(v?.status, 'bootstrap');
  });

  // Controle positivo: o fix não pode cegar o caminho normal desse mesmo emissor.
  it("emissor 'toString' COM ping válido segue funcionando (vivo e morto)", () => {
    const vivo = veredito('toString', { toString: '2026-07-28T05:00:00.000Z' });
    assert.equal(vivo?.status, 'alive');
    assert.equal(vivo?.ageHours, 1);
    assert.equal(vivo?.lastSeen, '2026-07-28T05:00:00.000Z');

    const morto = veredito('toString', { toString: '2026-07-23T06:00:00.000Z' });
    assert.equal(morto?.status, 'dead');
    assert.equal(morto?.firesPayload, true);
  });

  // O round 3 trocou o acumulador por `Map` + `Object.fromEntries`. `fromEntries` usa
  // `[[DefineOwnProperty]]`, não `[[Set]]` — então `__proto__` vira propriedade PRÓPRIA e não
  // muda o protótipo. Este teste trava esse comportamento ponta a ponta.
  it("emissor '__proto__' sobrevive ao ciclo lastSeenFromPings → auditEmitters", () => {
    const seen = lastSeenFromPings('{"emitter":"__proto__","ts":"2026-07-28T05:00:00.000Z"}');
    assert.equal(seen['__proto__'], '2026-07-28T05:00:00.000Z', 'a chave não pode ser engolida');
    assert.equal(Object.getPrototypeOf(seen), Object.prototype, 'protótipo não pode ser poluído');
    const v = veredito('__proto__', seen);
    assert.equal(v?.status, 'alive');
    assert.equal(v?.ageHours, 1);
  });
});

// ─── R2 (W2 round 4) — largura FIXA da fração torna verdadeiro o invariante lexicográfico ──────
// `lastSeenFromPings` escolhe o ping mais recente por comparação de string. Isso só equivale a
// comparação cronológica se TODO ts aceito tiver o MESMO formato. A regex anterior
// (`(?:\.\d{1,3})?Z`) aceitava 4 larguras distintas, e `'Z'`(90) > `'.'`(46) > dígitos fazia o
// timestamp MAIS ANTIGO vencer. Ver o comentário do módulo, que afirma o invariante.
describe('DEADMAN-AUDIT-FALSE-FIRED — R2: só milissegundo de 3 dígitos entra', () => {
  const ping = (ts: string): string => `{"emitter":"${SWEEPER}","ts":${JSON.stringify(ts)}}`;
  const aceito = (ts: string): boolean => lastSeenFromPings(ping(ts))[SWEEPER] !== undefined;

  it('rejeita ts SEM fração de segundo', () => {
    assert.equal(aceito('2026-07-28T05:00:00Z'), false);
  });

  it('rejeita fração de 1 e de 2 dígitos', () => {
    assert.equal(aceito('2026-07-28T05:00:00.5Z'), false);
    assert.equal(aceito('2026-07-28T05:00:00.51Z'), false);
  });

  it('aceita a fração de 3 dígitos — a única forma que todo produtor real emite', () => {
    // `date -u +%Y-%m-%dT%H:%M:%S.000Z` (workflow) e `new Date().toISOString()` (entrypoint).
    assert.equal(aceito('2026-07-28T05:00:00.000Z'), true);
    assert.equal(aceito('2026-07-28T05:00:00.500Z'), true);
  });

  it('o par que a largura variável ordenava ao contrário agora resolve certo', () => {
    // Antes: 'T05:00:00Z' > 'T05:00:00.001Z' lexicograficamente ('Z' > '.'), então o auditor
    // elegia como "último sinal" o instante mais ANTIGO dos dois.
    const escolhido = lastSeenFromPings(
      `${ping('2026-07-28T05:00:00Z')}\n${ping('2026-07-28T05:00:00.001Z')}`,
    )[SWEEPER];
    assert.equal(escolhido, '2026-07-28T05:00:00.001Z');
  });

  it('outro par invertido: .5Z vs .51Z — ambos saem, nenhum vira last_seen', () => {
    const escolhido = lastSeenFromPings(
      `${ping('2026-07-28T05:00:00.5Z')}\n${ping('2026-07-28T05:00:00.51Z')}`,
    )[SWEEPER];
    assert.equal(escolhido, undefined, "'.5Z' > '.51Z' na string, mas é 10ms mais CEDO");
  });

  it('entre ts aceitos, o máximo lexicográfico É o máximo cronológico', () => {
    const amostras = [
      '2026-07-28T05:00:00.001Z',
      '2026-07-28T05:00:00.010Z',
      '2026-07-28T05:00:00.100Z',
      '2026-07-28T05:00:01.000Z',
      '2026-07-27T23:59:59.999Z',
    ];
    const maxCronologico = amostras.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
    const escolhido = lastSeenFromPings(amostras.map(ping).join('\n'))[SWEEPER];
    assert.equal(escolhido, maxCronologico, 'é este casamento que o módulo assume ao usar `>`');
  });
});

// ─── N3 (W2 round 2) — dedup pela ENTREGA, não pela decisão ────────────────────────────────────
// `payload_fired` é, por contrato (§3), "presente e true APENAS quando o payload foi disparado".
// Deduplicar por `status:dead` fazia uma falha transitória do `gh` perder o alerta para sempre.
describe('DEADMAN-AUDIT-FALSE-FIRED — N3: dedup exige entrega confirmada', () => {
  it('dead COM payload_fired → já alertado (dedup legítimo)', () => {
    const rec = '{"v":2,"emitter":"sweeper-vps-qa","status":"dead","payload_fired":true}';
    assert.deepEqual(deriveAlreadyAlerted(rec), [SWEEPER]);
  });

  it('dead SEM payload_fired → NÃO alertado; a próxima execução retenta', () => {
    const rec = '{"v":2,"emitter":"sweeper-vps-qa","status":"dead"}';
    assert.deepEqual(
      deriveAlreadyAlerted(rec),
      [],
      'o alerta falhou ao ser entregue — suprimir a retentativa perde a morte em silêncio',
    );
  });

  it('a retentativa de fato dispara o payload', () => {
    const v = verdictFor(SWEEPER, {
      lastSeenByEmitter: { [SWEEPER]: '2026-07-23T06:00:00.000Z' },
      alreadyAlerted: [
        ...deriveAlreadyAlerted('{"v":2,"emitter":"sweeper-vps-qa","status":"dead"}'),
      ],
    });
    assert.equal(v.firesPayload, true);
  });

  it('registro v1 com DEAD + payload_fired segue reconhecido', () => {
    const v1 = '{"v":1,"emitter":"sweeper-vps-qa","status":"DEAD","payload_fired":true}';
    assert.deepEqual(deriveAlreadyAlerted(v1), [SWEEPER]);
  });
});

// ─── N6 (W2 round 2) — id duplicado geraria DUAS issues para a mesma morte ─────────────────────
describe('DEADMAN-AUDIT-FALSE-FIRED — N6: id duplicado em emitters.json é rejeitado', () => {
  it('dois emissores com o mesmo id → erro no parse, não dois vereditos', () => {
    const dup = JSON.stringify({
      default_threshold_days: 3,
      emitters: [{ id: 'a' }, { id: 'a', threshold_days: 9 }],
    });
    assert.throws(() => parseEmitterConfig(dup), /duplicad/i);
  });
});

// ─── Contrato do workflow — a decisão sai do YAML e o caminho não pode ter escape ──────────────
describe('DEADMAN-AUDIT-FALSE-FIRED — workflow delega a decisão e não engole falha', () => {
  it('o YAML não decide morte inline com "status=DEAD" solto', () => {
    assert.ok(
      !/^\s*status=DEAD\s*(#.*)?$/m.test(WORKFLOW),
      'a decisão deve vir de scripts/ci/deadman-audit.ts, não do bash inline (D1 vive aqui)',
    );
  });

  // N4 (W2 round 2): este ticket introduziu o PRIMEIRO uso de `node` neste workflow (antes era
  // 100% bash/jq/date). Sem `setup-node`, `--experimental-strip-types` depende do runtime da imagem
  // `ubuntu-latest`, que muda sem aviso — e a falha mata o step ANTES do keep-alive.
  it('N4: o workflow instala Node explicitamente antes de invocar o script', () => {
    assert.match(WORKFLOW, /uses: actions\/setup-node@/, 'o step usa `node` mas não instala Node');
    assert.match(
      WORKFLOW,
      /node-version: *'?24'?/,
      'a versão deve casar com engines.node do projeto',
    );
    const setupIdx = WORKFLOW.indexOf('actions/setup-node@');
    const nodeIdx = WORKFLOW.indexOf('node --experimental-strip-types');
    assert.ok(setupIdx < nodeIdx, 'setup-node precisa vir ANTES da invocação do script');
  });

  it('N4: todas as actions são SHA-pinadas (ADR-0011 supply-chain)', () => {
    const uses = [...WORKFLOW.matchAll(/uses: *([^\s]+)/g)].map((m) => m[1] ?? '');
    assert.ok(uses.length > 0, 'nenhum `uses:` encontrado');
    for (const u of uses) {
      assert.match(u, /@[0-9a-f]{40}$/, `action não pinada por SHA: ${u}`);
    }
  });

  it('o caminho de alerta não tem escape "|| true" engolindo falha (ADR-0011)', () => {
    // O comando é multi-linha (continuação com `\`) — juntar ANTES de checar, senão o `|| true`
    // que mora na última linha escapa do filtro e o teste passa em falso.
    const joined = WORKFLOW.replace(/\\\n\s*/g, ' ');
    const alertCommands = joined.split('\n').filter((l) => l.includes('gh issue create'));
    assert.ok(alertCommands.length > 0, 'nenhum caminho de alerta encontrado no workflow');
    for (const cmd of alertCommands) {
      assert.ok(!cmd.includes('|| true'), `escape em: ${cmd.trim()}`);
    }
  });
});
