# Criar um snapshot de volume

Para criar um snapshot do volume execute o comando abaixo:

## Console

1. Ao final do grid de listagem de Volumes clicar no ícone de menu
2. No menu, clicar em Criar snapshot
3. Escolha um nome para o snapshot e clique em criar snapshot

## MGC-CLI

```bash
mgc block-storage snapshots create --name "block-snapshot"  --volume.id "0e2dc76-1215-47a7-9fc3-a5b45d5dbedc" --type "instant"
```

> O parâmetro `type` pode ser usado para especificar o tipo do snapshot a ser criado. Caso não seja especificado o padrão é a criação do tipo *instant*. Para maiores informações consulte [tipos de snapshot](types-snapshot.md)
