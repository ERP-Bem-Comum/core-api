/**
 * Gera o mapa `código de compensação → ISPB` a partir da lista de participantes do STR publicada
 * pelo Banco Central (#923).
 *
 *     pnpm run cnab:ispb
 *
 * ## Por que um MÓDULO TS, e não um `.db` como a tabela de domínios
 *
 * O `dominios-spb.db` (`.claude/skills/cnab240-bradesco/dominios/`) é consultado pelo HARNESS — um
 * agente perguntando "este código ainda é vigente?", em Bun, fora do caminho de execução. Este mapa é
 * consultado em RUNTIME DE PRODUÇÃO, dentro da geração do arquivo de pagamento, onde `src/` roda em
 * Node e o `node:sqlite` ainda é experimental. Depender dele ali seria pôr um módulo experimental no
 * caminho que move dinheiro, para ler 347 pares que cabem em 12 KB.
 *
 * O módulo gerado tem três propriedades que o `.db` não tem aqui: zero I/O na emissão, cobertura do
 * `typecheck`, e **diff legível na PR** — quem revisar a atualização vê exatamente quais instituições
 * entraram e saíram, em vez de um binário que mudou.
 *
 * ## Determinismo e proveniência
 *
 * Mesma entrada → mesma saída, byte a byte: as chaves saem ordenadas. O cabeçalho do arquivo gerado
 * grava o nome da fonte, o **sha256** e as contagens, para que uma afirmação sobre o ISPB possa citar
 * de onde veio — não da memória de quem escreveu. É a mesma disciplina da tabela `meta` do
 * `dominios-spb.db`.
 *
 * ## ⚠️ A coluna que NÃO se usa para filtrar
 *
 * `Participa_da_Compe` responde se a instituição opera na câmara de compensação (cheque, DOC) — NÃO
 * se ela tem código, e não se ela faz Pix. Medido em 01/09/2026: dos 347 participantes com código
 * numérico, apenas **95** participam da Compe. Nubank (`260`) e C6 (`336`) estão entre os 252 que não
 * participam — e são favorecidos correntes. Filtrar por essa coluna produziria "ISPB desconhecido"
 * para cadastro correto, e o operador seria mandado consertar o que já está certo.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SOURCE_CSV = join(ROOT, '.claude/skills/cnab240-bradesco/participantes-str-20260901.csv');
const TARGET_TS = join(ROOT, 'src/modules/financial/adapters/cnab/ispb-by-bank-code.generated.ts');

const COLUMN = { ISPB: 0, SHORT_NAME: 1, BANK_CODE: 2 } as const;

/**
 * Parser de linha CSV que respeita aspas — e não é zelo teórico: `Nome_Extenso` traz vírgula DENTRO
 * do campo em 33 linhas ("SANTINVEST S.A. - CREDITO, FINANCIAMENTO E INVESTIMENTO"). Um `split(',')`
 * ingênuo desloca as colunas seguintes e produz mapa errado sem erro algum.
 */
const parseCsvLine = (line: string): readonly string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      // `""` dentro de campo entre aspas é uma aspa literal.
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      // `?? ''` por `noUncheckedIndexedAccess`: o índice é sempre válido dentro do laço, e o
      // compilador não tem como saber disso.
      current += char ?? '';
    }
  }
  fields.push(current);
  return fields;
};

type Participant = Readonly<{ bankCode: string; ispb: string; name: string }>;

// U+FEFF, o BOM UTF-8 que o arquivo do Bacen traz. Construído por código, e não escrito literalmente:
// o caractere no fonte é "irregular whitespace" para o ESLint — e um caractere invisível num literal é
// a última coisa que alguém procura ao depurar.
const BOM = String.fromCodePoint(0xfeff);

