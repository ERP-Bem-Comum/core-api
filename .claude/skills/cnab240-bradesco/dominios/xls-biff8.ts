/**
 * Leitor BIFF8 (.xls) mínimo — container OLE2/CFB + records de célula.
 *
 * Existe porque a Tabela de Domínio do SPB é publicada em .xls de 2005 (BIFF8,
 * não OOXML), e o alternativo seria puxar SheetJS: pacote que saiu do npm, cuja
 * versão remanescente no registry é antiga. Um parser local de ~250 linhas custa
 * menos ao repositório do que uma dependência de build que ninguém audita.
 *
 * Escopo deliberadamente estreito: só o necessário para uma planilha de texto.
 * Não lê fórmula, gráfico, macro nem formatação condicional.
 *
 * Runtime: bun (harness local, nunca `src/`).
 */

// ─────────────────────────────── OLE2 / CFB ───────────────────────────────

const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;
/** Abaixo deste tamanho o stream vive no mini-FAT, não no FAT principal. */
const MINI_STREAM_CUTOFF = 4096;

/** Extrai os streams nomeados do container OLE2. */
export function readCfbStreams(buf: Buffer): Map<string, Buffer> {
  if (buf.readBigUInt64LE(0) !== 0xe11ab1a1e011cfd0n) {
    throw new Error('arquivo não é um container OLE2/CFB');
  }

  const sectorSize = 1 << buf.readUInt16LE(30);
  const miniSectorSize = 1 << buf.readUInt16LE(32);
  const fatSectorCount = buf.readUInt32LE(44);
  const dirStart = buf.readUInt32LE(48);
  const miniFatStart = buf.readUInt32LE(60);
  const difatStart = buf.readUInt32LE(68);
  const difatSectorCount = buf.readUInt32LE(72);

  // O setor 0 começa logo após o header de 512 bytes — daí o (s + 1).
  const at = (sector: number) => (sector + 1) * sectorSize;

  // DIFAT: 109 entradas cabem no header; o resto encadeia em setores próprios.
  const difat: number[] = [];
  for (let i = 0; i < 109; i++) {
    const v = buf.readUInt32LE(76 + i * 4);
    if (v === END_OF_CHAIN || v === FREE_SECTOR) break;
    difat.push(v);
  }
  let next = difatStart;
  for (let n = 0; n < difatSectorCount && next !== END_OF_CHAIN && next !== FREE_SECTOR; n++) {
    const base = at(next);
    const perSector = sectorSize / 4 - 1; // a última entrada é o ponteiro seguinte
    for (let i = 0; i < perSector; i++) {
      const v = buf.readUInt32LE(base + i * 4);
      if (v !== END_OF_CHAIN && v !== FREE_SECTOR) difat.push(v);
    }
    next = buf.readUInt32LE(base + perSector * 4);
  }

  const fat: number[] = [];
  for (const sector of difat.slice(0, fatSectorCount || difat.length)) {
    const base = at(sector);
    for (let i = 0; i < sectorSize / 4; i++) fat.push(buf.readUInt32LE(base + i * 4));
  }

  const follow = (start: number, table: number[]): number[] => {
    const out: number[] = [];
    const seen = new Set<number>();
    let s = start;
    while (s !== END_OF_CHAIN && s !== FREE_SECTOR && s < table.length && !seen.has(s)) {
      seen.add(s);
      out.push(s);
      s = table[s]!;
    }
    return out;
  };

  const readFat = (start: number, size: number): Buffer =>
    Buffer.concat(follow(start, fat).map((s) => buf.subarray(at(s), at(s) + sectorSize))).subarray(
      0,
      size,
    );

  const miniFat: number[] = [];
  for (const s of follow(miniFatStart, fat)) {
    const base = at(s);
    for (let i = 0; i < sectorSize / 4; i++) miniFat.push(buf.readUInt32LE(base + i * 4));
  }

  // Diretório: entradas de 128 bytes; nome em UTF-16 com o terminador contado.
  const dirSectors = follow(dirStart, fat);
  const dir = readFat(dirStart, dirSectors.length * sectorSize);
  type Entry = { name: string; type: number; start: number; size: number };
  const entries: Entry[] = [];
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const nameLen = dir.readUInt16LE(off + 64);
    if (nameLen === 0) continue;
    entries.push({
      name: dir.subarray(off, off + Math.max(0, nameLen - 2)).toString('utf16le'),
      type: dir.readUInt8(off + 66), // 2 = stream, 5 = root
      start: dir.readUInt32LE(off + 116),
      size: Number(dir.readBigUInt64LE(off + 120)),
    });
  }

  const root = entries.find((e) => e.type === 5);
  const miniStream = root ? readFat(root.start, root.size) : Buffer.alloc(0);
  const readMini = (start: number, size: number): Buffer =>
    Buffer.concat(
      follow(start, miniFat).map((s) =>
        miniStream.subarray(s * miniSectorSize, (s + 1) * miniSectorSize),
      ),
    ).subarray(0, size);

  const streams = new Map<string, Buffer>();
  for (const e of entries) {
    if (e.type !== 2) continue;
    streams.set(e.name, e.size < MINI_STREAM_CUTOFF ? readMini(e.start, e.size) : readFat(e.start, e.size));
  }
  return streams;
}

