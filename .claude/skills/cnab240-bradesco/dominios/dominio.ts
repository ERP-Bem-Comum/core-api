/**
 * Consulta a Tabela de Domínio do SPB. Saída em JSON de uma linha, mínima.
 *
 *   bun .claude/skills/cnab240-bradesco/dominios/dominio.ts CanPgto 4
 *   → {"desc":"Pix","vig":"vigente","prod":"2023-07-01"}
 *
 *   bun .../dominio.ts FinlddIF              # todos os vigentes do tipo
 *   bun .../dominio.ts FinlddIF --todos      # inclui os extintos
 *   bun .../dominio.ts --busca "pagamento de tributo"
 *   bun .../dominio.ts --tipos pgto
 *   bun .../dominio.ts --meta                # proveniência da edição
 *
 * O banco é aberto em disco, somente leitura. Não carregue para memória: o
 * page cache do SO já serve as páginas quentes, e copiar 1,9 MB a cada
 * invocação custa mais do que os 0,6 µs por consulta que isso economiza.
 *
 * Runtime: bun (harness local, nunca `src/`).
 */
import { Database } from 'bun:sqlite';
import { dirname, join } from 'node:path';

const DB_PATH = join(dirname(Bun.fileURLToPath(import.meta.url)), 'dominios-spb.db');

export type DomainRow = {
  tipo: string;
  dominio: string;
  descricao: string;
  controle: string | null;
  hom_inicio: string | null;
  prod_inicio: string | null;
  hom_fim: string | null;
  prod_fim: string | null;
};

/**
 * Estado de um domínio numa data. Três estados, não um booleano: "não vale
 * hoje" tem duas causas com consequências opostas — um código extinto exige
 * achar o substituto, um código futuro exige apenas esperar.
 */
type Vigencia = 'vigente' | 'futuro' | 'extinto';

/**
 * Classifica a vigência de um domínio na data `hoje` (ISO `aaaa-mm-dd`).
 *
 * Três decisões do dono (25/08/2026) estão embutidas aqui:
 *
 * 1. **Só as datas de produção entram.** A homologação do ERP roda com dado
 *    fictício — conta do cedente e fornecedores inclusive — mas precisa emitir
 *    o arquivo *idêntico* ao de produção. Classificar por `hom_*` faria os dois
 *    ambientes divergirem, que é exatamente o defeito que se quer evitar: um
 *    arquivo aprovado em homologação e recusado em produção.
 *
 * 2. **Bordas fechadas nas duas pontas.** `prod_fim` igual a hoje ainda vale o
 *    dia inteiro (expira à meia-noite seguinte); `prod_inicio` igual a hoje já
 *    vale desde o primeiro minuto. Daí `>` e `<` estritos abaixo — a igualdade
 *    cai no ramo `vigente`.
 *
 * 3. **`null` é vigência infinita, não desconhecido.** No normativo do Bacen a
 *    ausência de data inicial significa "sempre valeu" (regra atemporal do
 *    manual), e a de data final, "nunca foi desativado" — 5.431 das 9.474
 *    linhas estão nesse caso. Traduzir `null` como "não sei" quebraria a regra
 *    por falta de parâmetro temporal em mais da metade da tabela.
 *
 * Comparação lexicográfica de string basta: ISO `aaaa-mm-dd` ordena como data.
 */
export function classificarVigencia(row: DomainRow, hoje: string): Vigencia {
  if (row.prod_inicio !== null && row.prod_inicio > hoje) return 'futuro';
  if (row.prod_fim !== null && row.prod_fim < hoje) return 'extinto';
  return 'vigente';
}

// ─────────────────────────── saída ───────────────────────────

const emit = (value: unknown): void => {
  console.log(JSON.stringify(value));
};

const fail = (erro: string, extra: Record<string, unknown> = {}): never => {
  emit({ erro, ...extra });
  process.exit(1);
};

// ─────────────────────────── consultas ───────────────────────────

function abrir(): Database {
  try {
    return new Database(DB_PATH, { readonly: true });
  } catch {
    return fail('db-ausente', { dica: 'bun .claude/skills/cnab240-bradesco/dominios/build.ts' });
  }
}

