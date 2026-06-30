# Visão Geral

A Magalu Cloud oferece imagens pré-configuradas de **Windows e Linux com SQL Server**, permitindo que empresas implantem bancos de dados de forma rápida, segura e com alto desempenho, sem a necessidade de configurações manuais complexas.

As imagens já incluem o licenciamento adequado do SQL Server, com cobrança integrada à infraestrutura da máquina virtual.

---

## Versões Disponíveis de SQL Server

* **SQL Server 2022 Enterprise Edition**
  Edição mais completa, indicada para workloads críticos, com suporte a alta disponibilidade, desempenho avançado e recursos completos de Business Intelligence.

* **SQL Server 2022 Standard Edition**
  Edição intermediária, voltada para aplicações corporativas, oferecendo um equilíbrio entre custo, desempenho e funcionalidades.

* **SQL Server 2022 Web Edition**
  Versão otimizada para aplicações web e cenários de hospedagem, com foco em custo reduzido.

---

## Sistemas Operacionais

As imagens de SQL Server estão disponíveis nos seguintes sistemas operacionais:

* **Linux**
* **Windows Server 2022**

---

## Requisitos da Máquina

### Para VMs com Windows

* **vCPU**: mínimo de **4 vCPUs**
* **Memória RAM**: proporção mínima de **8 GB por vCPU** (mínimo de **32 GB de RAM**)
* **Disco**: mínimo de **100 GB**

### Para VMs com Linux

* **vCPU**: mínimo de **4 vCPUs**
* **Memória RAM**: proporção mínima de **8 GB por vCPU** (mínimo de **32 GB de RAM**)
* **Disco**: mínimo de **40 GB**

---

## Classes de VMs

> As imagens Microsoft SQL Server estão disponíveis exclusivamente para instâncias do tipo DP (Dedicated Performance).

Essas imagens **não podem ser utilizadas em instâncias BV (Balanced Value)**.

Caso seja necessário utilizar SQL Server, selecione uma instância **DP** durante a criação da máquina virtual.

Este tipo de Máquina Virtual (VM) garante:

* Recursos dedicados de CPU e memória
* Maior previsibilidade de desempenho
* Adequação aos requisitos de licenciamento e boas práticas do SQL Server
