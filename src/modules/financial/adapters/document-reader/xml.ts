import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ok, err } from '../../../../shared/primitives/result.ts';
import type { Result } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as Competencia from '../../domain/document/competencia.ts';
import * as Retention from '../../domain/shared/retention.ts';
import type { DocumentType } from '../../domain/document/types.ts';
import type { DocumentReaderResult, SupplierIdentity } from '../../domain/document-reader/types.ts';
import type { DocumentReaderError } from '../../domain/document-reader/errors.ts';
import type {
  DocumentReaderPort,
  DocumentReaderInput,
} from '../../application/ports/document-reader.ts';

// Reader XML (fatia 3 — FIN-DOC-READER-XML). Topo da cascata (ADR-0050). Parse PATH-AWARE
// (não regex — research.md:64) de NFS-e Nacional e NF-e 4.00 para os VOs canônicos do agregado
// Document.
//
// SEGURANÇA (bytes hostis — ADR-0050): documentos fiscais NF-e/NFS-e usam XSD, NUNCA DTD. Por isso
// rejeitamos QUALQUER `<!DOCTYPE` antes do parse (`read`), o que mata XXE (CWE-611) e billion-laughs
// (CWE-776) na RAIZ — sem depender dos limites internos implícitos da lib (que divergem do próprio
// `.d.ts` e podem mudar em patch sem quebrar semver). `processEntities: true` só decodifica as 5
// entidades XML padrão (`&amp;` etc.); `parseTagValue: false` preserva zeros à esquerda e decimais.
const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  processEntities: true,
});

export const MAX_BYTES = 8 * 1024 * 1024;

type Node = Readonly<Record<string, unknown>>;
const asNode = (v: unknown): Node | undefined =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Node) : undefined;
const asStr = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined;

// '1234.56' → 123456 cents; '1000.00' → 100000; '5.00' → 500 (serve também para pAliq → basis points).
const decimalToCents = (raw: string | undefined): number | undefined => {
  if (raw === undefined) return undefined;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw.trim());
  if (m?.[1] === undefined) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
};