const readParticipants = (csv: string): readonly Participant[] => {
  // ⚠️ Sem remover o BOM, o primeiro cabeçalho não é `ISPB` mas `<BOM>ISPB`, e a checagem de layout
  // abaixo falharia por um caractere que não aparece na tela. As colunas são lidas por índice, então
  // o resto do parse continuaria "funcionando" — com a guarda desarmada.
  const withoutBom = csv.startsWith(BOM) ? csv.slice(BOM.length) : csv;
  const lines = withoutBom.split(/\r?\n/);
  const [header, ...rows] = lines;
  if (header === undefined) throw new Error('CSV vazio');

  const headerFields = parseCsvLine(header);
  if (headerFields[COLUMN.ISPB] !== 'ISPB' || headerFields[COLUMN.BANK_CODE] !== 'Número_Código') {
    throw new Error(
      `layout do CSV mudou — esperado ISPB na coluna 0 e Número_Código na 2, veio ${JSON.stringify(headerFields.slice(0, 3))}`,
    );
  }

  const participants: Participant[] = [];
  for (const row of rows) {
    if (row.trim() === '') continue;
    const fields = parseCsvLine(row);
    const ispb = (fields[COLUMN.ISPB] ?? '').trim();
    const bankCode = (fields[COLUMN.BANK_CODE] ?? '').trim();
    const name = (fields[COLUMN.SHORT_NAME] ?? '').trim();

    // `n/a` é participante sem código de compensação — Selic, câmaras, o próprio Bacen. Não entra no
    // mapa porque ninguém o digita como banco do favorecido, e inventar uma chave para ele criaria
    // uma entrada que só pode ser alcançada por engano.
    if (!/^\d{3}$/.test(bankCode)) continue;
    if (!/^\d{8}$/.test(ispb)) throw new Error(`ISPB fora do formato para ${bankCode}: ${ispb}`);

    participants.push({ bankCode, ispb, name });
  }
  return participants;
};

const main = (): void => {
  const raw = readFileSync(SOURCE_CSV);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const participants = readParticipants(raw.toString('utf8'));

  const byCode = new Map<string, Participant>();
  for (const p of participants) {
    const existing = byCode.get(p.bankCode);
    // Unicidade MEDIDA na fonte de 01/09/2026 (zero duplicatas em 347). A guarda existe porque a
    // premissa é da EDIÇÃO, não do formato: o dia em que o Bacen publicar dois ISPB para o mesmo
    // código, o build precisa parar — e não eleger um dos dois por ordem de leitura.
    if (existing !== undefined && existing.ispb !== p.ispb) {
      throw new Error(
        `código ${p.bankCode} aparece com dois ISPB distintos — a de-para deixou de ser determinística`,
      );
    }
    byCode.set(p.bankCode, p);
  }

  const sorted = [...byCode.values()].sort((a, b) => a.bankCode.localeCompare(b.bankCode));
  const entries = sorted.map((p) => `  '${p.bankCode}': '${p.ispb}', // ${p.name}`).join('\n');

  const content = `// GERADO POR \`pnpm run cnab:ispb\` — NÃO EDITAR À MÃO.
//
// Mapa código de compensação → ISPB, para o campo \`P015\` do Segmento B na modalidade Pix (#923).
//
// Fonte: ${basename(SOURCE_CSV)} — Relação de Participantes do STR, Banco Central do Brasil.
//   sha256: ${sha256}
//   participantes no arquivo: ${String(participants.length)} com código numérico
//   entradas neste mapa: ${String(sorted.length)}
//
// ⚠️ Instituição entra e sai do SPI. Um ISPB extinto produz arquivo BEM-FORMADO que o banco recusa, e
// o \`remittance-inspector.ts\` não pega — não é defeito de forma. Regerar ao atualizar a fonte.

export const ISPB_BY_BANK_CODE: Readonly<Record<string, string>> = {
${entries}
};
`;

  writeFileSync(TARGET_TS, content, 'utf8');
  process.stdout.write(
    `mapa gerado: ${String(sorted.length)} entradas\n  fonte: ${basename(SOURCE_CSV)}\n  sha256: ${sha256}\n`,
  );
};

main();
