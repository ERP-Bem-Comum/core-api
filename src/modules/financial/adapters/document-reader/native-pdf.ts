import { ok, err } from '../../../../shared/primitives/result.ts';
import type { Result } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as Cnpj from '../../../../shared/kernel/cnpj.ts';
import * as Competencia from '../../domain/document/competencia.ts';
import * as Retention from '../../domain/shared/retention.ts';
import type { DocumentType } from '../../domain/document/types.ts';
import type { DocumentReaderResult, SupplierIdentity } from '../../domain/document-reader/types.ts';
import type { DocumentReaderError } from '../../domain/document-reader/errors.ts';
import type {
  DocumentReaderPort,
  DocumentReaderInput,
} from '../../application/ports/document-reader.ts';
import {
  detectStructure,
  inflateGuarded,
  extractStreams,
  isFlate,
  MAX_BYTES,
  MAX_TOTAL_INFLATE,
} from './pdf-lowlevel.ts';

const MAX_OPERAND = 4096; // teto por operando de texto (nenhum campo fiscal real passa disso)
// #386 F1 (anti-amplificação, CWE-400/789): teto de operandos acumulados entre dois flushes
// (Tj/TJ/posição). Sem isso, um content-stream com milhões de `()`/`<>` sem mostrar texto faria
// `pending` crescer sem limite (KB de payload → centenas de MB de heap). Nenhuma linha fiscal real
// tem tantos runs entre flushes; operandos acima do teto são descartados (o excedente não é texto útil).
const MAX_PENDING_OPERANDS = 2048;

// Reader nativo de PDF de texto (FIN-DOC-READER-NATIVE, ADR-0050). Caminho principal 100% `node:zlib`.
// Extrai texto do content-stream (WinAnsi direto; Identity-H via CMap `/ToUnicode`) e estrutura por
// tipo com âncoras. `resolvedVia:'native-text'`. Sem texto recuperável → `scanned-unsupported`.

// Módulo de parsing de BYTES: `Uint8Array` não tem variant readonly nativo no TS 6 (ver port).
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

const latin1 = (b: Uint8Array): string => Buffer.from(b).toString('latin1');

// --- Decodificação de texto ---------------------------------------------------

const decodeLiteral = (inner: string): string =>
  inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\])/g, '$1');

const decodeHex = (hex: string, toUnicode: ReadonlyMap<number, string>): string => {
  let out = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    out += toUnicode.get(Number.parseInt(hex.slice(i, i + 4), 16)) ?? '';
  }
  return out;
};

// CMap /ToUnicode → mapa código(2-byte)→char (bfchar). Suficiente p/ Identity-H fiscal.
const parseToUnicode = (cmap: string): ReadonlyMap<number, string> => {
  const map = new Map<number, string>();
  const blocks = /beginbfchar([^]*?)endbfchar/g;
  for (let block = blocks.exec(cmap); block !== null; block = blocks.exec(cmap)) {
    const pair = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    const body = block[1] ?? '';
    for (let p = pair.exec(body); p !== null; p = pair.exec(body)) {
      if (p[1] === undefined || p[2] === undefined) continue;
      // #389 (CWE-248): guarda de faixa — um codepoint > 0x10FFFF faria String.fromCodePoint lançar
      // RangeError não capturado, vazando pela borda do port. Fail-closed: ignora o mapeamento inválido
      // (o `?? ''` do decodeHex trata o código sem entrada como vazio, coerente com o resto do arquivo).
      const cp = Number.parseInt(p[2], 16);
      if (cp > 0x10ffff) continue;
      map.set(Number.parseInt(p[1], 16), String.fromCodePoint(cp));
    }
  }
  return map;
};

