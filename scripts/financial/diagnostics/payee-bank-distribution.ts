/**
 * Distribuição de favorecidos por INSTITUIÇÃO — o número que dimensiona duas frentes (#755).
 *
 * ## Por que existe
 *
 * Duas decisões estavam sendo tomadas no escuro por falta de um único número:
 *
 *   1. **Alcance do defeito de câmara/forma**, que atinge favorecido do próprio Bradesco. Se for a
 *      maioria, é o item mais urgente da frente; se for marginal, muda de posição na fila.
 *   2. **Viabilidade do cálculo de dígito verificador**, que só é determinístico para o próprio
 *      banco. Se a suspeita do #734 se concentra em cadastros do Bradesco, o cálculo converte
 *      "suspeito" em "errado, nominalmente" numa tarde. Se não, o caminho é outro.
 *
 * ## Pelo caminho PRESCRITO, não por inspeção (CA2)
 *
 * A leitura do campo usa `decomposePayeeAccount` — a MESMA função que o emissor usa para converter o
 * bloco bancário do cadastro nos campos posicionais do Segmento A. Uma consulta ad hoc com `SUBSTR`
 * mediria outra coisa: o cadastro guarda o código do banco **prefixando o nome** (`237 - Banco…`),
 * e é a régua do emissor que decide o que dali vira código de compensação. Número de planilha e
 * número da régua podem divergir — e é essa divergência que interessa detectar.
 *
 * ## O universo
 *
 * As QUATRO tabelas que o `ContractorReadPort` varre (`contractor-read.drizzle.ts`): fornecedor,
 * financiador, colaborador e ato. Medir só `par_suppliers` deixaria de fora favorecido que o emissor
 * alcança — e o total não fecharia com o universo que o CA1 pede.
 *
 * ## Escopo
 *
 * Somente leitura: nenhum `INSERT`/`UPDATE`/`DELETE`. Seguro rodar em produção.
 * Saída AGREGADA (CA4) — contagens por código de banco e vereditos de dígito. **Nenhum nome,
 * documento, agência ou número de conta é impresso**, para o laudo poder ser colado numa issue de
 * repositório público sem vazar cadastro.
 *
 * Uso: `PARTNERS_DATABASE_URL=mysql://... pnpm run financial:payee-bank-distribution`
 *
 * Exit codes: 0 medido · 2 config ausente · 1 erro.
 */

import process from 'node:process';

import { createConnection, type RowDataPacket } from 'mysql2/promise';

import {
  decomposePayeeAccount,
  readPayeeBankCode,
} from '#src/modules/financial/domain/payout/payee-account.ts';
import { verifyAccountCheckDigit } from '#src/modules/financial/domain/payout/account-check-digit.ts';

const TAG = '[payee-bank-distribution] ';

const BANK_BRADESCO = '237';

/** As quatro tabelas que o `ContractorReadPort` consulta — o universo de favorecidos. */
const PAYEE_TABLES: readonly string[] = [
  'par_suppliers',
  'par_financiers',
  'par_collaborators',
  'par_acts',
];

// Os aliases do SELECT são camelCase, e não o `bank_account_bank` natural em SQL: o resultado vira
// propriedade de tipo aqui, e `naming-convention` cobra camelCase nela. Mesmo idioma de
// `projection-health.ts`.
type BankRow = RowDataPacket &
  Readonly<{
    bank: string | null;
    agency: string | null;
    accountNumber: string | null;
    checkDigit: string | null;
  }>;

type Tally = Readonly<{
  /** Cadastros com bloco bancário preenchido, por tabela. */
  withBankBlock: number;
  /** Decompuseram sem lacuna — o emissor consegue escrever o Segmento A. */
  decomposable: number;
  /** Por código de banco, entre os decomponíveis. */
  byBankCode: ReadonlyMap<string, number>;
  /** Motivo da recusa, por campo+razão, entre os que NÃO decompõem. */
  gaps: ReadonlyMap<string, number>;
  /** Veredito do dígito, por `banco/status`. */
  checkDigit: ReadonlyMap<string, number>;
}>;

