# Plano de Testes (TDD) — FIN-DOCUMENTO-INGESTAO

> **Referência**: Kent Beck, _Test-Driven Development by Example_ (Cap. 1 — "The Money Example": "The rhythm of TDD is: write a test, make it run, make it right").
>
> Freeman & Pryce, _Growing Object-Oriented Software_ (Cap. 2 — "Test-Driven Development with Objects": "TDD is not about testing, it is about design").

---

## 1. Estratégia de Testes

| Nível          | Ferramenta                   | Escopo                          | Cobertura Mínima |
| :------------- | :--------------------------- | :------------------------------ | :--------------- |
| **Unitário**   | `node:test` + `assert`       | Domain Services, VOs, Entidades | 90%              |
| **Integração** | `node:test` + MySQL (Docker) | Repositories, Ports/Adapters    | 80%              |
| **E2E**        | Playwright                   | Fluxos completos de UI          | CAs críticos     |

> **Regra**: Toda regra de negócio (invariante) deve ter pelo menos um teste unitário. Toda Port deve ter pelo menos um teste de integração com adapter real.

---

## 2. Testes Unitários (Domain)

### 2.1. CalculadoraLiquido

```ts
describe('CalculadoraLiquido', () => {
  test('CA2: calcula liquido para NFS-e com retencoes', () => {
    const bruto = Money.of(10000_00); // R$ 10.000,00 em centavos
    const retencoes = [
      Retencao.create('ISS', 3.5, Money.of(350_00)),
      Retencao.create('IRRF', 1.5, Money.of(150_00)),
      Retencao.create('INSS', 11.0, Money.of(1100_00)),
    ];
    const liquido = CalculadoraLiquido.calcular(
      bruto,
      Money.zero(),
      retencoes,
      Money.zero(),
      Money.zero(),
      Money.zero(),
    );
    assert.strictEqual(liquido.cents, 793500); // R$ 7.935,00
  });

  test('CA5: DANFE sem retencoes -> liquido = bruto', () => {
    const bruto = Money.of(50000_00);
    const liquido = CalculadoraLiquido.calcular(
      bruto,
      Money.zero(),
      [],
      Money.zero(),
      Money.zero(),
      Money.zero(),
    );
    assert.strictEqual(liquido.cents, 50000_00);
  });

  test('invariante: liquido nunca negativo', () => {
    const bruto = Money.of(100_00);
    const retencoes = [Retencao.create('ISS', 10, Money.of(200_00))];
    const result = CalculadoraLiquido.calcular(
      bruto,
      Money.zero(),
      retencoes,
      Money.zero(),
      Money.zero(),
      Money.zero(),
    );
    assert.strictEqual(result.kind, 'err');
    assert.strictEqual(result.error, 'liquido-negativo');
  });

  test('descontos na fonte abatem do bruto', () => {
    const bruto = Money.of(10000_00);
    const descontosFonte = Money.of(500_00);
    const liquido = CalculadoraLiquido.calcular(
      bruto,
      descontosFonte,
      [],
      Money.zero(),
      Money.zero(),
      Money.zero(),
    );
    assert.strictEqual(liquido.cents, 9500_00);
  });

  test('juros e multa aumentam o liquido', () => {
    const bruto = Money.of(10000_00);
    const juros = Money.of(100_00);
    const multa = Money.of(50_00);
    const liquido = CalculadoraLiquido.calcular(
      bruto,
      Money.zero(),
      [],
      Money.zero(),
      multa,
      juros,
    );
    assert.strictEqual(liquido.cents, 10150_00);
  });
});
```

### 2.2. MotorRetencoes

```ts
describe('MotorRetencoes', () => {
  test('CA3: detecta divergencia de aliquota ISS', () => {
    const retencao = Retencao.create('ISS', 3.5, Money.of(350_00));
    const tabela = TabelaAliquotas.from([
      { municipio: 'Fortaleza', codigoServico: '01.05', tipo: 'ISS', aliquota: 5.0 },
    ]);
    const divergencias = MotorRetencoes.detectar([retencao], tabela, 'Fortaleza', '01.05');
    assert.strictEqual(divergencias.length, 1);
    assert.strictEqual(divergencias[0].tipo, 'Alíquota');
    assert.strictEqual(divergencias[0].valorOcr, '3.5');
    assert.strictEqual(divergencias[0].valorEsperado, '5.0');
  });

  test('nao detecta quando aliquota esta correta', () => {
    const retencao = Retencao.create('ISS', 5.0, Money.of(500_00));
    const tabela = TabelaAliquotas.from([
      { municipio: 'Fortaleza', codigoServico: '01.05', tipo: 'ISS', aliquota: 5.0 },
    ]);
    const divergencias = MotorRetencoes.detectar([retencao], tabela, 'Fortaleza', '01.05');
    assert.strictEqual(divergencias.length, 0);
  });
});
```