// #388 2c: mescla os CMaps /ToUnicode de TODAS as fontes num único mapa código→char. Um PDF pode ter
// várias fontes Type0, cada uma com seu CMap; usar só o 1º decodificava apenas a 1ª fonte. Fontes de
// subset distintas usam faixas de código (GID) disjuntas — medido 0 colisões no DANFCOM real.
// COLISÃO (mesmo código → chars diferentes em fontes distintas): fail-closed — o código ambíguo é
// DROPADO (vira char faltante via o `?? ''` do decodeHex), nunca "adivinha" o char de uma das fontes.
// Char faltante degrada para revisão manual; char ERRADO seria alucinação de valor fiscal (invariante #62).
const mergeToUnicode = (cmaps: readonly string[]): ReadonlyMap<number, string> => {
  const merged = new Map<number, string>();
  const ambiguous = new Set<number>();
  for (const cmap of cmaps)
    for (const [code, ch] of parseToUnicode(cmap)) {
      const prev = merged.get(code);
      if (prev === undefined) merged.set(code, ch);
      else if (prev !== ch) ambiguous.add(code);
    }
  for (const code of ambiguous) merged.delete(code);
  return merged;
};

// Tokenizer char-a-char O(n) — SEM regex de backtracking (anti-ReDoS, F1). Coleta operandos de string
// (`(...)` literal balanceado ou `<...>` hex, cada um ≤ MAX_OPERAND) em `pending` e os aplica no operador
// de mostrar texto: `Tj` (1 operando) e **`TJ`** (array `[ ... ]`, N operandos + kerning numérico ignorado).
// Reconstrução de linha (#386): operadores de posição (`Td`/`TD`/`T*`/`Tm`) e `BT`/`ET` fecham a linha
// corrente; runs de texto entre eles são CONCATENADOS na mesma linha (desfaz a fragmentação 1-linha-por-Tj).
interface Operand {
  readonly kind: 'lit' | 'hex';
  readonly value: string;
}
const extractText = (content: string, toUnicode: ReadonlyMap<number, string> | null): string => {
  const lines: string[] = [];
  let line = '';
  const pending: Operand[] = [];
  const n = content.length;

  const decode = (op: Operand): string =>
    op.kind === 'lit'
      ? decodeLiteral(op.value)
      : toUnicode !== null
        ? decodeHex(op.value, toUnicode)
        : '';
  const show = (): void => {
    for (const op of pending) line += decode(op);
    pending.length = 0;
  };
  const flushLine = (): void => {
    pending.length = 0;
    if (line !== '') {
      lines.push(line);
      line = '';
    }
  };

  let i = 0;
  let lastNum = 0; // #388 2b: último operando numérico visto (o ty do próximo Td/TD)
  while (i < n) {
    const ch = content[i];
    if (ch === '(') {
      let j = i + 1;
      let depth = 1;
      let buf = '';
      while (j < n && depth > 0 && buf.length < MAX_OPERAND) {
        const c = content[j];
        if (c === undefined) break;
        if (c === '\\') {
          buf += content.slice(j, j + 2);
          j += 2;
          continue;
        }
        if (c === '(') depth += 1;
        else if (c === ')') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
        }
        buf += c;
        j += 1;
      }
      if (pending.length < MAX_PENDING_OPERANDS) pending.push({ kind: 'lit', value: buf });
      i = j;
    } else if (ch === '<' && content[i + 1] !== '<') {
      let j = i + 1;
      let buf = '';
      for (
        let c = content[j];
        j < n && c !== undefined && c !== '>' && buf.length < MAX_OPERAND;
        c = content[j]
      ) {
        buf += c;
        j += 1;
      }
      if (pending.length < MAX_PENDING_OPERANDS) pending.push({ kind: 'hex', value: buf });
      i = j + 1;
    } else if (ch === 'T' && (content[i + 1] === 'j' || content[i + 1] === 'J')) {
      show(); // Tj (1 operando) | TJ (N operandos do array [...])
      i += 2;
    } else if (ch === 'T' && (content[i + 1] === 'd' || content[i + 1] === 'D')) {
      // #388 2b: Td/TD movem o cursor por (tx, ty) = (n1, n2). ty≈0 → mesmo baseline (avanço
      // horizontal): separa palavras com um espaço mas NÃO fecha a linha — preserva token hifenizado
      // e mantém rótulo+valor na mesma linha (os regexes de campo usam `[^:\n]`). ty≠0 → nova linha.
      if (Math.abs(lastNum) < 0.01) {
        if (line !== '') line += ' ';
      } else {
        flushLine();
      }
      i += 2;
    } else if (ch === 'T' && (content[i + 1] === '*' || content[i + 1] === 'm')) {
      flushLine(); // T* (próxima linha) | Tm (reset da matriz de texto) → fronteira de linha
      i += 2;
    } else if ((ch === 'B' || ch === 'E') && content[i + 1] === 'T') {
      flushLine(); // BT/ET → fronteira de bloco de texto
      i += 2;
    } else if (
      ch === '-' ||
      ch === '+' ||
      ch === '.' ||
      (ch !== undefined && ch >= '0' && ch <= '9')
    ) {
      // #388 2b: coleta operando numérico (fora de string) p/ tx/ty do próximo Td. Mantém só os 2
      // últimos (n1=penúltimo, n2=último); operandos de outros operadores são empurrados para fora.
      let j = i;
      let buf = '';
      while (j < n) {
        const c = content[j];
        if (c === undefined || !(c === '-' || c === '+' || c === '.' || (c >= '0' && c <= '9')))
          break;
        buf += c;
        j += 1;
      }
      const v = Number.parseFloat(buf);
      if (!Number.isNaN(v)) lastNum = v;
      i = j > i ? j : i + 1;
    } else {
      i += 1;
    }
  }
  flushLine();
  return lines.join('\n');
};

