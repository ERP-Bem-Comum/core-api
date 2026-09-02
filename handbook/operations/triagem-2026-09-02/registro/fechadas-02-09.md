# Registro — 27 issues fechadas em 02/09/2026

Cada uma recebeu um comentário com a evidência (arquivo, linha ou PR) antes de ser fechada.
Verificado contra `571a14d7` (1.0.0-rc.2). Estado confirmado pela API depois do fechamento.

| # | Título | Por que fechou |
| --- | --- | --- |
| #798 | [financial] buildVanStorage descarta o erro de configuracao e cai para in-memory mudo | buildVanStorage faz fail-fast (composition.ts:763-769, PR #914). Não há mais ramo in-memory. |
| #792 | [financial] documento nunca sai de Approved — a remessa prende o titulo, mas Transmitted do documento e casca sem transicao | Título vai a Transmitted na mesma tx da reserva (remittance-repository.ts:53,68 — ADR-0065, PRs #848/#850). |
| #690 | [financial] Retorno da VAN: a caixa e do convenio — lote nao pode falhar por referencia desconhecida | return-file.ts:13-25 nunca falha o lote — baldes unreadable/skipped (PR #779). |
| #681 | [financial] Segmentos de cobranca (P/Q) em contexto de pagamento — errata do ADR-0002 e prevencao | Errata registrada na spec 016 §13 + unknown-segment no inspetor (remittance-inspector.ts:269). |
| #923 | [partners] ISPB do favorecido nao existe no cadastro — bloqueia o Segmento A e o B do emissor PIX | payee-ispb.ts + ispb-by-bank-code.generated.ts derivam ISPB do código de compensação (98fbc6c2, PR #934). |
| #893 | [financial] reclassificacao da taxonomia escreve em fin_documents fora do optimistic lock | CAS version+1 em reconciliation-repository.drizzle.ts:147-168, mapeado a document-version-conflict (409). |
| #894 | [financial] fin_payable_view nao tem guard de recencia — reprojetar evento antigo apaga a reclassificacao | payable-view-store.drizzle.ts:52-102 tem guard fresher + coluna occurred_at (migration 0055). |
| #895 | [financial] teste da cascata M2 escolhe o DocumentSaved por sorteio de UUID — CI vermelho no #889 | O teste apaga o outbox antes do confirm (:269), deixando um único DocumentSaved a projetar. |
| #896 | [financial] teste da trilha M2 nao pode falhar: assere piso de contagem que o seed ja satisfaz | reconciliation-reclassify.drizzle-mysql.test.ts:345 assere o Result e casa por conteúdo nos 3 alvos. |
| #569 | [infra] MinIO/S3 do comprovante-fonte: bytes precisam durar (senao in-memory some no restart) | buildDocumentStorage é fail-fast sem fallback (composition.ts:734-747, PR #916). |
| #525 | [ci] endereco de tailnet do QA hardcoded em 3 pontos do deploy-qa.yml — mover para secret ou MagicDNS | deploy-qa.yml não existe mais (virou qa-image.yml, PRs #748/#780); job Tailscale SSH removido. |
| #505 | [financial] batch de lancamento manual descarta budgetPlanRef/subcategoryRef em silencio (contract-lie pos-S2) | confirm-batch.ts:20-22,59-70 repassa budgetPlanRef/subcategoryRef ao recordManualEntry. |
| #502 | [financial/front] Epico: carimbar o titulo com Plano Orcamentario + Subcategoria na criacao — destrava REP-5 e #446 | S1-S6 mergeados; colunas budget_plan_ref/subcategory_ref em fin_documents, fin_payable_view e fin_manual_entries. |
| #466 | dev-seed: admin de dev congelado em 31 de 44 permissoes — seed one-shot nunca reconcilia | dev-seed.ts:17 usa PermissionCatalog.all.map — permissão nova entra no admin automaticamente. |
| #335 | [notifications] corrigir 3.6 do secrets-catalog — PARTNERS_INVITE_FROM documentado como alias lido | secrets-catalog.md:139 já registra que PARTNERS_INVITE_FROM não é lido (c61b83a8). |
| #268 | [financial] expor dados do ManualEntry no lookup da conciliacao (detalhe da nova transacao) | schemas.ts:1126-1137 (bloco marcado #268) devolve taxonomy com os 5 refs + category (4ec8445e). |
| #135 | [notifications/infra] provisionar envio de e-mail em deploy — SES/SMTP + SPF/DKIM/DMARC + DB + migration + CI | Runbook 08: prod envia por Amazon SES desde 02/07; CI fechado em fe338c47. |
| #129 | [partners] reconciler/backfill p/ par_contract_count_view (contador incremental drifta) | contract-count-backfill/backfill.ts:4 reconcilia drift via setCount absoluto — cita a #129. |
| #117 | [notifications] Envio de e-mail transacional via Umbler (SMTP) — EmailPort + outbox + DKIM/DMARC | nodemailer.ts + worker email-dispatch + outbox por evento (ADR-0047, dc5a7c2f/1acab1da). |
| #114 | [reports] expor modulo Relatorios (9 slices) — portar do legado; front bloqueado sem mock | reports/plugin.ts expõe 11 rotas /reports/* — o módulo foi portado. |
| #113 | [budget-plans] expor Plano Orcamentario (Planejamento + Consolidado ABC) — portar do legado | Módulo budget-plans completo: plano, árvore, orçamentos, 4 modelos, consolidated-result + CSV. |
| #95 | [EPIC] FIN-DETAIL — drawer de Detalhe completo (GET /api/v2/financial/documents/:id) | GET /financial/documents/:id devolve série, taxonomia, payeeBank e versão (schemas.ts:292-340, PR #254). |
| #63 | [financial] Fatia 8 — integracao cross-modulo (Contratos + Orcamento) | contractRef/budgetPlanRef no domínio + taxonomia 5 níveis (#502) + realized-by-plan-reader. |
| #62 | [financial] Fatia 7 — ingestao via OCR + enriquecimento | document-reader/cascade.ts + native-pdf.ts + autofill por CNPJ + rota /documents/with-source-file (48a5ac82). |
| #897 | [financial] reclassificar taxonomia de gasto pago entrou sob reconciliation:write, sem alcada propria | addb690b decidiu: as alçadas ficam FUNDIDAS, nada a mudar no preHandler. A issue pede o que já foi decidido não fazer. |
| #864 | [financial] lote de boleto: 223-224 sai em branco onde o G059 AB exige 01, e o Segmento J-52 nao e emitido | J-52 passou a ser emitido (PR #928); 223-224 em branco é decisão explícita no multipag-records.ts:219-222. |
| #892 | [financial] Ancora M2 — reclassificar a taxonomia (5 niveis) na conciliacao (PR #889) | 04f24df8 é ancestral do HEAD (CHANGELOG:18). A âncora entregou; as fatias #898-#913 já vivem sozinhas. |
