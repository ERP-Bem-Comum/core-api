# Restaurar um snapshot

Para restaurar um snapshot em uma nova instância, utilize o Console ou a CLI conforme abaixo.

## Console

👣 Início > Menu > Virtual Machines > Meus Snapshots

Na página de Virtual Machines, na aba de "Meus Snapshots":

1. Clique no menu do snapshot que deseja restaurar.
2. Clique em **"Restaurar Snapshot"**.
3. Escolha um tipo de instância com disco igual ou maior ao snapshot.
4. Defina ou selecione a chave SSH.
5. Defina um nome para a instância restaurada.

> O snapshot precisa estar no estado **Disponível** para poder ser restaurado.

## CLI

```
mgc virtual-machine snapshots restore \
  --id="snapshot-id" \
  --name="restored-instance-name" \
  --machine-type.id="machine-type-id" \
  --machine-type.name="machine-type-name" \
  --network.associate-public-ip=true \
  --network.interface.id="interface-id" \
  --network.interface.security-groups='[{"id":"security-group-id"}]' \
  --network.vpc.id="vpc-id" \
  --network.vpc.name="vpc-name" \
  --ssh-key-name="ssh-key-name"
```

## Flags disponíveis

| Nome | Tipo | Descrição | Obrigatório |
|------|------|-----------|-------------|
| `--id` | string | ID do snapshot a ser restaurado | Sim |
| `--name` | string | Nome da nova instância | Sim |
| `--machine-type.id` | string | ID do tipo de instância | Sim (ou name) |
| `--machine-type.name` | string | Nome do tipo de instância | Sim (ou id) |
| `--network.associate-public-ip` | boolean | Define se a instância terá IP público associado | Não |
| `--network.interface.id` | string | ID da interface de rede | Sim (ou security-groups) |
| `--network.interface.security-groups` | array | Lista de security groups (em JSON) | Sim (ou id) |
| `--network.vpc.id` | string | ID da VPC | Sim (ou name) |
| `--network.vpc.name` | string | Nome da VPC | Sim (ou id) |
| `--ssh-key-name` | string | Nome da chave SSH a ser utilizada | Sim |
