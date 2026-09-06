import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk, ok } from '#src/shared/index.ts';
import { previewRemittance } from '#src/modules/financial/application/use-cases/preview-remittance.ts';
import { generateRemittance } from '#src/modules/financial/application/use-cases/generate-remittance.ts';
import type {
  RemittancePreviewReader,
  RemittancePreviewRow,
} from '#src/modules/financial/application/ports/remittance-preview-reader.ts';
import type { RemittancePaymentReader } from '#src/modules/financial/application/ports/remittance-payment-reader.ts';
import type { CedenteAccountStore } from '#src/modules/financial/application/ports/cedente-account-store.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';
import { createRemittanceBatchPlanner } from '#src/modules/financial/adapters/cnab/batch-planner.ts';
import { createBradescoMultipagTranslator } from '#src/modules/financial/adapters/cnab/bradesco-multipag-translator.ts';
import { inspectRemittanceFile } from '#src/modules/financial/adapters/cnab/remittance-inspector.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import { create as createAccount } from '#src/modules/financial/domain/cedente/cedente-account.ts';

/*
 * CA6 da #948 — o Pix do PRÉ-VOO ao OBJETO NO ARMAZENAMENTO, num teste só.
 *
 * As duas metades já eram cobertas separadamente, e é exatamente por isso que este arquivo existe:
 * um pré-voo que aprova e uma geração que produz arquivo não provam que o operador consegue ir de um
 * ao outro. A #837 nasceu dessa lacuna — as duas pontas concordavam em teste e divergiam em uso.
 *
 * ⚠️ O QUE ESTE TESTE NÃO PROVA, e vale dizer para ninguém confiar de mais nele: os dois use cases
 * leem por PORTS DIFERENTES (`RemittancePreviewReader` e `RemittancePaymentReader`), então as duas
 * fixtures abaixo descrevem o mesmo título mas não são o mesmo dado. Que o cadastro real alimente as
 * duas de forma coerente é responsabilidade dos adapters Drizzle, e é medido na suíte de integração.
 * O que se prova aqui é o CAMINHO: pré-voo aprova → geração emite → objeto chega ao armazenamento
 * com a estrutura que o banco validou.
 *
 * A régua da estrutura é o `TESTE_PIX_BLOQUEADO_CNAB240_REV2.REM`, submetido ao Bradesco em
 * 02/09/2026 e validado por escrito em 05/09 — "apto para transmissão". Não há ambiente de
 * homologação para remessa de pagamento (ADR-0061), então esse laudo é o mais longe que a evidência
 * vai.
 */

const NOW = new Date(Date.UTC(2026, 7, 11, 14, 26, 5));
const PAYMENT_DATE = new Date(Date.UTC(2026, 7, 12));

const PAYABLE_ID = 'pay-pix-1';
const DOCUMENT_ID = 'doc-pix-1';

// Inscrição e chave SINTÉTICAS — dado real de cadastro não entra em fixture, e os repositórios são
// públicos (`.claude/rules/cnab.md`). A chave é um UUID de 36 posições, a forma que o `G100 = 04`
// (chave aleatória) descreve.
const PAYEE_DOCUMENT = '00000000000191';
const PIX_KEY = '00000000-0000-4000-8000-000000000000';
const VALUE_CENTS = 100_00;

const CEDENTE_ACCOUNT_ID = CedenteAccountId.generate();

// ── As duas leituras do MESMO título, cada uma no port do seu use case ────────────────────────────

const previewRow: RemittancePreviewRow = {
  payableId: PAYABLE_ID,
  documentId: DOCUMENT_ID,
  status: 'Approved',
  paymentMethod: 'PIX',
  paymentDetail: null,
  valueCents: VALUE_CENTS,
  payee: {
    // Desde a #945 o Pix por chave não exige bloco bancário: quem endereça no SPI é a chave, e as
    // posições bancárias do Segmento A saem zeradas por laudo do banco.
    bank: null,
    agency: null,
    accountNumber: null,
    checkDigit: null,
    pixKey: { keyType: 'random-key', key: PIX_KEY },
    document: PAYEE_DOCUMENT,
  },
};

const previewReader: RemittancePreviewReader = {
  loadPreviewRows: (ids) => Promise.resolve(ok(ids.includes(PAYABLE_ID) ? [previewRow] : [])),
};

const paymentReader: RemittancePaymentReader = {
  loadPayments: (ids) =>
    Promise.resolve(
      ok(
        ids.includes(PAYABLE_ID)
          ? [
              {
                payableId: PAYABLE_ID,
                documentId: DOCUMENT_ID,
                route: 'pix' as const,
                payee: {
                  name: 'FORNECEDOR PIX',
                  documentType: '2' as const,
                  document: PAYEE_DOCUMENT,
                },
                pixKey: PIX_KEY,
                pixKeyType: 'random-key',
                valueCents: VALUE_CENTS,
                paymentDate: PAYMENT_DATE,
              },
            ]
          : [],
      ),
    ),
};