// ──────────────────────────────── BIFF8 ────────────────────────────────

const REC = {
  EOF: 0x000a,
  BOUNDSHEET: 0x0085,
  MULRK: 0x00bd,
  SST: 0x00fc,
  LABELSST: 0x00fd,
  CONTINUE: 0x003c,
  NUMBER: 0x0203,
  LABEL: 0x0204,
  RK: 0x027e,
  XF: 0x00e0,
  FORMAT: 0x041e,
} as const;

type BiffRecord = { id: number; data: Buffer };

function splitRecords(stream: Buffer): BiffRecord[] {
  const out: BiffRecord[] = [];
  let p = 0;
  while (p + 4 <= stream.length) {
    const id = stream.readUInt16LE(p);
    const len = stream.readUInt16LE(p + 2);
    if (p + 4 + len > stream.length) break;
    out.push({ id, data: stream.subarray(p + 4, p + 4 + len) });
    p += 4 + len;
  }
  return out;
}

/** XLUnicodeString curta (contador de 1 byte) — usada em BOUNDSHEET e FORMAT. */
function shortString(buf: Buffer, offset: number, cch: number): string {
  const flags = buf.readUInt8(offset);
  const start = offset + 1;
  return (flags & 0x01) !== 0
    ? buf.subarray(start, start + cch * 2).toString('utf16le')
    : buf.subarray(start, start + cch).toString('latin1');
}

/**
 * Leitor da Shared String Table, que atravessa records CONTINUE.
 *
 * A armadilha que custa a tabela inteira: quando os caracteres de uma string
 * cruzam para o CONTINUE seguinte, o **byte de flags se repete** no início do
 * novo record — e o encoding pode inverter (compressed ↔ UTF-16) no meio da
 * mesma string. Um leitor que avança de chunk sozinho, sem reler esse byte,
 * desloca toda a SST a partir da primeira fronteira: as células continuam
 * apontando para índices válidos, e o conteúdo sai silenciosamente errado.
 */
class SharedStringReader {
  private chunkIndex = 0;
  private offset = 0;
  private chunks: Buffer[];

  constructor(chunks: Buffer[]) {
    this.chunks = chunks;
  }

  private exhausted(): boolean {
    return this.offset >= (this.chunks[this.chunkIndex]?.length ?? 0);
  }

  private advance(): boolean {
    if (this.chunkIndex + 1 >= this.chunks.length) {
      this.chunkIndex = this.chunks.length;
      return false;
    }
    this.chunkIndex++;
    this.offset = 0;
    return true;
  }

  get done(): boolean {
    return this.chunkIndex >= this.chunks.length || (this.exhausted() && this.chunkIndex + 1 >= this.chunks.length);
  }

  /** Bytes de campo numérico: atravessam a fronteira SEM reler flags. */
  private take(n: number): Buffer {
    const parts: Buffer[] = [];
    let left = n;
    while (left > 0) {
      if (this.exhausted() && !this.advance()) break;
      const chunk = this.chunks[this.chunkIndex]!;
      const size = Math.min(left, chunk.length - this.offset);
      parts.push(chunk.subarray(this.offset, this.offset + size));
      this.offset += size;
      left -= size;
    }
    const joined = Buffer.concat(parts);
    return joined.length === n ? joined : Buffer.concat([joined, Buffer.alloc(n - joined.length)]);
  }

  private u8(): number {
    return this.take(1).readUInt8(0);
  }
  private u16(): number {
    return this.take(2).readUInt16LE(0);
  }
  private u32(): number {
    return this.take(4).readUInt32LE(0);
  }

  /** XLUnicodeRichExtendedString. */
  next(): string {
    if (this.exhausted()) this.advance(); // fronteira entre strings: sem flag extra
    const cch = this.u16();
    let flags = this.u8();
    let wide = (flags & 0x01) !== 0;
    const runCount = (flags & 0x08) !== 0 ? this.u16() : 0;
    const extSize = (flags & 0x04) !== 0 ? this.u32() : 0;

    const parts: string[] = [];
    let left = cch;
    while (left > 0) {
      if (this.exhausted()) {
        if (!this.advance()) break;
        flags = this.u8(); // o byte de flags se repete no CONTINUE
        wide = (flags & 0x01) !== 0;
      }
      const chunk = this.chunks[this.chunkIndex]!;
      const bytesPerChar = wide ? 2 : 1;
      const available = chunk.length - this.offset;
      const count = Math.min(left, Math.floor(available / bytesPerChar));
      if (count === 0) {
        this.offset = chunk.length; // byte órfão no fim do chunk
        continue;
      }
      const slice = chunk.subarray(this.offset, this.offset + count * bytesPerChar);
      // "compressed" no BIFF8 é o byte baixo do UTF-16 — latin1, não cp1252.
      parts.push(wide ? slice.toString('utf16le') : slice.toString('latin1'));
      this.offset += count * bytesPerChar;
      left -= count;
    }
    this.take(runCount * 4 + extSize);
    return parts.join('');
  }
}

