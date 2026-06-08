# Plano de Implementação — FIN-DOCUMENTO-INGESTAO

> **Referência**: Fowler/Sadalage, _Refactoring_ p. 68 — Parallel Change / Expand-Contract pattern.
>
> Ramakrishnan & Gehrke, _Database Management Systems_ (3ª ed.) — Cap. 19: Schema evolution via migrations.

---

## 1. Fatiamento em Fases

| Fase   | Entrega                                                                       | Dependências | Size Estimado |
| :----- | :---------------------------------------------------------------------------- | :----------- | :------------ |
| **F1** | Schema do banco + Domain model (Documento, Titulo, Retencao)                  | —            | S             |
| **F2** | Ports (OcrPort, StoragePort, RepositoryPorts) + Infra (S3, OCR mock)          | F1           | S             |
| **F3** | Domain Services (CalculadoraLiquido, MotorRetencoes, GeradorTitulos) + testes | F1           | M             |
| **F4** | Tela de Lançar Documento (upload OCR, formulário, preview, auto-save)         | F2, F3       | L             |
| **F5** | Grid de Contas a Pagar (busca, filtros, paginação, ações em lote)             | F1           | M             |
| **F6** | Validações fiscais + modal de divergência                                     | F3, F4       | M             |
| **F7** | Integração com cadastro de fornecedores (busca + cadastro rápido)             | F4           | S             |

---

## 2. Modelo de Dados (MySQL 8.4)

### 2.1. Tabela `fin_documentos`

```sql
CREATE TABLE fin_documentos (
  id              VARCHAR(36) PRIMARY KEY,
  tipo            VARCHAR(16) NOT NULL CHECK (tipo IN ('NFS-e','DANFE','RPA','Fatura','Boleto','Recibo','Imposto')),
  fornecedor_id   VARCHAR(36) NOT NULL,
  contrato_id     VARCHAR(36),
  numero          VARCHAR(50) NOT NULL,
  serie           VARCHAR(10),
  competencia     CHAR(7) NOT NULL, -- MM/AAAA
  data_emissao    DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  descricao       TEXT,
  valor_bruto     DECIMAL(15,2) NOT NULL,
  descontos_fonte DECIMAL(15,2) DEFAULT 0,
  descontos       DECIMAL(15,2) DEFAULT 0,
  multa           DECIMAL(15,2) DEFAULT 0,
  juros           DECIMAL(15,2) DEFAULT 0,
  valor_liquido   DECIMAL(15,2) NOT NULL,
  forma_pagamento VARCHAR(32) NOT NULL CHECK (forma_pagamento IN ('TED','Transferencia_Bancaria','PIX','Boleto','Cartao_Corporativo','Cambio','Guia_Recolhimento','Outro')),
  conta_debito_id VARCHAR(36) NOT NULL,
  pdf_url         VARCHAR(500),
  lido_por_ocr    BOOLEAN DEFAULT FALSE,
  divergencia_detectada BOOLEAN DEFAULT FALSE,
  centro_custo_id VARCHAR(36) NOT NULL,
  categoria_id    VARCHAR(36) NOT NULL,
  subcategoria_id VARCHAR(36),
  programa_id     VARCHAR(36) NOT NULL,
  plano_orc_id    VARCHAR(36) NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_fornecedor (fornecedor_id),
  INDEX idx_vencimento (data_vencimento),
  INDEX idx_status_titulo (status), -- via join com fin_titulos
  INDEX idx_competencia (competencia)
) ENGINE=InnoDB;
```

### 2.2. Tabela `fin_retencoes`

```sql
CREATE TABLE fin_retencoes (
  id            VARCHAR(36) PRIMARY KEY,
  documento_id  VARCHAR(36) NOT NULL,
  tipo          VARCHAR(8) NOT NULL CHECK (tipo IN ('ISS','IRRF','INSS','CSRF')),
  aliquota      DECIMAL(5,2) NOT NULL,
  valor         DECIMAL(15,2) NOT NULL,
  base_calculo  DECIMAL(15,2) NOT NULL,

  FOREIGN KEY (documento_id) REFERENCES fin_documentos(id) ON DELETE CASCADE,
  INDEX idx_doc (documento_id)
) ENGINE=InnoDB;
```

### 2.3. Tabela `fin_impostos_registrados`

```sql
CREATE TABLE fin_impostos_registrados (
  id            VARCHAR(36) PRIMARY KEY,
  documento_id  VARCHAR(36) NOT NULL,
  tipo          VARCHAR(16) NOT NULL CHECK (tipo IN ('ICMS','IPI','PIS','COFINS','CBS','IBS_Municipal','IBS_Estadual')),
  aliquota      DECIMAL(5,2),
  valor         DECIMAL(15,2),
  base_calculo  DECIMAL(15,2),

  FOREIGN KEY (documento_id) REFERENCES fin_documentos(id) ON DELETE CASCADE,
  INDEX idx_doc (documento_id)
) ENGINE=InnoDB;
```

### 2.4. Tabela `fin_titulos`

