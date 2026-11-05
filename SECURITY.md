# Política de segurança — core-api (ERP Bem Comum)

## Como reportar uma vulnerabilidade

**Não abra issue pública.** Use o reporte privado do GitHub:
**Security → Report a vulnerability** neste repositório
(<https://github.com/ERP-Bem-Comum/core-api/security/advisories/new>).

Inclua o que for possível: a rota afetada, os passos para reproduzir, o impacto esperado e a versão (commit
ou tag) em que você observou o problema. O relato fica visível só para os mantenedores.

## O que acontece depois

| Etapa                                    | Prazo-alvo                            |
| :--------------------------------------- | :------------------------------------ |
| Confirmação de recebimento               | 2 dias úteis                          |
| Triagem e severidade                     | 5 dias úteis                          |
| Correção de **crítica/alta** em produção | o quanto antes, com hotfix se preciso |

## Versões suportadas

Só a `main` (produção, versão em tag `v*`) recebe correção de segurança. A `dev` é homologação.

## Travas automáticas deste repositório

- `audit (produção — blocking)` é obrigatório em todo PR para `dev` e `main` e falha fechada
  (`.github/workflows/audit.yml`).
- Auditoria diária da `main` e da `dev`. Se ficar vermelha, abre uma issue `seguranca` atribuída aos
  responsáveis.
- Quarentena de 1 dia e `trustPolicy: no-downgrade` no pnpm, protegidas por
  `tests/infra/supply-chain-guard.test.ts`.
- A `main` só recebe PR da `dev`, de `release/*` ou de `hotfix/*`, sempre com versão nova e CHANGELOG
  coerente (`promotion-gate.yml`). A tag e a release são criadas no merge (`release-tag.yml`).
- Escaneamento de segredos com bloqueio no push, CodeQL e alertas do Dependabot.
