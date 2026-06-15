# Descoberta: Módulo Financeiro — Fatia 1: Gestão de Documentos + Geração de Títulos

**Feature**: `specs/009-fin-documentos-titulos/` · **Consultor**: `/acdg-skills:requirements-engineer`

> Fase 0 da pipeline `core-api-sdd`. Elicitação ancorada em Gerenciamento de Requisitos
> (Moraes & Lopes) + Histórias de Usuário. Saída alimenta a SPEC (fase 1).
>
> **Fonte canônica do domínio**: `handbook/domain_questions/financeiro/` — em especial
> `bounded-contexts/gestao-documentos.md` e `bounded-contexts/titulos-liquidacao.md`.
> **Ignorado nesta análise** (decisão do P.O.): `src/modules/financial/` atual e
> `specs/FIN-DOCUMENTO-INGESTAO/` — serão reconciliados depois.

## Problema / Oportunidade

A organização opera hoje com "títulos avulsos", sem rastreabilidade entre o documento fiscal
e o pagamento. Para uma entidade sem fins lucrativos, isso compromete governança e transparência:
não há garantia de que cada obrigação financeira nasça de um documento validado nem de que as
retenções fiscais sejam calculadas corretamente. A oportunidade é inverter o modelo para
**Document-Driven Finance**: o **Fato Gerador** (documento fiscal/não-fiscal) passa a ser a raiz
de toda obrigação a pagar, originando títulos com cálculo automático de retenções e ciclo de vida
controlado (`handbook/domain_questions/financeiro/01-introducao.md:3-9`).

Esta é a **primeira fatia vertical** do módulo: dá ao Operador e ao Aprovador a capacidade de
**lançar um documento e ver os títulos nascerem corretos e aprovados** — sem ainda tocar banco,
remessa ou conciliação.

## Stakeholders

| Stakeholder                           | Interesse / o que espera                                                                                                                       | Decisor? |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Operador de Contas a Pagar / Analista | Lançar documentos (manual), ajustar dados, ver título pai + filhos gerados. **Não aprova.** (`01-introducao.md:13`)                            | não      |
| Aprovador (Perfil de Governança)      | Validar o lançamento, aprovar o título (pai+filhos), poder desfazer aprovação. **Analistas/Operadores nunca aprovam.** (`01-introducao.md:14`) | sim      |
| Governança / Auditoria                | Confiar que cada título reflete o documento e que toda mudança é rastreável (`01-introducao.md:16`)                                            | não      |
| P.O. (Gabriel)                        | Fatiamento incremental sem criar dependências upstream prematuras (Orçamento/Conta Bancária)                                                   | sim      |

## Histórias de usuário (INVEST)

<!-- Independent, Negotiable, Valuable, Estimable, Small, Testable -->

- **US-001** (P1): Como **Operador**, quero salvar um **documento não-fiscal** (Boleto/Recibo/Imposto/Fatura)
  com valor bruto e vínculos, para que o sistema gere automaticamente **1 título pai** (valor líquido)
  com status `Aberto`.
  - **Valor / prioridade**: menor fatia que já entrega o Fato Gerador → título. MVP isolado.
  - **Critérios de aceitação**: dado um Boleto de R$ 1.000 sem retenções, quando salvo, então é criado
    1 título pai de R$ 1.000 em `Aberto` vinculado ao documento (`gestao-documentos.md:8-9,93`).

- **US-002** (P1): Como **Operador**, quero salvar um **documento fiscal com retenções** (NFS-e/RPA),
  para gerar **título pai (líquido) + títulos filhos** (um por imposto retido), todos em `Aberto`,
  com o valor líquido calculado corretamente.
  - **Valor / prioridade**: exercita a regra-mãe (R1/R8) — geração de filhos e cálculo do líquido.
  - **Critérios de aceitação**: dado NFS-e com Bruto 1.000, desconto na fonte 50, ISS 50, IRRF 15,
    INSS 110, quando salvo, então pai = R$ 775 e 3 filhos (ISS, IRRF, INSS); CBS/IBS apenas registrados,
    fora do líquido (`gestao-documentos.md:104-116`, `:78-81`).

- **US-003** (P1): Como **Aprovador**, quero aprovar um título em `Aberto`, para mudar **pai e filhos**
  para `Aprovado` e travar os campos vitais.
  - **Valor / prioridade**: fecha o ciclo mínimo "lançar → aprovar"; ativa a governança.
  - **Critérios de aceitação**: dado um título pai `Aberto` com filhos, quando o Aprovador aprova,
    então pai e filhos vão para `Aprovado` e valor/fornecedor/vínculos ficam imutáveis
    (`titulos-liquidacao.md:67` R7, `gestao-documentos.md:84` R4).

