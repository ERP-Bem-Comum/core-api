/**
 * Port: AliquotaRepositoryPort
 * Responsabilidade: Consulta de alíquotas padrão por município/código serviço.
 */

export type AliquotaRepositoryPort = Readonly<{
  findByMunicipioEServico: (
    municipioIbge: string,
    codigoServico: string,
  ) => Promise<AliquotaConfig | null>;
  findByCnpjPrestador: (cnpj: string) => Promise<AliquotaConfig | null>;
}>;

export type AliquotaConfig = Readonly<{
  iss?: number;
  irrf?: number;
  inss?: number;
  csrf?: number; // PIS + COFINS + CSLL agrupado
  municipioIbge: string;
  codigoServico?: string;
}>;
