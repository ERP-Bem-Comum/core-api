# Restaurar um snapshot de volume

A restauração de um snapshot poderá ser feita na criação de um novo volume. Esta mesma ação estará disponível no console em breve.

Para a referência do snapshot podem ser usados 2 tipos de parâmetros:

| Nome | Tipo | Descrição |
|------|------|-----------|
| id | string | O id do snapshot |
| name | string | nome do snapshot |

## MGC-CLI

```bash
mgc block-storage volumes create --name="mysnapshot" -size="10" --type.name="cloud_nvme10k" --snapshot.id="00e295b5-5a4a-46bc-8237-f2682a786928"
```
