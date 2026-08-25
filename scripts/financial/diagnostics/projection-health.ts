/**
 * Diagnóstico das projeções do financial — `fin_payable_view` a partir do `fin_outbox`.
 *
 * ## Por que este script existe
 *
 * Até aqui, a única receita para saber se o read-model estava populado era **abrir o dashboard e
 * ver se o widget tem dado**. Isso é usar tela de produto como sonda de infraestrutura: um widget
 * vazio tem pelo menos cinco causas — worker parado, backfill nunca rodado, deploy atrasado, falta
 * de permissão, ou simplesmente não haver pagamento no período — e a tela não distingue nenhuma
 * delas.
 *
 * ## A ambiguidade que nenhuma consulta isolada resolve
 *
 * `COUNT(*) WHERE processed_at IS NULL = 0` significa "está em dia" **ou** "o worker morreu e nada
 * novo entrou". Numa janela sem documentos novos, um worker saudável e um morto produzem
 * exatamente o mesmo resultado. Este script **não conserta isso** — nenhum SELECT conserta, porque
 * o dado que falta é um sinal de vida do processo, e nenhum worker emite heartbeat hoje. O que ele
 * faz é **declarar a ambiguidade em vez de escondê-la**, cruzando a fila com a idade da última
 * escrita na view para dizer o que dá e o que não dá para concluir.
 *
 * A cura definitiva é heartbeat no `runLoop` — o padrão que o [ADR-0042](../../../handbook/architecture/adr/0042-deadman-switch-redundant.md)
 * já definiu para o scheduler do auto-expire e que os workers de projeção nunca adotaram.
 *
 * ## Escopo
 *
 * Somente leitura: nenhum `INSERT`/`UPDATE`/`DELETE`. Seguro rodar em produção.
 * Saída AGREGADA — contagens, idades e ids técnicos. Nenhum valor de negócio (fornecedor, valor,
 * documento) é impresso, para o laudo poder ser colado num chamado sem vazar dado.
 *
 * Uso: `FINANCIAL_DATABASE_URL=mysql://... pnpm run financial:projection-health`
 *
 * Exit codes: 0 saudável · 3 divergência encontrada · 4 indeterminado (ambiguidade) · 2 config · 1 erro.
 */

import process from 'node:process';

import { createConnection, type RowDataPacket } from 'mysql2/promise';

const TAG = '[projection-health] ';

// O alias do SQL é `AS ageSeconds`, em camelCase, e não o `age_seconds` que seria natural em
// SQL: o resultado vira propriedade de tipo aqui, e `naming-convention` cobra camelCase nela.
type Counted = RowDataPacket & { readonly n: number };
type Aged = RowDataPacket & { readonly n: number; readonly ageSeconds: number | null };

const pad = (label: string): string => label.padEnd(38);

