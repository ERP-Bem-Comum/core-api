import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Retention from '../../domain/shared/retention.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';
import type {
  HeldPayable,
  RemittanceRepository,
  RemittanceRepositoryError,
} from '../ports/remittance-repository.ts';

// Port estreito de propósito: este use case faz UMA pergunta à remessa — "algum destes títulos está
// preso?". Injetar o `RemittanceRepository` inteiro daria a ele acesso a emitir e confirmar remessa,
// que não é da sua alçada. `Pick` mantém o adapter existente compatível sem tipo novo a manter.
export type HeldPayablesReader = Pick<RemittanceRepository, 'findHeldPayables'>;

export type AdjustDocumentDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
  remittances: HeldPayablesReader;
}>;

export type AdjustDocumentCommand = Readonly<{
  documentId: string;
  // Optimistic lock (FR-009/ADR-0002 da feature 010): versão do documento lida pelo cliente.
  // Repassada ao `repo.save` como `expectedVersion` — UPDATE com WHERE version = expectedVersion.
  expectedVersion: number;
  grossValueCents?: number;
  sourceDiscountsCents?: number;
  discountsCents?: number;
  penaltyCents?: number;
  interestCents?: number;
  retentions?: readonly Retention.RetentionInput[];
  dueDate?: Date;
  description?: string | null;
  paymentDetail?: string | null;
}>;

export type AdjustDocumentError =
  | DocumentError
  | DocumentRepositoryError
  | DocumentId.DocumentIdError
  | Money.MoneyError
  | Retention.RetentionError
  | RemittanceRepositoryError;

// Recusa por título preso: a única do fluxo em que a APLICAÇÃO já conhece a evidência e a descarta.
// `findHeldPayables` apura o vínculo em `held.value` (abaixo, no caminho de valor) e o domínio recusa
// com `'document-has-held-payable'`. Antes desta mudança a lista morria aqui, e o front recebia um
// code opaco — sem como dizer ao operador QUAL título travou nem em QUE remessa.
//
// Três restrições moldam o desenho, e nenhuma é negociável:
//
//   1. `AdjustDocumentError` compõe SEIS unions de string (`DocumentError`, `DocumentRepositoryError`,
//      `DocumentIdError`, `MoneyError`, `RetentionError`, `RemittanceRepositoryError`). Anexar payload
//      a um membro só produz `string | { … }` na união — todo consumidor passa a precisar de
//      `typeof e === 'string'` antes de discriminar, e o switch exaustivo deixa de ser leitura única.
//   2. A borda NUNCA vaza slug interno no body de 4xx (`adapters/http/plugin.ts:201-202`,
//      OWASP API8:2023): o que sai é code público estável + message PT-BR. A evidência precisa de um
//      canal DECLARADO no contrato, não pode viajar grudada no slug.
//   3. `bulkUpdateDueDate` reusa este use case e só olha três slugs (`bulk-update-due-date.ts:36-42`).
//      O que for escolhido aqui não pode obrigá-lo a mudar.
//
// DECIDIDO (23/08/2026) — o CONTEÚDO da evidência e o que a borda expõe:
//
//   - A evidência carrega os títulos presos E a remessa em forma identificável pelo operador (`nsa`),
//     não só o UUID. É a única forma que produz frase acionável — "2 títulos presos na remessa NSA
//     000123" — sem obrigar o front a uma chamada extra. O port passou a devolver o vínculo
//     (`findHeldPayables`), e o custo esperado não se materializou: o `innerJoin` com
//     `fin_remittances` já existia para filtrar por status, então entraram duas colunas na projeção e
//     nenhuma junção nova. Medido em MySQL 8.4.11 real: `payable_idx` intacto, `type=range`,
//     `Using index`, com 10.007 vínculos em 2.003 remessas.
//
//   - A borda EXPÕE os ids em `details`, abrindo exceção explícita à regra de
//     `adapters/http/plugin.ts:201-202`. A distinção que sustenta a exceção: aquela regra protege
//     contra revelar MECANISMO INTERNO (`document-repository-failure` diz qual componente falhou);
//     um `payableId` da nota que o usuário autenticado está editando é recurso ao qual ele já tem
//     acesso, e não descreve infraestrutura nenhuma. A exceção precisa ser justificada por escrito
//     ao lado da regra quando a borda for tocada — omitir a justificativa a torna indistinguível de
//     descuido, que é como este repositório já leu omissão duas vezes.
//
//   - O CANAL é o envelope discriminado abaixo, escolhido em 23/08/2026 como solução **paliativa**:
//     ele resolve pelo compilador (nenhum consumidor ignora o caso rico por engano), ao preço de
//     `r.error.error === '…'` nos chamadores.
//
// TODO(human): resolver o custo semântico e estético de `r.error.error` nos consumidores. A escolha
// do envelope está feita e vale; o que falta é a forma de ler esse acesso duplo sem ruído — helper de
// narrowing, renomear o campo interno, ou outra convenção que o módulo ainda não tem. Não bloqueia
// nada: é dívida de legibilidade, não de correção.

