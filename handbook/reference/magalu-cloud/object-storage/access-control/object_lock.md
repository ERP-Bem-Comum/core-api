# Object Locking

O **Object Locking** é uma funcionalidade do Magalu Cloud que oferece proteção adicional para objetos armazenados, impedindo sua exclusão ou modificação por um período de retenção definido. Esse bloqueio pode ser aplicado tanto em nível de bucket quanto em objetos individuais, garantindo que todos os usuários, incluindo administradores, respeitem o período de retenção antes de qualquer alteração ou remoção dos objetos bloqueados. O Magalu Cloud suporta apenas o modo **Conformidade (Compliance)**, impedindo alterações até o vencimento da retenção.

---

## Objetivo Principal

O **Object Locking** garante a integridade e a conformidade dos dados ao permitir bloqueios temporários ou permanentes em objetos armazenados. Essa funcionalidade é essencial para cenários que exigem a preservação de dados por motivos legais, auditoria ou segurança.

### Benefícios do Object Locking:

- **Proteção contra alteração e remoção:** Objetos bloqueados permanecem imutáveis durante o período de retenção.
- **Conformidade regulatória:** Atende a normas que exigem imutabilidade de dados por períodos específicos.
- **Flexibilidade de bloqueio:** Possibilidade de definir retenção em buckets inteiros ou objetos individuais.

---

## Funcionamento do Object Locking

Ao ativar o Object Locking no Magalu Cloud, o comportamento das operações de modificação e exclusão muda. Como operamos apenas no modo **Conformidade (Compliance)**, os objetos não podem ser modificados ou excluídos até que o período de retenção expire.

### Considerações Importantes:

- O bloqueio pode ser ativado em **buckets inteiros** ou em **objetos individuais**.
- Objetos previamente armazenados **não são afetados** pelo bloqueio.
- Para bloquear objetos antigos, é necessário reenvio manual ou a criação de novas versões bloqueadas.
- O modo **Governança** não é suportado.

### Processo de Bloqueio:

1. **Ativação do versionamento do bucket:** O bucket precisa estar versionado para a ativação do locking, confira como ativar o versionamento em nossa Documentação
2. **Ativação do Locking:** Pode ser configurado no bucket durante sua criação ou aplicado a objetos específicos.
3. **Definição do Período de Retenção:** Feita no bucket ou no momento do upload do objeto.
4. **Visualização do Status:** O status do bloqueio pode ser consultado via CLI.

---

## Estrutura do Object Locking

A estrutura do **Object Locking** no Magalu Cloud segue o padrão de versionamento e retenção já utilizado em outros sistemas compatíveis com S3. Ela inclui:

- **Modo de Conformidade:** Todos os objetos bloqueados estarão imunes a qualquer alteração, independentemente das permissões atribuídas a usuários ou administradores, até que o período de retenção expire. (**O modo governança não é suportado**)
- **Período de Retenção:** O período de retenção é o intervalo de tempo durante o qual o objeto permanecerá bloqueado. Após o vencimento desse período, o objeto pode ser desbloqueado ou ter o bloqueio estendido. A partir do momento que o período de retenção acaba, o objeto pode ser excluído, para prolongar o período, é necessário realizar a ativação do bloqueio novamente.
- **Exclusão:** Ao tentar excluir um objeto bloqueado, o sistema não permitirá a ação, garantindo a preservação do objeto durante o período de retenção.

---

## Operações de Object Locking

- **Ativar Locking em um Bucket:** Garante que todos os objetos futuros sigam as regras de retenção.
- **Bloquear um Objeto Individual:** Define retenção específica para um objeto ou versão.
- **Visualizar o Status de Locking:** Permite verificar via CLI se o objeto está bloqueado e quando expira o bloqueio. Para instruções detalhadas sobre como realizar essas operações via CLI ou portal, consulte a Documentação.

---

## Procedimento de Desbloqueio

- O bloqueio é **irrevogável** até que o período de retenção expire.
- Para desbloquear antes do vencimento, o **proprietário do tenant** deve contatar o suporte do Costumer Service para iniciar o processo de identificação e formalização do desbloqueio.

---

## Casos de Uso

### Proteção contra Exclusão Acidental

Se um desenvolvedor acidentalmente tentar excluir dados críticos, o Object Locking impedirá essa remoção até que a retenção expire.

### Garantia de Imutabilidade

Quando for necessário garantir que os dados armazenados não sejam alterados ou excluídos, o Object Locking assegura essa imutabilidade até a expiração da retenção.

### Flexibilidade na Definição de Retenção

O Object Locking permite definir diferentes períodos de retenção para objetos dentro do mesmo bucket, oferecendo maior flexibilidade no gerenciamento de dados.
