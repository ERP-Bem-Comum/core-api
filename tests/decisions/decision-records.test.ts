/**
 * Gate do formato dos registros de decisão (`context/decisions/*.yaml`).
 *
 * Encodifica as guardas anti-alucinação do `context/decisions/SCHEMA.md` §4 como asserção
 * executável. Existe porque regra que não bloqueia não vale: sem este teste, "toda alegação carrega
 * evidência ancorada" é promessa de quem preencheu o arquivo.
 *
 * Cada registro é validado alegação por alegação, de forma que a falha nomeie o ID exato.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const DECISIONS_DIR = join(PROJECT_ROOT, 'context', 'decisions');

const REALITY_VERDICTS = [
  'holds',
  'partial',
  'absent',
  'contradicted',
  'exercised',
  'unverified',
] as const;
const TESTABILITY_VERDICTS = [
  'testable',
  'testable-with-work',
  'unfalsifiable',
  'not-applicable',
] as const;
const LAYERS = ['static', 'unit', 'integration', 'contract', 'e2e'] as const;
const RULE_STATUS = ['pending', 'proposed', 'accepted'] as const;
const DISPOSITIONS = ['adopt', 'narrow', 'replace', 'drop'] as const;
const KINDS = ['obligation', 'prohibition', 'permission', 'aspiration'] as const;

// Sem teste possível ⇒ `layer` MUST ser null (SCHEMA §9).
const NO_TEST_VERDICTS = ['unfalsifiable', 'not-applicable'];
// Evidência de ausência não tem linha para citar — declara-se com prefixo (SCHEMA §4 guarda 2).
const ABSENCE_PREFIX = /^(ausência|nota):\s/u;
const PATH_LINE = /[\w./-]+:\d+/u;
// Citação de documento em prosa: âncora por SEÇÃO (`arquivo.md §3.9`). É mais durável que número de
// linha — seção sobrevive a edição do texto, linha não. Mesma exigência da guarda 2 (local específico
// e encontrável), forma adequada ao tipo de arquivo.
const PATH_SECTION = /[\w./-]+\.mdx?\s+§[\d.]+/u;

// ─── Narrowing sem `any` (parse() do yaml devolve any) ────────────────────────
const asObject = (v: unknown, where: string): Record<string, unknown> => {
  assert.ok(typeof v === 'object' && v !== null && !Array.isArray(v), `${where}: esperava objeto`);
  return v as Record<string, unknown>;
};
const asStringArray = (v: unknown, where: string): readonly string[] => {
  assert.ok(Array.isArray(v), `${where}: esperava lista`);
  for (const [i, item] of v.entries()) {
    assert.equal(typeof item, 'string', `${where}[${i}]: esperava string`);
  }
  return v as readonly string[];
};
const asString = (v: unknown, where: string): string => {
  assert.equal(typeof v, 'string', `${where}: esperava string`);
  return v as string;
};
const asStringOrNull = (v: unknown, where: string): string | null => {
  if (v === null || v === undefined) return null;
  return asString(v, where);
};

const yamlFiles = existsSync(DECISIONS_DIR)
  ? readdirSync(DECISIONS_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
  : [];

describe('context/decisions — o diretório existe e tem registros', () => {
  it('há pelo menos um registro .yaml', () => {
    assert.ok(yamlFiles.length > 0, `nenhum .yaml em ${DECISIONS_DIR}`);
  });
});

const seenClaimIds = new Set<string>();

for (const file of yamlFiles) {
  const raw = readFileSync(join(DECISIONS_DIR, file), 'utf-8');
  const parsed: unknown = parse(raw);
  const doc = asObject(parsed, file);
  const docId = asString(doc['id'], `${file}#id`);

  describe(`${file} — cabeçalho`, () => {
    it('id casa com o nome do arquivo', () => {
      assert.equal(`${docId}.yaml`, file, 'id divergente do nome do arquivo');
    });

    it('source aponta para um arquivo que existe', () => {
      const source = asString(doc['source'], `${docId}#source`);
      assert.ok(existsSync(join(PROJECT_ROOT, source)), `source inexistente: ${source}`);
    });

    it('extraction.state é sample ou complete', () => {
      const extraction = asObject(doc['extraction'], `${docId}#extraction`);
      const state = asString(extraction['state'], `${docId}#extraction.state`);
      assert.ok(['sample', 'complete'].includes(state), `state inválido: ${state}`);
    });

    it('assessment declara contra qual commit foi verificado', () => {
      const assessment = asObject(doc['assessment'], `${docId}#assessment`);
      const sha = asString(assessment['checked_against'], `${docId}#checked_against`);
      assert.match(sha, /^[0-9a-f]{7,40}$/u, `checked_against não é um SHA: ${sha}`);
    });

    // Julgamento anterior é insumo citado, não trabalho refeito. O `applied_to` verificado pega
    // rule que sumiu com decisão ainda apontando para ela.
    it('prior_art cita documentos e destinos que existem', () => {
      const priorArt = doc['prior_art'];
      assert.ok(Array.isArray(priorArt), `${docId}#prior_art: esperava lista`);
      for (const rawEntry of priorArt) {
        const entry = asObject(rawEntry, `${docId}#prior_art[]`);
        const source = asString(entry['source'], `${docId}#prior_art[].source`);
        assert.ok(existsSync(join(PROJECT_ROOT, source)), `source inexistente: ${source}`);
        assert.ok(
          asString(entry['verdict'], `${docId}#prior_art[].verdict`).trim().length > 0,
          'verdict vazio',
        );
        for (const target of asStringArray(entry['applied_to'], `${docId}#applied_to`)) {
          assert.ok(existsSync(join(PROJECT_ROOT, target)), `applied_to inexistente: ${target}`);
        }
      }
    });
  });

  const claims = doc['claims'];
  assert.ok(Array.isArray(claims), `${docId}#claims: esperava lista`);

  for (const rawClaim of claims) {
    const claim = asObject(rawClaim, `${docId}#claims[]`);
    const id = asString(claim['id'], `${docId}#claims[].id`);

    describe(id, () => {
      it('id é único e prefixado pelo ADR de origem', () => {
        assert.ok(id.startsWith(`${docId}-C`), `id fora do padrão ${docId}-Cn: ${id}`);
        assert.ok(!seenClaimIds.has(id), `id duplicado: ${id}`);
        seenClaimIds.add(id);
      });

      it('tem texto e kind válido', () => {
        assert.ok(asString(claim['text'], `${id}#text`).trim().length > 0, 'text vazio');
        const kind = asString(claim['kind'], `${id}#kind`);
        assert.ok(KINDS.includes(kind as (typeof KINDS)[number]), `kind inválido: ${kind}`);
      });

      // Guarda 1 — sem source_lines não há citação literal, só memória.
      it('guarda 1: declara source_lines', () => {
        const lines = claim['source_lines'];
        assert.ok(Array.isArray(lines) && lines.length > 0, 'source_lines vazio');
      });

      const reality = asObject(claim['reality'], `${id}#reality`);
      const verdict = asString(reality['verdict'], `${id}#reality.verdict`);
      const evidence = asStringArray(reality['evidence'], `${id}#reality.evidence`);

      it('reality.verdict é um valor conhecido', () => {
        assert.ok(
          REALITY_VERDICTS.includes(verdict as (typeof REALITY_VERDICTS)[number]),
          `verdict inválido: ${verdict}`,
        );
      });

      // Guardas 3 e 4 — veredito afirmativo exige prova; `unverified` exige a ausência dela.
      it('guardas 3 e 4: veredito e evidência são coerentes', () => {
        if (verdict === 'unverified') {
          assert.equal(evidence.length, 0, 'unverified com evidência — escolha um veredito');
        } else {
          assert.ok(evidence.length > 0, `${verdict} sem evidência`);
        }
      });

      // Guarda 2 — evidência de presença cita path:linha; de ausência, declara-se com prefixo.
      it('guarda 2: toda evidência é ancorada ou declarada como ausência', () => {
        for (const item of evidence) {
          assert.ok(
            PATH_LINE.test(item) || PATH_SECTION.test(item) || ABSENCE_PREFIX.test(item),
            `evidência sem âncora (path:linha ou arquivo.md §seção) e sem prefixo "ausência:"/"nota:" -> ${item}`,
          );
        }
      });

      // Guarda 5 — "parcialmente verdade" sem dizer onde é afirmação vazia.
      it('guarda 5: partial delimita onde vale', () => {
        if (verdict !== 'partial') return;
        const holdsIn = asStringArray(reality['holds_in'], `${id}#holds_in`);
        const absentIn = asStringArray(reality['absent_in'], `${id}#absent_in`);
        assert.ok(holdsIn.length > 0 || absentIn.length > 0, 'partial sem holds_in nem absent_in');
      });

      it('carrega o comando que re-verifica', () => {
        assert.ok(asString(reality['verify'], `${id}#verify`).trim().length > 0, 'verify vazio');
      });

      const testability = asObject(claim['testability'], `${id}#testability`);
      const tVerdict = asString(testability['verdict'], `${id}#testability.verdict`);
      const layer = asStringOrNull(testability['layer'], `${id}#testability.layer`);

      it('testability.verdict é um valor conhecido e red está preenchido', () => {
        assert.ok(
          TESTABILITY_VERDICTS.includes(tVerdict as (typeof TESTABILITY_VERDICTS)[number]),
          `testability.verdict inválido: ${tVerdict}`,
        );
        assert.ok(asString(testability['red'], `${id}#red`).trim().length > 0, 'red vazio');
      });

      it('layer é null exatamente quando não há teste possível', () => {
        if (NO_TEST_VERDICTS.includes(tVerdict)) {
          assert.equal(layer, null, `${tVerdict} não pode declarar layer`);
        } else {
          assert.ok(layer !== null, 'layer ausente');
          assert.ok(LAYERS.includes(layer as (typeof LAYERS)[number]), `layer inválido: ${layer}`);
        }
      });

      it('testable-with-work nomeia o que falta', () => {
        if (tVerdict !== 'testable-with-work') return;
        const blocker = asStringOrNull(testability['blocker'], `${id}#blocker`);
        assert.ok(blocker !== null && blocker.trim().length > 0, 'testable-with-work sem blocker');
      });

      // Regra 1 do context/INDEX.md: o que já é mecânico não vira texto — mas tem de ser rastreável.
      // Mecanismo é teste, rule semgrep, config eslint ou hook — qualquer um, desde que exista.
      it('enforced_by lista mecanismos que existem no repo', () => {
        assert.ok('enforced_by' in testability, 'campo enforced_by ausente');
        const mechanisms = asStringArray(testability['enforced_by'], `${id}#enforced_by`);
        for (const mechanism of mechanisms) {
          assert.ok(
            existsSync(join(PROJECT_ROOT, mechanism)),
            `mecanismo declarado não existe: ${mechanism}`,
          );
        }
      });

      const rule = asObject(claim['rule'], `${id}#rule`);
      const status = asString(rule['status'], `${id}#rule.status`);
      const disposition = asStringOrNull(rule['disposition'], `${id}#rule.disposition`);
      const text = asStringOrNull(rule['text'], `${id}#rule.text`);

      it('rule.status e rule.disposition são valores conhecidos', () => {
        assert.ok(
          RULE_STATUS.includes(status as (typeof RULE_STATUS)[number]),
          `status inválido: ${status}`,
        );
        if (disposition !== null) {
          assert.ok(
            DISPOSITIONS.includes(disposition as (typeof DISPOSITIONS)[number]),
            `disposition inválida: ${disposition}`,
          );
        }
      });

      it('pending não decide nada; decidido tem disposição', () => {
        if (status === 'pending') {
          assert.equal(disposition, null, 'pending com disposition');
          assert.equal(text, null, 'pending com text');
        } else {
          assert.ok(disposition !== null, `${status} sem disposition`);
        }
      });

      it('drop não carrega texto; as demais disposições carregam', () => {
        if (disposition === null) return;
        if (disposition === 'drop') {
          assert.equal(text, null, 'drop com rule.text — a alegação é descartada, não reescrita');
        } else {
          assert.ok(text !== null && text.trim().length > 0, `${disposition} sem rule.text`);
        }
      });

      // SCHEMA §6 — alegação intestável não pode ser promovida sem antes ser reescrita.
      it('§6: alegação sem teste possível não é adotada nem estreitada', () => {
        if (tVerdict !== 'unfalsifiable') return;
        assert.ok(
          disposition === null || ['drop', 'replace'].includes(disposition),
          `unfalsifiable com disposition ${String(disposition)} — exige drop ou replace`,
        );
      });
    });
  }
}
