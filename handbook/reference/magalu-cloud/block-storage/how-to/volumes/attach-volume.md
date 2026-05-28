# Anexar Volume a uma Instância

Anexar um volume a uma máquina virtual (VM) permite que você utilize o volume como um disco de armazenamento regular. Um volume pode ser anexado a apenas uma VM por vez, mas uma VM pode ter múltiplos volumes anexados.

## 💡 Boas Práticas

Seguindo as boas práticas recomendadas, a quantidade máxima de discos em uma VM é de **8**. Considere o disco local e uma quantidade máxima de 7 discos adicionais anexados.

## Pré-requisitos

- O volume deve estar no estado disponível (available)
- O volume não deve estar anexado a nenhuma outra instância
- A VM deve estar no estado ligada ou desligada (running, stopped)
- A VM não deve ter nenhuma ação em progresso.

Você pode criar um novo volume por meio de Block Storage ou Virtual Machines.

Para anexar um volume a uma instância, execute o comando abaixo.

## Por Block Storage

👣 *Inicio > Menu > Block Storage > Volumes > Anexar instância*

Na listagem de volumes da página de Block Storage:

1. Clique no menu do volume que deseja anexar
2. Clique em "Anexar Instância"
3. Selecione a instância que deseja anexar

> Nota: Para anexar um volume a instância, as instâncias listadas são as disponíveis na mesma região e Zona de Disponibilidade que o volume foi provisionado.

4. Clique em "Anexar"

## Por Virtual Machines

👣 *Inicio > Menu > Virtual Machines > Instâncias > Detalhes da Instâncias > Volume > Anexar volume existente*

Na listagem de volumes da página de Volumes em Detalhes de Instância:

1. Clique em "Anexar volume existente"
2. Selecione a instância que deseja anexar

> Nota: Para anexar um volume a instância, os volumes listados são os disponíveis na mesma região e AZ que a instância foi provisionada.

3. Clique em "Anexar"

## CLI

Para anexar um volume a uma instância você precisará executar o comando utilizando as seguintes flags:

| Name | Type | Description | Required |
|------|------|-------------|----------|
| id | string | O id do volume | Yes |
| virtual-machine-id | string | O id da virtual machine | Yes |

```bash
mgc block-storage volumes attach --id "ccea5ec2-851a-4c76-b8dd-dd53a025c96e" --virtual-machine-id "0dc3972c-d378-47d1-8a94-5aa8d8aaba5c"
```
