// Fixtures XML SINTÉTICAS para FIN-DOC-READER-XML — dados fiscais FALSOS (CNPJ/valores fake),
// estruturalmente fiéis aos schemas oficiais. NENHUM PII real (LGPD; gabarito real é local-only).
//
// Paths ancorados na pesquisa (fontes oficiais cruzadas, 2026-07-09):
// - NF-e 4.00 (NT 2014.002): nfeProc/NFe/infNFe/{ide/nNF, ide/dhEmi, emit/xNome, emit/CNPJ, total/ICMSTot/vNF}
// - NFS-e Nacional (Res. CGNFS-e 3/2023, ns sped.fazenda.gov.br/nfse):
//     NFSe/infNFSe/{nNFSe, emit/xNome, emit/CNPJ, DPS/infDPS/{dhEmi, dCompet, valores/vServPrest/vServ,
//     valores/trib/tribMun/{pAliq, tpRetISSQN, vISSQN}}}

// Gabarito esperado por fixture — os testes comparam contra estes valores (cents/year-month).
export type Expected = Readonly<{
  resolvedVia: 'xml';
  type: 'NFS-e' | 'DANFE';
  documentNumber: string;
  issueDateIso: string;
  legalName: string;
  taxId: string;
  grossValueCents: number;
  competence?: Readonly<{ year: number; month: number }>;
  retentions?: readonly Readonly<{
    type: string;
    baseCents: number;
    rateBps: number;
    valueCents: number;
  }>[];
}>;

const toUtf8 = (xml: string): Uint8Array => new TextEncoder().encode(xml);

// ---------------------------------------------------------------------------
// CA1 — NFS-e Nacional válida, com ISS retido (tpRetISSQN=2)
// ---------------------------------------------------------------------------
const NFSE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFSe35260498765432000155000000012340">
    <nNFSe>0000000001234</nNFSe>
    <dhProc>2026-04-28T19:35:00-03:00</dhProc>
    <emit>
      <CNPJ>98765432000155</CNPJ>
      <xNome>PRESTADOR SINTETICO LTDA</xNome>
    </emit>
    <valores>
      <vLiq>865.00</vLiq>
      <vISSQN>50.00</vISSQN>
      <pAliqAplic>5.00</pAliqAplic>
    </valores>
    <DPS>
      <infDPS Id="DPS35260498765432000155000001">
        <dhEmi>2026-04-28T19:34:48-03:00</dhEmi>
        <dCompet>2026-04-01</dCompet>
        <prest>
          <CNPJ>98765432000155</CNPJ>
          <xNome>PRESTADOR SINTETICO LTDA</xNome>
        </prest>
        <valores>
          <vServPrest>
            <vServ>1000.00</vServ>
          </vServPrest>
          <trib>
            <tribMun>
              <pAliq>5.00</pAliq>
              <tpRetISSQN>2</tpRetISSQN>
              <vISSQN>50.00</vISSQN>
            </tribMun>
          </trib>
        </valores>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>`;

export const NFSE_NACIONAL = {
  bytes: (): Uint8Array => toUtf8(NFSE_XML),
  expected: {
    resolvedVia: 'xml',
    type: 'NFS-e',
    documentNumber: '0000000001234',
    issueDateIso: '2026-04-28T19:34:48-03:00',
    legalName: 'PRESTADOR SINTETICO LTDA',
    taxId: '98765432000155',
    grossValueCents: 100000, // vServ 1000.00
    competence: { year: 2026, month: 4 }, // dCompet 2026-04-01
    retentions: [{ type: 'ISS', baseCents: 100000, rateBps: 500, valueCents: 5000 }], // pAliq 5% · vServ 1000 · vISSQN 50
  } satisfies Expected,
} as const;

// ---------------------------------------------------------------------------
// CA2 — NF-e 4.00 (mapeia para type='DANFE'), sem retenção
// ---------------------------------------------------------------------------
const NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe versao="4.00" Id="NFe41230612345678000199550010000001231000000123">
      <ide>
        <nNF>123456</nNF>
        <dhEmi>2024-05-18T10:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>EMPRESA SINTETICA LTDA</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>1234.56</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

export const NFE = {
  bytes: (): Uint8Array => toUtf8(NFE_XML),
  expected: {
    resolvedVia: 'xml',
    type: 'DANFE',
    documentNumber: '123456',
    issueDateIso: '2024-05-18T10:30:00-03:00',
    legalName: 'EMPRESA SINTETICA LTDA',
    taxId: '12345678000199',
    grossValueCents: 123456, // vNF 1234.56
  } satisfies Expected,
} as const;

// ---------------------------------------------------------------------------
// CA4 — encoding ISO-8859-1 declarado, com acento no nome (bytes latin1)
// ---------------------------------------------------------------------------
const NFSE_LATIN1_XML = `<?xml version="1.0" encoding="ISO-8859-1"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFSe0001">
    <nNFSe>0000000000042</nNFSe>
    <emit>
      <CNPJ>98765432000155</CNPJ>
      <xNome>PRESTAÇÃO E SERVIÇOS LTDA</xNome>
    </emit>
    <DPS>
      <infDPS Id="DPS0001">
        <dhEmi>2026-04-28T19:34:48-03:00</dhEmi>
        <dCompet>2026-04-01</dCompet>
        <valores><vServPrest><vServ>1000.00</vServ></vServPrest></valores>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>`;

export const NFSE_LATIN1 = {
  // Bytes em latin1 (não UTF-8) — o reader deve honrar o `encoding` declarado no prólogo.
  bytes: (): Uint8Array => new Uint8Array(Buffer.from(NFSE_LATIN1_XML, 'latin1')),
  expectedLegalName: 'PRESTAÇÃO E SERVIÇOS LTDA',
} as const;

// ---------------------------------------------------------------------------
// CA6 — XXE: entidade externa NÃO deve ser resolvida (sem SSRF/leitura de arquivo)
// ---------------------------------------------------------------------------
const XXE_XML = `<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFSe0002">
    <nNFSe>0000000000099</nNFSe>
    <emit>
      <CNPJ>98765432000155</CNPJ>
      <xNome>&xxe;</xNome>
    </emit>
    <DPS><infDPS Id="DPS0002">
      <dhEmi>2026-04-28T19:34:48-03:00</dhEmi>
      <valores><vServPrest><vServ>1000.00</vServ></vServPrest></valores>
    </infDPS></DPS>
  </infNFSe>