const emptyTally = (): {
  withBankBlock: number;
  decomposable: number;
  byBankCode: Map<string, number>;
  gaps: Map<string, number>;
  checkDigit: Map<string, number>;
} => ({
  withBankBlock: 0,
  decomposable: 0,
  byBankCode: new Map(),
  gaps: new Map(),
  checkDigit: new Map(),
});

const bump = (counter: Map<string, number>, key: string): void => {
  counter.set(key, (counter.get(key) ?? 0) + 1);
};

const write = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

/**
 * Conta uma tabela inteira pela régua do emissor.
 *
 * O filtro de bloco preenchido usa `<> ''` além de `IS NOT NULL` porque o cadastro incompleto entrou
 * como STRING VAZIA: o CHECK do banco exige as quatro colunas juntas nulas ou juntas preenchidas,
 * então quem tinha o bloco pela metade gravou `''` para satisfazê-lo (ver `payout/types.ts`).
 */
const tallyTable = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- conexão mysql2 não é readonly-representável.
  connection: Awaited<ReturnType<typeof createConnection>>,
  table: string,
): Promise<Tally> => {
  const [rows] = await connection.query<BankRow[]>(
    `select bank_account_bank         as bank,
            bank_account_agency       as agency,
            bank_account_number       as accountNumber,
            bank_account_check_digit  as checkDigit
       from ${table}
      where bank_account_bank is not null and bank_account_bank <> ''`,
  );

  const tally = emptyTally();

  for (const row of rows) {
    tally.withBankBlock += 1;

    // A DISTRIBUIÇÃO usa o universo inteiro, não só quem decompõe — e essa distinção é o coração da
    // medição. Um cadastro do Bradesco recusado por dígito divergente continua sendo do Bradesco, e
    // é exatamente essa população que a #734 investiga: contá-la apenas entre os decomponíveis a
    // apagaria do relatório justamente onde ela importa.
    const bank = readPayeeBankCode(row.bank);
    bump(tally.byBankCode, bank.ok ? bank.value : 'ilegível');

    const decomposed = decomposePayeeAccount({
      bank: row.bank,
      agency: row.agency,
      accountNumber: row.accountNumber,
      checkDigit: row.checkDigit,
      pixKey: null,
      // A decomposição da conta não olha inscrição nem chave PIX — os dois entram nulos pela mesma
      // razão, e este diagnóstico mede distribuição de BANCO.
      document: null,
    });

    if (!decomposed.ok) {
      // A lacuna é agregada por BANCO + campo + razão, nunca por cadastro. O banco na chave é o que
      // responde o CA3: `check-digit-mismatch` concentrado em `237` significa que o cálculo do
      // dígito converte a maior parte dos suspeitos numa tarde; espalhado por instituições cujo
      // algoritmo não temos, significa que o caminho é outro. Sem o banco, a contagem diz que há
      // divergência e não diz onde agir.
      const scope = bank.ok ? bank.value : 'ilegível';
      for (const g of decomposed.error) bump(tally.gaps, `${scope}/${g.field}/${g.reason}`);
      continue;
    }

    tally.decomposable += 1;
    const { bankCode, accountNumber, accountDigit } = decomposed.value;

    // CA3: o veredito do dígito, cruzado com a instituição. É o que responde se o cálculo resolve a
    // maior parte dos suspeitos ou nenhum — `not-verifiable/unsupported-bank` é a resposta honesta
    // para banco cujo algoritmo não temos, e contá-la como acerto inventaria uma verificação.
    const verdict = verifyAccountCheckDigit(bankCode, accountNumber, accountDigit);
    const detail =
      verdict.status === 'not-verifiable' ? `${verdict.status}/${verdict.reason}` : verdict.status;
    bump(tally.checkDigit, `${bankCode}/${detail}`);
  }

  return tally;
};

