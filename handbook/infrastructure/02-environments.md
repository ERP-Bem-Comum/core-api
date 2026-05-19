[← Voltar para Infraestrutura](./README.md)

# 🌐 Ambientes

> **Status:** vigente | **Última revisão:** 2026-04-27

---

## 1. Inventário

Três ambientes obrigatórios:

| Ambiente | Propósito | Dados | Acesso |
| :--- | :--- | :--- | :--- |
| `dev` | Desenvolvimento local + integração contínua | Sintéticos / anonimizados | Time de dev |
| `staging` | Validação pré-produção, ensaios de release | Dump anonimizado de prod | Dev + QA + P.O. |
| `prod` | Produção | Reais | Operação restrita |

---

## 2. Princípio do Espelhamento

> **Staging deve ter a MESMA topologia que prod.**

Sem exceção:
- ✅ Mesmo número de réplicas por serviço.
- ✅ Mesmo modo de gerenciamento de DB (managed/HA, mesma classe de instância).
- ✅ Mesma camada de observabilidade.
- ✅ Mesmas regras de rede.
- ✅ Mesmos alertas configurados.

Diferenças aceitas:
- Tamanho de instâncias (staging pode ser menor — mas não muito).
- Volume de dados.
- Limites de rate limit (staging pode ser mais permissivo).

> **Por quê:** bugs de concorrência, condições de corrida, comportamento sob HA — tudo isso só aparece em ambiente realista. Staging "simplificado" mente.

---

## 3. Promoção entre Ambientes

```
dev ──► staging ──► prod
```

| Promoção | Trigger | Aprovação |
| :--- | :--- | :--- |
| `dev` → `staging` | PR aprovado em `main` | Automática |
| `staging` → `prod` | Tag de release + janela de deploy | Manual |

> ❌ **Nunca** deployar direto de `dev` para `prod`.

---

## 4. Dados em Staging

Dump de produção é **anonimizado** antes de ser carregado em staging:

| Campo | Tratamento |
| :--- | :--- |
| Nomes de pessoas | Substituir por valores fictícios (`Fulano da Silva`, etc.) |
| CPF / CNPJ | Substituir por gerados válidos para teste |
| Email | Substituir por `<id>@example.local` |
| Telefone | Substituir por padrão fictício |
| Endereço | Manter cidade/UF, anonimizar resto |
| Valores financeiros | Preservar (auditoria de cálculo) |
| Datas | Preservar (auditoria temporal) |
| Tokens, secrets, chaves API | **NÃO copiar** |

> Ferramentas e scripts de anonimização: a definir com infra/security antes do primeiro carregamento de staging.

---

## 5. Janelas de Manutenção

| Ambiente | Janela | Comunicação |
| :--- | :--- | :--- |
| `dev` | Livre, sem SLA | Mensagem no canal do time |
| `staging` | Aviso de **1 dia útil** | Canal de QA + P.O. |
| `prod` | Janela formal pré-acordada | Comunicado oficial aos stakeholders |

---

## 6. Acesso e Permissões

### 6.1. dev

- Time de dev tem acesso total (incluindo escrita).
- Reset/recreate frequente é OK.

### 6.2. staging

- Dev: acesso de leitura + deploy via pipeline.
- QA: acesso para executar testes.
- P.O.: acesso para validação de UAT.
- Acesso direto ao banco: leitura apenas (via `readonly_bi`).

### 6.3. prod

- **Acesso restrito** a um pequeno time de operação.
- Mudanças via pipeline — **nunca** SSH/manual.
- Acesso ao banco: emergência apenas, com auditoria, via break-glass procedure (a definir).

---

## 7. SLAs Internos

| Item | dev | staging | prod |
| :--- | :--- | :--- | :--- |
| Disponibilidade | Best effort | 99% | 99.9% |
| RPO (Recovery Point) | 1 dia | 4 horas | 15 minutos |
| RTO (Recovery Time) | 4 horas | 1 hora | 30 minutos |

> Valores conservadores iniciais. Revisar após primeiros 3 meses em prod.

---

## 8. Referências

- [`./01-infra-handoff.md`](./01-infra-handoff.md) — handoff principal.
- [`./04-observability-baseline.md`](./04-observability-baseline.md) — alertas e SLOs.