// --- Estruturação por tipo ----------------------------------------------------

const parseBrCents = (raw: string): number | undefined => {
  const m = /^(\d+)(?:,(\d{1,2}))?$/.exec(raw.trim().replace(/\./g, '')); // remove milhar '.'
  if (m?.[1] === undefined) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
};

const group1 = (text: string, re: RegExp): string | undefined => re.exec(text)?.[1];

// #566: normaliza o CNPJ/CPF lido para o comprimento canônico (CNPJ 14, CPF 11).
// Menos que 11 → inválido (undefined). Slice protege contra dígitos vizinhos capturados junto.
//
// ADR-0044: CNPJ pode conter letras (12 alfanuméricos + 2 DVs numéricos), então a captura do bloco
// emitente aceita `[0-9A-Za-z]` — e com isso o `raw` passa a atravessar o texto VIZINHO quando o
// identificador não é um CNPJ (a captura não sabe onde ele termina). Os dois ramos abaixo tratam
// esse `raw` largo de formas diferentes, e é essa assimetria que importa:
//
//   - ramo CNPJ: testa os 14 primeiros caracteres significativos contra o checksum do kernel. O
//     comprimento canônico é o que delimita o identificador; o resto da captura é descartado.
//   - ramo legado (CPF / CNPJ com checksum inválido): recorta o `raw` à corrida inicial de dígitos e
//     máscara, ATÉ a primeira letra. Sem esse recorte, um CPF seguido de `IM 0012345` produziria
//     `52998224725001` — 14 caracteres de comprimento plausível, montados com dígitos da inscrição
//     municipal, que seguiriam silenciosos até o `resolveSupplierByCnpj` e o autofill do front.
//     Foi exatamente a regressão que reprovou a tentativa anterior; ver
//     `tests/reports/W2-2026-08-04-cnpj-alfanumerico-REPROVADO.md`. Alargar a captura exige
//     estreitar o consumidor.
const normalizeTaxId = (raw: string | undefined): string | undefined => {
  if (raw === undefined) return undefined;
  const cnpj = raw
    .replace(/[.\-/\s]/g, '')
    .toUpperCase()
    .slice(0, 14);
  if (Cnpj.isValidCnpj(cnpj)) return cnpj;
  const digits = (/^[\d.\-/\s]*/.exec(raw)?.[0] ?? '').replace(/\D/g, '');
  if (digits.length >= 14) return digits.slice(0, 14);
  if (digits.length >= 11) return digits.slice(0, 11);
  return undefined;
};

