// Perfil do lote: o que muda no ENVELOPE quando a rota do pagamento muda.
//
// Fonte primária: `jun-19-layout-multipag.pdf` (local-only). Cada rota tem sua própria seção no
// manual, e as seções não declaram o mesmo header de lote: a versão do layout do lote difere entre
// elas (pp. 23, 31, 38 e 44), e há campo que existe numa seção e não existe noutra. Um header de
// lote único, parametrizado só pela forma de lançamento, emite envelope errado assim que a segunda
// rota entra — e envelope errado o banco recusa sem dizer qual campo.
//
// A forma de lançamento é DERIVADA daqui, nunca informada por quem chama (#711, CA4 e CA11).
// Enquanto existia uma rota só, quem chamava e quem pagava concordavam por acidente; com formas
// mistas, um parâmetro de entrada vira uma afirmação que o conteúdo do arquivo pode contradizer.
//
// A câmara centralizadora (P001) segue a mesma disciplina, um elo adiante: banco do favorecido
// decide a forma, e a forma decide a câmara (`clearingHouseFor`). Enquanto ela foi um opcional com
// default, o default valeu para TODOS os pagamentos — inclusive os que o banco recusa (#751).
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';
import { hasRemittanceIssuer, type RouteWithIssuer } from '../../domain/payout/van-routes.ts';

// O mínimo que decide o perfil. O montador passa o pagamento inteiro; aqui só interessa o que
// participa da decisão — e é por isso que o boleto declara o código de barras: é dele que sai o
// banco emissor do título, assim como a transferência declara o banco do favorecido.
export type ProfiledPayment =
  | Readonly<{ route: 'transfer'; payeeBankCode: string }>
  | Readonly<{ route: 'pix' }>
  | Readonly<{ route: 'tax-guide' }>
  | Readonly<{ route: 'billet'; barcode: string }>;

export type CnabBatchProfile = Readonly<{
  serviceType: string; // G025
  launchForm: string; // G029 — a chave do agrupamento em lotes
  batchLayoutVersion: string; // G030 — varia por seção do manual
  // P014. `null` significa que a seção daquela rota NÃO tem o campo, e as posições saem em branco —
  // diferente de "tem o campo, e o valor é vazio". A seção de cobrança é o caso.
  paymentIndicator: string | null;
}>;

export type BatchProfileError =
  | 'remittance-launch-form-unsupported'
  | 'remittance-billet-bank-unreadable'
  | 'remittance-payee-bank-unreadable';

const SERVICE_SUPPLIER_PAYMENT = '20'; // G025
const LAUNCH_CREDIT_CURRENT_ACCOUNT = '01'; // G029 — Crédito em Conta Corrente (p. 100)
const LAUNCH_TED_OTHER_HOLDER = '41'; // G029 — TED Outra Titularidade (p. 100)
const LAUNCH_BILLET_OWN_BANK = '30'; // G029
const LAUNCH_BILLET_OTHER_BANK = '31'; // G029
const BATCH_LAYOUT_PAYMENTS = '045'; // G030 — seção de pagamentos (p. 23)
const BATCH_LAYOUT_COLLECTION = '040'; // G030 — seção de títulos de cobrança (p. 31)
const PAYMENT_INDICATOR_DEFAULT = '01'; // P014

