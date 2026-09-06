import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isOk, ok } from '#src/shared/index.ts';
import { previewRemittance } from '#src/modules/financial/application/use-cases/preview-remittance.ts';
import type { RemittancePaymentReaderError } from '#src/modules/financial/application/ports/remittance-payment-reader.ts';
import type {
  RemittancePreviewReader,
  RemittancePreviewRow,
} from '#src/modules/financial/application/ports/remittance-preview-reader.ts';
import type { CedenteAccountStore } from '#src/modules/financial/application/ports/cedente-account-store.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
import type { PayeePaymentTarget } from '#src/modules/financial/domain/payout/types.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { createRemittanceBatchPlanner } from '#src/modules/financial/adapters/cnab/batch-planner.ts';

/*
 * CA3 da #948 — a SEGUNDA camada da rede: o READER.
 *
 * `preflight-covers-emitter-refusals.test.ts` varre a união do MONTADOR. Ela não basta, e o motivo é
 * de encanamento: entre o pré-voo e o montador existe o reader, que também recusa — e as recusas
 * dele escapam de uma rede que só olha o adapter CNAB.
 *
 * ⚠️ A CONSEQUÊNCIA DE UMA RECUSA DO READER É DIFERENTE, e é o que justifica a rede separada em vez
 * de mais entradas na outra. Ele roda ANTES do `allocateNsa`, então não queima sequência — mas é
 * TUDO-OU-NADA: um título que o pré-voo aprovou e o reader rejeita derruba a geração INTEIRA, e o
 * erro que chega ao operador não diz qual título foi. Ele acabou de ver uma tela dizendo que estava
 * tudo pronto. O custo não é o NSA; é a impossibilidade de diagnosticar.
 *
 * ⚠️ E O "PRÉ-VOO" AQUI É `previewRemittance`, NÃO `checkPayoutReadiness`. A outra rede mede a régua
 * de domínio, que julga CADASTRO. Esta mede o use case, porque parte do que o reader recusa não é
 * cadastro — `document-not-approved` depende do STATUS do título, que a régua de domínio não vê e o
 * pré-voo do operador vê. Medir contra a régua de domínio deixaria essa recusa parecendo descoberta
 * quando ela é coberta, só que noutra camada.
 */

const PAYEE_DOCUMENT = '00000000000191';

const BANK_ACCOUNT_ONLY: PayeePaymentTarget = {
  bank: '237',
  agency: '1234-5',
  accountNumber: '123456',
  checkDigit: '0',
  pixKey: null,
  document: PAYEE_DOCUMENT,
};

// Cadastro sem destino nenhum — a forma que a ETL de fato gravou para fornecedor incompleto.
const NO_DESTINATION: PayeePaymentTarget = {
  bank: null,
  agency: null,
  accountNumber: null,
  checkDigit: null,
  pixKey: null,
  document: null,
};

const CEDENTE_ACCOUNT_ID = CedenteAccountId.generate();

const CEDENTE_ACCOUNT: CedenteAccount = {
  id: CEDENTE_ACCOUNT_ID,
  bankCode: '237',
  agency: '1234',
  accountNumber: '567890',
  accountDigit: '1',
  convenio: '000000',
  document: '12345678000199',
  status: 'Active',
  nextNsa: 1,
};

const row = (over: Partial<RemittancePreviewRow>): RemittancePreviewRow => ({
  payableId: 'pay-1',
  documentId: 'doc-1',
  status: 'Approved',
  paymentMethod: 'TED',
  paymentDetail: null,
  valueCents: 10_000,
  payee: BANK_ACCOUNT_ONLY,
  ...over,
});

const runPreview = async (r: RemittancePreviewRow) => {
  const useCase = previewRemittance({
    preview: {
      loadPreviewRows: (ids) => Promise.resolve(ok(ids.includes(r.payableId) ? [r] : [])),
    } satisfies RemittancePreviewReader,
    cedenteAccounts: {
      findById: () => Promise.resolve(ok(CEDENTE_ACCOUNT)),
    } as unknown as CedenteAccountStore,
    batchPlanner: createRemittanceBatchPlanner(),
  });

  const out = await useCase({
    cedenteAccountId: CEDENTE_ACCOUNT_ID,
    payableIds: [r.payableId],
  });
  assert.ok(isOk(out));
  return out.value;
};

/**
 * O que o pré-voo do OPERADOR faz com o título que o reader rejeitaria.
 *
 * `preflight`  — a tela já o mostra impedido, com a ação nomeada. `probe` demonstra, executando.
 * `schema`     — a condição existe no reader mas é DEFENSIVA: a coluna é `NOT NULL`, então o estado
 *                não é alcançável por dado. Fica declarada, com a referência da coluna.
 * `infra`      — falha de infraestrutura, não de dado. Nenhum pré-voo antecipa banco fora do ar.
 */
