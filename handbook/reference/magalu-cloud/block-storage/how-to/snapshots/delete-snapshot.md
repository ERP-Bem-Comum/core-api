# Deletar um snapshot de volume

Para deletar um snapshot execute o comando abaixo:

## Console

Acesse **Inicio > Menu > Block Storage > Meus snapshots**

Na página de Block Storage na aba de Meus Snapshots:

1. Clique no menu do snapshot que deseja deletar
2. Clique em "Excluir snapshot"
3. Confirme a operação digitando o nome do snapshot

## MGC-CLI

```bash
mgc block-storage snapshots delete --id 90e2dc76-1215-47a7-9fc3-a5b45d5dbedc
```

> A deleção dos snapshots é irreversível.

> Os snapshots tem dependência com o volume principal sendo assim, não é possível a sua deleção.