// ─── Câmara centralizadora (P001, Segmento A, colunas 018-020) ────────────────────────────────
//
// A câmara NÃO é escolha de quem monta o arquivo, nem atributo do favorecido: é FUNÇÃO DA FORMA DE
// LANÇAMENTO. Duas leituras independentes do manual sustentam as formas de TED:
//
//   · a nota (2) da descrição de G029 (p. 101) tabula forma → câmara, e lista `03`, `41` e `43`
//     como as formas que transitam por câmara de TED;
//   · a ocorrência 'AK' de G059 (p. 107) instrui a preencher `018` para TED e **zeros para as
//     outras modalidades**, citando exatamente as colunas 018 a 020 do Segmento A.
//
// Crédito em conta corrente (`01`) não transita por câmara alguma — o crédito não sai do banco. Por
// isso não há default aqui: um valor por omissão só pode acertar UMA das modalidades, e a que ele
// errar produz registro que o próprio banco recusa (#751).
//
// ⚠️ O PIX É A EXCEÇÃO QUE O MANUAL NÃO ESCREVE, e é por isso que esta nota existe. A forma `45`
// transita pelo SPI (`009`) — e nada disso está no PDF: a nota (2) tabula apenas `03`/`41`/`43`,
// a descrição de P001 (p. 132) enumera só `018` e `888`, e a string `009` NÃO OCORRE UMA ÚNICA VEZ
// no manual inteiro. Quem o sustenta é o golden do banco (`GOLDEN_TEST_MULTIPAG_PIX_240`, 29/08/2026):
// forma `45` no header de lote, `009` em 018-020 do Segmento A. Os goldens valem como verdade por
// decisão do dono do repositório (01/09/2026), e a hierarquia está na skill `cnab240-bradesco`
// §"A hierarquia completa" — laudo do validador > golden > G059 > tabela de layout.
//
// **Não "corrigir" este `009` para `000` lendo a nota (2).** A lacuna é do manual, está registrada
// em `referencias/03-dominios-campos.md`, e o valor errado aqui só aparece depois de transmitido
// (#890 achado 2) — o `remittance-inspector.ts` não pega, porque não é defeito de forma.
const CLEARING_TED = '018'; // P001 (p. 132) — TED (STR, CIP)
const CLEARING_PIX = '009'; // SPI — golden do banco; ausente do manual
const CLEARING_NONE = '000'; // G059, ocorrência 'AK' (p. 107) — zeros fora das formas de TED
const TED_LAUNCH_FORMS: ReadonlySet<string> = new Set(['03', '41', '43']);

// Exportada porque o emissor de PIX (#838) precisa da MESMA constante para derivar o perfil do
// lote: duas literais `'45'` divergiriam no dia em que uma delas mudasse, e a divergência sairia
// como arquivo cuja câmara não corresponde à forma — exatamente o defeito da #751.
export const LAUNCH_PIX_TRANSFER = '45'; // G029 — Pix Transferência (p. 100)

// Total sobre o domínio de G029, de propósito: uma forma nova entra pelo último `return` e sai com
// zeros, que é o que o manual manda para tudo que não é TED nem PIX — nunca herdando a câmara da
// forma anterior.
export const clearingHouseFor = (launchForm: string): string => {
  if (TED_LAUNCH_FORMS.has(launchForm)) return CLEARING_TED;
  if (launchForm === LAUNCH_PIX_TRANSFER) return CLEARING_PIX;
  return CLEARING_NONE;
};

// ─── Finalidade da TED (P011, Segmento A, colunas 220-224) ────────────────────────────────────
//
// Mesma disciplina da câmara, um elo adiante — e pela mesma razão: enquanto o campo foi opcional com
// default de string vazia, TODA remessa saiu com as cinco posições em branco, TED inclusive. É o
// arquivo que o Validador Universal recusou em 21/08/2026 (#813).
//
// ⚠️ O DOMÍNIO DE VALORES É EXTERNO a este repositório, e a fonte primária diz isso explicitamente.
// O layout FEBRABAN **público** (campo 26.3A) afirma sobre P011 exatamente o mesmo que o manual sob
// restrição de redistribuição, palavra por palavra: o domínio é delegado aos Dicionários de Domínios
// para o SPB, do Banco Central. O que o Bacen publica é o XSD do dicionário — só a ESTRUTURA, zero
// enumeração; o XML com os valores é distribuído pela RSFN aos participantes do SPB, e um ERP não é
// participante. Não há versão a citar, e isso é declaração do próprio Bacen: o dicionário não é
// sujeito a controle de versão e pode mudar sem aviso prévio.
//
// A consulta externa que levantou a tabela está registrada na #813 (21/08/2026), e a fonte a rotula
// DECLARADAMENTE PARCIAL — "exemplos de algumas das finalidades". É por isso que não existe
// allow-list aqui: uma lista dos doze valores conhecidos recusaria um código legítimo fora dela.
//
// ⚠️ `00007` é ALUGUEL, e este é o erro provável. O `07 - Pagamento de Fornec/Honor.` que parece a
// resposta perfeita pertence à tabela de **DOC** do manual Bradesco — outro layout, outras posições
// (381-382, coordenada que sequer existe num registro de 240). As duas tabelas não compartilham
// numeração: no domínio de TED, `05` é pagamento a fornecedores e `07` é aluguel. Escrever o código
// de uma na outra produz arquivo aceito declarando ao Banco Central a finalidade errada.
//
// PREMISSA DECLARADA (decisão da P.O., 21/08/2026, na #813): **este cliente paga exclusivamente
// fornecedor PJ**. É o que sustenta ser constante do emissor em vez de campo por título — hoje 100%
// dos títulos produziriam o mesmo valor, e a constante tem a virtude de o chamador não poder
// contradizê-la. O que DERRUBA a premissa, e obriga a revê-la: entrar cliente com perfil de
// pagamento misto, ou o Bacen/Bradesco passarem a cobrar granularidade por título.
//
// O `00008` (duplicatas e títulos) foi considerado e recusado: nem todo pagamento a fornecedor tem
// duplicata — nota de serviço, recibo e RPA não têm. O `00006` (honorários) está fora por
// impossibilidade, não por preferência: o cadastro não distingue fornecedor de prestador.
const TED_PURPOSE_SUPPLIER_PAYMENT = '00005'; // Pagamento a fornecedores — casa com o serviço `20`

