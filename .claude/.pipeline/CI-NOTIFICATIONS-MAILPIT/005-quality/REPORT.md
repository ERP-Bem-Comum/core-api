# W3 — REPORT (CI-NOTIFICATIONS-MAILPIT, #135/US4)

## Gate do repo (sessão)
- `typecheck` (tsc --noEmit) ✅
- `format:check` (prettier) ✅
- `lint` (eslint) ✅ — corrigido `prefer-regexp-exec` no teste da config.
- `test` (node --test) ✅ **3498 pass / 0 fail** · 18 skipped · **3516 total** (+5 do teste da config).

## CAs
- **CA1** (runner declara mailpit + envs SMTP) ✅ — teste da config 5/5 GREEN.
- **CA2** (workflow com path filter + `workflow_dispatch` + roda a suíte) ✅.
- **CA3** (actions pinadas por SHA) ✅.
- **CA4** (gate intacto — `pnpm test` puro segue skipando a integração de notifications) ✅ — 2 SKIP confirmados.
- **CA5** (suíte unit sem regressão ≥3374) ✅ — 3498 pass.

## Validação ao vivo (x99 — o que destravou o ticket)
Mailpit real no x99 (`docker run` + túnel SSH `-L 1025`): a suíte de e-mail migrada rodou **3/3 GREEN**
(CA-T7 envio real · CA-T8 invalid-recipient · CA-T9 transport-failed), sem rede externa. Isso é a prova
que o ticket original não conseguia fazer ("Docker proibido nesta sessão") — agora possível com o x99.

## CA6 (pós-merge, por design)
O caminho do runner (`docker compose up -d mailpit --wait`) é validado no **CI** no primeiro PR que tocar
notifications — o próprio `000-request` define o CA6 como pós-W3-local. A validação substantiva (suíte ×
Mailpit real) foi feita nesta sessão; a orquestração compose é padrão (serviço `mailpit` já existia).