/** Formatos de data embutidos no BIFF (os que não têm FORMAT record próprio). */
const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55,
  56, 57, 58,
]);

function decodeRk(rk: number): number {
  const dividedBy100 = (rk & 0x01) !== 0;
  const isInteger = (rk & 0x02) !== 0;
  let value: number;
  if (isInteger) {
    value = (rk | 0) >> 2;
  } else {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(0, 0);
    b.writeUInt32LE(rk & 0xfffffffc, 4);
    value = b.readDoubleLE(0);
  }
  return dividedBy100 ? value / 100 : value;
}

/** Serial do Excel → ISO. O +1 abaixo de 61 compensa o 29/02/1900 inexistente. */
function serialToIsoDate(serial: number): string {
  const adjusted = serial < 61 ? serial + 1 : serial;
  return new Date(Math.round((adjusted - 25569) * 86400000)).toISOString().slice(0, 10);
}

export type CellValue = string | number | null;
export type ParsedSheet = { name: string; rows: CellValue[][] };

export function parseWorkbook(workbook: Buffer): ParsedSheet[] {
  const records = splitRecords(workbook);

  const boundSheets: { position: number; name: string }[] = [];
  const formats = new Map<number, string>();
  const xfFormatIndex: number[] = [];
  let sharedStrings: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    switch (r.id) {
      case REC.BOUNDSHEET:
        boundSheets.push({
          position: r.data.readUInt32LE(0),
          name: shortString(r.data, 7, r.data.readUInt8(6)),
        });
        break;
      case REC.FORMAT:
        formats.set(r.data.readUInt16LE(0), shortString(r.data, 4, r.data.readUInt16LE(2)));
        break;
      case REC.XF:
        xfFormatIndex.push(r.data.readUInt16LE(2));
        break;
      case REC.SST: {
        const chunks = [r.data.subarray(8)];
        let j = i + 1;
        while (j < records.length && records[j]!.id === REC.CONTINUE) chunks.push(records[j++]!.data);
        const unique = r.data.readUInt32LE(4);
        const reader = new SharedStringReader(chunks);
        sharedStrings = [];
        for (let k = 0; k < unique && !reader.done; k++) sharedStrings.push(reader.next());
        break;
      }
      default:
        break;
    }
  }

  const isDateCell = (xfIndex: number): boolean => {
    const formatIndex = xfFormatIndex[xfIndex];
    if (formatIndex === undefined) return false;
    if (BUILTIN_DATE_FORMATS.has(formatIndex)) return true;
    const pattern = formats.get(formatIndex);
    if (pattern === undefined) return false;
    const withoutLiterals = pattern.replace(/\[[^\]]*\]/g, '');
    return /[dmy]/i.test(withoutLiterals) && /[/\-.]/.test(withoutLiterals);
  };

  return boundSheets.map((sheet) => {
    const rows: CellValue[][] = [];
    const put = (row: number, col: number, value: CellValue) => {
      (rows[row] ??= [])[col] = value;
    };

    for (const r of splitRecords(workbook.subarray(sheet.position))) {
      if (r.id === REC.EOF) break;
      const row = r.data.length >= 4 ? r.data.readUInt16LE(0) : 0;
      const col = r.data.length >= 4 ? r.data.readUInt16LE(2) : 0;
      switch (r.id) {
        case REC.LABELSST:
          put(row, col, sharedStrings[r.data.readUInt32LE(6)] ?? '');
          break;
        case REC.LABEL:
          put(row, col, shortString(r.data, 8, r.data.readUInt16LE(6)));
          break;
        case REC.RK: {
          const n = decodeRk(r.data.readUInt32LE(6));
          put(row, col, isDateCell(r.data.readUInt16LE(4)) ? serialToIsoDate(n) : n);
          break;
        }
        case REC.NUMBER: {
          const n = r.data.readDoubleLE(6);
          put(row, col, isDateCell(r.data.readUInt16LE(4)) ? serialToIsoDate(n) : n);
          break;
        }
        case REC.MULRK: {
          const count = (r.data.length - 6) / 6;
          for (let k = 0; k < count; k++) {
            const n = decodeRk(r.data.readUInt32LE(6 + k * 6));
            put(row, col + k, isDateCell(r.data.readUInt16LE(4 + k * 6)) ? serialToIsoDate(n) : n);
          }
          break;
        }
        default:
          break;
      }
    }
    return { name: sheet.name, rows };
  });
}

/** Atalho: arquivo .xls → planilhas. */
export function readXls(bytes: Buffer): ParsedSheet[] {
  const streams = readCfbStreams(bytes);
  const workbook = streams.get('Workbook') ?? streams.get('Book');
  if (!workbook) {
    throw new Error(`stream Workbook ausente — streams: ${[...streams.keys()].join(', ')}`);
  }
  return parseWorkbook(workbook);
}
