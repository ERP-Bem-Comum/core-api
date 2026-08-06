---
name: falsos-positivos-native-pdf-taxid-preexistente
description: Guarda contra falso positivo — saídas erradas do taxId em native-pdf.ts que JÁ existem em HEAD e reaparecem em toda revisão do reader fiscal
metadata:
  type: feedback
---

O `taxId` de `src/modules/financial/adapters/document-reader/native-pdf.ts` produz valores
errados **de nascença** em cenários que parecem regressão quando se lê só o diff. Antes de
reportar qualquer um deles, rodar HEAD lado a lado ([[review-method-replicate-head-logic-in-scratch]]).

**Why:** numa mesma revisão eu encontrei três saídas silenciosamente erradas e nenhuma era do
diff. Reportá-las como achado de correção teria sido gritar lobo; ignorá-las sem verificar
teria sido sorte. A diferença é uma execução comparativa de dois minutos.

**How to apply:** a cascata `taxId` tem 3 braços encadeados por `??`, e o **1º que devolve
valor vence** — inclusive sobre o braço que o diff acabou de consertar. Os padrões abaixo
eram pré-existentes na revisão de 2026-08-04; **confirmar** se ainda são antes de citá-los:

- **Vizinho que começa com dígito** (`CPF 52998224725 0012345 IM`, ou o número na linha
  seguinte): o recorte do ramo legado só para em **letra**, e `\s` é tolerado de propósito
  (o `-90` do CNPJ pode cair na linha seguinte). Saída: `52998224725001`. HEAD idem.
- **Braço `CNPJ:` com classe numérica** (`/CNPJ:\s*([\d.\-/\s]{11,25})/`): varre o texto
  **inteiro**, não o `emitBlock`, então pode devolver o CNPJ do **TOMADOR**. E, num CNPJ
  alfanumérico com letra na 12ª posição, trunca em 11 dígitos e devolve algo que o downstream
  não distingue de CPF. HEAD idem.
- **CNPJ com checksum inválido** (typo/OCR) cai no ramo legado e sai como 14 dígitos crus.
  HEAD idem.

O que **é** legítimo apontar nesses casos: que a mudança em revisão declara consertar o
reader para ADR-0044 e deixa um braço da mesma cascata com o defeito da mesma família — como
**ressalva** com a menção explícita de que HEAD faz igual, e encaminhamento por `issue-report`
(CLAUDE.md anti-padrão 7, scope-creep), nunca como REPROVADO.

Contexto útil: `tests/cleanup/cnpj-alphanumeric-language.test.ts` mantém este arquivo numa
**allowlist pinada** de "defeito de código" — se o diff corrige parte do defeito, a
justificativa do pin fica desatualizada e isso é uma ressalva de registro, não de correção.
