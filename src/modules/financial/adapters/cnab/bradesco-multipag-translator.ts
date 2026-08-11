// Implementação do `CnabRemittanceTranslator` para o layout Multipag do Bradesco.
//
// Junta as três peças que vivem neste diretório — nome, montagem e inspeção — atrás de uma
// assinatura que não menciona CNAB. É aqui que o vocabulário muda: entra "pagamento", sai
// "posição 120-134".
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';
import type {
  CnabRemittanceTranslator,
  CnabTranslateError,
  TranslateRemittanceInput,
  TranslatedRemittance,
} from '../../application/ports/cnab-remittance-translator.ts';
import { buildRemittanceFileName } from './remittance-file-name.ts';
import { buildRemittanceFile } from './remittance-file.ts';
import { inspectRemittanceFile } from './remittance-inspector.ts';

export const createBradescoMultipagTranslator = (): CnabRemittanceTranslator => ({
  translate: (
    input: TranslateRemittanceInput,
  ): Result<TranslatedRemittance, CnabTranslateError> => {
    const fileName = buildRemittanceFileName({
      convenio: input.cedente.convenio,
      nsa: input.nsa,
      generatedAt: input.generatedAt,
    });
    if (!fileName.ok) return err('cnab-file-name-failed');

    const file = buildRemittanceFile({
      cedente: input.cedente,
      bankName: input.cedente.bankName,
      nsa: input.nsa,
      generatedAt: input.generatedAt,
      serviceType: input.serviceType,
      launchForm: input.launchForm,
      payments: input.payments.map((p) => ({
        payee: p.payee,
        paymentDate: p.paymentDate,
        valueCents: p.valueCents,
      })),
    });
    if (!file.ok) return err('cnab-translation-failed');

    // Última barreira antes de o use case enfileirar dinheiro. Sem ambiente de homologação
    // (ADR-0061), é a única validação que existe antes do banco — e fica DENTRO do tradutor para
    // que o chamador não possa esquecê-la.
    if (inspectRemittanceFile(file.value.content).length > 0) return err('cnab-malformed-file');

    return ok({
      fileName: fileName.value,
      content: file.value.content,
      totalCents: file.value.totalCents,
      lineCount: file.value.lineCount,
    });
  },
});