// Envelope de falha: `plain` para todo erro que já existia, `held-payables` para a única recusa que
// carrega evidência. Discriminar por `kind` — e não pela presença de um campo — é o que faz o
// compilador cobrar o tratamento do caso rico em quem consome.
//
// ⚠️ `held` é o VÍNCULO como o banco o devolve, sem deduplicação de espécie alguma — e isso é a
// decisão, não uma sobra. Um título preso em DUAS remessas vivas aparece duas vezes, e é assim que
// deve ser: essa repetição é o sinal da #789 (o mesmo título em duas remessas = pagamento em dobro),
// o caso mais grave que esta recusa pode estar reportando. Colapsá-lo aqui apagaria exatamente o que
// a evidência existe para mostrar — foi por isso que o `Set` saiu do adapter, e vale igual aqui.
//
// Uma versão anterior deduplicava as remessas e não os títulos. Duas listas paralelas não conseguem
// dizer "o título A está nas remessas 101 e 202" sem um pareamento por índice que nenhum tipo cobra;
// a lista de vínculos diz. Contar títulos distintos é `new Set(h.payableId).size` — decisão de
// APRESENTAÇÃO, que pertence a quem exibe, não a esta camada.
export type AdjustDocumentFailure =
  | Readonly<{ kind: 'plain'; error: AdjustDocumentError }>
  | Readonly<{
      kind: 'held-payables';
      error: 'document-has-held-payable';
      held: readonly HeldPayable[];
    }>;

// Encurta os 13 pontos de propagação — sem ele, cada `return err(x.error)` viraria um literal de
// objeto e o ruído esconderia o único ponto que de fato mudou (a recusa por título preso).
const plain = (error: AdjustDocumentError): AdjustDocumentFailure => ({ kind: 'plain', error });

type ChangesError = Money.MoneyError | Retention.RetentionError;

const buildRetentions = (
  inputs: readonly Retention.RetentionInput[] | undefined,
): Result<readonly Retention.Retention[] | undefined, Retention.RetentionError> => {
  if (inputs === undefined) return ok(undefined);
  const built: Retention.Retention[] = [];
  for (const r of inputs) {
    const created = Retention.create(r);
    if (!created.ok) return err(created.error);
    built.push(created.value);
  }
  return ok(built);
};

const buildChanges = (
  cmd: AdjustDocumentCommand,
): Result<Document.AdjustDocumentChanges, ChangesError> => {
  const optionalMoney = (
    cents: number | undefined,
  ): Result<Money.Money, Money.MoneyError> | null =>
    cents === undefined ? null : Money.fromCents(cents);

  const gross = optionalMoney(cmd.grossValueCents);
  if (gross !== null && !gross.ok) return err(gross.error);
  const sourceDiscounts = optionalMoney(cmd.sourceDiscountsCents);
  if (sourceDiscounts !== null && !sourceDiscounts.ok) return err(sourceDiscounts.error);
  const discounts = optionalMoney(cmd.discountsCents);
  if (discounts !== null && !discounts.ok) return err(discounts.error);
  const penalty = optionalMoney(cmd.penaltyCents);
  if (penalty !== null && !penalty.ok) return err(penalty.error);
  const interest = optionalMoney(cmd.interestCents);
  if (interest !== null && !interest.ok) return err(interest.error);

  const retentions = buildRetentions(cmd.retentions);
  if (!retentions.ok) return err(retentions.error);

  return ok({
    ...(gross?.ok ? { grossValue: gross.value } : {}),
    ...(sourceDiscounts?.ok ? { sourceDiscounts: sourceDiscounts.value } : {}),
    ...(discounts?.ok ? { discounts: discounts.value } : {}),
    ...(penalty?.ok ? { penalty: penalty.value } : {}),
    ...(interest?.ok ? { interest: interest.value } : {}),
    ...(retentions.value !== undefined ? { retentions: retentions.value } : {}),
    ...(cmd.dueDate !== undefined ? { dueDate: cmd.dueDate } : {}),
    ...(cmd.description !== undefined ? { description: cmd.description } : {}),
    ...(cmd.paymentDetail !== undefined ? { paymentDetail: cmd.paymentDetail } : {}),
  });
};