### 2.3. GeradorTitulos

```ts
describe('GeradorTitulos', () => {
  test('CA4: NFS-e gera 1 pai + 4 filhos', () => {
    const doc = DocumentoFactory.nfse({ valorBruto: Money.of(10000_00), retencoes: [...] });
    const titulos = GeradorTitulos.gerar(doc);
    const pai = titulos.find(t => t.tipo === 'Pai');
    const filhos = titulos.filter(t => t.tipo === 'Filho');
    assert.ok(pai);
    assert.strictEqual(filhos.length, 4);
    assert.ok(filhos.some(f => f.tipoRetencao === 'ISS'));
    assert.ok(filhos.some(f => f.tipoRetencao === 'IRRF'));
    assert.ok(filhos.some(f => f.tipoRetencao === 'INSS'));
    assert.ok(filhos.some(f => f.tipoRetencao === 'CSRF'));
  });

  test('CA10: DANFE gera apenas 1 pai', () => {
    const doc = DocumentoFactory.danfe({ valorBruto: Money.of(50000_00) });
    const titulos = GeradorTitulos.gerar(doc);
    assert.strictEqual(titulos.length, 1);
    assert.strictEqual(titulos[0].tipo, 'Pai');
  });

  test('RPA gera 1 pai + 3 filhos (sem ISS)', () => {
    const doc = DocumentoFactory.rpa({ valorBruto: Money.of(5000_00), retencoes: [...] });
    const titulos = GeradorTitulos.gerar(doc);
    const filhos = titulos.filter(t => t.tipo === 'Filho');
    assert.strictEqual(filhos.length, 3);
    assert.ok(!filhos.some(f => f.tipoRetencao === 'ISS'));
  });
});
```

### 2.4. Money (Value Object)

```ts
describe('Money', () => {
  test('soma de valores', () => {
    const a = Money.of(100_00);
    const b = Money.of(50_00);
    assert.strictEqual(a.add(b).cents, 150_00);
  });

  test('subtracao resulta negativa lanca erro', () => {
    const a = Money.of(50_00);
    const b = Money.of(100_00);
    assert.throws(() => a.subtract(b), /money-negative/);
  });

  test('formatacao para display', () => {
    const m = Money.of(123456_78);
    assert.strictEqual(m.format(), 'R$ 123.456,78');
  });
});
```

---

## 3. Testes de Integração (Infra)

### 3.1. DocumentoDrizzleRepository

```ts
describe('DocumentoDrizzleRepository (integration)', () => {
  test('salva documento completo com retencoes', async () => {
    const repo = createDocumentoDrizzleRepository({ db });
    const doc = DocumentoFactory.nfseCompleto();
    const id = await repo.save(doc);
    const found = await repo.findById(id);
    assert.ok(found);
    assert.strictEqual(found.retencoes.length, 4);
  });

  test('busca com filtros por fornecedor', async () => {
    const repo = createDocumentoDrizzleRepository({ db });
    await repo.save(DocumentoFactory.nfse({ fornecedor: 'Bambu' }));
    await repo.save(DocumentoFactory.recibo({ fornecedor: 'Outro' }));
    const result = await repo.findByFilters({ fornecedor: 'Bambu' });
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].fornecedor, 'Bambu');
  });

  test('delete em cascada remove retencoes', async () => {
    const repo = createDocumentoDrizzleRepository({ db });
    const id = await repo.save(DocumentoFactory.nfseCompleto());
    await repo.delete(id);
    const found = await repo.findById(id);
    assert.strictEqual(found, null);
    // Verificar que retencoes foram deletadas
  });
});
```

### 3.2. S3StorageAdapter

```ts
describe('S3StorageAdapter (integration)', () => {
  test('upload e retrieve de PDF', async () => {
    const storage = createS3StorageAdapter({ client: s3Client, bucket: 'fin-documentos' });
    const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const url = await storage.upload(buffer, 'test.pdf', 'application/pdf');
    assert.ok(url.includes('test.pdf'));
  });
});
```

