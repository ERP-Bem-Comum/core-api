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
import { buildRemittanceFile, type RemittanceFileError } from './remittance-file.ts';
import { inspectRemittanceFile } from './remittance-inspector.ts';

// A recusa do montador traduzida para o vocabulário do port — e é um `switch` EXAUSTIVO, não um
// ternário com `else` genérico (#804).
//
// A diferença não é estilística. Com o ternário, um membro novo em `RemittanceFileError` caía
// calado em `cnab-translation-failed`: o emissor ganhava uma causa de recusa e a borda continuava
// dizendo "falhou a tradução", sem que nada apontasse a perda. Aqui o compilador cobra o caso —
// `switch-exhaustiveness-check` está ligado, e o retorno tipado fecha a porta.
//
// Os membros que ainda convergem para `cnab-translation-failed` estão listados um a um, de
// propósito: a convergência passa a ser uma escolha registrada, e não o efeito de um `default`.
const translateErrorFor = (error: RemittanceFileError): CnabTranslateError => {
  switch (error) {
    case 'convenio-field-empty':
      return 'cnab-convenio-missing';
    case 'convenio-field-overflow':
      return 'cnab-convenio-overflow';
    // A rota sem emissor sobe com nome próprio: achatá-la mandaria o operador procurar dado
    // faltando num título que está completo — o que falta é o emissor.
    case 'remittance-launch-form-unsupported':
      return 'cnab-launch-form-unsupported';
    case 'numeric-field-overflow':
    case 'numeric-field-invalid':
    case 'remittance-billet-bank-unreadable':
    case 'remittance-payee-bank-unreadable':
    case 'remittance-without-payments':
    case 'remittance-reference-overflow':
      return 'cnab-translation-failed';
  }
};

export const createBradescoMultipagTranslator = (): CnabRemittanceTranslator => ({
  translate: (
    input: TranslateRemittanceInput,
  ): Result<TranslatedRemittance, CnabTranslateError> => {
    // O CONTEÚDO antes do NOME, e a ordem é deliberada (#804).
    //
    // Enquanto o nome vinha primeiro, todo problema de convênio chegava ao chamador como
    // `cnab-file-name-failed`: `buildRemittanceFileName` recusa convênio não-numérico ou vazio, e o
    // tradutor achatava os quatro erros dele num só. O operador recebia "falha ao montar o nome do
    // arquivo" para um convênio faltando no cadastro — mensagem que não aponta tela nenhuma.
    //
    // Montando o arquivo primeiro, o convênio é julgado pelo campo que o escreve, com erro próprio,
    // e o nome só responde pelo que é dele: NSA fora de faixa, comprimento, caractere inseguro.
    const file = buildRemittanceFile({
      cedente: input.cedente,
      bankName: input.cedente.bankName,
      nsa: input.nsa,
      generatedAt: input.generatedAt,
      payments: input.payments,
    });
    if (!file.ok) return err(translateErrorFor(file.error));

    const fileName = buildRemittanceFileName({
      convenio: input.cedente.convenio,
      nsa: input.nsa,
      generatedAt: input.generatedAt,
    });
    if (!fileName.ok) return err('cnab-file-name-failed');

    // Última barreira antes de o use case enfileirar dinheiro. Sem ambiente de homologação
    // (ADR-0061), é a única validação que existe antes do banco — e fica DENTRO do tradutor para
    // que o chamador não possa esquecê-la.
    if (inspectRemittanceFile(file.value.content).length > 0) return err('cnab-malformed-file');

    return ok({
      fileName: fileName.value,
      content: file.value.content,
      totalCents: file.value.totalCents,
      lineCount: file.value.lineCount,
      batchCount: file.value.batchCount,
      // Repassado sem tocar: a ordem é o contrato, e reordenar aqui seria desfazer exatamente o que
      // o montador se deu ao trabalho de preservar.
      yourNumbers: file.value.yourNumbers,
    });
  },
});
