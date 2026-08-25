/**
 * Composição de leitura do bloco bancário do FAVORECIDO na borda HTTP (ADR-0032).
 *
 * Cobre os QUATRO `payeeKind` (#708/CA5, decisão (b) da P.O.). Até 08/2026 só `supplier`
 * era lido e os outros três degradavam para `null` em silêncio — não por decisão, mas
 * porque a premissa "bancário/PIX existem só em Supplier" ficou no código depois que o
 * domínio mudou: `payment-target.ts` declara os VOs compartilhados pelos 4 desde a US1 da
 * feature 015. Um colaborador com conta cadastrada aparecia sem dados bancários na tela, e
 * ninguém tinha como saber se faltava cadastro ou faltava leitura.
 *
 * Not-found, port nulo, IO ou timeout → `null` (degradação graciosa). A indisponibilidade
 * de Parceiros NÃO derruba a leitura do documento — isso continua valendo.
 *
 * @transient — composição síncrona provisória até BFF v2 assumir (ADR-0032).
 */

import type {
  BankAccount,
  ContractorReadError,
  ContractorReadPort,
  PixKey,
} from '#src/modules/partners/public-api/index.ts';
import { type Result, ok as okResult, err as errResult } from '#src/shared/primitives/result.ts';
import type { PayeeKind } from '../../domain/document/types.ts';

const DEFAULT_TIMEOUT_MS = 2_000;

export type PayeeBankBlock = Readonly<{
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

const withTimeout = async <T>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> => {
  let fire: (value: T) => void = () => undefined;
  const timeout = new Promise<T>((resolve) => {
    fire = resolve;
  });
  const timer = setTimeout(() => {
    fire(onTimeout);
  }, ms);
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

// Toda View de contratado carrega o bloco; o que muda por `kind` é só QUAL leitura chamar. O
// switch é exaustivo de propósito: um `payeeKind` novo passa a falhar no compilador em vez de
// cair num `default` que devolveria `null` e reintroduziria a degradação silenciosa.
// Nome e documento entram aqui porque o Segmento A os grava (#720): sem eles, emitir exigiria uma
// segunda ida ao `partners` para buscar na mesma View o que esta leitura já trouxe. Os quatro
// `payeeKind` os declaram.
type BankBearingView = Readonly<{
  name: string;
  document: string;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

const readByKind = (
  port: ContractorReadPort,
  kind: PayeeKind,
  id: string,
): Promise<Result<BankBearingView | null, ContractorReadError>> => {
  switch (kind) {
    case 'supplier':
      return port.getSupplierView(id);
    case 'financier':
      return port.getFinancierView(id);
    case 'collaborator':
      return port.getCollaboratorView(id);
    case 'act':
      return port.getActView(id);
  }
};

export type PayeeBankReadError = 'contractor-read-unavailable';

/**
 * O favorecido como o ARQUIVO precisa dele: identidade mais destino de pagamento.
 *
 * O Segmento A grava nome e inscrição do favorecido, além da conta — dados que o bloco bancário
 * sozinho não carrega. Em vez de uma segunda leitura ao `partners` para buscar o nome, a mesma
 * View entrega tudo, e `readPayeeBank` passa a ser uma projeção desta.
 */
export type PayeeContractor = Readonly<{
  name: string;
  document: string;
  bankAccount: BankAccount | null;
  pixKey: PixKey | null;
}>;

export const readPayeeContractor = async (
  port: ContractorReadPort | null,
  ref: { kind: PayeeKind | null; id: string | null },
  opts: { timeoutMs?: number } = {},
): Promise<Result<PayeeContractor | null, PayeeBankReadError>> => {
  if (port === null || ref.id === null || ref.kind === null) return okResult(null);

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSentinel = {
    ok: false as const,
    error: 'contractor-read-unavailable' as const,
  };
  const result = await withTimeout(readByKind(port, ref.kind, ref.id), timeoutMs, timeoutSentinel);

  if (!result.ok) return errResult('contractor-read-unavailable');
  if (result.value === null) return okResult(null);

  return okResult({
    name: result.value.name,
    document: result.value.document,
    bankAccount: result.value.bankAccount,
    pixKey: result.value.pixKey,
  });
};

/**
 * A leitura que PRESERVA a distinção entre "não achei" e "não consegui perguntar".
 *
 * `null` significa favorecido sem referência ou inexistente; o erro significa que o `partners` não
 * respondeu — timeout, IO ou port ausente.
 *
 * Existe porque há dois consumidores com necessidades opostas. A tela do documento prefere
 * degradar: um bloco bancário faltando não deve derrubar a leitura do documento (ADR-0032). O
 * pré-voo da remessa NÃO pode degradar: se ele tratar indisponibilidade como cadastro vazio, dirá
 * ao operador que dezenas de títulos estão sem dados bancários e o mandará corrigir cadastro que
 * está correto — e é justamente o pré-voo que existe para dizer o que falta.
 *
 * Uma leitura, dois desfechos declarados. `composePayeeBank` é esta função com o erro achatado.
 */
export const readPayeeBank = async (
  port: ContractorReadPort | null,
  ref: { kind: PayeeKind | null; id: string | null },
  opts: { timeoutMs?: number } = {},
): Promise<Result<PayeeBankBlock | null, PayeeBankReadError>> => {
  const contractor = await readPayeeContractor(port, ref, opts);
  if (!contractor.ok) return contractor;
  if (contractor.value === null) return okResult(null);

  return okResult({ bankAccount: contractor.value.bankAccount, pixKey: contractor.value.pixKey });
};

/**
 * Variante que DEGRADA — o contrato que a borda do documento já consumia (ADR-0032).
 *
 * Não-encontrado, indisponibilidade, timeout e port nulo colapsam em `null`, porque nenhum deles
 * deve derrubar a leitura do documento. Quem precisa distinguir usa `readPayeeBank`.
 */
export const composePayeeBank = async (
  port: ContractorReadPort | null,
  ref: { kind: PayeeKind | null; id: string | null },
  opts: { timeoutMs?: number } = {},
): Promise<PayeeBankBlock | null> => {
  const result = await readPayeeBank(port, ref, opts);
  return result.ok ? result.value : null;
};
