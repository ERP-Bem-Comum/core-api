# W3 — Quality Gate CTR-INQUIRY-0012-UPDATE-POST-ADR-0021

> Gate final. Outcome: GREEN.

## Escopo da validação

Refactor documental sobre arquivo único. Não roda typecheck/test/format-check (nenhum arquivo `.ts`/`.tsx`/`.json`/`.js` tocado).

## Arquivos no diff final

```
handbook/inquiries/0012-bff-managed-api-gateway-vs-fastify.md  [MODIFIED]
```

Único arquivo de produção tocado. Nada em `src/`, `tests/`, `scripts/`, `package.json`, `tsconfig.json`, etc.

## Cross-references (re-validados)

| De → Para | Verificado |
| :--- | :---: |
| Bloco aviso topo → §9 anchor | ✅ `#9-atualização-2026-05-22--impacto-do-adr-0021` (kebab-case de "Atualização 2026-05-22 — Impacto do ADR-0021") |
| Bloco aviso topo → ADR-0021 | ✅ `../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md` |
| Bloco aviso topo → ADR-0007 | ✅ `../architecture/adr/0007-multi-cloud-aws-gcp.md` |
| §4.2 superseded box → ADR-0021 | ✅ |
| §4.2 superseded box → §9 anchor | ✅ |
| §6 pergunta 4 → ADR-0021 + §9 anchor | ✅ |
| §7 último bullet → (sem novo link, apenas explicação) | ✅ |
| §9 → ADR-0021 / ADR-0007 / ADR-0008 / Inquiry-0013 / Inquiry-0003 | ✅ todos os paths relativos corretos |
| §9.8 → handbook/reference/magalu-cloud/network/overview.md + security/ | ✅ paths existem (verificados em W1) |

## Idioma

PT-BR conforme regra invariante do projeto. Termos técnicos (VPC, Security Groups, LBaaS, JWT, mTLS, OFTP, STCP, CNAB, MGC, PBE, etc.) mantidos em EN como nomenclatura canônica.

## Consistência do estado da Inquiry

- Status `Open` preservado ✅
- "Última atualização: 2026-05-22" adicionada ✅
- Bloqueio (skeleton bff-gateway + ADR-0018 candidato) preservado ✅
- Tema (Estratégia & Arquitetura) preservado ✅

## Impacto em código de produção

Zero. Verificado por `git status` (se rodável) ou inspeção: apenas `handbook/inquiries/0012-...md` + arquivos do `.claude/.pipeline/CTR-INQUIRY-0012-UPDATE-POST-ADR-0021/`.

## Outcome

GREEN. Inquiry-0012 atualizada com cirurgia, cross-references íntegras, §9 nova substantiva, status da inquiry preservado, zero risco para código.
