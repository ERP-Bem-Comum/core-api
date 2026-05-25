# Estender um Disco Anexado

## Visão geral

Após estender o tamanho de um disco pelo console da plataforma, o sistema operacional da máquina virtual **não reconhece automaticamente** o novo espaço disponível. É necessário executar procedimentos adicionais dentro da VM para que o disco, a partição e o sistema de arquivos passem a utilizar o novo tamanho.

Este guia descreve como aplicar o novo espaço em discos anexados a VMs **Linux** e **Windows Server 2022**.

## Pré-requisitos

Antes de iniciar, verifique se:

*   O disco já foi estendido com sucesso pelo **Console**, **CLI** ou **Terraform**
*   A VM está **em execução**
*   Você possui acesso administrativo à VM:
    *   **Linux:** `root` ou usuário com `sudo`
    *   **Windows:** usuário **Administrador**
*   Existe um **snapshot recente do volume** (recomendado)

---

## Linux

### 1. Identificar o disco e o espaço disponível

Liste os discos e partições para confirmar que o sistema reconheceu o novo tamanho do disco:

```bash
lsblk
```

#### Verifique:

*   **Nome do disco** (ex: `/dev/vda`, `/dev/sda`)
*   **Partição associada** (ex: `/dev/vda1`)
*   **Presença de espaço não alocado**

### 2. Redimensionar a partição

Se o disco possuir apenas uma partição, normalmente ela pode ser expandida diretamente.

#### Utilizando `growpart`

```bash
sudo growpart /dev/vda 1
```

Onde:

*   `/dev/vda` → disco
*   `1` → número da partição

### 3. Expandir o sistema de arquivos

#### Sistemas de arquivos `ext4`

Comum em:

*   Ubuntu
*   Debian
*   Oracle Linux
*   Rocky Linux

```bash
sudo resize2fs /dev/vda1
```

#### Sistemas de arquivos `xfs`

Comum em:

*   Oracle Linux
*   Rocky Linux
*   Fedora

```bash
sudo xfs_growfs /
```

> ⚠️ **Importante:** o comando deve apontar para o **ponto de montagem**, não para o dispositivo.

### 4. Verificar o novo tamanho

```bash
df -h
```

Confirme que o sistema de arquivos está utilizando o novo espaço disponível.

## Observações importantes para Linux

*   O redimensionamento pode ser realizado **online**, sem necessidade de reinicializar a VM
*   Caso o disco possua **múltiplas partições** ou utilize **LVM**, o processo pode exigir etapas adicionais
*   Em ambientes críticos, execute o procedimento durante uma **janela de manutenção**

---

## Windows Server 2022

### Visão geral

No Windows Server 2022, após o disco ser estendido no console, o novo espaço aparece como **Não Alocado** e precisa ser incorporado ao volume existente.

### 1. Acessar o Gerenciamento de Disco

1.  Conecte-se à VM via **RDP**
2.  Pressione `Win + R`
3.  Digite `diskmgmt.msc` e pressione **Enter**

### 2. Identificar o disco estendido

*   Localize o disco correspondente
*   Confirme a presença de espaço **Não Alocado** ao final do volume

### 3. Estender o volume

1.  Clique com o botão direito no volume (**NTFS**)
2.  Selecione **Estender Volume**
3.  Siga o assistente:
    *   Utilize todo o espaço disponível
    *   Conclua o processo

### 4. Validar o novo tamanho

*   Verifique no **Gerenciamento de Disco**
*   Ou no **Explorador de Arquivos**, em **Este Computador**

## Observações importantes para Windows

*   O processo é **online** e não requer reinicialização
*   O volume deve estar formatado em **NTFS**

## Boas práticas

*   Sempre mantenha **snapshots atualizados** antes de realizar alterações em disco
*   Documente todas as alterações realizadas em **ambientes de produção**
