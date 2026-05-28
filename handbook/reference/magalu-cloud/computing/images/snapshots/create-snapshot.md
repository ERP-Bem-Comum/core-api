# Criar um snapshot

Para criar um snapshot da sua instância execute o comando abaixo:

> info
>
> Caso a sua instância se encontre ligada, recomendamos que antes de criar o snapshot você desligue a instância para não gerar inconsistência nos dados do snapshot.

## 🖥️ Console

👣Início > Menu > Virtual Machines

Na listagem de instâncias da página de Virtual Machines:

1. Clique no menu da instância que deseja criar um snapshot
2. Clique em "Criar snapshot"
3. Uma sugestão de nome é fornecida mas você pode definir o nome do snapshot de sua preferência. Para o nome do snapshot são permitidas apenas letras minúsculas, hífen, underline e números.
4. Clique em "Criar snapshot"

## CLI

```
mgc virtual-machines snapshots create --name my-snapshot  --virtual-machine.id 0e2dc76-1215-47a7-9fc3-a5b45d5dbedc
```