- **US-004** (P2): Como **Operador**, quero **ajustar o lançamento** enquanto está em `Aberto`
  (bruto, retenções, juros/multa, descontos, vínculos), para recalcular o líquido antes da aprovação
  (`gestao-documentos.md:71`).

- **US-005** (P2): Como **Aprovador**, quero **desfazer a aprovação** (`Aprovado` → `Aberto`),
  para corrigir; se os valores do pai mudarem, os filhos sofrem **hard delete** e são recriados na nova
  aprovação (`titulos-liquidacao.md:71` R8.1, `:112`).

- **US-006** (P3): Como **Operador**, quero **cancelar** um documento em `Aberto`, fazendo **hard delete**
  de pai e filhos; o cancelamento é proibido em qualquer outro status (`gestao-documentos.md:86-87` R6/R7).

- **US-007** (P3): Como **Operador**, quero salvar um **rascunho** parcial e depois submetê-lo
  (`Rascunho` → `Aberto`), para não perder trabalho em andamento (`titulos-liquidacao.md:42-43`).

## Requisitos

### Funcionais

- **RF-001**: O sistema DEVE permitir criar/salvar documento dos tipos: NFS-e, DANFE, RPA, Fatura,
  Boleto, Recibo, Imposto (`gestao-documentos.md:22`).
- **RF-002**: O sistema DEVE calcular o **valor líquido** como
  `Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros`; impostos registrados
  (ICMS, IPI, PIS, COFINS, CBS, IBS) NÃO entram; o campo é calculado e não editável
  (`gestao-documentos.md:78-81` R1).
- **RF-003**: Ao salvar o documento, o sistema DEVE gerar automaticamente o **título pai** (valor líquido)
  em `Aberto` (`gestao-documentos.md:69`, `especificacao-mestre.md:120-122`).
- **RF-004**: O sistema DEVE gerar **títulos filhos** apenas para NFS-e (ISS, IRRF, INSS, CSRF) e RPA
  (IRRF, INSS, CSRF); DANFE/Fatura/Boleto/Recibo/Imposto NÃO geram filhos
  (`titulos-liquidacao.md:69` R8, `especificacao-mestre.md:60-68`).
- **RF-005**: O sistema DEVE registrar retenções (geram filhos) e impostos registrados (apenas leitura).
- **RF-006**: O sistema DEVE implementar a máquina de estados desta fatia: `Rascunho` → `Aberto` →
  `Aprovado`, com `Desfazer Aprovação` (`Aprovado`→`Aberto`) e `Cancelamento` (`Aberto`→excluído).
- **RF-007**: A aprovação do **pai** DEVE aprovar automaticamente todos os **filhos** (herança de aprovação),
  mantendo ciclo de vida financeiro independente entre eles (`titulos-liquidacao.md:67-68` R7/R7.1).
- **RF-008**: Após `Aprovado`, apenas **Descrição** e **Data de Vencimento** DEVEM ser editáveis sem
  reabertura; campos vitais ficam imutáveis (`gestao-documentos.md:84-85` R4/R5).
- **RF-009**: O `Cancelamento` DEVE ser permitido somente em `Aberto` e fazer hard delete de pai+filhos
  (`gestao-documentos.md:86-87`).
- **RF-010**: O sistema DEVE separar funções: o Operador NÃO aprova; o Aprovador aprova/desfaz aprovação
  (`titulos-liquidacao.md:10-11`).
- **RF-011**: O documento DEVE armazenar a **forma de pagamento** (TED, Transferência Bancária, PIX, Boleto,
  Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro) — sem efeito de remessa nesta fatia
  (`gestao-documentos.md:31`).
- **RF-012**: O documento DEVE guardar vínculos como **referências leves (UUID)**: fornecedor (obrigatório),
  contrato, plano orçamentário, categoria, programa — sem importar o domínio dono.

### Não-funcionais (viram métricas na fase 4)

- **RNF-001 (Integridade)**: O líquido derivado e a soma das obrigações DEVEM ser sempre consistentes com a
  fórmula — zero divergência tolerada (`gestao-documentos.md:78-81`).
