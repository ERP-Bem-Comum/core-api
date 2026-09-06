import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { CedenteAccountId } from '../../domain/cedente/cedente-account-id.ts';
import type { RemittanceId } from '../../domain/remittance/remittance-id.ts';
import { create as createRemittance } from '../../domain/remittance/remittance.ts';
import { distinctPaymentDays } from '../../domain/remittance/payment-dates.ts';
import {
  checkCedenteRemittanceReadiness,
  type CedenteRemittanceGap,
} from '../../domain/cedente/remittance-eligibility.ts';
import { inscriptionType } from '../../domain/payout/inscription.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import type { RemittancePaymentData } from '../ports/remittance-payment-reader.ts';
import type { CedenteAccountStore } from '../ports/cedente-account-store.ts';
import type { RemittanceRepository } from '../ports/remittance-repository.ts';
import type { RemittancePaymentReader } from '../ports/remittance-payment-reader.ts';
import type { VanStoragePort } from '../ports/van-storage.ts';
import type { CnabRemittanceTranslator } from '../ports/cnab-remittance-translator.ts';

export type GenerateRemittanceDeps = Readonly<{
  cedenteAccounts: CedenteAccountStore;
  remittances: RemittanceRepository;
  payments: RemittancePaymentReader;
  translator: CnabRemittanceTranslator;
  storage: VanStoragePort;
  now: () => Date;
  newRemittanceId: () => RemittanceId;
  hashContent: (content: string) => string;
}>;

// Nem tipo de serviço nem forma de lançamento entram por aqui: a forma é derivada da rota de cada
// título, um lote por forma (#711, CA4). Recebê-la do chamador era aceitar uma afirmação que o
// conteúdo do arquivo podia contradizer — e com uma rota só, os dois concordavam por acidente.
export type GenerateRemittanceInput = Readonly<{
  cedenteAccountId: CedenteAccountId;
  payableIds: readonly string[];
}>;

// Razão social do cedente — posições 073-102 do header de arquivo E do header de lote.
//
// Vinha de `account.bankName`, que é o nome do BANCO: `export-reconciliation-nibo.ts` compõe
// `${bankCode} ${bankName}` com o mesmo campo. O emissor mandava ao Bradesco o mesmo valor nas
// posições 073-102 (nome da empresa) e 103-132 (nome do banco) — e 30 brancos nas duas quando a
// conta veio do ETL, que nunca preenche `bankName` (`scripts/etl/financial/mapper.ts`).
//
// CONSTANTE, e não coluna, porque o dado é da ORGANIZAÇÃO emissora: um só, igual para todas as
// contas-cedente. Uma coluna criaria uma cópia por conta, livre para divergir — foi exatamente
// assim que `bankName` virou a segunda casa de um dado que não tinha casa nenhuma.
//
// Não é segredo: é público na Receita e já aparece versionado (`scripts/seed/partners.ts`). O que
// NÃO cabe aqui é dado bancário por conta — agência, conta e DV vêm da linha, e hard-codá-los
// repetiria o defeito que esta constante corrige.
//
// ⚠️ `alpha()` trunca em 30 posições sem avisar. Este valor tem 20 — mudá-lo pede conferir o novo.
const CEDENTE_COMPANY_NAME = 'ASSOCIACAO BEM COMUM';

// UM arquivo gerado. Era o retorno inteiro do use case até a partição multi-arquivo (CA4 da #838).
export type GeneratedRemittanceFile = Readonly<{
  remittanceId: RemittanceId;
  fileName: string;
  objectKey: string;
  nsa: number;
  totalCents: number;
  lineCount: number;
}>;

// ⚠️ LISTA, e não um arquivo com campos opcionais para os demais. Uma seleção pode exigir mais de um
// arquivo — o layout manda certas modalidades em arquivo separado —, e cada um tem NSA, nome, hash e
// desfecho de transporte PRÓPRIOS. Devolver o primeiro e omitir o resto faria a tela de confirmação
// exibir um comprovante que descreve metade do que foi enfileirado, e o operador confirmaria
// acreditando ter conferido — o mesmo defeito que o pré-voo existe para não cometer.
//
// A ordem é a da partição: primeira aparição de cada modalidade na seleção.
export type GenerateRemittanceOutput = Readonly<{
  files: readonly GeneratedRemittanceFile[];
}>;

