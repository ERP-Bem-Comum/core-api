# Workspace

Workspace hold auth and runtime configuration, like tokens and log filter settings. Users can create as many workspaces as they choose to. Auth and config operations will affect only the current workspace, so users can alter and switch between workspaces without loosing the previous configuration

## Usage

```
mgc workspace [flags]
mgc workspace [command]
```

## Commands

```
create      Creates a new workspace
delete      Deletes the workspace with the specified name
get         Get current workspace.
list        List all available workspaces
set         Sets workspace to be used
```

## Flags

```
-h, --help   help for workspace
```
