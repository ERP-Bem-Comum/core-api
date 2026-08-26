// Sobe um arquivo de remessa FICTÍCIO ao prefixo `sandbox/` do bucket da VAN — exercício do caminho
// de escrita de ponta a ponta, sem transmitir nada ao banco.
//
// POR QUE `sandbox/` E NUNCA `saida/`: `putRemittance` enfileira PARA O BANCO — o aviso está no topo
// do port, e não existe "salvar rascunho" naquele prefixo. O `sandbox/` fica de fora do ciclo de
// leitura do agente e de fora do `findRemittance` (`van-storage.s3.ts:174`), então um arquivo aqui
// não vira pagamento nem é servido no lugar de uma remessa real. É o caminho que o próprio port
// nomeia como "exercício sem risco".
//
// ⚠️ O NSA é CONSTANTE e não passa por `allocateNsa`. Alocar consumiria número da sequência real da
// conta-cedente, e o número não volta por desenho: reusá-lo é retransmissão aos olhos do banco, e
// pulá-lo abre gap na sequência que o banco vê. Um exercício não pode custar isso — por isso este
// use case não recebe `CedenteAccountStore` nem `RemittanceRepository`: sem eles no `Deps`, alocar
// não é uma coisa que este código *possa* fazer por engano.
//
// O arquivo sai pelo MESMO `CnabRemittanceTranslator` da remessa real, que já devolve o conteúdo
// inspecionado. Um gerador próprio aqui produziria um arquivo que o emissor de verdade não produz —
// e o exercício passaria a provar o gerador de mentira, não o caminho.
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  CnabRemittanceTranslator,
  CnabTranslateError,
  RemittanceCedenteData,
  RemittancePayeeData,
  RemittancePaymentInput,
  TranslateRemittanceInput,
} from '../ports/cnab-remittance-translator.ts';
import type { VanObjectKey, VanStorageError, VanStoragePort } from '../ports/van-storage.ts';

export type UploadSandboxRemittanceDeps = Readonly<{
  translator: CnabRemittanceTranslator;
  /**
   * Só `putSandbox`, e não o `VanStoragePort` inteiro.
   *
   * Receber o port completo daria a este use case acesso a `putRemittance` — o método que enfileira
   * pagamento no banco. Nada no código de hoje o chamaria, mas a próxima pessoa a editar este
   * arquivo teria a porta ao alcance, e o compilador não teria nada a dizer. Recebendo uma função
   * só, gravar em `saida/` deixa de ser algo que este código *pode* fazer.
   */
  putSandbox: VanStoragePort['putSandbox'];
  now: () => Date;
}>;

export type UploadSandboxRemittanceError = CnabTranslateError | VanStorageError;

export type UploadSandboxRemittanceOutput = Readonly<{
  key: VanObjectKey;
  fileName: string;
  lineCount: number;
  batchCount: number;
  totalCents: number;
}>;

// Convênio mascarado. `000000` é reservado e o `van-agent` mascara o mesmo valor do outro lado do
// contrato — `tests/cleanup/bank-fixture-masking.test.ts` cobra isso. Os três repositórios são
// públicos, e um convênio copiado de arquivo do banco já viveu aqui em 16 ocorrências.
const SANDBOX_CONVENIO = '000000';

// Topo da faixa (`domain/cedente/nsa.ts`: MIN 1, MAX 999_999). Fixo pela razão do aviso acima.
const SANDBOX_NSA = 999_999;

// Cedente de exercício: nada aqui é cadastro real. Os dígitos são obviamente sintéticos de
// propósito — um documento plausível num repositório público é indistinguível de um vazamento para
// quem lê depois, e o inspetor de forma não valida DV de CNPJ (`.claude/rules/cnab.md`), então
// "parecer válido" não compraria nada em troca do risco.
const SANDBOX_CEDENTE: RemittanceCedenteData = {
  bankCode: '237',
  documentType: '2',
  document: '00000000000000',
  convenio: SANDBOX_CONVENIO,
  agency: '00000',
  agencyDigit: '0',
  accountNumber: '0000000',
  accountDigit: '0',
  accountAgencyDigit: '0',
  companyName: 'EXERCICIO SANDBOX VAN',
  bankName: 'BRADESCO',
};

// Favorecido de exercício. Sintético como o cedente, e pela mesma razão.
//
// `bankCode` DIFERENTE do cedente (`237`) de propósito: a forma de lançamento é derivada do
// conteúdo (#711), então favorecido em outro banco produz TED, e TED é o caminho com mais campos
// preenchidos — finalidade (`P011`) e tipo de conta (`P013`) saem obrigatórios, enquanto crédito em
// conta exige os dois em BRANCO (inquiry-0033). Exercitar a rota mais preenchida é o que dá mais
// chance de o emissor errar aqui, e não no dia do arquivo real.
//
// Nome em caixa alta e sem acento: o emissor recusa qualquer caractere fora de `\x20-\x7E`
// (`cnab-malformed-file`), e a recusa não aponta campo nenhum (#862).
const SANDBOX_PAYEE: RemittancePayeeData = {
  name: 'FORNECEDOR EXERCICIO SANDBOX',
  documentType: '2',
  document: '00000000000000',
  bankCode: '001',
  agency: '00001',
  agencyDigit: '0',
  accountNumber: '0000123',
  accountDigit: '4',
};

/**
 * Os pagamentos do arquivo de exercício.
 *
 * `at` é a data de geração — a mesma que carimba o nome do arquivo —, e serve de base para a data de
 * pagamento de cada título.
 */
const buildSandboxPayments = (at: Date): readonly RemittancePaymentInput[] => [
  {
    route: 'transfer',
    payee: SANDBOX_PAYEE,
    // Valor pequeno e reconhecível. Não é arbitrário a ponto de dar na vista num extrato — este
    // arquivo não vai ao banco —, mas é distinto o bastante para se achar no conteúdo do `.REM` ao
    // conferir as posições 120-134 do Segmento A contra as 136-150 do B.
    valueCents: 12_345,
    paymentDate: at,
  },
];

const buildSandboxInput = (at: Date): TranslateRemittanceInput => ({
  cedente: SANDBOX_CEDENTE,
  nsa: SANDBOX_NSA,
  generatedAt: at,
  payments: buildSandboxPayments(at),
});

export const uploadSandboxRemittance =
  (deps: UploadSandboxRemittanceDeps) =>
  async (): Promise<Result<UploadSandboxRemittanceOutput, UploadSandboxRemittanceError>> => {
    const at = deps.now();

    // O tradutor devolve o arquivo JÁ inspecionado — se a forma não fecha, ele recusa aqui e nada
    // chega ao bucket. Um arquivo malformado em `sandbox/` seria pior que erro: passaria a impressão
    // de que o caminho funciona.
    const translated = deps.translator.translate(buildSandboxInput(at));
    if (!translated.ok) return err(translated.error);

    const stored = await deps.putSandbox(translated.value.fileName, translated.value.content);
    if (!stored.ok) return err(stored.error);

    return ok({
      key: stored.value,
      fileName: translated.value.fileName,
      lineCount: translated.value.lineCount,
      batchCount: translated.value.batchCount,
      totalCents: translated.value.totalCents,
    });
  };
