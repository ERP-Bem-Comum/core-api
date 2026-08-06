# Data Model — FIN-DOCUMENTO-INGESTAO

> Modelo físico MySQL 8.4 (ADR-0020). Prefixo `fin_` (ADR-0014).

---

## 1. Tabela `fin_documentos`

Fato gerador. Dono dos dados fiscais e financeiros que originam os títulos.

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
  INDEX idx_competencia (competencia)
) ENGINE=InnoDB;
```

---

## 2. Tabela `fin_retencoes`

Retenções que abatem do valor bruto e geram títulos filhos (NFS-e, RPA).

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

---

## 3. Tabela `fin_impostos_registrados`

Impostos fiscais registrados apenas para leitura/auditoria (não geram títulos filhos).

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

---

## 4. Tabela `fin_titulos`

Ciclo de vida financeiro. Cada documento gera 1 título pai + N filhos (quando aplicável).

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

---

## 5. Tabela `fin_divergencias`

Registro de divergências detectadas entre OCR e alíquotas padrão.

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

---

## 6. Tabela `fin_trilha_auditoria`

Alterações significativas em campos do documento (não cada keystroke do auto-save).

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

## Diagrama ER (simplificado)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  fin_documentos │◄────┤  fin_retencoes  │     │fin_impostos_reg │
│   (fato gerador)│     │ (abatem líquido)│     │ (leitura apenas)│
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   fin_titulos   │◄────┤ fin_divergencias│     │fin_trilha_aud  │
│ (ciclo financeiro│     │  (OCR vs padrão)│     │ (auditoria)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```
