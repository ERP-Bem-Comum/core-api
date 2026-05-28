<!--
Template de SPEC (fase spec-driven, pré-W0). Copie para:
  - Ticket:  .claude/.pipeline/<TICKET>/001-spec/SPEC.md
  - Épico:   .claude/.planning/EPIC-<NOME>.md  (usa também a seção §10 Fatiamento)
Preencha todas as seções. Apague os comentários <!-- --> ao finalizar.
Idioma: PT-BR (doc). Erros internos em EN kebab-case. Eventos EN passado.
-->

# SPEC — <TÍTULO> (`<TICKET-ID ou EPIC-ID>`)

> **Tipo:** ticket | épico · **Size:** XS|S|M|L|XL · **Épico-pai:** `<EPIC-ID ou —>`
> **Status da spec:** draft | em-revisão | aprovada
> **ADRs tocados:** `ADR-XXXX`, … (cada um justificado em §7)

## 1. Problema & contexto (o PORQUÊ)
<!-- 2-5 frases. Que dor isto resolve? Por que agora? Cite a origem (ADR/Inquiry/pedido). -->

## 2. User stories
<!-- Uma ou mais. Formato: Como <ator>, quero <ação>, para <valor>. -->
- Como **<ator>**, quero **<ação>**, para **<valor>**.

## 3. Critérios de aceitação (viram os testes do W0)
<!-- Testáveis e binários. Given/When/Then ou lista. Numerados CA1, CA2… -->
- **CA1** — <condição observável>.
- **CA2** — <erro esperado> (string literal union, EN kebab-case).

## 4. Não-objetivos / fora de escopo
<!-- Explícito: o que esta unidade NÃO faz. Evita scope creep no W1. -->
- <não-objetivo>.

## 5. Clarificações (Q&A resolvidas)
<!-- O "/clarify": ambiguidades levantadas e como foram resolvidas, com quem decidiu.
     Ambiguidade não resolvida = NÃO pode sair de draft. -->
- **Q:** <pergunta> · **R:** <resposta> (<quem/quando>).

## 6. Plano técnico de alto nível (o COMO — sem código)
<!-- Arquivos a criar/tocar, ports, fluxo (validate→fetch→domain→persist→emit),
     mapeamento rota→use case, etc. Mantém domínio/application sem framework. -->

## 7. Constitution check (aderência aos ADRs/regras)
<!-- O diferencial. Para CADA ADR/regra tocado: como a spec adere. Conflito = bloqueio. -->
| Fonte | Exigência | Como a spec adere |
| :-- | :-- | :-- |
| `ADR-XXXX` | <exigência citada> | <adesão> |
| `.claude/rules/<x>.md` | <regra> | <adesão> |

## 8. Riscos & mitigações
| Risco | Severidade | Mitigação |
| :-- | :-- | :-- |
| <risco> | alta/média/baixa | <mitigação> |

## 9. Definition of Done
<!-- Além do W3 verde: o que prova que a user story foi entregue. -->
- [ ] CAs cobertos por teste (W0) e verdes (W3).
- [ ] Constitution check sem conflito aberto.

## 10. Fatiamento em tickets (ÉPICO apenas)
<!-- Só para épico. Ordem por dependência; cada linha vira um ticket com sua própria SPEC. -->
| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `<TICKET>` | S | <entrega atômica> | — |