export type GenerateRemittanceError =
  | 'remittance-empty-selection'
  | 'remittance-payables-already-held'
  | 'remittance-payments-unavailable'
  // Título não-`Approved` na seleção (#736). É a barreira que importa: impede pagar o que ninguém
  // aprovou, contornando a separação de funções que o `payable:approve` garante.
  | 'document-not-approved'
  | 'remittance-mixed-payment-dates'
  // Título de rota que o emissor ainda não cobre (PIX, guia). Não é dado faltando: é o arquivo que
  // ainda não sabe emitir aquela forma, e o operador não tem o que corrigir no cadastro.
  | 'remittance-launch-form-unsupported'
  // Conta-cedente sem convênio, ou com convênio ilegível (#722). É dado que o operador corrige, e
  // por isso viaja com nome próprio em vez de virar falha interna do montador do nome.
  | CedenteRemittanceGap
  | 'remittance-nsa-unavailable'
  | 'remittance-file-name-failed'
  | 'remittance-build-failed'
  | 'remittance-malformed-file'
  | 'remittance-persist-failed'
  | 'remittance-upload-failed';

export const generateRemittance =
  (deps: GenerateRemittanceDeps) =>
  async (
    input: GenerateRemittanceInput,
  ): Promise<Result<GenerateRemittanceOutput, GenerateRemittanceError>> => {
    if (input.payableIds.length === 0) return err('remittance-empty-selection');

    // 1. Quem já está preso. A pergunta vai ao BANCO porque outra instância pode ter enfileirado o
    // mesmo título há segundos — e incluir de novo é pagar duas vezes.
    const held = await deps.remittances.findHeldPayables(input.payableIds);
    if (!held.ok) return err('remittance-persist-failed');
    if (held.value.length > 0) return err('remittance-payables-already-held');

    // 2. Dados de pagamento. Faltar título é erro: montar com menos do que foi selecionado
    // pagaria parte e calaria sobre o resto.
    const payments = await deps.payments.loadPayments(input.payableIds);
    if (!payments.ok) {
      // Não-aprovado sobe com nome próprio (409): é regra de negócio que o operador entende, não a
      // indisponibilidade genérica que os demais erros do reader viram. O pré-voo já mostra QUAIS.
      return err(
        payments.error === 'document-not-approved'
          ? 'document-not-approved'
          : 'remittance-payments-unavailable',
      );
    }
    if (payments.value.length !== input.payableIds.length) {
      return err('remittance-payments-unavailable');
    }

    // 3. Um arquivo, um dia. A checagem vem ANTES do NSA de propósito: o número não volta depois de
    // alocado, e queimar um por erro de seleção deixaria um gap na sequência sem nenhum arquivo do
    // outro lado. Sem isto, uma seleção com vencimentos distintos vira um arquivo bem-formado que o
    // banco processa com datas misturadas — sem erro, sem retorno negativo, sem sinal.
    const days = distinctPaymentDays(payments.value.map((p) => p.paymentDate));
    if (days.length > 1) return err('remittance-mixed-payment-dates');

    const account = await deps.cedenteAccounts.findById(input.cedenteAccountId);
    if (!account.ok || account.value === null) return err('remittance-nsa-unavailable');

    // 3.1. A conta serve para gerar? O convênio é opcional no cadastro e obrigatório aqui (#722).
    //
    // A verificação vem ANTES do NSA pelo mesmo motivo da checagem de datas: o número não volta
    // depois de alocado, e sem isto cada tentativa com conta incompleta queimava um da sequência —
    // falhando adiante, no montador do nome, e chegando ao operador como erro interno.
    const eligible = checkCedenteRemittanceReadiness(account.value);
    if (!eligible.ok) return err(eligible.error);

    // 3.2. EM QUANTOS ARQUIVOS a seleção se reparte, e o que vai em cada um (CA4 da #838).
    //
    // ⚠️ ANTES do NSA, pela MESMA disciplina das duas checagens acima, e agora com uma razão a mais:
    // é aqui que se descobre QUANTOS números alocar. Perguntar depois obrigaria a alocar um, montar,
    // descobrir que faltava outro e alocar de novo — com o primeiro já queimado se o segundo falhasse.
    // Uma seleção que a partição já recusa não queima sequência nenhuma.
    const plan = deps.translator.planFiles({
      cedenteBankCode: account.value.bankCode,
      payments: payments.value,
    });
    if (!plan.ok) {
      // A rota sem emissor sobe com nome próprio — é o que o operador entende ("o arquivo ainda não
      // sabe emitir esta forma"), e não há dado a corrigir no cadastro. As demais causas são falha
      // de montagem: o pré-voo já as mostra título a título.
      return err(
        plan.error === 'cnab-launch-form-unsupported'
          ? 'remittance-launch-form-unsupported'
          : 'remittance-build-failed',
      );
    }

    const generatedAt = deps.now();

    // Os dados do cedente são os MESMOS em todos os arquivos da geração — montados uma vez, fora do
    // laço. Montá-los por arquivo abriria a porta para dois arquivos da mesma remessa declararem
    // cedentes diferentes, que é o tipo de divergência que nenhum teste procura.
    const cedente = {
      bankCode: account.value.bankCode,
      // 018 — G005. DERIVADO da inscrição, não afirmado (#856, CA4). Era `'2'` literal: todo cedente
      // saía declarado pessoa jurídica, e um cedente pessoa física produzia arquivo bem-formado cujo
      // tipo de inscrição não corresponde ao titular. A régua é a MESMA que o reader usa para o
      // favorecido — uma função só, no domínio, medindo o comprimento da inscrição normalizada.
      documentType: inscriptionType(account.value.document),
      document: account.value.document,
      convenio: account.value.convenio,
      agency: account.value.agency,
      // 058 — G009. Sai do CADASTRO desde a #856; era `''` literal, e o dígito que o operador digita
      // na tela desde 25/08 (specs/107 do web-app) não tinha onde ser gravado.
      //
      // Ausente continua sendo BRANCO, e isso é o layout, não desistência: `Alfa` vazio é brancos
      // (p. 14), e a agência pode legitimamente não ter DV. O que mudou é que o branco passou a
      // significar "esta agência não tem dígito" em vez de "o sistema não sabe".
      //
      // ⚠️ Nunca `'0'` por omissão. `05-armadilhas-e-divergencias.md` §2 é explícito: "se o DV for
      // `0`, enviar `0`; se a agência realmente não tiver DV, enviar branco. Nunca zero por padrão
      // sem confirmar" — zero é um dígito afirmado, e afirmar o errado é pior que não afirmar.
      agencyDigit: account.value.agencyDigit ?? '',
      accountNumber: account.value.accountNumber,
      accountDigit: account.value.accountDigit,
      // 072 — G012. BRANCO, e a ausência é justificada, não esquecida (#856, CA2 · ramo facultativo).
      //
      // O campo não é "o segundo DV do cedente": `G012` (layout v08, p. 96) o define como a **2ª
      // posição do DV** para bancos cujo dígito de conta tem duas posições — o exemplo do próprio
      // manual é `45981-36`, com `3` na 071 e `6` na 072. O DV de conta do Bradesco tem UMA posição:
      // `bradescoAccountCheckDigits` (Manual de Procedimentos 4008-523-0096 v16, p. 30) devolve um
      // único caractere, `0`–`9` ou `P`. Não existe segunda posição a gravar.
      //
      // Confirmado do outro lado, no arquivo que o banco aceitou: a inquiry-0033 mediu 18 submissões
      // ao Validador Universal em 25/08/2026, com os DVs de agência/conta vazios em três cenários e
      // **nenhuma crítica** a eles.
      //
      // ⚠️ Por isso NÃO ganhou coluna, ao contrário da 058: uma coluna aqui pediria ao operador um
      // dígito que a conta dele não tem, e o que ele digitasse iria para o arquivo.
      accountAgencyDigit: '',
      companyName: CEDENTE_COMPANY_NAME,
      // ⚠️ Sai com 30 brancos quando a coluna é NULL — o caso de TODA conta vinda do ETL, que nunca
      // preenche o campo. Fica assim de propósito: 103-132 é o nome do BANCO, o destinatário do
      // arquivo é o próprio banco, e o layout (p. 15, G014) não marca o campo como obrigatório —
      // é uma das duas colunas sem asterisco do header, ao lado do nome da empresa.
      bankName: account.value.bankName ?? '',
    } as const;

    // O que foi montado e ainda não foi gravado. Acumula porque a gravação é UMA para todas as
    // remessas: ver `saveAll` e o modo de falha sem saída que ele existe para não ter.
    const prepared: {
      remittance: Remittance;
      content: string;
      fileName: string;
      nsa: number;
      totalCents: number;
      lineCount: number;
    }[] = [];

    for (const group of plan.value) {
      // Os pagamentos DESTE arquivo, na ordem de entrada. Os índices vêm da partição, que os derivou
      // desta mesma lista — o `undefined` é inalcançável e existe porque
      // `noUncheckedIndexedAccess` o exige.
      const filePayments: RemittancePaymentData[] = [];
      for (const index of group.paymentIndices) {
        const payment = payments.value[index];
        if (payment === undefined) return err('remittance-build-failed');
        filePayments.push(payment);
      }

      // 4. UM NSA POR ARQUIVO, cada um sob lock de linha. A partir daqui o número está CONSUMIDO —
      // se algo falhar adiante, ele não volta, e isso agora vale N vezes. É deliberado: gap na
      // sequência é inofensivo, reusar número é retransmissão aos olhos do banco. E dois arquivos
      // com o MESMO NSA seriam, para o banco, o mesmo arquivo transmitido duas vezes — que é a razão
      // pela qual a alocação está aqui dentro, e não uma vez lá fora.
      const nsa = await deps.cedenteAccounts.allocateNsa(input.cedenteAccountId);
      if (!nsa.ok) return err('remittance-nsa-unavailable');

      // O tradutor devolve o arquivo JÁ verificado — nome, montagem e inspeção estrutural são dele.
      // A application não conhece layout: trocar de banco é trocar o adapter injetado aqui.
      const translated = deps.translator.translate({
        cedente,
        nsa: nsa.value,
        generatedAt,
        // O pagamento vai INTEIRO, como o reader o entregou: cada rota carrega os dados que ela usa,
        // e achatá-los aqui num formato único perderia o que distingue boleto de transferência.
        payments: filePayments,
      });
      if (!translated.ok) {
        switch (translated.error) {
          case 'cnab-file-name-failed':
            return err('remittance-file-name-failed');
          case 'cnab-malformed-file':
            return err('remittance-malformed-file');
          case 'cnab-launch-form-unsupported':
            return err('remittance-launch-form-unsupported');
          // O convênio recusado pelo emissor reusa o vocabulário do gap de cedente, em vez de ganhar
          // um erro paralelo (#804): para quem opera, é o MESMO problema e a MESMA tela, tenha ele
          // sido detectado na elegibilidade — antes do NSA — ou aqui, no montador. Dois nomes para o
          // mesmo defeito obrigariam a borda a traduzir duas vezes a mesma mensagem.
          //
          // Chegar aqui significa que a checagem anterior não pegou: ela roda sobre a conta-cedente,
          // esta sobre o que de fato foi escrito no registro. É a dupla verificação que o cabeçalho
          // de `remittance-eligibility.ts` declara intencional.
          case 'cnab-convenio-missing':
            return err('cedente-convenio-missing');
          case 'cnab-convenio-overflow':
            return err('cedente-convenio-too-long');
          // Converge para o erro de DADO FALTANDO, e não para `remittance-build-failed` (#891). A
          // distinção é a mesma que o bloco do convênio faz acima: o que o operador precisa ler é
          // "falta cadastro", e a tela é a do pré-voo — que já mostra QUAIS títulos não saem. Mandá-lo
          // para `build-failed` diria "defeito do emissor", que é o chamado errado.
          //
          // Chegar aqui significa que o reader deixou passar: ele recusa o título sem inscrição do
          // favorecido ANTES de alocar NSA. Esta é a rede de segurança contra um chamador novo, não o
          // caminho normal — e é por isso que o vocabulário do operador é o mesmo dos dois lados.
          //
          // ⚠️ Com a partição, "antes de alocar NSA" passou a valer por ARQUIVO: chegar aqui no
          // segundo arquivo significa que o primeiro já queimou o dele. O gap é inofensivo (ver o
          // comentário do `allocateNsa` acima), mas a recusa parcial não é — e é por isso que a
          // gravação é UMA para todas as remessas, em `saveAll`, e não uma por arquivo.
          //
          // ⚠️ OS DOIS DA ROTA PIX (#838) convergem para o MESMO desfecho, e a convergência é escolha
          // registrada, não efeito de `default`: nos dois o operador vai ao cadastro do favorecido, e
          // a tela é a do pré-voo. O que os distingue — chave que não cabe no campo, tipo de chave
          // fora do domínio do layout — importa para quem lê o log do emissor, e é por isso que eles
          // sobem NOMEADOS até aqui em vez de serem achatados na origem. Chegar em qualquer um deles
          // é rede de segurança: o reader já recusou antes do NSA.
          //
          // Eram três; o `cnab-payee-ispb-unknown` saiu na #923 junto com a tabela de-para de ISPB.
          case 'cnab-billet-party-unidentified':
          case 'cnab-pix-key-unrepresentable':
          case 'cnab-pix-key-type-unsupported':
            return err('remittance-payments-unavailable');
          case 'cnab-translation-failed':
            return err('remittance-build-failed');
        }
      }

      // A costura da #752, e o único ponto do sistema onde ela pode acontecer.
      //
      // O tradutor devolve as referências de G064 na ordem de ENTRADA dos pagamentos DESTE arquivo;
      // `filePayments` está nessa mesma ordem e é quem carrega o `documentId`. A camada CNAB não
      // conhece documento (ADR-0006) e a application não conhece layout — o par só existe aqui.
      //
      // ⚠️ Casar por índice só é correto porque `buildRemittanceFile` devolve na ordem de entrada,
      // apesar de o agrupamento em lotes reordenar internamente. Se aquele contrato mudar, este
      // casamento passa a associar a referência ao documento errado — em silêncio, e o erro só
      // aparece no primeiro retorno real. O teste que fixa a ordem sob reordenação é o que segura
      // isto.
      //
      // ⚠️ E a partição acrescentou uma segunda condição, que o índice sozinho não revela: o índice é
      // dentro do ARQUIVO, não da seleção. `filePayments` é a fatia que a partição escolheu, e é ela
      // que foi passada ao tradutor — casar contra `payments.value` associaria a referência do
      // primeiro título do segundo arquivo ao primeiro título da seleção.
      const payables = filePayments.map((payment, index) => ({
        payableId: payment.payableId,
        documentId: payment.documentId,
        yourNumber: translated.value.yourNumbers[index] ?? '',
      }));

      const remittance = createRemittance({
        id: deps.newRemittanceId(),
        cedenteAccountId: input.cedenteAccountId,
        nsa: nsa.value,
        fileName: translated.value.fileName,
        contentHash: deps.hashContent(translated.value.content),
        payables,
        generatedAt: generatedAt.toISOString(),
      });
      // A recusa por referência ausente (`remittance-document-without-reference`) chega aqui: o
      // `?? ''` acima existe porque `noUncheckedIndexedAccess` o exige, e o agregado é quem
      // transforma o vazio em erro nomeado, em vez de deixá-lo virar arquivo emitido sem chave.
      if (!remittance.ok) return err('remittance-build-failed');

      prepared.push({
        remittance: remittance.value,
        content: translated.value.content,
        fileName: translated.value.fileName,
        nsa: nsa.value,
        totalCents: translated.value.totalCents,
        lineCount: translated.value.lineCount,
      });
    }

    // 5. REGISTRAR ANTES DE ENFILEIRAR. A ordem é a decisão mais importante deste use case.
    //
    // Gravar no bucket é enfileirar pagamento. Se o upload viesse primeiro e a persistência
    // falhasse, existiria um pagamento a caminho do banco SEM registro nosso — invisível, e os
    // documentos continuariam livres para entrar noutra remessa.
    //
    // Nesta ordem, o pior caso é uma remessa `Queued` sem arquivo: visível, recuperável, e já
    // prendendo os documentos — com os títulos dela já `Transmitted` (ADR-0065 §2). Erra-se para
    // menos, como no resto do fluxo: título preso por remessa que não saiu é visível e tem saída (o
    // descarte da §4); título livre com arquivo a caminho do banco não é nem uma coisa nem outra.
    // A reserva acontece DENTRO desta gravação (#789), e é aqui que a corrida se decide. A consulta
    // do passo 1 continua valendo — ela recusa cedo, antes de queimar NSA e montar arquivo, e é o
    // que dá ao operador uma resposta rápida no caso comum. O que ela não pode fazer é ser a única
    // barreira: entre ela e esta linha coube a tradução CNAB inteira.
    //
    // Perder a corrida devolve o MESMO erro da recusa antecipada, e de propósito: para quem opera, o
    // fato é um só — o título já está em outra remessa. Que a descoberta tenha vindo de uma consulta
    // ou de um lock é detalhe de implementação, e inventar um segundo nome faria a tela ter de
    // explicar uma diferença que não muda a ação de ninguém.
    // Um evento por TÍTULO (ADR-0065 §2), gravados na MESMA transação da reserva e da transição —
    // é o `save` quem os põe no outbox, e é por isso que eles descem daqui em vez de serem
    // publicados depois: o evento existe se e somente se a transição foi persistida (ADR-0015). Se o
    // CAS recusar qualquer título, a transação desfaz e nenhum destes chega ao outbox.
    //
    // Por título, nunca por nota: uma nota pode ter saído em parte — o pai no arquivo e a retenção
    // ainda em aberto —, e anunciar a nota diria que ela foi paga inteira. É a mesma razão pela qual
    // os eventos da remessa carregam `payableIds`, e não `documentIds`.
    //
    // ⚠️ Os eventos de TODOS os arquivos entram na MESMA transação, junto de todas as remessas. Cada
    // evento carrega o NSA e o nome do arquivo em que aquele título de fato saiu — não os do primeiro
    // arquivo —, porque é por eles que a trilha da nota diz ao operador onde procurar o pagamento.
    const transmittedEvents = prepared.flatMap(({ remittance, nsa, fileName }) =>
      remittance.payables.map((p) => ({
        type: 'PayableTransmitted' as const,
        documentId: p.documentId,
        payableId: p.payableId,
        remittanceId: remittance.id,
        nsa,
        fileName,
        occurredAt: generatedAt,
      })),
    );

    const persisted = await deps.remittances.saveAll(
      prepared.map((p) => p.remittance),
      transmittedEvents,
    );
    if (!persisted.ok) {
      switch (persisted.error) {
        case 'remittance-payables-already-held':
          return err('remittance-payables-already-held');
        // Título que deixou de ser `Approved` entre o pré-voo e a gravação reusa o slug do #736, e
        // não ganha um segundo nome. Para quem opera o fato é o mesmo — "um título da seleção não
        // está aprovado" — e a ação é a mesma: ir ao fluxo de aprovação. É o raciocínio que o
        // parágrafo acima já aplica ao título preso: que a descoberta tenha vindo do reader ou do
        // CAS é implementação, e inventar um nome por origem obrigaria a tela a explicar uma
        // diferença que não muda a ação de ninguém.
        case 'remittance-payable-not-approved':
          return err('document-not-approved');
        case 'remittance-repository-unavailable':
          return err('remittance-persist-failed');
      }
    }

    // 6. ENFILEIRAR. Gravar no bucket é o ato que põe o pagamento a caminho do banco.
    //
    // ⚠️ AQUI A ATOMICIDADE ACABA, e é a diferença que a partição introduziu. O passo 5 é uma
    // transação: ou as N remessas entram, ou nenhuma entra. O bucket não tem transação — cada
    // `putRemittance` é um ato isolado e IRREVERSÍVEL na prática, porque o agente da VAN varre
    // `saida/` e pode transmitir o primeiro arquivo antes de o segundo sequer ser gravado.
    //
    // Com um arquivo só, "falhou o upload" tinha uma resposta óbvia: erro, remessa `Queued` sem
    // arquivo, e o descarte da §4 como saída. Com N arquivos surge um estado que não existia — parte
    // enfileirada, parte não —, e ele precisa de uma decisão explícita.
    // ⚠️ SEGUE O LAÇO ACUMULANDO FALHAS — não aborta na primeira (decisão do dono, 01/09/2026).
    //
    // Três razões, e a primeira é a que decide sozinha:
    //
    // 1. **Aritmética.** Abortar no primeiro erro GARANTE mais remessas encalhadas do que seguir: as
    //    não-tentadas ficam `Queued` sem objeto por decisão nossa, não por falha. Seguindo, encalha
    //    só o que de fato falhou.
    // 2. **Não há ação compensatória para "arquivo já em `saida/`"**, então backward recovery não se
    //    aplica — *"Backward recovery involves reverting the failure and cleaning up afterwards—a
    //    rollback. For this to work, we need to define compensating actions"* (Sam Newman, Building
    //    Microservices, p. 233). Apagar o que subiu correria com o agente, que pode já ter lido.
    // 3. **O ADR-0065 §2 nomeia o desfecho**: upload que falha depois da transação devolve
    //    `remittance-upload-failed` ao operador, com os títulos já `Transmitted`, e a saída é o
    //    descarte da §4. Nada no caso parcial enfraquece isso — para quem opera, a geração não
    //    completou.
    //
    // ⚠️ E "seguir" significa SEGUIR OS OUTROS ARQUIVOS DESTA GERAÇÃO — nunca retentar este depois.
    // A distinção não é sutil e fecha uma porta que parece aberta: as referências de G064 destes
    // títulos JÁ FORAM PERSISTIDAS (a costura da #752), e o retorno do banco casa por elas. Um
    // arquivo regerado com NSA novo carrega referências novas, que não batem com o que está gravado
    // — o pagamento aconteceria e o retorno não encontraria o título. A recuperação é `discard`
    // (§4, permitido porque não há objeto em prefixo nenhum) → títulos de volta a `Approved` → nova
    // geração inteira. Quem for implementar retry aqui, leia isto antes.
    //
    // O que NÃO está em jogo: desfazer a persistência. Ela já commitou, e é assim de propósito —
    // "registrar antes de enfileirar" existe para que nunca haja pagamento a caminho do banco sem
    // registro nosso.
    const files: GeneratedRemittanceFile[] = [];
    let anyUploadFailed = false;

    for (const file of prepared) {
      const uploaded = await deps.storage.putRemittance(file.fileName, file.content);

      if (!uploaded.ok) {
        anyUploadFailed = true;
        continue;
      }

      files.push({
        remittanceId: file.remittance.id,
        fileName: file.fileName,
        objectKey: uploaded.value,
        nsa: file.nsa,
        totalCents: file.totalCents,
        lineCount: file.lineCount,
      });
    }

    // O sucesso parcial é FALHA para quem operou: ele pediu a remessa de uma seleção, e parte dela
    // não está enfileirada. `files` é descartado de propósito — o operador não age por este retorno,
    // age pela tela de acompanhamento, onde as N remessas aparecem e o descarte já decide por
    // remessa (o que subiu tem descarte recusado, porque vai ser pago; o que não subiu, liberado).
    if (anyUploadFailed) return err('remittance-upload-failed');

    return ok({ files });
  };
