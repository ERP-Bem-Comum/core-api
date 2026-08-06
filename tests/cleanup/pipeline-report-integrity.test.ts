/**
 * PIPELINE-REPORT-INTEGRITY — wave marcada `done` tem o relatório que promete.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Origem: auditoria do harness em 2026-08-06. A pergunta era a P1 da spec 041 — "quando um ticket é
 * marcado `closed-green`, isso significa que o código foi revisado e testado, ou virou carimbo?".
 * A medição REFUTOU a suspeita de carimbo generalizado: das 470 pipelines cronometradas, 235 somam
 * mais de 10 minutos de wave e 162 entre 1 e 10. O pipeline registrou trabalho real.
 *
 * O que ele NÃO registra é se o relatório prometido existe. 45 tickets declaram waves `done` com
 * `reportPath` apontando para 100 arquivos que não estão no disco. O caso exemplar é o
 * `REP6-STATUS-DISPLAYSTATUS`: STATE.json afirma W0 RED, W1 GREEN, W2 APPROVED e W3 GREEN, com os
 * quatro `reportPath` preenchidos, e nenhum dos quatro arquivos existe. Enquanto isso o hook
 * `inject-ticket-context.sh` o apresentava a cada prompt como pipeline concluída.
 *
 * A distribuição temporal desmonta a leitura de degradação progressiva: mai 16/119 (13,4%),
 * jun 5/231 (2,2%), jul 22/142 (15,5%). Junho teve o DOBRO do volume de julho e sete vezes menos
 * registro fantasma — volume não explica a falha.
 *
 * ⚠️ Tensão conhecida: a spec 038 aposenta a pipeline W0→W3. Este gate não a ressuscita — enquanto
 * os 552 diretórios existirem no repositório e o hook os injetar em contexto, um `closed-green` sem
 * lastro é afirmação falsa sendo lida como verdadeira. Quando a spec 038 remover `.claude/.pipeline/`,
 * este arquivo sai junto: o teste do primeiro `describe` passa a varrer zero pipelines e o pin do
 * segundo passa a exigir allowlist vazia, que é exatamente o sinal de "pode apagar".
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const PIPELINE_DIR = join(PROJECT_ROOT, '.claude/.pipeline');

/**
 * 🔒 Allowlist PINADA — tickets cuja dívida de relatório é anterior a este gate (2026-08-06).
 *
 * A granularidade é o TICKET, não o relatório: a unidade de trabalho para consertar é o ticket
 * inteiro, e ao resolvê-lo a entrada sai daqui de uma vez. O pin por `deepEqual` no segundo
 * `describe` impede que a lista cresça em silêncio — ticket NOVO com relatório fantasma falha o
 * primeiro teste, e adicioná-lo aqui falha o segundo.
 *
 * Esta lista só pode DIMINUIR. Duas formas legítimas: escrever o relatório que falta, ou remover o
 * diretório do ticket (a spec 038 removerá todos).
 */
const KNOWN_GHOST_REPORTS: readonly string[] = [
  'AUTH-HTTP-CREATE-USER',
  'CTR-ADAPTERS-CLEANUP-EVENT-BUS',
  'CTR-ADAPTERS-FOLDER-REORG',
  'CTR-ADAPTERS-RENAME-PORT-PREFIX',
  'CTR-AMENDMENT-DOCUMENT-LINK',
  'CTR-CLOUD-AWS-MAGALU-PBE',
  'CTR-DOCUMENT-AGGREGATE',
  'CTR-DOCUMENT-AGGREGATE-PERSISTENCE',
  'CTR-DOCUMENT-LIFECYCLE-DELETE',
  'CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE',
  'CTR-DOCUMENT-RENAME-PT-EN',
  'CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES',
  'CTR-HTTP-CONTRACT-LIST-FILTERS',
  'CTR-HTTP-DOCUMENT-DELETE',
  'CTR-INQUIRY-0012-UPDATE-POST-ADR-0021',
  'CTR-OBJECTIVE-TEXT',
  'CTR-RENUMBER-VIGENCIA-YEAR',
  'CTR-SHARED-REORG-PRIMITIVES',
  'CTR-STORAGE-MAGALU-CONFIG',
  'CTR-USECASE-DELETE-DOCUMENT',
  'CTR-USECASE-SUPERSEDE-DOCUMENT',
  'CTR-USECASE-UPLOAD-DOCUMENT',
  'DASH-F1-KPI-COST-CENTERS',
  'DASH-F4-REALIZED-VS-PLANNED',
  'DASH-F5-NO-CONTRACT-TOP5',
  'FIN-DANFSE-EMITENTE-CNPJ',
  'FIN-DELETE-BANK-STATEMENT',
  'FIN-DRAFT-PARTIAL-SCHEMA',
  'FIN-MANUAL-ENTRY-DOC-FIELDS',
  'FIN-OCR-AUTOFILL-SUPPLIER',
  'FIN-OFX-COMMA-DECIMAL',
  'FIN-PAYABLE-COUNTS',
  'FIN-PAYABLE-ORDER-RECENT',
  'FIN-PDF-STATEMENT-PARSER',
  'FIN-RECON-DETAIL-MANUAL-CATEGORY',
  'FIN-RECON-DETAIL-TITLE-CATEGORY',
  'FIN-RECON-PAID-PARITY',
  'FIN-UNDO-RECON-DESTINATION',
  'PARTNERS-GEO-READ-DEGRADE',
  'PRG-PROGRAMS-MODULE',
  'REP-CASHFLOW-A',
  'REP-CASHFLOW-B',
  'REP6-GENERAL-REPORT-A',
  'REP6-GENERAL-REPORT-D',
  'REP6-STATUS-DISPLAYSTATUS',
];