- **RNF-002 (Auditoria)**: Toda mudança de estado/valor DEVE emitir evento de domínio que sustente a trilha
  (Time Travel) — auditoria é transversal e obrigatória (`02-context-map.md:79`, `01-introducao.md:16`).
- **RNF-003 (Isolamento)**: O módulo DEVE viver em schema `fin_*` isolado, sem acoplar `ctr_*`/`partners_*`
  (ADR-0014); consumo cross-módulo só via `public-api` (ADR-0006).

## Restrições e premissas

- **Arquitetura core-api**: Modular Monolith (ADR-0006); isolamento de schema `fin_*` (ADR-0014);
  MySQL 8.4 dialeto único (ADR-0020); domínio puro `Result<T,E>` + branded + sem `class`/`throw`
  (`.claude/rules/domain.md`); eventos cross-módulo via outbox (ADR-0015); HTTP como UX primária (ADR-0037);
  Money em `bigint` cents (`src/shared/kernel/money.ts`); pnpm (ADR-0012).
- **Reúso confirmado** (análise de pré-requisitos): `SupplierRef` + read port de fornecedor já existem em
  `partners/public-api`; `ProgramsReadPort` em `programs/public-api`; padrões de Storage (ADR-0019),
  Outbox (ADR-0015) e Timeline/auditoria (`contracts/domain/timeline/`) prontos para reúso.
- **Premissa (inclusão manual)**: nesta fatia NÃO há OCR real; campos de metadados de OCR são input opcional.
- **Premissa (refs sem dono)**: plano orçamentário e categoria não têm módulo dono ainda; espelham o
  precedente `programId`/`budgetPlanId` de `contracts` (`contracts/domain/contract/types.ts:33-37`) — refs leves.

## Fora de escopo

- Integração Bancária / CNAB 240, remessa, retorno, VAN (`bounded-contexts/integracao-bancaria.md`).
- Extrato D+1 e estados `Transmitido`/`Recusado`/`Pago` (placeholders no enum, sem transições nesta fatia).
- Submódulo Conciliação e evento `TituloConciliado` (`bounded-contexts/conciliacao.md`).
- Módulo Orçamento (Plano Orçamentário/Categoria/Centro de Custo) e Conta Bancária da entidade.
- Alçada de aprovação por valor (`gestao-documentos.md:218-219`).
- OCR real e motor de vigilância de alíquota (R3) — apenas registro de divergência fica como evolução.

## Rastreabilidade (inicial)

| Requisito     | História | Critério → BDD                                                   | Teste (TDD)         |
| ------------- | -------- | ---------------------------------------------------------------- | ------------------- |
| RF-002/RF-003 | US-001   | Boleto sem retenção → 1 pai líquido `Aberto`                     | a definir na fase 7 |
| RF-002/RF-004 | US-002   | NFS-e com retenções → pai + filhos, líquido correto              | a definir na fase 7 |
| RF-007/RF-008 | US-003   | Aprovar → pai+filhos `Aprovado`, vitais imutáveis                | a definir na fase 7 |
| RF-006/RF-008 | US-004   | Ajustar em `Aberto` recalcula líquido                            | a definir na fase 7 |
| RF-006 (R8.1) | US-005   | Desfazer aprovação → `Aberto`, filhos hard delete se valor mudou | a definir na fase 7 |
| RF-009        | US-006   | Cancelar só em `Aberto`; demais status rejeitam                  | a definir na fase 7 |

## Perguntas em aberto

- [ ] **[NEEDS CLARIFICATION: obrigatoriedade dos vínculos orçamentários]** Plano orçamentário e categoria
      são **obrigatórios** no salvamento já nesta fatia (como o agregado sugere) ou **opcionais** até existir o
      módulo Orçamento? → resolver em `/speckit-clarify`. _Default proposto: opcionais (refs leves nuláveis)._
- [ ] **[NEEDS CLARIFICATION: validação de existência das refs]** O fornecedor deve ter sua existência
      verificada via `partners` read port no salvamento, ou basta validar o formato (UUID v4)? → `/speckit-clarify`.
      _Default proposto: validar apenas formato nesta fatia; cross-check de existência fica para fatia posterior._
- [ ] **[NEEDS CLARIFICATION: granularidade da trilha de auditoria]** Persistir já uma timeline por-campo
      (estilo `contracts/timeline`) ou apenas emitir eventos de domínio nesta fatia? _Default proposto: emitir
      eventos; timeline detalhada em fatia futura._
