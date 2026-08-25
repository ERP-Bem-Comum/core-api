// Adapter Drizzle do RemittancePreviewReader (#720): o que o operador vê ANTES de gerar a remessa.
//
// Três fontes, uma linha: o TÍTULO vem de `fin_payables` (forma, complemento, valor, status), a
// nota de `fin_documents` (o favorecido de quem se paga) e o destino de pagamento vem do
// `partners`, por composição em runtime (ADR-0032).
//
// O grão é o TÍTULO, e o `INNER JOIN` é o mesmo de `payable-list-view.drizzle.ts` — o grid de
// Contas a Pagar, que é de onde a seleção do operador sai. Ler por documento aqui e listar por
// título lá foi exatamente o descasamento que originou esta mudança: o operador selecionava um
// título e o pré-voo respondia sobre a nota inteira.
//
// Este adapter NÃO julga aptidão. Ele entrega o cadastro como está e quem decide é
// `checkPayoutReadiness`, no domínio — a mesma função que a geração usa. É essa separação que faz
// pré-voo e geração concordarem sempre; uma segunda régua "de tela" divergiria, e a divergência
// apareceria como título que o pré-voo aprova e o arquivo recusa.
//
// Boundary: try/catch → Result (.claude/rules/adapters.md).

import { eq, inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  RemittancePreviewReader,
  RemittancePreviewReaderError,
  RemittancePreviewRow,
} from '#src/modules/financial/application/ports/remittance-preview-reader.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type {
  DocumentStatus,
  PayeeKind,
  PaymentMethod,
} from '#src/modules/financial/domain/document/types.ts';
import type { PayeePaymentTarget } from '#src/modules/financial/domain/payout/types.ts';
import type { PayeeBankBlock } from '../../http/payee-bank-composition.ts';
import { finDocuments, finPayables } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-remittance-preview-reader] ${op} failed: ${String(cause)}\n`);
};

// A leitura do favorecido, injetada. Recebe a referência e devolve o bloco, ou o erro quando o
// `partners` não respondeu — a distinção que o pré-voo não pode perder (ver `readPayeeBank`).
export type PayeeBankLookup = (
  ref: Readonly<{ kind: PayeeKind | null; id: string | null }>,
) => Promise<Result<PayeeBankBlock | null, 'contractor-read-unavailable'>>;

const toPaymentTarget = (block: PayeeBankBlock | null): PayeePaymentTarget | null => {
  if (block === null) return null;

  // Bloco presente com campos vazios NÃO é o mesmo que favorecido ausente: o primeiro é cadastro
  // incompleto, que o operador corrige; o segundo é documento sem favorecido, que nenhum cadastro
  // resolve. O port declara essa diferença e o pré-voo a apresenta ao operador.
  return {
    bank: block.bankAccount?.bank ?? null,
    agency: block.bankAccount?.agency ?? null,
    accountNumber: block.bankAccount?.accountNumber ?? null,
    checkDigit: block.bankAccount?.checkDigit ?? null,
    pixKey: block.pixKey === null ? null : { keyType: block.pixKey.keyType, key: block.pixKey.key },
  };
};

const payeeCacheKey = (kind: string | null, id: string | null): string =>
  `${kind ?? ''}:${id ?? ''}`;

export const createDrizzleRemittancePreviewReader = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  lookupPayeeBank: PayeeBankLookup,
): RemittancePreviewReader => {
  const { db } = handle;

  return {
    loadPreviewRows: async (
      payableIds: readonly string[],
    ): Promise<Result<readonly RemittancePreviewRow[], RemittancePreviewReaderError>> => {
      // Seleção vazia não vai ao banco. O use case percorre a seleção original, então id ausente
      // vira `not-found` lá — sumir com ele aqui é o defeito que o pré-voo existe para corrigir.
      if (payableIds.length === 0) return ok([]);

      try {
        const rows = await db
          .select({
            payableId: finPayables.id,
            documentId: finPayables.documentId,
            // Forma, complemento, valor e status são DO TÍTULO: o pai pode sair em boleto e o filho
            // de retenção em guia, e o pai pode estar pago com o filho ainda em aberto.
            status: finPayables.status,
            paymentMethod: finPayables.paymentMethod,
            paymentDetail: finPayables.paymentDetail,
            valueCents: finPayables.value,
            // O favorecido é da NOTA — o título não tem fornecedor próprio.
            payeeKind: finDocuments.payeeKind,
            payeeId: finDocuments.supplierRef,
          })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .where(inArray(finPayables.id, [...payableIds]));

        // Uma leitura por FAVORECIDO, não por título: numa remessa real o mesmo fornecedor aparece
        // em vários títulos, e perguntar de novo ao `partners` a cada linha multiplicaria idas ao
        // banco por um dado que não muda no meio da consulta.
        const cache = new Map<string, PayeeBankBlock | null>();
        const items: RemittancePreviewRow[] = [];

        for (const row of rows) {
          const key = payeeCacheKey(row.payeeKind, row.payeeId);
          if (!cache.has(key)) {
            const block = await lookupPayeeBank({
              kind: (row.payeeKind as PayeeKind | null) ?? null,
              id: row.payeeId ?? null,
            });
            // Indisponibilidade do `partners` derruba o pré-voo INTEIRO, de propósito. Degradar
            // aqui faria o operador ler "sem dados bancários" em títulos cujo cadastro está
            // completo — e agir sobre isso, corrigindo o que não está errado.
            if (!block.ok) {
              logStore('loadPreviewRows:payee', block.error);
              return err('remittance-preview-reader-unavailable');
            }
            cache.set(key, block.value);
          }

          items.push({
            payableId: row.payableId,
            documentId: row.documentId,
            // `status` é NOT NULL no schema; o cast reflete o vocabulário do domínio. Um valor fora
            // da união (não deveria existir, há CHECK) não é `Approved`, então cai em `not-approved`.
            status: row.status as DocumentStatus,
            paymentMethod: (row.paymentMethod as PaymentMethod | null) ?? null,
            paymentDetail: row.paymentDetail ?? null,
            // Sem `?? 0`: `fin_payables.value` é NOT NULL com CHECK `>= 0`, e o tipo já prova. O
            // documento tinha o fallback porque `fin_documents.net_value` é nullable (rascunho);
            // no título não é, e mantê-lo descreveria um estado que o schema não admite.
            valueCents: row.valueCents,
            payee: toPaymentTarget(cache.get(key) ?? null),
          });
        }

        return ok(items);
      } catch (cause) {
        logStore('loadPreviewRows', cause);
        return err('remittance-preview-reader-unavailable');
      }
    },
  };
};
