# Deletar volume

Para excluir permanentemente um volume, execute o comando abaixo.

## Pré-requisitos

- O volume a ser deletado não pode ter um snapshot gerado a partir dele.

> Orientamos primeiramente sempre a desanexar volumes de sua instância para que não haja acidentes ou inconsistências nos dados dos recursos que escolher manter.

## Console

### Por Block Storage

Início > Menu > Block Storage

Na listagem de volumes da página de Block Storage:

1. Clique no menu do volume que deseja deletar
2. Clique em Excluir
3. Confirme a operação digitando o nome do volume

> A deleção dos volumes é irreversível, não podendo ser recuperada.

### Por Virtual Machines

Início > Menu > Virtual Machines > Instâncias > Detalhes da Instâncias > Volume

Na listagem de volumes da página de Volumes em Detalhes de Instância:

1. Clique no menu do volume que deseja deletar
2. Clique em Excluir
3. Confirme a operação digitando o nome do volume

> A deleção dos volumes é irreversível, não podendo ser recuperado depois.

## CLI

Para deletar um volume você precisará das seguintes flags:

| Name | Type | Description | Required |
|------|------|-------------|----------|
| id | string | O id do Volume | Yes |

```bash
mgc block-storage volumes delete --id 6e4be608-172a-4e5c-ac5c-ce6d44415266
```
