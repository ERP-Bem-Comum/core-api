# Administrar Workspaces

A CLI possui uma ferramenta útil para agrupar configurações semelhantes e permitir que você alterne entre elas quando necessário: os workspaces.

Com os workspaces você pode, por exemplo, ter uma configuração diferente para cada região ou para cada tenant que deseja usar. Dessa forma, você não precisa alterar todas as configurações sempre que alternar entre regiões ou tenants, basta trocar o workspace.

```
mgc workspace
```

## Comandos Disponíveis

Os comandos disponíveis para gestão de workspaces são: `create`, `delete`, `current`, `list`, `set-current` e `select-current`.

### Criar um Workspace

```
mgc workspace create "meu-workspace"
```

### Listar Workspaces

```
mgc workspace list
```

### Definir Workspace Ativo

Para definir o novo workspace como ativo, você pode usar os comandos `set-current` ou `select-current`:

```
mgc workspace set-current "meu-workspace"
```

O comando `select-current` permite a seleção interativa, facilitada.

```
mgc workspace select-current
```

### Apagar um Workspace

```
mgc workspace delete "meu-workspace"
```

## Importante

**IMPORTANTE:** "os workspaces são armazenados localmente nos arquivos de configuração da CLI. Se você instalar a CLI em outro sistema, os workspaces não serão automaticamente disponibilizados na nova instalação."
