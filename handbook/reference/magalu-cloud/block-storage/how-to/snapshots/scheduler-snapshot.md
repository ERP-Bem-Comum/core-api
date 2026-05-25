# Como Criar Agendamento de Snapshot

_Atualizado em 15/09/2025_

## 🔹 Visão Geral

Este guia cobre todas as operações de **schedulers de snapshots** em **Block Storage** usando a CLI da Magalu Cloud (`mgc`).
Você aprenderá a:

* Criar agendamentos de snapshot.
* Associar volumes ao scheduler.
* Remover volumes.
* Listar agendamentos.
* Consultar detalhes de um scheduler específico.

> ⚠️ **Observação:** Atualmente, o agendamento é **sempre diário**. Frequências quinzenais ou mensais **não são suportadas**.
> ⏰ **Importante:** Todos os horários seguem o padrão **UTC**.
> Por exemplo, se você deseja que o snapshot seja criado às **15h no horário de Brasília (BRT)**, é necessário configurar o `start-time` para **18:00 UTC**.

---

## ✅ Pré-requisitos

Antes de iniciar, verifique que você possui:

* Uma conta ativa na Magalu Cloud
* CLI `mgc` instalada e configurada

> ℹ️ Esta funcionalidade está disponível a partir da **versão 0.48.0** da CLI e **ainda não está disponível via console Web**.

---

## 🗓️ Agendamento de Snapshots via CLI

Agora é possível gerenciar os agendamentos de snapshots diretamente pela CLI da Magalu Cloud utilizando a rota:

```bash
mgc bs schedulers
```

### Comandos disponíveis

* **attach** → Associa um volume a um agendamento.
* **create** → Cria um novo agendamento.
* **delete** → Remove um agendamento.
* **detach** → Desassocia um volume de um agendamento.
* **get** → Exibe os detalhes de um agendamento específico.
* **list** → Lista todos os agendamentos existentes.

---

## ⚙️ Criando um Agendamento de Snapshot

Exemplo: criar um snapshot diário às 02:00 UTC com retenção de 7 dias:

```bash
mgc block-storage schedulers create --name "snapshot-diario" --policy.frequency.daily.start-time "02:00" --policy.retention-in-days 7 --description "snapshot diario" --snapshot.type instant
```

**Principais flags:**

* `--name`: Nome do agendamento (obrigatório)
* `--description`: Descrição do scheduler
* `--snapshot.type`: Tipo do snapshot (`instant` ou `object`)
* `--policy.frequency.daily.start-time`: Horário de execução diária (HH:MM 24h, **UTC**)

  > Ex.: Para 15h BRT, configure `start-time` como **18:00 UTC**

* `--policy.retention-in-days`: Número de dias que o snapshot será mantido

---

## 📦 Associar Volumes ao Scheduler

Para incluir volumes no scheduler criado:

**Usando ID do volume:**

```bash
mgc block-storage schedulers attach "<ID_DO_AGENDAMENTO>" --volume.id="<ID_DO_VOLUME>"
```

**Usando nome do volume:**

```bash
mgc block-storage schedulers attach "<ID_DO_AGENDAMENTO>" --volume.name="<NOME_DO_VOLUME>"
```

### Limitações e Considerações

* **Número de volumes por agendamento:** Não existe limite de discos que podem ser associados a um mesmo agendamento de snapshot.
* **Número de agendamentos por volume:** Cada volume pode estar vinculado a apenas **um** agendamento de snapshot.

---

## 🔄 Listar Agendamentos Existentes

```bash
mgc block-storage schedulers list
```

---

## 🔎 Ver o Agendamento e os Discos Associados

Para consultar os detalhes de um agendamento e os volumes vinculados:

```bash
mgc block-storage schedulers get "<ID_DO_AGENDAMENTO>" --expand volume
```

---

## 🛑 Excluir um Agendamento

Se precisar remover um agendamento existente:

```bash
mgc block-storage schedulers delete "<ID_DO_AGENDAMENTO>"
```

ℹ️ **Atenção:** Ao excluir um agendamento, todos os discos associados a ele são removidos da rotina. Não é necessário excluir os discos individualmente antes de remover o agendamento.

---

## 🔗 Remover Disco do Agendamento

Para remover um volume específico de um scheduler:

```bash
mgc block-storage schedulers detach "<ID_DO_AGENDAMENTO>" --volume.id="<ID_DO_VOLUME>"
```

---

## 📌 Boas Práticas

* Defina janelas de baixa utilização (ex.: madrugada) para minimizar impacto de I/O.
* Configure retenção de snapshots adequada para evitar custos desnecessários.