type Wave = Readonly<{
  id?: string;
  status?: string;
  reportPath?: string;
}>;

type PipelineState = Readonly<{
  ticket?: string;
  waves?: readonly Wave[];
}>;

/** Um relatório prometido por uma wave `done` e ausente do disco. */
type GhostReport = Readonly<{ ticket: string; wave: string; reportPath: string }>;

const pipelineTickets = (): readonly string[] => {
  if (!existsSync(PIPELINE_DIR)) return [];
  return readdirSync(PIPELINE_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
};

const readState = (ticket: string): PipelineState | null => {
  const statePath = join(PIPELINE_DIR, ticket, 'STATE.json');
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, 'utf-8')) as PipelineState;
  } catch {
    // STATE.json ilegível é outro problema, coberto por quem o escreve — aqui não é ghost report.
    return null;
  }
};

/**
 * Varre as pipelines e devolve toda wave `done` cujo `reportPath` não existe no disco.
 *
 * Só cobra wave `done`: wave em andamento ainda não prometeu relatório algum, e wave sem
 * `reportPath` declarado não fez promessa que dê para cobrar.
 */
const ghostReports = (): readonly GhostReport[] => {
  const ghosts: GhostReport[] = [];
  for (const ticket of pipelineTickets()) {
    const state = readState(ticket);
    for (const wave of state?.waves ?? []) {
      if (wave.status !== 'done') continue;
      const reportPath = wave.reportPath;
      if (reportPath === undefined || reportPath === '') continue;
      if (!existsSync(join(PIPELINE_DIR, ticket, reportPath))) {
        ghosts.push({ ticket, wave: wave.id ?? '?', reportPath });
      }
    }
  }
  return ghosts;
};

describe('PIPELINE-REPORT-INTEGRITY — wave `done` entrega o relatório que promete', () => {
  it('nenhuma pipeline NOVA declara wave concluída apontando para relatório inexistente', () => {
    const offenders = [...new Set(ghostReports().map((g) => g.ticket))]
      .filter((t) => !KNOWN_GHOST_REPORTS.includes(t))
      .sort();

    assert.deepEqual(
      offenders,
      [],
      'ticket com wave `done` cujo relatório não existe no disco — o STATE.json afirma uma revisão ' +
        'que ninguém pode ler, e o `closed-green` passa a ser afirmação sem lastro:\n' +
        offenders.join('\n'),
    );
  });

  it('a allowlist de relatórios fantasma está pinada (não cresce em silêncio)', () => {
    assert.deepEqual(
      [...KNOWN_GHOST_REPORTS].sort(),
      [...KNOWN_GHOST_REPORTS],
      'a allowlist precisa estar ordenada para que o diff de quem a edita seja legível',
    );

    const stillGhost = [...new Set(ghostReports().map((g) => g.ticket))].sort();
    assert.deepEqual(
      stillGhost,
      [...KNOWN_GHOST_REPORTS],
      'a allowlist divergiu do disco. Se um ticket foi CORRIGIDO (ou removido), tire-o da lista — ' +
        'ela só pode diminuir. Se um ticket NOVO entrou, o primeiro teste já falhou e a correção é ' +
        'escrever o relatório, não estender a lista.',
    );
  });
});