// Primeiro identificador NORMALIZÁVEL entre todas as ocorrências do rótulo.
//
// Enquanto a captura exigia `\d` logo após o rótulo, uma ocorrência de campo preenchido com texto
// (`CNPJ / CPF / NIF NAO INFORMADO`) simplesmente não casava, e o motor seguia sozinho para a
// ocorrência seguinte. Com a classe alargada do ADR-0044 ela passa a casar — e a captura gulosa
// atravessa a quebra de linha e COME o rótulo seguinte, escondendo-o. O campo preenchido com lixo
// passaria a apagar o identificador válido que vem depois.
//
// Por isso a varredura é sobre as posições do RÓTULO, não sobre os matches do identificador: o
// `lastIndex` avança só até o fim do rótulo, então a ocorrência seguinte chega intacta. Estreitar a
// classe de volta resolveria o sintoma e desfaria o ADR-0044; a gula precisa ser contida pelo laço.
const TAX_ID_AT_START = /^([0-9A-Za-z][0-9A-Za-z.\-/\s]{9,24})/;

const firstTaxId = (text: string): string | undefined => {
  const label = /CNPJ\s*\/\s*CPF\s*\/\s*NIF\s*/gi;
  for (let m = label.exec(text); m !== null; m = label.exec(text)) {
    const id = normalizeTaxId(group1(text.slice(m.index + m[0].length), TAX_ID_AT_START));
    if (id !== undefined) return id;
  }
  return undefined;
};

const detectType = (text: string): DocumentType | undefined => {
  if (/NFS-e|NOTA FISCAL DE SERVI/i.test(text)) return 'NFS-e';
  if (/RECIBO DE PAGAMENTO A AUT|\bRPA\b/i.test(text)) return 'RPA';
  if (/BOLETO/i.test(text)) return 'Boleto';
  // #386: NF-e/NFC-e/NFCom (DANFE/DANFCOM) — documento auxiliar da nota fiscal eletrônica.
  if (/DANFE|DANFCOM|DOCUMENTO AUXILIAR DA NOTA FISCAL|NOTA FISCAL ELETR|\bNFC?-?e\b/i.test(text))
    return 'DANFE';
  return undefined;
};

const parseCompetence = (text: string): Competencia.Competencia | undefined => {
  const m = /Compet[eê]ncia:\s*(\d{2})\/(\d{4})/i.exec(text);
  if (m?.[1] === undefined || m[2] === undefined) return undefined;
  const c = Competencia.fromString(`${m[2]}-${m[1]}`);
  return c.ok ? c.value : undefined;
};

const parseRetentions = (text: string, baseCents: number): readonly Retention.Retention[] => {
  const out: Retention.Retention[] = [];
  const re = /(ISS|INSS|IRRF)\s*\((\d+,\d+)%\)[^:\n]*:\s*R\$\s*([\d.,]+)/gi;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    const type = m[1]?.toUpperCase();
    const rateBps = m[2] !== undefined ? parseBrCents(m[2]) : undefined;
    const valueCents = m[3] !== undefined ? parseBrCents(m[3]) : undefined;
    if (type === undefined || rateBps === undefined || valueCents === undefined) continue;
    const r = Retention.create({ type, baseCents, rateBps, valueCents });
    if (r.ok) out.push(r.value);
  }
  return out;
};

