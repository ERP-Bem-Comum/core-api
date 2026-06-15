# FIN-DOCUMENTO-TITULOS — Request

**Size**: L · **Feature SDD**: `specs/009-fin-documentos-titulos/` · **Branch**: `feat/fin-module`

## Escopo

Fatia 1 do Módulo Financeiro (`src/modules/financial/`, schema `fin_*`): Gestão de Documentos (Fato Gerador) +
geração automática de Títulos (Pai/Filhos) + máquina de estados `Draft→Open→Approved` (+ desfazer aprovação,
cancelamento) + trilha por-campo. Fonte: `specs/009-fin-documentos-titulos/` (spec, domain, ADRs 0001-0005, plan,
data-model, contracts, bdd 26 cenários, tasks 50 itens). Borda HTTP `/api/v1/financial` (ADR-0037).

**Fora de escopo** (fatias futuras): Integração Bancária/CNAB, remessa/retorno, extrato D+1, Conciliação, OCR real,
módulo Orçamento, Conta Bancária, alçada.

## Critérios de aceite (dos cenários BDD)

- [ ] CA-1 (CT-001/002/007): salvar documento não-fiscal → 1 título pai (líquido) em `Aberto`; fornecedor obrigatório.
- [ ] CA-2 (CT-003..006/008/009/010): NFS-e/RPA → pai + filhos; DANFE só pai; impostos registrados fora do líquido; líquido não-positivo rejeitado.
- [ ] CA-3 (CT-011..015): aprovar → pai+filhos `Aprovado`; imutabilidade pós-aprovação; Operador não aprova.
- [ ] CA-4 (CT-016/017): ajustar em `Aberto` recalcula; bloqueado pós-aprovação.
- [ ] CA-5 (CT-018..021): desfazer aprovação; hard delete + recria filhos se valores mudaram; edição de filho restrita.
- [ ] CA-6 (CT-022/023): cancelar só em `Aberto` (hard delete); bloqueado fora.
- [ ] CA-7 (CT-024..026): rascunho + submissão.
- [ ] CA-8 (NFR-002/SC-006): trilha por-campo reconstituível (quem/quando/antes→novo).

## Pipeline

W0 RED (este) → W1 GREEN → W2 review → W3 gate. Plano de testes W0: `tasks.md` Phases 2-3 (Foundational + US1) primeiro.
