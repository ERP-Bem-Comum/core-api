# Code Review — FIN-DOC-QUICKWINS — Round 1

**Veredito:** APPROVED · **Reviewer:** code-reviewer · **Data:** 2026-06-19

**Escopo:** `domain/document/document.ts` (set RPA), `domain/shared/retention.ts` (comentário), `adapters/http/plugin.ts` (rota submit) + testes.

## Issues

- 🔴 Crítica: nenhuma. Zero `throw`/`class`/`any`; rota espelha o padrão existente (`approve`/`undo-approval` + `loadAndSerialize`); regra de retenção alterada via dado (set), não lógica.
- 🟡 Importante: nenhuma.
- 🔵 Observação: #154 amplia a regra de produto (RPA passa a aceitar ISS) — alinhado à issue; o teste que fixava a regra antiga foi atualizado no W0 (não é regressão silenciosa). Comentário de `retention.ts` sincronizado.

## O que está bom

- Fail-first respeitado (RED → GREEN) mesmo nos quick wins.
- #91 reusa o use-case `submitDraft` já existente — só expõe a rota (mínimo, YAGNI).
- Sem regressão: suíte completa 2959 pass / 0 fail.

**APPROVED** → W3.