// `null`, e não string vazia, pelo mesmo motivo de `paymentIndicator` acima: significa "esta rota
// NÃO tem o campo", e as posições saem em branco — diferente de "tem o campo, e o valor é vazio".
// Quem escreve a linha é que traduz `null` em brancos.
//
// ✅ CA2 RESPONDIDA PELO VALIDADOR em 25/08/2026 — inquiry-0033. O empate era real e foi decidido
// pela única fonte que podia: os dois arquivos de crédito em conta que esta CA2 pedia foram gerados
// e submetidos. Preenchido (zeros em 220-224) → RECUSADO, "Código Finalidade para TED. Inválido para
// Crédito em Conta". Em branco → ACEITO. **O `null` daqui estava certo**, e o argumento da simetria
// com o campo vizinho é que era o bom: fora de TED, 225-226 também é recusado quando preenchido.
//
// ⚠️ A regra INVERTE por forma, e é isso que impede o campo de virar parâmetro: em TED os dois campos
// são obrigatórios; em crédito em conta os dois são PROIBIDOS. Um chamador com liberdade de preencher
// `220-224` num lote `01` produz arquivo recusado — o mesmo desenho que a câmara já resolveu (#751).
//
// Total sobre G029, como `clearingHouseFor`: forma nova entra pelo `else` e sai sem finalidade.
export const tedPurposeFor = (launchForm: string): string | null =>
  TED_LAUNCH_FORMS.has(launchForm) ? TED_PURPOSE_SUPPLIER_PAYMENT : null;

// ── P013 (225-226) — finalidade complementar: tipo da conta do favorecido ──────────────────────────
//
// Irmão gêmeo de `tedPurposeFor`, e é assim de propósito: os dois campos vivem no mesmo par de
// posições vizinhas, obedecem à MESMA inversão por forma, e a inquiry-0033 §5.2 fixou que P013
// "deriva da forma do lote, com a mesma semântica de `null`". Separá-los em desenhos diferentes
// deixaria dois campos que sempre variam juntos livres para divergir.
//
// MEDIDO no Validador Universal em 25/08/2026 (inquiry-0033, 18 remessas):
//   - TED (`41`): `CC` ou `PP` OBRIGATÓRIO. Em branco → recusa, que foi a crítica de 21/08
//     ("colunas 225 a 226, Código finalidade complementar inválido").
//   - Crédito em conta (`01`): PROIBIDO. Preenchido → recusa.
// É por isso que o valor não pode ser parâmetro do chamador: preenchê-lo num lote `01` produz
// arquivo recusado, exatamente como em `220-224`.
//
// PREMISSA DECLARADA (decisão da P.O., 25/08/2026): **conta corrente**. Difere da premissa do
// `00005` acima num ponto que importa e que foi levantado antes de decidir — a finalidade é
// propriedade do PAGAMENTO (e "todo pagamento aqui é a fornecedor" é estruturalmente verdadeiro),
// enquanto o tipo de conta é propriedade do FAVORECIDO, e um favorecido PJ pode ter poupança.
//
// O que sustenta a premissa NÃO é a raridade da poupança — é o PROCESSO, e a P.O. o descreveu:
//   1. o operador confere a classificação das contas ANTES de gerar a remessa;
//   2. se ainda assim for errado, o título não processa e volta RECUSADO;
//   3. o pagamento é refeito fora da remessa, e a baixa é manual.
// Ou seja, o erro tem detecção e caminho de volta — não é falha silenciosa. Foi essa a razão de a
// constante ser aceitável aqui, e é ela que cai se o processo mudar.
//
// O que DERRUBA a premissa, e obriga a revê-la: o cadastro do favorecido passar a guardar o tipo de
// conta (**#817** — a modelagem não existe em camada nenhuma hoje), ou entrar cliente cujo operador
// não faça a conferência prévia. Quando a #817 entrar, esta constante vira leitura do cadastro e a
// `PayoutField` ganha `payee-account-type`; o formato desta função não muda.
const PAYEE_ACCOUNT_TYPE_CHECKING = 'CC'; // Conta Corrente — `PP` seria Poupança