const mergeInto = (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- acumulador: o ponto da função é escrever nele.
  target: ReturnType<typeof emptyTally>,
  source: Tally,
): ReturnType<typeof emptyTally> => {
  target.withBankBlock += source.withBankBlock;
  target.decomposable += source.decomposable;
  for (const [k, v] of source.byBankCode)
    target.byBankCode.set(k, (target.byBankCode.get(k) ?? 0) + v);
  for (const [k, v] of source.gaps) target.gaps.set(k, (target.gaps.get(k) ?? 0) + v);
  for (const [k, v] of source.checkDigit)
    target.checkDigit.set(k, (target.checkDigit.get(k) ?? 0) + v);
  return target;
};

/** Ordena por contagem desc, e por chave quando empata — saída estável entre execuções. */
const ranked = (counter: ReadonlyMap<string, number>): readonly (readonly [string, number])[] =>
  [...counter.entries()].sort((a, b) => {
    const byCount = b[1] - a[1];
    return byCount === 0 ? a[0].localeCompare(b[0]) : byCount;
  });

const main = async (): Promise<number> => {
  const url =
    process.env['PARTNERS_DATABASE_URL'] ??
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'];

  if (url === undefined || url === '') {
    process.stderr.write(`${TAG}PARTNERS_DATABASE_URL ausente.\n`);
    return 2;
  }

  const connection = await createConnection(url);
  try {
    const total = emptyTally();

    write(`${TAG}universo por tabela:`);
    for (const table of PAYEE_TABLES) {
      const tally = await tallyTable(connection, table);
      write(
        `  ${table.padEnd(20)} com bloco bancário: ${String(tally.withBankBlock).padStart(4)}` +
          `  decomponíveis: ${String(tally.decomposable).padStart(4)}`,
      );
      mergeInto(total, tally);
    }

    // CA1 — o total confere com o universo por construção: `decomponíveis + recusados` fecha com
    // `com bloco bancário`, e a linha abaixo torna isso conferível em vez de prometido.
    const refused = total.withBankBlock - total.decomposable;
    write('');
    write(
      `${TAG}TOTAL: ${String(total.withBankBlock)} com bloco bancário ` +
        `= ${String(total.decomposable)} decomponíveis + ${String(refused)} recusados`,
    );

    write('');
    write(`${TAG}distribuição por código de banco (universo INTEIRO, decomponha ou não):`);
    for (const [bankCode, count] of ranked(total.byBankCode)) {
      const share = total.withBankBlock === 0 ? 0 : (count / total.withBankBlock) * 100;
      const marca = bankCode === BANK_BRADESCO ? '  ← Bradesco' : '';
      write(
        `  ${bankCode.padStart(9)}: ${String(count).padStart(4)}  (${share.toFixed(1)}%)${marca}`,
      );
    }

    const bradesco = total.byBankCode.get(BANK_BRADESCO) ?? 0;
    const outros = total.withBankBlock - bradesco;
    write('');
    write(`${TAG}Bradesco: ${String(bradesco)}  ·  outras instituições: ${String(outros)}`);

    write('');
    write(`${TAG}veredito do dígito verificador, por banco (CA3):`);
    for (const [key, count] of ranked(total.checkDigit)) {
      write(`  ${key.padEnd(40)} ${String(count).padStart(4)}`);
    }

    if (total.gaps.size > 0) {
      write('');
      write(`${TAG}por que os recusados não decompõem (banco/campo/razão) — CA3:`);
      for (const [key, count] of ranked(total.gaps)) {
        write(`  ${key.padEnd(40)} ${String(count).padStart(4)}`);
      }
    }

    return 0;
  } finally {
    await connection.end();
  }
};

try {
  process.exitCode = await main();
} catch (cause) {
  process.stderr.write(`${TAG}falhou: ${String(cause)}\n`);
  process.exitCode = 1;
}