const toDate = (iso: string | undefined): Date | undefined => {
  if (iso === undefined) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const toMoney = (
  cents: number | undefined,
): Result<Money.Money | undefined, 'malformed-document'> => {
  if (cents === undefined) return ok(undefined);
  const m = Money.fromCents(cents);
  return m.ok ? ok(m.value) : err('malformed-document');
};

const buildSupplier = (emit: Node | undefined): SupplierIdentity | undefined => {
  if (emit === undefined) return undefined;
  const legalName = asStr(emit['xNome']);
  const taxId = asStr(emit['CNPJ']) ?? asStr(emit['CPF']);
  if (legalName === undefined || taxId === undefined) return undefined;
  return { legalName, taxId };
};

const buildCompetence = (dCompet: string | undefined): Competencia.Competencia | undefined => {
  if (dCompet === undefined) return undefined;
  const c = Competencia.fromString(dCompet.slice(0, 7)); // 'YYYY-MM-DD' → 'YYYY-MM'
  return c.ok ? c.value : undefined;
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Uint8Array não é readonly nativo no TS 6
const sniffEncoding = (bytes: Uint8Array): string => {
  const head = new TextDecoder('iso-8859-1').decode(bytes.subarray(0, 256));
  const m = /encoding=["']([^"']+)["']/i.exec(head);
  return m?.[1]?.toLowerCase() ?? 'utf-8';
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- Uint8Array não é readonly nativo no TS 6
const decodeBytes = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder(sniffEncoding(bytes)).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
};

const parseRoot = (xml: string): Node | undefined => {
  try {
    return asNode(parser.parse(xml)); // throw em entidade externa (XXE) → tratado como malformed
  } catch {
    return undefined;
  }
};

// NFS-e Nacional: número + prestador em `infNFSe`; emissão/competência/valores em `infNFSe/DPS/infDPS`.
const mapNfse = (infNFSe: Node): Result<DocumentReaderResult, DocumentReaderError> => {
  const infDPS = asNode(asNode(infNFSe['DPS'])?.['infDPS']);
  const emit = asNode(infNFSe['emit']) ?? asNode(infDPS?.['prest']);
  const dpsValores = asNode(infDPS?.['valores']);
  const vServ = asStr(asNode(dpsValores?.['vServPrest'])?.['vServ']);

  const gross = toMoney(decimalToCents(vServ));
  if (!gross.ok) return gross;

  const retentions: Retention.Retention[] = [];
  const tribMun = asNode(asNode(dpsValores?.['trib'])?.['tribMun']);
  const tpRet = asStr(tribMun?.['tpRetISSQN']);
  if (tribMun !== undefined && (tpRet === '2' || tpRet === '3')) {
    const baseCents = decimalToCents(vServ);
    const rateBps = decimalToCents(asStr(tribMun['pAliq']));
    const valueCents = decimalToCents(asStr(tribMun['vISSQN']));
    if (baseCents !== undefined && rateBps !== undefined && valueCents !== undefined) {
      const r = Retention.create({ type: 'ISS', baseCents, rateBps, valueCents });
      if (!r.ok) return err('malformed-document');
      retentions.push(r.value);
    }
  }

  const documentNumber = asStr(infNFSe['nNFSe']);
  const supplier = buildSupplier(emit);
  const competence = buildCompetence(asStr(infDPS?.['dCompet']));
  const issueDate = toDate(asStr(infDPS?.['dhEmi']));

  if (documentNumber === undefined && supplier === undefined && gross.value === undefined) {
    return err('malformed-document');
  }
  return ok({
    resolvedVia: 'xml',
    type: 'NFS-e' satisfies DocumentType,
    ...(documentNumber !== undefined ? { documentNumber } : {}),
    ...(competence !== undefined ? { competence } : {}),
    ...(issueDate !== undefined ? { issueDate } : {}),
    ...(supplier !== undefined ? { supplier } : {}),
    ...(gross.value !== undefined ? { grossValue: gross.value } : {}),
    ...(retentions.length > 0 ? { retentions } : {}),
  });
};

// NF-e 4.00 → type 'DANFE' (a representação impressa da NF-e no catálogo de DocumentType).
const mapNfe = (infNFe: Node): Result<DocumentReaderResult, DocumentReaderError> => {
  const ide = asNode(infNFe['ide']);
  const emit = asNode(infNFe['emit']);
  const vNF = asStr(asNode(asNode(infNFe['total'])?.['ICMSTot'])?.['vNF']);

  const gross = toMoney(decimalToCents(vNF));
  if (!gross.ok) return gross;

  const documentNumber = asStr(ide?.['nNF']);
  const supplier = buildSupplier(emit);
  const issueDate = toDate(asStr(ide?.['dhEmi']));

  if (documentNumber === undefined && supplier === undefined && gross.value === undefined) {
    return err('malformed-document');
  }
  return ok({
    resolvedVia: 'xml',
    type: 'DANFE' satisfies DocumentType,
    ...(documentNumber !== undefined ? { documentNumber } : {}),
    ...(issueDate !== undefined ? { issueDate } : {}),
    ...(supplier !== undefined ? { supplier } : {}),
    ...(gross.value !== undefined ? { grossValue: gross.value } : {}),
  });
};

export const createXmlDocumentReader = (): DocumentReaderPort => ({
  // `bytes: Uint8Array` não tem variant readonly nativo no TS 6 (ver port document-reader.ts).
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  read: async (input: DocumentReaderInput) => {
    if (input.bytes.length === 0) return err('empty-input');
    if (input.bytes.length > MAX_BYTES) return err('source-too-large');

    const xml = decodeBytes(input.bytes);
    // Sem DTD: documentos fiscais não usam DOCTYPE; rejeitar mata XXE + billion-laughs na raiz.
    if (/<!DOCTYPE/i.test(xml)) return err('malformed-document');
    if (XMLValidator.validate(xml) !== true) return err('malformed-document');

    const root = parseRoot(xml);
    if (root === undefined) return err('malformed-document');

    const infNFSe = asNode(asNode(root['NFSe'])?.['infNFSe']);
    if (infNFSe !== undefined) return mapNfse(infNFSe);

    const nfe = asNode(asNode(root['nfeProc'])?.['NFe']) ?? asNode(root['NFe']);
    const infNFe = asNode(nfe?.['infNFe']);
    if (infNFe !== undefined) return mapNfe(infNFe);

    return err('malformed-document'); // XML válido, sem schema fiscal reconhecível → cascata cai p/ nativo
  },
});
