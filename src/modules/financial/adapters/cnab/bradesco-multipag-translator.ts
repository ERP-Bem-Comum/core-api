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
import {
  buildRemittanceFile,
  planRemittanceFiles,
  type RemittanceFileError,
} from './remittance-file.ts';
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
    // Sobe com nome próprio pela mesma razão do convênio: o que falta é dado de CADASTRO, e o
    // operador precisa ler isso, não "falhou a tradução" (#891).
    case 'billet-party-unidentified':
      return 'cnab-billet-party-unidentified';
    // Mesma razão, outra rota: a chave é dado de cadastro, e o operador precisa ler que ela não cabe
    // no campo — não "falhou a tradução" (#838).
    case 'pix-key-unrepresentable':
      return 'cnab-pix-key-unrepresentable';
    // O erro de TRADUÇÃO da rota Pix, que sobe nomeado: diz que o tipo da chave não existe no
    // domínio do layout. Eram dois até a #923 — o `payee-ispb-unknown` saiu com a tabela de-para.
    case 'remittance-pix-key-type-unsupported':
      return 'cnab-pix-key-type-unsupported';
    // CNPJ alfanumérico (#863), e sobe nomeado por um motivo DIFERENTE dos anteriores: aqui não há
    // dado a corrigir no cadastro nem defeito no emissor. O documento está certo — é o layout do
    // banco, na v08 (jul/2025), que declara o campo `Num` e não previu a mudança da Receita de
    // 07/2026 (ADR-0044). A ação de quem recebe é escalar, não cadastrar, e um erro genérico
    // mandaria o operador procurar defeito numa inscrição válida.
    case 'inscription-alphanumeric-unsupported':
      return 'cnab-inscription-alphanumeric-unsupported';
    // `remittance-mixed-file-modalities` converge para o desfecho genérico, e é escolha, não
    // descuido: a seleção mista NÃO deveria alcançar o montador — quem chama passa por `planFiles`,
    // que já reparte. Chegar aqui significa que alguém montou um arquivo sem repartir antes, e não há
    // dado a corrigir no cadastro; é o chamador que pulou uma etapa.
    case 'numeric-field-overflow':
    case 'numeric-field-invalid':
    case 'remittance-billet-bank-unreadable':
    case 'remittance-payee-bank-unreadable':
    case 'remittance-without-payments':
    case 'remittance-reference-overflow':
    case 'remittance-mixed-file-modalities':
      return 'cnab-translation-failed';
    // #948 CA4 — sobe nomeado, e é o contraste com a linha acima que explica por quê. As duas falam
    // de mistura, e param em lugares opostos: `mixed-file-modalities` é a defesa do montador contra
    // quem não repartiu — chegar lá é defeito de CÓDIGO, e o operador não tem o que fazer. Este vem
    // da partição, antes do NSA, e é ESCOLHA DE SELEÇÃO: o operador refaz e segue.
    case 'remittance-pix-requires-exclusive-file':
      return 'cnab-pix-requires-exclusive-file';
  }
};

export const createBradescoMultipagTranslator = (): CnabRemittanceTranslator => ({
  // A partição reusa `translateErrorFor`: as causas de recusa são as MESMAS do montador, porque a
  // partição deriva o perfil de cada pagamento pela mesma função. Um mapeamento próprio aqui
  // divergiria do outro no dia em que um erro novo entrasse — e o operador receberia dois nomes para
  // o mesmo defeito conforme a etapa em que ele fosse detectado.
  planFiles: (input) => {
    const plan = planRemittanceFiles(input.payments, input.cedenteBankCode);
    return plan.ok ? ok(plan.value) : err(translateErrorFor(plan.error));
  },

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
