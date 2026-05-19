[← Voltar ao Handbook](../README.md)

# 🔧 Operações

> Runbooks, post-mortems e playbooks operacionais.
>
> **Esta seção começa vazia e cresce conforme o sistema entra em produção.** Cada incidente relevante e cada procedimento recorrente devem gerar (ou atualizar) documentação aqui.

---

## 📂 Estrutura Sugerida

```
operations/
├── README.md                  ← (você está aqui)
├── runbooks/                  ← Procedimentos para problemas recorrentes
│   ├── outbox-dead-letter.md
│   ├── db-restore.md
│   └── ...
├── incidents/                 ← Post-mortems sem culpa
│   ├── 2026-NN-NN-titulo.md
│   └── ...
└── playbooks/                 ← Procedimentos planejados
    ├── release-prod.md
    ├── rollback.md
    └── ...
```

---

## 🚧 Estado Atual

Esta seção será populada conforme:
- Primeiro deploy em staging → playbooks de release/rollback.
- Primeiro deploy em prod → playbooks expandidos, runbooks de DB.
- Primeiro incidente → post-mortem + runbook derivado.

---

## 📋 Templates

> A criar quando a primeira necessidade real surgir, com base no aprendizado real do time. Não pré-otimizar.

### Template de Runbook (esboço)

```markdown
# Runbook: <Sintoma observado>

## Quando este runbook se aplica
<Condições objetivas — ex: "alerta X disparou", "métrica Y > Z">

## Diagnóstico
1. ...
2. ...

## Resolução
1. ...
2. ...

## Escalação
<Quem chamar se este runbook não resolver>

## Prevenção
<O que mudar no sistema para isso não acontecer de novo>
```

### Template de Post-Mortem (esboço)

```markdown
# Incidente YYYY-MM-DD: <Título descritivo>

## Resumo
<2-3 linhas — o que aconteceu, impacto, duração>

## Linha do tempo
- HH:MM — ...
- HH:MM — ...

## Causa raiz
<Análise técnica, sem culpa pessoal>

## Resolução imediata
<O que foi feito para parar o sangramento>

## Aprendizados
- ...

## Ações de follow-up
- [ ] ...
- [ ] ...
```

---

## 🔗 Relação com Outras Seções

- [`../infrastructure/04-observability-baseline.md`](../infrastructure/04-observability-baseline.md) — alertas que disparam runbooks.
- [`../architecture/`](../architecture/README.md) — entender o sistema antes de operá-lo.
