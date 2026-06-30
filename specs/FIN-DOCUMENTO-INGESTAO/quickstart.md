# Quickstart — FIN-DOCUMENTO-INGESTAO

> Guia mínimo para rodar a feature localmente e validar os principais fluxos.

---

## 1. Setup Local

### 1.1. Subir dependências (MySQL + MinIO)

```bash
# Na raiz do projeto
docker compose up -d mysql minio
```

### 1.2. Rodar migrations

```bash
pnpm run db:migrate
```

### 1.3. Seed de alíquotas padrão (SEFIN Fortaleza)

```bash
pnpm run db:seed -- --table=aliquotas
```

### 1.4. Subir aplicação

```bash
pnpm run dev
```

---

## 2. Testar Upload + OCR (adapter mock)

```bash
curl -X POST http://localhost:3000/api/documentos/upload \
  -F "file=@tests/fixtures/nfs-e-exemplo.pdf"
```

**Resposta esperada:**

```json
{
  "pdfUrl": "s3://minio/fin/documentos/uuid.pdf",
  "ocr": {
    "tipo": "NFS-e",
    "numero": "0847",
    "fornecedor": { "razaoSocial": "Bambu Educação", "cnpj": "37.364.305/0001-92" },
    "valorBruto": 10000.0,
    "retencoes": [
      { "tipo": "ISS", "aliquota": 3.5, "valor": 350.0 },
      { "tipo": "IRRF", "aliquota": 1.5, "valor": 150.0 },
      { "tipo": "INSS", "aliquota": 11.0, "valor": 1100.0 },
      { "tipo": "CSRF", "aliquota": 4.65, "valor": 465.0 }
    ]
  }
}
```

---

## 3. Criar documento via CLI

```bash
pnpm run cli:financeiro -- documento criar \
  --tipo NFS-e \
  --fornecedor 37.364.305/0001-92 \
  --valor-bruto 10000.00 \
  --vencimento 2026-06-10 \
  --forma-pagamento PIX
```

---

## 4. Verificar títulos gerados

```bash
pnpm run cli:financeiro -- titulo listar \
  --documento-id <ID>
```

**Saída esperada (NFS-e):**

- 1 título pai (líquido) — status `Aberto`
- 4 títulos filhos (ISS, IRRF, INSS, CSRF) — status `Aberto`

---

## 5. Rodar testes

```bash
# Unitários (node:test)
pnpm test

# Integração (sobe MySQL via docker)
pnpm run test:integration
```

---

## 6. Portas e endpoints locais

| Serviço       | URL                   | Credenciais             |
| :------------ | :-------------------- | :---------------------- |
| API           | http://localhost:3000 | —                       |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| MySQL         | localhost:3306        | root / root             |