type ReaderCoverage =
  | Readonly<{ kind: 'preflight'; probe: () => Promise<void> }>
  | Readonly<{ kind: 'schema'; why: string }>
  | Readonly<{ kind: 'infra'; why: string }>;

const READER_COVERAGE: Record<RemittancePaymentReaderError, ReaderCoverage> = {
  // O reader recusa por status; a tela mostra `not-approved` com contador próprio. As duas metades
  // concordam porque a régua é a mesma (`isApprovedForRemittance`), e a ação é aprovar — não
  // completar cadastro, que é o que um `blocked` mandaria fazer.
  'document-not-approved': {
    kind: 'preflight',
    probe: async () => {
      const preview = await runPreview(row({ status: 'Draft' }));

      assert.equal(preview.notApprovedCount, 1);
      assert.equal(preview.lines[0]?.status, 'not-approved');
      assert.equal(preview.readyCount, 0, 'a tela aprovaria o que o reader vai rejeitar');
    },
  },

  // O balde do cadastro. O reader chama `checkPayoutReadiness` — a MESMA régua do pré-voo —, e é o
  // caso estrutural abaixo que impede essa chamada de virar uma segunda cópia.
  //
  // ⚠️ As condições que o reader tem ALÉM da régua (`paymentMethod`, `dueDate` e `valueCents` nulos)
  // não são alcançáveis por dado: as três colunas são `NOT NULL` em `fin_payables`
  // (`schemas/mysql.ts` — `value`, `due_date`, `payment_method`). Se alguma virar nullable, esta
  // entrada deixa de ser verdade e o `PayoutCandidate` passa a precisar do campo — ele hoje não
  // carrega nem valor nem vencimento.
  'remittance-payment-incomplete': {
    kind: 'preflight',
    probe: async () => {
      const preview = await runPreview(row({ payee: NO_DESTINATION }));

      assert.equal(preview.blockedCount, 1);
      assert.equal(preview.lines[0]?.status, 'blocked');
      assert.ok(
        (preview.lines[0]?.gaps.length ?? 0) > 0,
        'impedido sem lacuna nomeada não diz ao operador o que corrigir',
      );
    },
  },

  'remittance-payment-reader-unavailable': {
    kind: 'infra',
    why: 'falha de leitura no banco — não é estado do título, e nenhum pré-voo a antecipa',
  },
};

describe('#948 CA3 — toda recusa do reader tem resposta do pré-voo', () => {
  it('as recusas classificadas como cobertas aparecem no pré-voo do operador', async () => {
    for (const [error, coverage] of Object.entries(READER_COVERAGE)) {
      if (coverage.kind !== 'preflight') continue;
      await assert.doesNotReject(async () => {
        await coverage.probe();
      }, `${error}: a sonda do pré-voo falhou`);
    }
  });

  /*
   * ⚠️ O CASO ESTRUTURAL, e é ele que sustenta a entrada `remittance-payment-incomplete` acima.
   *
   * A cobertura daquela recusa não vem de as duas camadas chegarem ao mesmo veredito por acaso — vem
   * de o reader CHAMAR a régua do pré-voo em vez de reimplementá-la. Uma segunda cópia compilaria,
   * passaria em todos os testes de unidade dos dois lados, e divergiria no primeiro dia em que uma
   * das duas mudasse. É literalmente a #837.
   *
   * Ler o fonte é o preço de fixar isso: a alternativa seria subir MySQL para exercitar um adapter
   * Drizzle, e o que se quer provar aqui não é comportamento — é DEPENDÊNCIA.
   */
  it('o reader consulta a régua do pré-voo, em vez de manter uma cópia', () => {
    // Resolvido a partir do PRÓPRIO ARQUIVO, nunca do `cwd`. É a convenção de `tests/cleanup/`
    // (`docs-update.test.ts`), e o motivo é o mesmo que a rule de testes registra: gate cuja resposta
    // depende de ONDE roda não verifica nada — passaria aqui e estouraria no runner.
    const HERE = fileURLToPath(new URL('.', import.meta.url));
    const PROJECT_ROOT = resolve(HERE, '..', '..', '..', '..', '..');
    const path =
      'src/modules/financial/adapters/persistence/repos/remittance-payment-reader.drizzle.ts';
    const source = readFileSync(join(PROJECT_ROOT, path), 'utf8');

    assert.match(
      source,
      /import \{ checkPayoutReadiness \}/,
      `${path} deixou de importar a régua do pré-voo`,
    );
    assert.match(
      source,
      /checkPayoutReadiness\(\{/,
      `${path} importa a régua mas não a chama — a cobertura do pré-voo deixou de valer`,
    );
  });
});
