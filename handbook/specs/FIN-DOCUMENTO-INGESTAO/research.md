# Research — FIN-DOCUMENTO-INGESTAO

> Pesquisa de tecnologias e decisões arquiteturais que fundamentam a implementação.

---

## 1. OCR (Optical Character Recognition)

### Opções avaliadas

| Tecnologia              | Modelo     | Latência | Acurácia (NFS-e)   | Custo        | Decisão              |
| :---------------------- | :--------- | :------- | :----------------- | :----------- | :------------------- |
| **Tesseract 5.x**       | On-premise | 2–5s     | 75–85%             | Zero infra   | Fase 2 (fallback)    |
| **AWS Textract**        | SaaS       | 1–3s     | 90–95%             | Pay-per-page | Fase 2 (preferido)   |
| **Google Cloud Vision** | SaaS       | 1–3s     | 88–93%             | Pay-per-page | Descartado — lock-in |
| **Adapter Mock**        | Local      | <100ms   | 100% (dados fixos) | Zero         | **Fase 1**           |

### Conclusão

Adotar **Port + Adapter Pattern** (`OcrPort`) para isolar a tecnologia. Fase 1 usa adapter mock (retorna fixtures) para viabilizar desenvolvimento paralelo. Fase 2 avalia Tesseract (custo zero, privacidade de dados fiscais) vs AWS Textract (acurácia superior).

### Risco mitigado

PDFs com layout não padronizado (ex: DANFE de fornecedores pequenos) tendem a falhar em OCR genérico. A interface de correção manual + trilha de auditoria é obrigatória independentemente da tecnologia escolhida.

---

## 2. Storage de PDFs

### Opções avaliadas

| Tecnologia           | Escrita   | Leitura   | Custo Dev        | Custo Prod         | Decisão    |
| :------------------- | :-------- | :-------- | :--------------- | :----------------- | :--------- |
| **MinIO**            | S3-compat | S3-compat | Zero (docker)    | Zero (self-hosted) | **Dev**    |
| **AWS S3**           | S3 API    | S3 API    | Zero (via MinIO) | Pay-per-GB         | **Prod**   |
| **Filesystem local** | Local     | Local     | Zero             | Não escalável      | Descartado |

### Conclusão

`@aws-sdk/client-s3` é o cliente único (ADR-0019). MinIO em dev garante paridade total com produção. Nenhuma alteração de código ao trocar de MinIO para S3.

---

## 3. Agrupamento CSRF (PIS + COFINS + CSLL)

### Contexto

Documentos NFS-e e RPA geram retenções de PIS, COFINS e CSLL. No Bradesco CNAB 240, esses três impostos são recolhidos em uma única guia DARF (código 6106).

### Decisão

Agrupar PIS + COFINS + CSLL em um único título filho denominado **CSRF**. Isso simplifica:

- Grid de Contas a Pagar (menos linhas)
- Geração de remessa CNAB (1 linha por obrigação)
- Conciliação bancária (1 saída no extrato)

### Trade-off

Perde-se granularidade no grid (não é possível ver PIS isolado), mas os valores individuais permanecem no documento (`fin_impostos_registrados` para auditoria fiscal).

---

## 4. Auto-save vs Event Sourcing

### Opções avaliadas

| Abordagem                   | Persistência        | Recuperação         | Complexidade | Decisão               |
| :-------------------------- | :------------------ | :------------------ | :----------- | :-------------------- |
| **Event Sourcing completo** | Cada evento         | Replay              | Alta         | Descartado — overkill |
| **Snapshot + diff**         | Estado a cada N seg | Último snapshot     | Média        | Descartado            |
| **Debounce + persistência** | Após 2s inativo     | Último estado salvo | **Baixa**    | **Adotado**           |

### Conclusão

Auto-save com debounce de 2s persistindo no backend (rascunho em `fin_documentos` com flag `is_rascunho`). A trilha de auditoria (`fin_trilha_auditoria`) captura apenas alterações significativas (valores fiscais, fornecedor), não cada keystroke.

---

## 5. Schema Migration Strategy

### Decisão

Adotar **Expand-Contract** (Fowler/Sadalage, _Refactoring_ p. 68) para evolução do schema:

1. **Expand**: Adiciona nova coluna/tabela, código lê ambas.
2. **Migrate**: Backfill dos dados antigos.
3. **Contract**: Remove coluna antiga, código lê apenas a nova.

### Fundamentação

MySQL 8.4 + Drizzle ORM + `drizzle-kit migrate` suportam migrações reversíveis. A estratégia evita downtime em deploys e permite rollback seguro.

---

## 6. Forma de Pagamento e CNAB

### Pesquisa

Consulta ao handbook/guidelines/bradesco_guideline/ confirma que:

- TED e Transferência Bancária geram remessa CNAB 240 (Segmentos P, Q, J)
- PIX, Boleto, Cartão Corporativo, Câmbio, Guia de Recolhimento e Outro são pagamentos manuais (fora da remessa)
- Arquivo de retorno processado em alguns minutos (acatamento = flag lógica, não muda status)
- Extrato D+1 confirma saída real (status → Pago)

---

## Referências

- Fowler, M. & Sadalage, P. _Refactoring Databases_. Cap. 3: Parallel Change / Expand-Contract.
- Ramakrishnan, R. & Gehrke, J. _Database Management Systems_ (3ª ed.). Cap. 19: Schema evolution.
- Bradesco. _Layout CNAB 240 Pagamentos (versão atual)_. handbook/guidelines/bradesco_guideline/.
