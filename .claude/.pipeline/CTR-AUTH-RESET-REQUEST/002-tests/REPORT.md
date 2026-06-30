# W0 — Tests (RED)

- `tests/.../use-cases/request-password-reset.test.ts` (novo): conta ativa → token emitido + e-mail com link de origem confiável; conta inexistente → ok sem enviar (anti-enumeração); invalida tokens pendentes anteriores ao emitir novo.
- `tests/.../adapters/http/routes.test.ts` (+1): `/forgot-password` responde **202** para conta existente E inexistente (resposta uniforme).

RED: minter/mailer ports, use case e rota não existiam.