export const complementPurposeFor = (launchForm: string): string | null =>
  TED_LAUNCH_FORMS.has(launchForm) ? PAYEE_ACCOUNT_TYPE_CHECKING : null;

// ─── A forma que exige ARQUIVO próprio (partição multi-arquivo, CA4 da #838) ───────────────────
//
// Quarta função a derivar da forma de lançamento, e a primeira que decide algo acima do registro: o
// manual (pág. 15) exige que o Pix vá "em arquivo separado dos demais serviços e modalidades". Sem
// esta régua, uma seleção mista produz um arquivo bem-formado que o banco recusa inteiro.
//
// ⚠️ NÃO é "cada forma no seu arquivo", e o golden prova o contrário: o de TED traz `01`, `41` e `31`
// nos três lotes do MESMO arquivo. Formas convivem; o que não convive com elas é o Pix. Por isso a
// função é um agrupamento — e não um predicado "esta forma é exclusiva?" —, que erraria por excesso
// de partição no dia em que houvesse duas modalidades exclusivas entre si mas não entre elas.
//
// Total sobre G029, como as três irmãs acima: forma nova cai no grupo comum. Uma forma desconhecida
// que de fato exigisse arquivo próprio produziria arquivo recusado — mas o caminho oposto (partir por
// omissão) quebraria em dois os arquivos mistos que o banco JÁ aceita, e é o dano que se paga sem ter
// lido nada no manual.
//
// ⚠️ ESTA É UMA PROPRIEDADE DO LAYOUT, E NÃO O ESTADO DA IMPLEMENTAÇÃO — a nota existe porque a fonte
// errada está a um import de distância e responde a uma pergunta *parecida*. `hasRemittanceIssuer`
// (`domain/payout/van-routes.ts`, #837) responde "esta rota tem emissor?", que hoje é `não` para o Pix
// e vira `sim` quando a #838 destravar. A pergunta daqui é outra: "esta forma exige arquivo próprio?"
// — e para o Pix a resposta é `sim` HOJE e continua `sim` DEPOIS de ele ganhar emissor.
//
// Derivar a partição daquela régua faria a partição DESAPARECER exatamente no dia em que ela passasse
// a ter efeito prático, sem que uma linha mudasse aqui. O arquivo misto resultante é o que o banco
// recusa, e ninguém lembraria por quê. É a sexta reincidência do padrão que `.claude/rules/cnab.md`
// registra em §"Parâmetro opcional é o defeito": uma fonte que responde perto do que se perguntou.
//
// ⚠️ VIVE AQUI, e não no montador, pela razão que mudou `batchKeyFor` de casa na #804: DOIS
// consumidores — o montador, que reparte o arquivo, e o pré-voo, que precisa dizer na tela quantos
// arquivos saem. Uma segunda cópia faria a tela descrever um arquivo e o banco receber outro.
const FILE_GROUP_DEFAULT = 'default';
const FILE_GROUP_PIX = 'pix';

export const fileGroupFor = (launchForm: string): string =>
  launchForm === LAUNCH_PIX_TRANSFER ? FILE_GROUP_PIX : FILE_GROUP_DEFAULT;

