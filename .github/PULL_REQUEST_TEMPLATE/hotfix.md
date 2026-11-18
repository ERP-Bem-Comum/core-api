<!--
Template de HOTFIX. Fluxo (Gitflow):
  main ──► hotfix/xxx ──PR──► dev (HML) ──► validado ──PR (mesma branch)──► main (produção)
A branch nasce da `main` para que o PR na `main` leve SÓ a correção, nunca as features que estão
na `dev` esperando release. O workflow `hotfix` confere isso em todo PR de `hotfix/*`.
-->

## Para onde vai este PR

- [ ] `dev`: primeira etapa, para validar na HML
- [ ] `main`: segunda etapa, depois da validação na HML (mesma branch `hotfix/*`)

## O problema em produção

<!-- O que quebrou, desde quando, quem é afetado. Link da issue/incidente. -->

Closes #

## Causa e correção

<!-- Causa raiz em uma ou duas frases e o que a mudança faz. Hotfix é mínimo: nada além da correção. -->

## Validação na HML

<!-- Preencha antes de abrir o PR para a `main`. -->

- Quem validou:
- Como (passos ou evidência):

## Checklist

- [ ] A branch `hotfix/*` nasceu da `main`, não da `dev`
- [ ] A mudança contém só a correção (sem refatoração ou feature junto)
- [ ] Teste que reproduz o defeito e passa com a correção
- [ ] Validado na HML depois do merge na `dev`
- [ ] PR para a `main` aberto a partir da **mesma** branch
- [ ] Smoke test em produção depois do deploy
