# Guia de Deploy Seguro – Magalu Cloud

Este guia tem como objetivo orientar a criação e configuração segura de recursos na Magalu Cloud, com foco em ambientes de produção, homologação e testes.

---

## 1. Rede e Segurança

### VPC e Grupos de Segurança

*   Crie redes (VPCs) e Grupos de Segurança isolados para cada ambiente (produção, homologação, testes, etc.).
*   Adote a política de menor privilégio: permita apenas o tráfego estritamente necessário.
*   Prefira grupos de segurança personalizados com regras restritivas em vez de usar o grupo padrão.

---

## 2. Alta Disponibilidade

*   Distribua seus workloads entre diferentes zonas de disponibilidade e/ou regiões para garantir resiliência contra falhas localizadas.
*   Utilize serviços de balanceamento de carga (como LBaaS – _em desenvolvimento_) ou soluções de terceiros para garantir HA em workloads, DNS, etc.

---

## 3. Máquinas Virtuais (VM)

### Passo 1 – Criação da VM

*   Para VMs Linux, gere um par de chaves SSH localmente e utilize a chave pública (`.pub`) durante a criação.

### Passo 2 – Configuração de Segurança

*   Associe a VM a um grupo de segurança restritivo:
    *   Crie um novo grupo com regras mínimas, ou
    *   Utilize um grupo "hardened" existente, ou
    *   Ajuste o grupo padrão, fechando:
        *   Porta **22** para VMs Windows;
        *   Porta **3389** para VMs Linux.

### Passo 3 – Alteração de Senha (Windows)

*   Após o provisionamento, altere imediatamente a senha padrão da VM Windows.

### Passo 4 – Atualização do Sistema Operacional

*   Realize o login e execute a atualização completa do sistema operacional.

---

## 4. DBaaS (Banco de Dados como Serviço)

### Passo 1 – Criação

*   Utilize um nome de usuário não óbvio.
*   Configure uma senha forte e complexa.
*   Defina uma política de backup regular e automatizada.

### Passo 2 – Gestão de Privilégios

*   Crie usuários com privilégios mínimos necessários à aplicação, especialmente em bancos MySQL.

### Passo 3 – Acesso à Instância

*   Por padrão, o banco de dados aceita apenas conexões locais – **mantenha essa configuração sempre que possível**.
*   Se o acesso remoto for necessário:
    *   Utilize mecanismos seguros como tunelamento SSH, VPN ou autenticação mTLS;
    *   Permita o acesso apenas a IPs específicos.

---

## 5. Kubernetes

### Passo 1 – Restrições de Acesso

*   Por padrão, o servidor Kubernetes (API Server) pode estar acessível publicamente.
*   Solicite a criação de uma regra de firewall com uma allow-list de IPs autorizados.

### Passo 2 – Pós-Criação do Cluster

*   Faça o download do `kubeconfig` pelo Console da Magalu Cloud.
*   Realize o hardening do cluster conforme as necessidades da sua aplicação (restrição de permissões, RBAC, namespaces, etc.).

---

## 6. Block Storage

### Passo 1 – Criação do Volume

*   Habilite a **criptografia** durante a criação do volume.

---

## 7. Object Storage

### Passo 1 – Criação do Bucket

*   Escolha entre bucket **privado** ou **público**. Em caso de dúvida, crie como privado.

### Passo 2 – Política de Acesso

*   Para buckets privados:
    *   Defina policies restritivas: libere apenas as ações necessárias (ex: `s3:GetObject`, `s3:PutObject`);
    *   Limite o acesso a tenants específicos.

*   Exemplos de policy podem ser encontrados em:
    [Políticas no Object Storage](https://docs.magalu.cloud/docs/storage/object-storage/how-to/permissions/policies)

### Passo 3 – Segregação Adicional

*   A segregação de acesso pode ser feita por **IP** e **tenant**.
*   Para cenários onde isso não for suficiente:
    *   Utilize [Service Accounts](https://docs.magalu.cloud/docs/id-access/id-magalu/use-cases/service_accounts/)
    *   Ou crie múltiplos tenants.

---

## 8. Turia IAM

*   Organize seus recursos em múltiplas **Organizações** ou **Contas Pessoais**.
*   Delegue acesso com granularidade, sempre respeitando o princípio do menor privilégio.

📌 Em caso de dúvidas ou para suporte adicional, consulte nossa documentação ou entre em contato com a equipe de suporte da Magalu Cloud.

---

## Informações da Página

| Campo | Valor |
|-------|-------|
| Data de Publicação | 28/05/2025 |
| Versão | 1.0 |