// G021, header de ARQUIVO, colunas 172-174 — a literal que declara o arquivo como sendo de Pix.
//
// Deriva do GRUPO, não da forma, e a diferença é a que importa: o campo é do arquivo, e um arquivo
// tem um grupo só, enquanto pode ter várias formas (o golden de TED tem `01`, `41` e `31`). Derivá-lo
// da forma obrigaria quem escreve o header a eleger uma das formas do arquivo como representante —
// escolha que não existe no layout e que daria resultado diferente conforme a ordem dos lotes.
//
// `null` com a mesma semântica de `tedPurposeFor`: "este arquivo NÃO tem o campo", e as posições saem
// em branco. Quem escreve a linha é que traduz `null` em brancos.
//
// ⚠️ MEDIDO nos dois goldens em 01/09/2026, e é o que sustenta as três posições — o manual descreve o
// campo 22 partido (22.0 identificação em 172-174, 22.1 reservado em 175-191), mas quem prova a
// literal é o arquivo do banco: golden de Pix traz [PIX] em 172-174 e 17 brancos em 175-191; golden
// de TED traz brancos nos dois. Ver `remittance-file.ts`, que emitia `blanks(20)` no trecho inteiro.
const PIX_FILE_IDENTIFICATION = 'PIX';

export const pixIdentificationFor = (fileGroup: string): string | null =>
  fileGroup === FILE_GROUP_PIX ? PIX_FILE_IDENTIFICATION : null;

// Os três primeiros dígitos do código de barras são o banco emissor do título (Carta-Circular Bacen
// 2.926) — é o que separa liquidação de título do próprio banco de título de outro banco.
//
// Ler isso errado não produz arquivo malformado: produz o arquivo válido de outra operação. Por
// isso o código de barras ilegível é ERRO, e não um palpite por omissão.
const BANK_CODE_LENGTH = 3;
const readIssuerBank = (barcode: string): string | null => {
  const prefix = barcode.slice(0, BANK_CODE_LENGTH);
  return /^\d{3}$/.test(prefix) ? prefix : null;
};

// O código do banco em três posições, para COMPARAÇÃO. O zero à esquerda é do campo, não do banco:
// `001` e `1` são o mesmo Banco do Brasil, e compará-los como strings cruas classificaria um
// favorecido do próprio banco como sendo de outra instituição — que é o defeito a evitar, ao
// contrário. Devolve `null` quando não há três dígitos a ler: sem banco não há forma a derivar.
//
// Exportada porque o agrupamento em lotes compara os mesmos códigos (`batchKeyOf`, em
// `remittance-file.ts`). Duas normalizações divergiriam, e a divergência apareceria como lote
// partido em dois — cada um correto, nenhum necessário.
export const normalizeBankCode = (raw: string): string | null => {
  const trimmed = raw.trim();
  return /^\d{1,3}$/.test(trimmed) ? trimmed.padStart(BANK_CODE_LENGTH, '0') : null;
};

// ─── A chave que decide se dois pagamentos dividem lote ───────────────────────────────────────
//
// A forma de lançamento NÃO basta: o validador oficial do Bradesco recusa lote cujos Segmentos A
// misturem favorecidos de bancos distintos (ERP-Bem-Comum/cnab-validator#2), enquanto a forma só
// separa o próprio banco de todo o resto — Itaú e Santander compartilham a forma `41` e cairiam
// juntos.
//
// O boleto fica fora da regra porque não tem favorecido bancário: quem recebe está no código de
// barras e o Segmento J não carrega banco de destino (#708, CA5). Para ele a forma é a chave
// inteira — e ela já separa título do próprio banco de título de outro.
//
// ⚠️ VIVE AQUI, e não no montador, porque tem DOIS consumidores desde a #804: o montador do arquivo
// e o planejador de lotes do pré-voo. Uma segunda cópia faria a tela descrever um agrupamento
// diferente do que foi transmitido — e o pré-voo existe justamente para que os dois coincidam.
const BATCH_KEY_SEPARATOR = ':'; // fora do domínio de G029 e de código de banco, ambos numéricos

export const batchKeyFor = (
  isTransfer: boolean,
  launchForm: string,
  payeeBankCode: string | null,
): string => {
  if (!isTransfer) return launchForm;

  // O banco entra NORMALIZADO: `341` e `0341` são o mesmo destino e escrevem as mesmas posições
  // 021-023. Chaves cruas partiriam um lote legítimo em dois, cada um válido e nenhum necessário.
  //
  // O fallback é inalcançável pelo montador — um banco que não normaliza já derrubou o perfil com
  // `remittance-payee-bank-unreadable`. Fica porque a alternativa seria um `!` afirmando o mesmo
  // sem prova, e porque agrupar pelo código cru erra menos que estourar aqui.
  const payeeBank = payeeBankCode === null ? null : normalizeBankCode(payeeBankCode);
  return `${launchForm}${BATCH_KEY_SEPARATOR}${payeeBank ?? String(payeeBankCode)}`;
};