```sql
CREATE TABLE fin_titulos (
  id                VARCHAR(36) PRIMARY KEY,
  documento_id      VARCHAR(36) NOT NULL,
  tipo              VARCHAR(8) NOT NULL CHECK (tipo IN ('Pai','Filho')),
  tipo_retencao     VARCHAR(8) CHECK (tipo_retencao IN ('ISS','IRRF','INSS','CSRF')),
  status            VARCHAR(16) NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Rascunho','Aberto','Aprovado','Transmitido','Recusado','Pago','Conciliado')),
  valor             DECIMAL(15,2) NOT NULL,
  vencimento        DATE NOT NULL,
  fornecedor_id     VARCHAR(36) NOT NULL,
  forma_pagamento   VARCHAR(32) NOT NULL CHECK (forma_pagamento IN ('TED','Transferencia_Bancaria','PIX','Boleto','Cartao_Corporativo','Cambio','Guia_Recolhimento','Outro')),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (documento_id) REFERENCES fin_documentos(id) ON DELETE CASCADE,
  INDEX idx_documento (documento_id),
  INDEX idx_status (status),
  INDEX idx_vencimento (vencimento)
) ENGINE=InnoDB;
```

### 2.5. Tabela `fin_divergencias`

```sql
CREATE TABLE fin_divergencias (
  id            VARCHAR(36) PRIMARY KEY,
  documento_id  VARCHAR(36) NOT NULL,
  campo         VARCHAR(100) NOT NULL,
  valor_ocr     VARCHAR(255),
  valor_corrigido VARCHAR(255),
  tipo          VARCHAR(16) NOT NULL CHECK (tipo IN ('Aliquota','Valor','Data')),
  decisao       VARCHAR(16) NOT NULL CHECK (decisao IN ('Aceito','Corrigido','Pendente')),
  usuario_id    VARCHAR(36) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (documento_id) REFERENCES fin_documentos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### 2.6. Tabela `fin_trilha_auditoria`

```sql
CREATE TABLE fin_trilha_auditoria (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  documento_id  BIGINT UNSIGNED NOT NULL,
  campo         VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_novo    TEXT,
  usuario_id    BIGINT UNSIGNED NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (documento_id) REFERENCES fin_documentos(id) ON DELETE CASCADE,
  INDEX idx_doc (documento_id)
) ENGINE=InnoDB;
```

---

## 3. API / Port Contracts

### 3.1. OcrPort (Port)

```ts
interface OcrPort {
  extract(pdfUrl: string): Promise<OcrResult>;
}

type OcrResult = {
  tipo?: TipoDocumento;
  numero?: string;
  serie?: string;
  fornecedor?: {
    razaoSocial: string;
    cnpj: string;
  };
  valorBruto?: Money;
  dataEmissao?: Date;
  competencia?: string;
  retencoes?: Array<{
    tipo: string;
    aliquota: number;
    valor: Money;
  }>;
  impostosRegistrados?: Array<{
    tipo: string;
    aliquota: number;
    valor: Money;
  }>;
  confianca: number; // 0-1
};
```

### 3.2. StoragePort (Port)

```ts
interface StoragePort {
  upload(file: Buffer, fileName: string, contentType: string): Promise<string>; // retorna URL
  delete(url: string): Promise<void>;
  getSignedUrl(url: string, expirySeconds: number): Promise<string>;
}
```

### 3.3. DocumentoRepositoryPort (Port)

```ts
interface DocumentoRepositoryPort {
  save(doc: Documento): Promise<DocumentoId>;
  findById(id: DocumentoId): Promise<Documento | null>;
  findByFilters(filters: DocumentoFilters): Promise<PaginatedResult<Documento>>;
  delete(id: DocumentoId): Promise<void>;
}
```

---

## 4. Quickstart (Para Desenvolvedor)

### 4.1. Setup Local

```bash
# 1. Subir MySQL + MinIO
docker compose up -d mysql minio

# 2. Rodar migrations
pnpm run db:migrate

# 3. Seed de alíquotas (SEFIN Fortaleza)
pnpm run db:seed -- --table=aliquotas

# 4. Subir aplicação
pnpm run dev
```

### 4.2. Testar OCR (com adapter mock)

```bash
# Upload de PDF teste
curl -X POST http://localhost:3000/api/documentos/upload \
  -F "file=@tests/fixtures/nfs-e-exemplo.pdf"

# Resposta esperada:
# { "pdfUrl": "s3://minio/fin/documentos/uuid.pdf", "ocr": { "tipo": "NFS-e", ... } }
```

### 4.3. Criar documento via CLI

```bash
pnpm run cli:financeiro -- documento criar \
  --tipo NFS-e \
  --fornecedor 37.364.305/0001-92 \
  --valor-bruto 10000.00 \
  --vencimento 2026-06-10 \
  --forma-pagamento PIX
```

---

## 5. Decisões Técnicas

### 5.1. OCR: Port + Adapter Pattern

O `OcrPort` isola a tecnologia de OCR. Fase 1 usa **adapter mock** (retorna dados fixos para testes). Fase 2 substitui por Tesseract (local) ou AWS Textract (SaaS) sem tocar no domínio.

### 5.2. Auto-save: Event Sourcing Leve

O auto-save persiste apenas o estado atual do formulário (não o histórico completo). A trilha de auditoria (`fin_trilha_auditoria`) captura alterações significativas (campos fiscais, valores), não cada keystroke.

### 5.3. CSRF como título filho único

Em vez de 3 filhos separados (PIS, COFINS, CSLL), agrupamos em 1 filho "CSRF". Isso simplifica o grid e a remessa CNAB. Os valores individuais permanecem no documento para auditoria.

### 5.4. Schema Migration: Expand-Contract

Ao alterar campos fiscais (ex: adicionar nova retenção):

1. **Expand**: Adiciona nova coluna/tabela, código lê ambas.
2. **Migrate**: Backfill dos dados antigos.
3. **Contract**: Remove coluna antiga, código lê apenas a nova.

Isso evita downtime e garante consistência durante deploys.
