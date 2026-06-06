import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Categoria de serviço do fornecedor. ADR-0031 §D2: mantém os códigos legados
// LITERAIS (não traduz) — inclui os typos do legado `ONGANIZACAO_DE_EVENTOS` e
// `TRASPORTE` (database.dbml Enum category_supplier). O rótulo humano PT-BR vive
// no dicionário do formatter da CLI, não aqui.

export type ServiceCategory =
  | 'AGUA'
  | 'ALIMENTACAO'
  | 'AR_CONDICIONADO'
  | 'ASSESSORIA'
  | 'AUDITORIA_EXTERNA'
  | 'BUFFET'
  | 'COMPRAS_E_SUPRIMENTOS'
  | 'CONSULTORIA'
  | 'CONTABEIS'
  | 'DEDETIZACAO'
  | 'ELETRICO'
  | 'EMISSAO_DE_PASSAGEM'
  | 'ENERGIA'
  | 'ENTREGA'
  | 'ESGOTO'
  | 'GRAFICA'
  | 'HIDRAULICO'
  | 'INFORMATICA'
  | 'INTERNET'
  | 'JURIDICO'
  | 'LAVAGEM'
  | 'LIMPEZA'
  | 'LOCATICIOS'
  | 'MANUTENCAO'
  | 'MARCENARIA'
  | 'MATERIAL_DE_CONSUMO'
  | 'MATERIAL_DE_INFORMATICA'
  | 'MATERIAL_DE_LIMPEZA'
  | 'MATERIAL_EXPEDIENTE'
  | 'OBRAS'
  | 'ONGANIZACAO_DE_EVENTOS'
  | 'PINTURA'
  | 'PRODUCAO'
  | 'RESERVA_DE_HOSPEDAGEM'
  | 'SEGURANCA'
  | 'SERVICOS_ADMINISTRATIVOS'
  | 'TRASPORTE'
  | 'VIDRACARIA'
  | 'BANCO';

export type ServiceCategoryError = 'invalid-service-category';

const CATEGORIES: ReadonlySet<string> = new Set<ServiceCategory>([
  'AGUA',
  'ALIMENTACAO',
  'AR_CONDICIONADO',
  'ASSESSORIA',
  'AUDITORIA_EXTERNA',
  'BUFFET',
  'COMPRAS_E_SUPRIMENTOS',
  'CONSULTORIA',
  'CONTABEIS',
  'DEDETIZACAO',
  'ELETRICO',
  'EMISSAO_DE_PASSAGEM',
  'ENERGIA',
  'ENTREGA',
  'ESGOTO',
  'GRAFICA',
  'HIDRAULICO',
  'INFORMATICA',
  'INTERNET',
  'JURIDICO',
  'LAVAGEM',
  'LIMPEZA',
  'LOCATICIOS',
  'MANUTENCAO',
  'MARCENARIA',
  'MATERIAL_DE_CONSUMO',
  'MATERIAL_DE_INFORMATICA',
  'MATERIAL_DE_LIMPEZA',
  'MATERIAL_EXPEDIENTE',
  'OBRAS',
  'ONGANIZACAO_DE_EVENTOS',
  'PINTURA',
  'PRODUCAO',
  'RESERVA_DE_HOSPEDAGEM',
  'SEGURANCA',
  'SERVICOS_ADMINISTRATIVOS',
  'TRASPORTE',
  'VIDRACARIA',
  'BANCO',
]);

export const parse = (raw: string): Result<ServiceCategory, ServiceCategoryError> =>
  CATEGORIES.has(raw) ? ok(raw as ServiceCategory) : err('invalid-service-category');

/** Catálogo canônico (read-only) das categorias legadas, na ordem de definição. */
export const listServiceCategories = (): readonly ServiceCategory[] =>
  [...CATEGORIES] as readonly ServiceCategory[];