export const adjustDocument =
  (deps: AdjustDocumentDeps) =>
  async (cmd: AdjustDocumentCommand): Promise<Result<void, AdjustDocumentFailure>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(plain(id.error));

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(plain(found.error));

    const hasValueChanges =
      cmd.grossValueCents !== undefined ||
      cmd.sourceDiscountsCents !== undefined ||
      cmd.discountsCents !== undefined ||
      cmd.penaltyCents !== undefined ||
      cmd.interestCents !== undefined ||
      cmd.retentions !== undefined;

    // #165: ajuste leve (só dueDate/description) — aceito em Open E Approved, sem regenerar os
    // títulos-filho (preserva ids/status, propaga dueDate in-place). Campos de valor seguem o
    // caminho completo abaixo (só Open).
    if (!hasValueChanges) {
      const doc = found.value.document;
      if (doc.status !== 'Open' && doc.status !== 'Approved') {
        return err(plain('invalid-state-transition'));
      }
      if (found.value.payables === null) return err(plain('document-repository-failure'));

      const edited = Document.editMetadata({
        document: doc,
        payables: found.value.payables,
        ...(cmd.dueDate !== undefined ? { dueDate: cmd.dueDate } : {}),
        ...(cmd.description !== undefined ? { description: cmd.description } : {}),
        ...(cmd.paymentDetail !== undefined ? { paymentDetail: cmd.paymentDetail } : {}),
      });
      if (!edited.ok) return err(plain(edited.error));

      const event = edited.value.events[0];
      if (event === undefined) return err(plain('document-repository-failure'));
      const entries = buildTimelineEntries(deps.clock, {
        event,
        before: doc,
        after: edited.value.document,
        payablesBefore: found.value.payables,
        payablesAfter: edited.value.payables,
        actor: null,
      });

      const saved = await deps.repo.save(
        { document: edited.value.document, payables: edited.value.payables },
        entries,
        cmd.expectedVersion,
        edited.value.events,
      );
      if (!saved.ok) return err(plain(saved.error));

      return ok(undefined);
    }

    const open = Document.parseOpen(found.value.document);
    if (!open.ok) return err(plain(open.error));
    if (found.value.payables === null) return err(plain('document-repository-failure'));

    const changes = buildChanges(cmd);
    if (!changes.ok) return err(plain(changes.error));

    // Vai ao BANCO, não à memória: outra instância pode ter emitido remessa com estes títulos desde
    // que este processo os leu. Só o caminho de VALOR consulta — o ajuste leve (`editMetadata`, mais
    // acima) preserva os títulos e não muda o quanto se paga.
    const ownIds: readonly string[] = [
      found.value.payables.parent.id,
      ...found.value.payables.children.map((child) => child.id),
    ];
    const held = await deps.remittances.findHeldPayables(ownIds);
    if (!held.ok) return err(plain(held.error));

    const adjusted = Document.adjust({
      document: open.value,
      payables: found.value.payables,
      changes: changes.value,
      // A decisão de recusar é do domínio; a aplicação só entrega o fato apurado. O domínio recebe
      // apenas os ids — a remessa não lhe interessa para decidir, e carregá-la para dentro faria o
      // agregado `Document` conhecer um conceito de outro agregado sem necessidade.
      heldPayableIds: held.value.map((h) => h.payableId),
    });
    // A única recusa do fluxo que carrega evidência. `held.value` já a tem em mãos — apurada duas
    // linhas acima, contra o banco — e devolver só o slug a jogaria fora, deixando o operador sem
    // saber QUAL título travou nem em QUE remessa.
    //
    // O `if` interno não é regra de negócio vazando para a aplicação: a decisão de recusar já foi do
    // domínio. Aqui só se escolhe COMO reportar o que ele decidiu.
    if (!adjusted.ok) {
      return err(
        adjusted.error === 'document-has-held-payable'
          ? {
              kind: 'held-payables',
              error: 'document-has-held-payable',
              // Repassado como veio do port: nenhuma transformação, nenhuma perda.
              held: held.value,
            }
          : plain(adjusted.error),
      );
    }

    // Trilha: marco de ajuste. before = estado lido (Open + payables atuais);
    // after = estado ajustado. actor=null (ajuste não carrega autoria nesta fatia).
    const event = adjusted.value.events[0];
    if (event === undefined) return err(plain('document-repository-failure'));
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: open.value,
      after: adjusted.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: adjusted.value.payables,
      actor: null,
    });

    const saved = await deps.repo.save(
      {
        document: adjusted.value.document,
        payables: adjusted.value.payables,
      },
      entries,
      cmd.expectedVersion,
      adjusted.value.events,
    );
    if (!saved.ok) return err(plain(saved.error));

    return ok(undefined);
  };
