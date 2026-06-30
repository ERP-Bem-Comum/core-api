# W0 — Rede de segurança · NOTIF-EMAIL-OUTBOX-RETIRE

> Skill: `tdd-strategist` · Outcome: **RED** (rede de segurança da remoção)

Fatia de remoção — sem "RED por API inexistente" clássico. W0 ajustou/removeu os testes dos componentes
mortos e garantiu rede de segurança: `email-dispatch` + os 3 fluxos (reset/invite/collaborator) seguem
verdes via `auth_outbox` + `par_email_outbox`. CA1 (zero referência ao morto) e CA2 (vivos intactos) como alvo.