### 3.3. OcrMockAdapter

```ts
describe('OcrMockAdapter', () => {
  test('retorna dados fixos para NFS-e teste', async () => {
    const ocr = createOcrMockAdapter();
    const result = await ocr.extract('s3://bucket/nfs-e-teste.pdf');
    assert.strictEqual(result.tipo, 'NFS-e');
    assert.strictEqual(result.valorBruto?.cents, 10000_00);
  });
});
```

---

## 4. Testes E2E (Playwright)

### 4.1. Fluxo Completo de Lançamento

```ts
test('CA1 + CA2: Upload OCR e cálculo do líquido', async ({ page }) => {
  await page.goto('/financeiro/contas-a-pagar/novo');
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/nfs-e-exemplo.pdf');
  await expect(page.locator('[data-field="tipo"]')).toHaveValue('NFS-e');
  await expect(page.locator('[data-field="valor-bruto"]')).toHaveValue('R$ 10.000,00');
  await expect(page.locator('#sidebar-net')).toHaveText('R$ 7.935,00');
});

test('CA3: Modal de divergência de alíquota', async ({ page }) => {
  await page.goto('/financeiro/contas-a-pagar/novo');
  // Preencher com ISS divergente
  await page.fill('[data-retencao="iss"] input', 'R$ 350,00');
  await page.click('button:has-text("Salvar Documento")');
  await expect(page.locator('text=Alíquota ISS Divergente')).toBeVisible();
  await page.click('text=Aceitar o documento (R$ 350,00)');
  await page.click('text=Confirmar escolha');
  await expect(page.locator('text=Documento salvo')).toBeVisible();
});

test('CA7: Grid mostra documento salvo', async ({ page }) => {
  await page.goto('/financeiro/contas-a-pagar');
  await expect(page.locator('text=NFS-e 0847')).toBeVisible();
  await expect(page.locator('text=Aberto')).toBeVisible();
});

test('CA8: Baixar documento no grid', async ({ page }) => {
  await page.goto('/financeiro/contas-a-pagar');
  await page.click('tr:has-text("NFS-e 0847") input[type="checkbox"]');
  await page.click('text=Baixar');
  await expect(page.locator('text=Pago')).toBeVisible();
});
```

---

## 5. Matriz de Rastreabilidade CA → Teste

| CA                        | Teste Unitário       | Teste Integração                    | Teste E2E                   |
| :------------------------ | :------------------- | :---------------------------------- | :-------------------------- |
| CA1 (OCR extrai campos)   | —                    | `OcrMockAdapter`                    | `upload-ocr.spec.ts`        |
| CA2 (Cálculo líquido)     | `CalculadoraLiquido` | —                                   | `upload-ocr.spec.ts`        |
| CA3 (Divergência ISS)     | `MotorRetencoes`     | —                                   | `modal-divergencia.spec.ts` |
| CA4 (NFS-e gera filhos)   | `GeradorTitulos`     | —                                   | —                           |
| CA5 (DANFE sem filhos)    | `GeradorTitulos`     | —                                   | —                           |
| CA6 (Auto-save)           | —                    | `DocumentoRepository`               | `autosave.spec.ts`          |
| CA7 (Grid lista docs)     | —                    | `DocumentoRepository.findByFilters` | `grid-listagem.spec.ts`     |
| CA8 (Baixar no grid)      | —                    | `TituloRepository`                  | `grid-baixar.spec.ts`       |
| CA9 (TED entra CNAB)      | —                    | —                                   | `forma-pagamento.spec.ts`   |
| CA10 (PIX não entra CNAB) | —                    | —                                   | `forma-pagamento.spec.ts`   |
| CA11 (Busca grid)         | —                    | `DocumentoRepository.findByFilters` | `grid-busca.spec.ts`        |
| CA12 (Exportar CSV)       | —                    | —                                   | `grid-exportar.spec.ts`     |

---

## 6. Execução dos Testes

```bash
# Unitários
pnpm test -- tests/unit/**/*.test.ts

# Integração (sobe MySQL + MinIO)
pnpm run test:integration

# E2E (sobe app completa)
pnpm run test:e2e

# Todos (Quality Gate W3)
pnpm test
```