// #396: exportado + `resolvedVia` parametrizado para o fallback `unpdf` reusar a MESMA extração de
// campos (regex) sobre o texto linearizado que o unpdf produz. O decode muda (in-house vs lib); a
// estruturação (detectType + campos) é única.
export const structureText = (
  text: string,
  resolvedVia: DocumentReaderResult['resolvedVia'],
): Result<DocumentReaderResult, DocumentReaderError> => {
  // #386: classifica sobre texto com whitespace normalizado — PDFs reais fragmentam por posição
  // (palavra-por-`Td`), então a reconstrução de linha não garante âncoras contíguas. Colapsar
  // espaços/quebras torna `detectType` robusto à fragmentação sem depender de layout perfeito.
  // #388 2b: cola o token quando um hífen fica seguido de espaço espúrio — a fragmentação `NFS-`|`e`
  // (Td entre eles) vira "NFS- e" após o colapso, e `detectType /NFS-e/` não casaria.
  const normalized = text.replace(/\s+/g, ' ').replace(/-\s+/g, '-');
  const type = detectType(normalized);
  if (type === undefined) return err('malformed-document');

  const documentNumber = group1(text, /N[uú]mero[^:\n]*:\s*(\S+)/i);
  // Isola o bloco do EMITENTE (prestador) — do rótulo "EMITENTE ..." até "TOMADOR ..." — para NUNCA pegar
  // o CNPJ/nome do TOMADOR (o DANFSe traz os dois). Sem os marcadores, cai no texto inteiro (layout genérico).
  const emitStart = text.search(/EMITENTE\s+DA\s+NFS-?e|EMITENTE\s+DA\s+NOTA|EMITENTE\b/i);
  const emitTail = emitStart === -1 ? text : text.slice(emitStart);
  const tomadorAt = emitTail.search(/TOMADOR\s+D[OA]\s+SERVI[ÇC]O|TOMADOR\b/i);
  const emitBlock = tomadorAt === -1 ? emitTail : emitTail.slice(0, tomadorAt);

  // #396 F2 (CWE-20): terminador `[^:\n]+` (não `.+`) — o unpdf colapsa `\n` em espaço, então `.+`
  // engoliria o documento inteiro após "Prestador:", contaminando o legalName e estourando `description`.
  const legalName =
    group1(text, /Prestador:\s*([^:\n]+)/i)?.trim() ??
    // DANFSe: "Nome / Nome Empresarial <IM numérico opcional> <nome> E-mail". Remove o IM à esquerda.
    group1(emitBlock, /Nome\s*\/\s*Nome Empresarial\s+(.+?)\s+E-?mail/i)
      ?.replace(/^[\d.\-/]+\s+/, '')
      .trim();
  // #566: identificador COMPLETO no comprimento canônico — 14 posições p/ CNPJ, 11 p/ CPF. O `\s` no
  // run tolera a quebra de linha da camada de texto do unpdf (o "-90" pode cair na linha seguinte);
  // `normalizeTaxId` corta no comprimento canônico. Menos que CPF → undefined (não seta supplier —
  // evita o truncado silencioso, #566).
  //
  // ⚠️ Os dois primeiros braços ainda capturam classe NUMÉRICA, e por serem `??` eles VENCEM o braço
  // 3. Um layout com rótulo `CNPJ:` e identificador alfanumérico (ADR-0044) para na 1ª letra e cai no
  // ramo legado — `CNPJ: 12.345.678/000A-08` devolve `12345678000`, 11 caracteres que o consumidor
  // não distingue de um CPF. É defeito PRÉ-EXISTENTE (idêntico em HEAD), fora do escopo desta
  // mudança — registrado em #627, com os 4 CAs; ver também a allowlist de
  // `tests/cleanup/cnpj-alphanumeric-language.test.ts`.
  const taxId =
    normalizeTaxId(group1(text, /CNPJ:\s*([\d.\-/\s]{11,25})/i)) ??
    normalizeTaxId(group1(text, /CPF:\s*([\d.\-/\s]{11,20})/i)) ??
    // ADR-0044: a 1ª posição do CNPJ é alfanumérica — exigir `\d` aqui é a mesma família de bug que
    // "14 dígitos". Quem delimita o identificador é `normalizeTaxId`, não a classe de caracteres.
    firstTaxId(emitBlock);
  // Basta o CNPJ para resolver o fornecedor (#FIN-OCR-AUTOFILL-SUPPLIER); legalName é auxiliar.
  const supplier: SupplierIdentity | undefined =
    taxId !== undefined ? { legalName: legalName ?? '', taxId } : undefined;
  const competence = parseCompetence(text);

  const grossRaw =
    group1(text, /Valor Total[^:\n]*:\s*R\$\s*([\d.,]+)/i) ??
    group1(text, /Valor Bruto:\s*R\$\s*([\d.,]+)/i) ??
    group1(text, /Valor do Documento:\s*R\$\s*([\d.,]+)/i) ??
    // #396: rótulos inequívocos de valor total em layouts reais (via texto linearizado do unpdf).
    // Conservador por design (rótulo específico) — a acurácia contra gabarito da P.O. valida o #62.
    group1(text, /VALOR TOTAL DO SERVI[ÇC]O\s*=\s*R\$\s*([\d.,]+)/i) ??
    group1(text, /Valor a Pagar\s*R\$\s*([\d.,]+)/i);
  const grossCents = grossRaw !== undefined ? parseBrCents(grossRaw) : undefined;
  let grossValue: Money.Money | undefined = undefined;
  if (grossCents !== undefined) {
    const m = Money.fromCents(grossCents);
    if (!m.ok) return err('malformed-document');
    grossValue = m.value;
  }

  const retentions = grossCents !== undefined ? parseRetentions(text, grossCents) : [];

  // #566: "Descrição do Serviço <texto> TRIBUTAÇÃO MUNICIPAL" (DANFSe) → campo `description` do
  // rascunho. Colapsa espaços e limita a varchar(500). NÃO carrega o fornecedor (resolve em supplierRef).
  const descRaw = group1(
    text,
    /Descri[çc][ãa]o\s+do\s+Servi[çc]o\s+(.+?)\s+TRIBUTA[ÇC][ÃA]O\s+MUNICIPAL/is,
  );
  const description =
    descRaw !== undefined ? descRaw.replace(/\s+/g, ' ').trim().slice(0, 500) : undefined;

  return ok({
    resolvedVia,
    type,
    ...(documentNumber !== undefined ? { documentNumber } : {}),
    ...(competence !== undefined ? { competence } : {}),
    ...(supplier !== undefined ? { supplier } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(grossValue !== undefined ? { grossValue } : {}),
    ...(retentions.length > 0 ? { retentions } : {}),
  });
};

// --- Port ---------------------------------------------------------------------

const readNative = (bytes: Uint8Array): Result<DocumentReaderResult, DocumentReaderError> => {
  if (bytes.length > MAX_BYTES) return err('source-too-large');
  const structural = detectStructure(bytes);
  if (!structural.ok) return err(structural.error);

  const inflated: string[] = [];
  let totalInflated = 0;
  for (const s of extractStreams(bytes).filter(isFlate)) {
    const r = inflateGuarded(s.data);
    if (!r.ok) return err(r.error);
    totalInflated += r.value.length;
    if (totalInflated > MAX_TOTAL_INFLATE) return err('decompression-limit-exceeded');
    inflated.push(latin1(r.value));
  }

  const cmapStreams = inflated.filter((t) => t.includes('beginbfchar'));
  const toUnicode = cmapStreams.length > 0 ? mergeToUnicode(cmapStreams) : null;
  const text = inflated
    .filter((t) => !t.includes('beginbfchar'))
    .map((c) => extractText(c, toUnicode))
    .join('\n')
    .trim();

  if (text === '') return err('scanned-unsupported');
  return structureText(text, 'native-text');
};

export const createNativePdfDocumentReader = (): DocumentReaderPort => ({
  read: async (input: DocumentReaderInput) => {
    if (input.bytes.length === 0) return err('empty-input');
    return readNative(input.bytes);
  },
});