const main = async (): Promise<number> => {
  const url = process.env['FINANCIAL_DATABASE_URL'];
  if (url === undefined || url.trim() === '') {
    process.stderr.write(`${TAG}FINANCIAL_DATABASE_URL é obrigatório\n`);
    return 2;
  }

  const conn = await createConnection(url);
  // `one` fecha sobre `conn` em vez de recebê-la: evita passar um tipo mutável como parâmetro
  // (prefer-readonly-parameter-types) sem precisar silenciar a regra.
  const one = async <T extends RowDataPacket>(sql: string): Promise<T> => {
    const [rows] = await conn.query<T[]>(sql);
    const first = rows[0];
    if (first === undefined) throw new Error(`consulta sem linha: ${sql}`);
    return first;
  };

  try {
    // ── fila ────────────────────────────────────────────────────────────────
    // Usa fin_outbox_processed_at_occurred_at_idx (processed_at primeiro → NULLs agrupados).
    const pending = await one<Aged>(`SELECT COUNT(*) AS n,
              TIMESTAMPDIFF(SECOND, MIN(occurred_at), NOW()) AS ageSeconds
         FROM fin_outbox WHERE processed_at IS NULL`);

    // A DLQ é tabela SEPARADA: evento que estoura maxAttempts sai do fin_outbox. Sem esta
    // consulta, "fila vazia" esconderia eventos que morreram sem nunca serem projetados.
    const dead = await one<Aged>(`SELECT COUNT(*) AS n,
              TIMESTAMPDIFF(SECOND, MAX(failed_at), NOW()) AS ageSeconds
         FROM fin_outbox_dead_letter`);

    // ── projeção ────────────────────────────────────────────────────────────
    const view = await one<Aged>(`SELECT COUNT(*) AS n,
              TIMESTAMPDIFF(SECOND, MAX(updated_at), NOW()) AS ageSeconds
         FROM fin_payable_view`);

    const source = await one<Counted>(`SELECT COUNT(*) AS n
         FROM fin_payables p INNER JOIN fin_documents d ON d.id = p.document_id`);

    // Falta linha: a fonte tem payable que a projeção nunca recebeu.
    const missing = await one<Counted>(`SELECT COUNT(*) AS n
         FROM fin_payables p
         INNER JOIN fin_documents d ON d.id = p.document_id
         LEFT JOIN fin_payable_view v ON v.payable_id = p.id
        WHERE v.payable_id IS NULL`);

    // Órfã: a view tem linha cuja fonte sumiu. Possível porque fin_payable_view não tem FK e
    // DELETE em fin_documents cascateia para fin_payables — a view não acompanha.
    const orphan = await one<Counted>(`SELECT COUNT(*) AS n
         FROM fin_payable_view v
         LEFT JOIN fin_payables p ON p.id = v.payable_id
        WHERE p.id IS NULL`);

    // ── laudo ───────────────────────────────────────────────────────────────
    const hours = (s: number | null): string =>
      s === null ? '—' : `${(s / 3600).toFixed(1)}h atrás`;

    process.stdout.write(`\n${TAG}fin_payable_view ← fin_outbox\n\n`);
    process.stdout.write(`  ${pad('eventos pendentes na fila')}${String(pending.n)}\n`);
    process.stdout.write(`  ${pad('  mais antigo ocorreu')}${hours(pending.ageSeconds)}\n`);
    process.stdout.write(`  ${pad('eventos mortos (DLQ)')}${String(dead.n)}\n`);
    process.stdout.write(`  ${pad('  último morreu')}${hours(dead.ageSeconds)}\n\n`);
    process.stdout.write(`  ${pad('linhas na projeção')}${String(view.n)}\n`);
    process.stdout.write(`  ${pad('  última escrita')}${hours(view.ageSeconds)}\n`);
    process.stdout.write(`  ${pad('payables na fonte')}${String(source.n)}\n`);
    process.stdout.write(`  ${pad('faltando na projeção')}${String(missing.n)}\n`);
    process.stdout.write(`  ${pad('órfãs na projeção')}${String(orphan.n)}\n\n`);

    // ── veredito ────────────────────────────────────────────────────────────
    const problems: string[] = [];
    if (missing.n > 0)
      problems.push(
        `${String(missing.n)} payable(s) da fonte sem linha na projeção — rode o backfill (idempotente): pnpm run job:financial:payable-view-backfill`,
      );
    if (orphan.n > 0)
      problems.push(
        `${String(orphan.n)} linha(s) órfã(s) na projeção — a fonte foi deletada e a view não acompanhou (não há FK). Precisa de limpeza manual.`,
      );
    if (dead.n > 0)
      problems.push(
        `${String(dead.n)} evento(s) na dead-letter — nunca foram projetados. Investigue fin_outbox_dead_letter.last_error.`,
      );
    if (pending.n > 0 && pending.ageSeconds !== null && pending.ageSeconds > 3600)
      problems.push(
        `fila parada: o evento mais antigo espera há ${hours(pending.ageSeconds)} — o worker payable-view-projection provavelmente não está rodando.`,
      );

    if (problems.length > 0) {
      process.stdout.write(`${TAG}DIVERGÊNCIA:\n`);
      for (const p of problems) process.stdout.write(`  • ${p}\n`);
      return 3;
    }

    // Fila vazia é ambígua por construção: sem heartbeat, não se distingue "em dia" de "morto
    // numa janela sem eventos novos". A última escrita na view é o único proxy disponível — e é
    // fraco, porque também fica velho quando simplesmente não houve pagamento no período.
    if (pending.n === 0 && (view.ageSeconds === null || view.ageSeconds > 86_400)) {
      process.stdout.write(
        `${TAG}INDETERMINADO: fila vazia e nenhuma escrita na projeção nas últimas 24h.\n` +
          `  Isso é compatível com "em dia, sem movimento" E com "worker morto". Nenhuma consulta\n` +
          `  distingue os dois — falta heartbeat no worker. Confirme pelo processo/log da task.\n`,
      );
      return 4;
    }

    process.stdout.write(`${TAG}SAUDÁVEL: fila em dia, projeção sem divergência.\n`);
    return 0;
  } finally {
    await conn.end();
  }
};

main().then(
  (code) => {
    process.exit(code);
  },
  (cause: unknown) => {
    process.stderr.write(`${TAG}erro: ${String(cause)}\n`);
    process.exit(1);
  },
);
