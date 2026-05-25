# Cópia de Snapshot entre Regiões

## Pré-requisitos

- [Baixar a CLI](../../../devops-tools/cli-mgc/how-to/download-and-install.md)
- [Realizar login na CLI](../../../devops-tools/cli-mgc/how-to/auth.md)

Para copiar um snapshot entre regiões, execute o comando na CLI. Esta mesma ação estará disponível no console em breve.

```
mgc virtual-machines snapshots copy \--id 90e2dc76-1215-47a7-9fc3-a5b45d5dbedc \--destination-region br-se1
```

## Contexto para Clientes Migrando da Região `br-mgl1`

> Acesse a [documentação completa sobre migração de VMs](https://docs.magalu.cloud/docs/computing/virtual-machine/how-to/general/mgl1-migrations)

Se você está realizando uma migração devido a descontinuidade da região `br-mgl1`, você deve adicionar a flag `--region` especificando a região de origem do snapshot:

```
mgc virtual-machines snapshots copy --region br-mgl1 --id SNAPSHOT-ID --destination-region br-se1
```

> Flag `--region`: Especifica a região de origem do snapshot. Essa flag é necessária quando a região configurada na CLI (com `mgc config set region`) é diferente da região do snapshot.

## Flag

| Nome | Tipo | Descrição | Obrigatório |
|------|------|-----------|------------|
| id | string | ID do Snapshot | Yes |
| destination-region | string | Regions (one of "br-mgl1", "br-ne1" or "br-se1") | Yes |

> Nesta versão da funcionalidade de Cópia de Snapshot entre Regiões só está disponível a cópia de snapshots da região de MGL1 para SE1 ou NE1
