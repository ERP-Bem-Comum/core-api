# Criar um snapshot com block

## Execução de Snapshots em VMs com Disco Raiz e Block Storage

### Visão geral

Snapshots e Imagens são recursos distintos dentro da Magalu Cloud e atendem a objetivos diferentes ao longo do ciclo de vida de uma máquina virtual.

Este documento descreve como executar snapshots em VMs que utilizam disco raiz e Block Storage, explicando o comportamento da plataforma e os fluxos recomendados conforme o objetivo desejado — **backup**, **restore** ou **criação de novas VMs**.

---

## Arquitetura de discos em VMs

Uma máquina virtual pode ser composta por:

### Disco raiz (root disk)

Responsável pelo sistema operacional, bootloader e configurações básicas da VM.

### Block Storage anexado

Volume adicional, com ciclo de vida independente da VM, geralmente utilizado para:

* Dados persistentes
* Bancos de dados
* Armazenamento de aplicações

Cada Block Storage possui **identidade própria** e **não pode ser utilizado simultaneamente por mais de uma VM**.

---

## O que um snapshot captura

Ao executar um snapshot de uma VM, a plataforma registra:

* O estado do disco raiz
* O estado dos volumes anexados
* Os metadados de mapeamento entre a VM e seus discos

Isso significa que o snapshot representa o **estado completo da VM naquele momento**, incluindo a associação lógica entre discos e volumes.

---

## Uso de snapshots

### → Snapshot para backup ou restore da própria VM

**Objetivo:** Recuperar o estado original da VM.

**Comportamento esperado:**

* Disco raiz e Block Storage são restaurados conforme o snapshot
* A associação original entre a VM e seus volumes é preservada

### → Snapshot como base para criação de novas VMs

**Objetivo:** Criar uma nova VM a partir de um estado existente.

Quando um snapshot que contém Block Storage é utilizado nesse contexto:

* A nova VM herda os metadados do snapshot
* O sistema tenta reutilizar o mesmo Block Storage
* Como o volume já está em uso pela VM original, pode ocorrer **falha de inicialização**

---

## Fluxo recomendado para snapshots reutilizáveis

Quando o objetivo é criar novas VMs, o snapshot deve ser tratado como um **artefato intermediário**, e não como o artefato final.

Recomendações:

* Criar snapshots com a **VM desligada**, garantindo maior consistência do disco
* **Não é necessário religar a VM** antes da criação do snapshot

---

## Etapa 1 — Preparação da VM

1. Desligar a VM
2. Garantir que:
   * Todos os Block Storages estejam **desanexados**
   * Apenas o **disco raiz** permaneça associado

---

## Etapa 2 — Criação do snapshot

### Criar snapshot via Console

1. Acesse: 👣 **Início → Menu → Virtual Machines**
2. Na listagem de instâncias:
   * Localize a VM desejada
   * Clique no menu de ações da instância
3. Selecione a opção **Criar snapshot**
4. Defina o nome do snapshot (apenas: letras minúsculas, números, hífen, underscore)
5. Clique em **Criar snapshot**

### Listar snapshots via Console

👣 **Início → Menu → Virtual Machines → Meus snapshots**

### Criar snapshot via CLI

```
mgc virtual-machines snapshots create \
  --name my-snapshot \
  --virtual-machine.id 0e2dc76-1215-47a7-9fc3-a5b45d5dbedc
```

### Listar snapshots via CLI

```
mgc virtual-machines snapshots list
```

### Consultar detalhes de um snapshot via CLI

```
mgc virtual-machines snapshots get \
  --id f91b0872-997f-40b3-87fa-24bbba54658b
```

---

### Boas práticas recomendadas:

* Utilize snapshots com Block Storage anexado apenas para backup ou restore;
* Para provisionamento de novas VMs, utilize imagens:
  1. [https://docs.magalu.cloud/docs/computing/images/general-overview](https://docs.magalu.cloud/docs/computing/images/general-overview)
  2. [https://docs.magalu.cloud/docs/computing/images/import-custom-images/overview](https://docs.magalu.cloud/docs/computing/images/import-custom-images/overview)
