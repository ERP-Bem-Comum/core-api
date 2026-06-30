# Guia de Zonas de Disponibilidade da Magalu Cloud

As **Zonas de Disponibilidade** (_Availability Zones_) da Magalu Cloud são um recurso essencial para quem busca alta disponibilidade e resiliência na infraestrutura de TI. Este guia apresenta os conceitos, benefícios e as melhores práticas para utilizá-las de forma eficiente.

---

## O que são Regiões?

As regiões da Magalu Cloud são áreas geográficas compostas por um ou mais datacenters fisicamente separados, cada um contendo várias Zonas de Disponibilidade (_Availability Zones_). Elas permitem que você implante recursos próximos dos seus usuários finais, reduzindo latência e melhorando o desempenho das aplicações.

Cada região é projetada para oferecer alta disponibilidade e resiliência, com redundância física e lógica entre suas zonas. Isso garante maior proteção contra falhas e facilita o atendimento a requisitos regulatórios específicos.

## O que são Availability Zones?

AZs são locais físicos independentes dentro de uma mesma região da Magalu Cloud. Cada zona é projetada para oferecer alta disponibilidade e resiliência contra falhas.

### Por que elas são importantes?

- Reduzem o impacto de falhas em aplicações.
- Facilitam o balanceamento de carga e o failover.
- Garantem a continuidade dos serviços para os clientes.

## Estrutura da Nomenclatura

As AZs seguem o padrão: **país-região-zona**.

- **Exemplo:** `br-se1-a`
  - **br:** Brasil
  - **se1:** Região Sudeste 1
  - **a:** Zona específica

## Lista de Zonas Disponíveis

> No momento só temos Zonas disponíveis na região SE1. Em breve será disponibilizado em NE1.

### Lista de Zonas Disponíveis SE1

- br-se1-a
- br-se1-b
- br-se1-c

---

## Benefícios das Availability Zones

### Alta Disponibilidade

Se uma AZ ficar indisponível, os recursos em outra zona podem assumir o serviço automaticamente, minimizando impactos para os usuários.

### Balanceamento de Carga

O uso de balanceadores de carga permite distribuir o tráfego entre servidores em diferentes AZs, otimizando o desempenho e evitando sobrecargas.

> **Exemplo:** Em uma aplicação com servidores em duas AZs, se um servidor falhar, o tráfego pode ser redirecionado para o outro, evitando interrupções.

### Isolamento físico

AZs localizadas em locais geográficos distintos, protegidos contra desastres como incêndios, inundações ou falhas de energia.

### Interconexão redundante

Redes entre AZs projetadas para suportar tráfego intenso e oferecer comunicação consistente com baixa latência.

---

## Como Usar Availability Zones na Magalu Cloud

### Verifique as AZs Disponíveis

Para listar as zonas disponíveis para sua conta, use o comando abaixo na CLI:

```
mgc profile availability-zones list
```

> **Nota:** Certifique-se de que o produto que você deseja utilizar está disponível na AZ escolhida.

### Disponibilidade por Produto

Cada produto pode ter ofertas em determinadas zonas, para ter certeza da disponibilidade, siga as instruções abaixo:

- **Virtual Machines (VMs):** [Listar Tipos de Imagens para verificar disponibilidade](https://docs.magalu.cloud/docs/computing/virtual-machine/offers/offer-instances-type)
- **Virtual Machines (VMs):** [Listar Tipos de Máquinas para verificar disponibilidade](https://docs.magalu.cloud/docs/computing/virtual-machine/how-to/machine-types/list-machines-types/)
- **Block Storage:** [Listar Tipos de Volumes para verificar disponibilidade](https://docs.magalu.cloud/docs/storage/block-storage/how-to/volume-types/list-volume-types)
- **Block Storage:** [Copiar o snapshot object de uma região a outra](https://docs.magalu.cloud/docs/storage/block-storage/how-to/snapshots/copy-between-regions)

### Dicas e restrições

| **Produto** | **Impacto / Restrição** | **💡 Dica** |
|---|---|---|
| **Virtual Machines (VMs)** | ⚠️ Instâncias criadas em uma única AZ serão afetadas em caso de falha naquela AZ. | Use snapshots para recuperação rápida e configure redundância distribuindo VMs entre múltiplas AZs. |
| **Block Storage (BS)** | ⚠️ Apenas volumes e VMs na **mesma** AZ podem ser conectados. | Realize replicações manuais entre AZs para garantir segurança e disponibilidade dos dados. No momento só é possível realizar a cópia de snapshots da região MGL1 para as regiões SE1 ou NE1. |
| **Kubernetes (K8s)** | ⚠️ O serviço Kubernetes não está distribuído entre múltiplas zonas de disponibilidade (AZs). Atualmente, o cluster é implantado em apenas uma AZ. | 💡 Considere usar backup, plano de recuperação de desastres e estratégias de monitoramento proativas. |
| **Object Storage** | ✅ Dados replicados automaticamente entre AZs, sem necessidade de intervenção do cliente. | Utilize para armazenar dados críticos que exigem alta disponibilidade e resiliência. |
