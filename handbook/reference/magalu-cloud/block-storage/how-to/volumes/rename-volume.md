# Renomear volume

Para renomear um volume, execute o comando abaixo na CLI ajustando os parâmetros das flags conforme necessidade. Esta mesma ação estará disponível no Console em breve.

| Nome | Tipo | Descrição | Mandatório |
|------|------|-----------|-----------|
| id | string | O id da instância | Sim |
| name | string | O novo nome da instância | Sim |

```bash
mgc block-storage volumes rename --id="0377d966-4a2d-485f-81b9-37273ba26471" --name="nem_name_volume"
```
