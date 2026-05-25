# Deletar um snapshot

Para deletar um snapshot da sua instância, você pode utilizar a Console ou CLI conforme descrito abaixo:

## Console

Acesse 🖥️ **Início > Menu > Virtual Machines > Meus Snapshots**

Na página de Virtual Machines, na aba de Meus Snapshots:

1. Clique no menu do snapshot que deseja deletar
2. Clique em "Excluir"
3. Confirme a operação digitando o nome da instância

## CLI

Execute o comando:

```
mgc virtual-machines snapshots delete --id 90e2dc76-1215-47a7-9fc3-a5b45d5dbedc
```

## Informação importante

> "A deleção dos snapshots é irreversível, não podendo ser recuperada depois."

No entanto, essa ação não afeta a instância original da qual o snapshot foi gerado, nem as instâncias criadas a partir desse snapshot.
