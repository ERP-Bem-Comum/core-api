# 📚 Domain Questions — ERP Financeiro

Esta pasta consolida o trabalho de **Domain-Driven Design (DDD)** do projeto, organizado por **módulo** e, dentro de cada módulo, por **Bounded Context (BC)**.

## 🗂️ Módulos

### 📦 [Contratos](./contratos/)
Gestão do ciclo de vida contratual com **Estado Vigente** derivado de aditivos homologados, **Timeline imutável** e gestão documental auditável.

**Bounded Contexts:**
* [Gestão de Contratos](./contratos/bounded-contexts/gestao-contratos.md) — Core ⭐
* [Aditivos e Alterações](./contratos/bounded-contexts/aditivos.md) — Core ⭐
* [Memória Operacional (Timeline)](./contratos/bounded-contexts/timeline.md) — Supporting
* [Integração Financeira](./contratos/07-external-context.md) — Generic (ACL)

### 💰 [Financeiro](./financeiro/)
**Document-Driven Finance**: toda obrigação nasce de um Fato Gerador (documento fiscal), com motor de retenções, ciclo bancário CNAB/Bradesco e conciliação por FITID.

**Bounded Contexts:**
* [Gestão de Documentos](./financeiro/bounded-contexts/gestao-documentos.md) — Core ⭐
* [Títulos e Liquidação](./financeiro/bounded-contexts/titulos-liquidacao.md) — Core ⭐
* [Integração Bancária](./financeiro/bounded-contexts/integracao-bancaria.md) — Generic (ACL)
* Ingestão & OCR — Supporting (descrito no [context-map](./financeiro/02-context-map.md))

## 📐 Convenção de Pastas

```
domain_questions/
├── README.md                              ← este arquivo
├── <modulo>/
│   ├── README.md                          ← visão executiva do módulo
│   ├── 01-introducao.md                   ← visão de produto
│   ├── 02-context-map.md                  ← mapa de BCs
│   ├── 06-event-flow.md                   ← matriz de eventos
│   ├── 07-external-context.md             ← fronteiras externas
│   ├── especificacao-*.md                 ← documento mestre/formal
│   └── bounded-contexts/
│       ├── <bc-1>.md                      ← detalhamento tático do BC
│       ├── <bc-2>.md
│       └── …
```

## 🧭 Como navegar

* **Quer entender um módulo do zero?** Comece pelo `README.md` do módulo, depois `01-introducao.md`, depois `02-context-map.md`.
* **Quer detalhe tático de um BC?** Vá direto em `<modulo>/bounded-contexts/<bc>.md`.
* **Quer ver como os BCs conversam?** Veja `06-event-flow.md` do módulo.
* **Quer a especificação formal para implementação?** Veja `especificacao-*.md` do módulo.
