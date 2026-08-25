/**
 * Port: OcrPort
 * Responsabilidade: Abstrair o serviço de OCR (extrair dados de PDF).
 *
 * ADR-0019: Storage via S3/MinIO. O OCR recebe URL do PDF, não o arquivo em si.
 */

// Placeholders — tipos reais virão do domain quando o módulo for criado
export type Money = unknown;
export type TipoDocumento = unknown;

export type OcrPort = Readonly<{
  extract: (pdfUrl: string) => Promise<OcrResult>;
}>;

export type OcrResult = Readonly<{
  tipo?: TipoDocumento;
  numero?: string;
  serie?: string;
  fornecedor?: Readonly<{
    razaoSocial: string;
    cnpj: string;
  }>;
  valorBruto?: Money;
  dataEmissao?: Date;
  competencia?: string;
  retencoes?: readonly Readonly<{
    tipo: string;
    aliquota: number;
    valor: Money;
  }>[];
  impostosRegistrados?: readonly Readonly<{
    tipo: string;
    aliquota: number;
    valor: Money;
  }>[];
  confianca: number; // 0-1
}>;