function consultarUm(db: Database, tipo: string, dominio: string, hoje: string, completo: boolean): void {
  const row = db
    .query('SELECT * FROM dominio WHERE tipo = ? AND dominio = ?')
    .get(tipo, dominio) as DomainRow | null;

  if (!row) {
    const vizinhos = db
      .query('SELECT dominio FROM dominio WHERE tipo = ? ORDER BY dominio LIMIT 12')
      .all(tipo) as { dominio: string }[];
    return void (vizinhos.length === 0
      ? fail('tipo-nao-encontrado', { tipo })
      : fail('dominio-nao-encontrado', { tipo, existentes: vizinhos.map((v) => v.dominio) }));
  }

  const vig = classificarVigencia(row, hoje);
  emit(
    completo
      ? { ...row, vig }
      : { desc: row.descricao, vig, prod: row.prod_inicio, ...(row.prod_fim ? { fim: row.prod_fim } : {}) },
  );
}

function listarTipo(db: Database, tipo: string, hoje: string, todos: boolean): void {
  const rows = db.query('SELECT * FROM dominio WHERE tipo = ? ORDER BY LENGTH(dominio), dominio').all(tipo) as DomainRow[];
  if (rows.length === 0) return void fail('tipo-nao-encontrado', { tipo });

  const itens = rows
    .map((r) => ({ row: r, vig: classificarVigencia(r, hoje) }))
    .filter(({ vig }) => todos || vig === 'vigente')
    .map(({ row, vig }) => ({ d: row.dominio, desc: row.descricao, ...(vig === 'vigente' ? {} : { vig }) }));

  emit({ tipo, total: rows.length, mostrados: itens.length, itens });
}

function buscar(db: Database, termo: string, hoje: string, limite: number): void {
  // FTS5 trata caracteres como sintaxe; aspas duplas fazem tudo virar frase literal.
  const query = termo
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replaceAll('"', '""')}"`)
    .join(' ');

  const hits = db
    .query(
      `SELECT d.* FROM dominio_fts f
         JOIN dominio d ON d.tipo = f.tipo AND d.dominio = f.dominio
        WHERE dominio_fts MATCH ? ORDER BY rank LIMIT ?`,
    )
    .all(query, limite) as DomainRow[];

  emit({
    termo,
    n: hits.length,
    hits: hits.map((r) => ({ t: r.tipo, d: r.dominio, desc: r.descricao, vig: classificarVigencia(r, hoje) })),
  });
}

function listarTipos(db: Database, filtro: string | undefined): void {
  const rows = filtro
    ? (db
        .query('SELECT tipo, COUNT(*) AS n FROM dominio WHERE tipo LIKE ? GROUP BY tipo ORDER BY tipo')
        .all(`%${filtro}%`) as { tipo: string; n: number }[])
    : (db.query('SELECT tipo, COUNT(*) AS n FROM dominio GROUP BY tipo ORDER BY tipo').all() as {
        tipo: string;
        n: number;
      }[]);
  emit({ n: rows.length, tipos: rows.map((r) => `${r.tipo}:${r.n}`) });
}

function mostrarMeta(db: Database): void {
  const rows = db.query('SELECT chave, valor FROM meta').all() as { chave: string; valor: string }[];
  emit(Object.fromEntries(rows.map((r) => [r.chave, r.valor])));
}

// ─────────────────────────── CLI ───────────────────────────

function main(): void {
  const argv = process.argv.slice(2);
  const flag = (name: string): boolean => argv.includes(name);
  const valorDe = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const posicionais = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));

  // Data de referência fixável para tornar a saída reproduzível em teste.
  const hoje = valorDe('--em') ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoje)) return void fail('data-invalida', { recebido: hoje });

  const db = abrir();
  try {
    if (flag('--meta')) return mostrarMeta(db);
    if (flag('--tipos')) return listarTipos(db, valorDe('--tipos'));
    if (flag('--busca')) {
      const termo = valorDe('--busca');
      if (!termo) return void fail('busca-sem-termo');
      return buscar(db, termo, hoje, Number(valorDe('--limite') ?? 10));
    }

    const [tipo, dominio] = posicionais;
    if (!tipo) {
      return void fail('uso', {
        formas: ['<tipo> <dominio>', '<tipo> [--todos]', '--busca <texto>', '--tipos [filtro]', '--meta'],
      });
    }
    return dominio === undefined
      ? listarTipo(db, tipo, hoje, flag('--todos'))
      : consultarUm(db, tipo, dominio, hoje, flag('--full'));
  } finally {
    db.close();
  }
}

// Só executa quando invocado direto — o teste importa `classificarVigencia`.
if (import.meta.main) main();