</NFSe>`;

export const XXE_ATTACK = {
  bytes: (): Uint8Array => toUtf8(XXE_XML),
  // O legalName resultante NUNCA pode conter conteúdo de arquivo (ex.: 'root:'); a entidade
  // externa deve ficar sem resolução (fast-xml-parser não processa DTD/entidades externas).
  forbiddenSubstring: 'root:',
} as const;

// ---------------------------------------------------------------------------
// CA3 — entradas de erro
// ---------------------------------------------------------------------------
export const EMPTY_INPUT = { bytes: (): Uint8Array => new Uint8Array([]) } as const;

export const MALFORMED_XML = {
  bytes: (): Uint8Array => toUtf8('<NFSe><infNFSe><nNFSe>1</nNFSe>'), // tags não fechadas
} as const;

// XML sintaticamente válido, mas sem nenhum schema fiscal reconhecível → cascata cai p/ nativo.
export const UNKNOWN_XML = {
  bytes: (): Uint8Array => toUtf8('<?xml version="1.0"?><relatorio><item>x</item></relatorio>'),
} as const;

// Billion-laughs (CWE-776): DOCTYPE com entidades aninhadas. Deve ser rejeitado ANTES do parse
// (guarda anti-DOCTYPE) — nunca expandir. Documentos fiscais legítimos não usam DOCTYPE.
const BILLION_LAUGHS_XML = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFSe0003"><nNFSe>&lol3;</nNFSe></infNFSe>
</NFSe>`;

export const BILLION_LAUGHS = {
  bytes: (): Uint8Array => toUtf8(BILLION_LAUGHS_XML),
} as const;