const setup = async () => {
  const accounts = createInMemoryCedenteAccountStore();
  const remittances = createInMemoryRemittanceRepository({
    payableStatuses: { [PAYABLE_ID]: 'Approved' },
  });
  const storage = createInMemoryVanStorage();

  const acc = createAccount({
    id: CEDENTE_ACCOUNT_ID,
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '000000',
    document: '12345678000199',
    bankName: 'BRADESCO',
  });
  assert.ok(isOk(acc));
  await accounts.save(acc.value);

  return {
    storage,
    // O planejador e o tradutor são os adapters REAIS, de propósito: um fake reimplementaria a régua
    // de agrupamento e de layout dentro do teste, e duas réguas divergem. É a mesma razão pela qual
    // o front não pode replicar a partição.
    preview: previewRemittance({
      preview: previewReader,
      cedenteAccounts: accounts as unknown as CedenteAccountStore,
      batchPlanner: createRemittanceBatchPlanner(),
    }),
    generate: generateRemittance({
      cedenteAccounts: accounts,
      remittances,
      payments: paymentReader,
      translator: createBradescoMultipagTranslator(),
      storage,
      now: () => NOW,
      newRemittanceId: RemittanceId.generate,
      hashContent: (c: string) => `h${String(c.length)}`,
    }),
  };
};

const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

describe('#948 CA6 — o Pix vai do pré-voo ao objeto no armazenamento', () => {
  it('o pré-voo aprova, a geração emite e o objeto depositado tem a estrutura que o banco validou', async () => {
    const s = await setup();

    // ── 1. O PRÉ-VOO ────────────────────────────────────────────────────────────────────────────
    const preview = await s.preview({
      cedenteAccountId: CEDENTE_ACCOUNT_ID,
      payableIds: [PAYABLE_ID],
    });
    assert.ok(isOk(preview), `pré-voo falhou: ${isErr(preview) ? preview.error : '?'}`);

    assert.equal(preview.value.readyCount, 1, 'o pré-voo não aprovou o título de Pix');
    assert.equal(preview.value.lines[0]?.route, 'pix');
    // A conta do CA5 fecha nesta seleção: tudo entrou em lote.
    assert.equal(preview.value.unplannedCount, 0);
    // O lote que a tela mostra é a forma `45` — a mesma que vai sair no arquivo.
    assert.equal(preview.value.batches.length, 1);
    assert.equal(preview.value.batches[0]?.launchForm, '45');

    // ── 2. A GERAÇÃO ────────────────────────────────────────────────────────────────────────────
    const generated = await s.generate({
      cedenteAccountId: CEDENTE_ACCOUNT_ID,
      payableIds: [PAYABLE_ID],
    });
    assert.ok(isOk(generated), `geração falhou: ${isErr(generated) ? generated.error : '?'}`);

    // ARQUIVO PRÓPRIO: o Pix sai sozinho, e a seleção só de Pix produz exatamente um (CA4).
    assert.equal(generated.value.files.length, 1);
    const file = generated.value.files[0];
    assert.ok(file !== undefined);
    assert.equal(file.totalCents, VALUE_CENTS);

    // ── 3. O OBJETO NO ARMAZENAMENTO ────────────────────────────────────────────────────────────
    //
    // É aqui que o teste deixa de medir valor de retorno e passa a medir o que a VAN vai buscar. Um
    // arquivo correto que não chega ao armazenamento não paga ninguém.
    assert.equal(file.objectKey, `saida/${file.fileName}`);
    const stored = await s.storage.getText(file.objectKey);
    assert.ok(isOk(stored), 'o arquivo não chegou ao armazenamento');

    const content = stored.value;
    assert.deepEqual(
      inspectRemittanceFile(content),
      [],
      'o objeto depositado tem defeito de forma',
    );

    const lines = content.split(/\r?\n/).filter((l) => l.length > 0);

    // Os 6 registros do arquivo validado: header de arquivo, header de lote, A, B, trailer de lote,
    // trailer de arquivo.
    assert.equal(lines.length, 6, 'o arquivo de Pix por chave tem 6 registros');

    // SEM SEGMENTO J: o J exige código de barras (`G063`), e Pix por chave não tem. É a ausência que
    // o golden mostra, e ela some em silêncio se alguém reusar o montador de boleto.
    assert.equal(
      lines.filter((l) => at(l, 8, 8) === '3' && at(l, 14, 14) === 'J').length,
      0,
      'apareceu Segmento J num arquivo de Pix',
    );

    const [header, batchHeader, segmentA, segmentB] = lines;
    assert.ok(header !== undefined && batchHeader !== undefined);
    assert.ok(segmentA !== undefined && segmentB !== undefined);

    // Os seis pontos que o Bradesco confirmou por escrito em 05/09/2026, mais os que só o arquivo
    // revela. Conferidos contra o REV2 campo a campo na mesma data.
    assert.equal(at(header, 172, 174), 'PIX', 'header de arquivo sem a literal PIX (172-174)');
    assert.equal(at(batchHeader, 12, 13), '45', 'forma de lançamento não é a modalidade 45');
    assert.equal(at(batchHeader, 14, 16), '045', 'versão do layout de lote');
    assert.equal(at(segmentA, 15, 15), '0', 'código de movimento');
    assert.equal(at(segmentA, 16, 17), '09', 'instrução — pagamento bloqueado para autorização');
    assert.equal(at(segmentA, 18, 20), '009', 'câmara centralizadora');
    assert.equal(
      at(segmentA, 21, 42),
      '0'.repeat(22),
      'banco, agência e conta do favorecido deveriam sair ZERADOS (laudo de 05/09)',
    );
    assert.equal(at(segmentA, 43, 43), ' ', 'DV agência/conta sai em branco (#754)');
    assert.equal(at(segmentB, 15, 17), '04 ', 'G100 — chave aleatória, alfa à ESQUERDA, não `004`');
    assert.equal(at(segmentB, 233, 240), '0'.repeat(8), 'ISPB do PSP do recebedor');
  });
});