// O pagamento cuja rota TEM emissor, estreitado pelo mesmo `RouteWithIssuer` que o pré-voo consulta.
//
// O predicado é sobre o PAGAMENTO inteiro, e não sobre `payment.route`: um type predicate aplicado a
// uma propriedade não estreita o objeto que a contém — só checagem direta do discriminante faz isso.
// Escrito sobre a propriedade, o `switch` abaixo continuaria vendo as quatro variantes e exigiria os
// `case` de `pix` e `tax-guide` de volta, que é a duplicação que a #837 remove.
type IssuablePayment = Extract<ProfiledPayment, { route: RouteWithIssuer }>;

const isIssuable = (payment: ProfiledPayment): payment is IssuablePayment =>
  hasRemittanceIssuer(payment.route);

// Transferência e boleto são as rotas com emissor. PIX e tributo ainda não têm — e o certo, até
// terem, é a recusa nomeada: emiti-los pelo perfil de transferência mandaria ao banco um pagamento
// bem-formado para a operação errada, usando dados que aquela rota sequer consulta.
//
// ⚠️ A LISTA DE ROTAS SUPORTADAS NÃO ESTÁ MAIS AQUI. Ela vive em `domain/payout/van-routes.ts`,
// consultada por este guard e por `checkPayoutReadiness` — uma fonte, dois consumidores (#837). O
// arranjo desfaz a divergência que fazia o pré-voo aprovar a Guia de Recolhimento e a geração
// recusá-la no último clique, e é o que garante que ligar uma rota lá ligue os DOIS lados.
//
// ⚠️ E é por isso que o `switch` abaixo cobre duas variantes, não quatro: ele é exaustivo sobre
// `IssuablePayment`. No dia em que `'pix'` entrar naquele array, este `switch` deixa de ser
// exaustivo e **o typecheck quebra apontando para cá** — o compilador dizendo onde o emissor de Pix
// falta. É a rede que impede o Pix de sair pelo perfil de transferência, que é o defeito da #751.
export const batchProfileFor = (
  payment: ProfiledPayment,
  cedenteBankCode: string,
): Result<CnabBatchProfile, BatchProfileError> => {
  if (!isIssuable(payment)) return err('remittance-launch-form-unsupported');

  switch (payment.route) {
    case 'transfer': {
      // Sem banco do favorecido não há forma a derivar — e o caminho por omissão custaria caro nos
      // dois sentidos: TED para quem é do próprio banco vira registro recusado; crédito em conta
      // para quem é de fora vira crédito que não sai. Recusar é a única saída que não erra.
      const payeeBank = normalizeBankCode(payment.payeeBankCode);
      if (payeeBank === null) return err('remittance-payee-bank-unreadable');

      // Favorecido no MESMO banco do cedente não precisa de transferência: o crédito é interno.
      // Emiti-lo como TED de outra titularidade é o defeito da #751 — e ele não falha o arquivo,
      // falha o registro, no validador do banco, depois de a remessa já ter sido transmitida.
      const launchForm =
        payeeBank === normalizeBankCode(cedenteBankCode)
          ? LAUNCH_CREDIT_CURRENT_ACCOUNT
          : LAUNCH_TED_OTHER_HOLDER;

      return ok({
        serviceType: SERVICE_SUPPLIER_PAYMENT,
        launchForm,
        batchLayoutVersion: BATCH_LAYOUT_PAYMENTS,
        paymentIndicator: PAYMENT_INDICATOR_DEFAULT,
      });
    }

    case 'billet': {
      const issuer = readIssuerBank(payment.barcode);
      if (issuer === null) return err('remittance-billet-bank-unreadable');

      return ok({
        serviceType: SERVICE_SUPPLIER_PAYMENT,
        launchForm: issuer === cedenteBankCode ? LAUNCH_BILLET_OWN_BANK : LAUNCH_BILLET_OTHER_BANK,
        batchLayoutVersion: BATCH_LAYOUT_COLLECTION,
        paymentIndicator: null,
      });
    }
  }
};
