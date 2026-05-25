# Tipos de Snapshots

Existem atualmente 2 tipos de snapshots para volumes:

- **Instant**: um snapshot de alta performance, armazenado em **SSD NVMe**, projetado para cargas de trabalho que exigem velocidade e recuperação imediata dos dados.

**Cenários de Uso** Aplicações que necessitam de snapshots para testes, desenvolvimento ou recuperação de falhas de maneira rápida, como ambientes de CI/CD ou desenvolvimento de software.

- **Object**: um snapshot de armazenamento durável e econômico, salvo em object storage. Ideal para backups de longo prazo e retenção de dados, com foco em segurança e baixo custo.

**Cenários de Uso** Backups de longo prazo, arquivamento e conformidade regulatória, onde a recuperação rápida não é crítica, mas sim a durabilidade e o custo.

## Comparativo de snapshots

| Atributo | Instant | Object |
|----------|---------|--------|
| Dispositivo | SSD NVMe | HDD |
| Performance | Extremamente rápido | Moderado |
| Recuperação | quase instantânea | mais lenta |

> Para consulta de preços consulte nossa [página de preços](https://magalu.cloud/precos/block-storage/).
