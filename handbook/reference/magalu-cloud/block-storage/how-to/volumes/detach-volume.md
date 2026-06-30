# Desanexar Volume de uma Instância

Após desanexar o volume de uma instância, este volume fica disponível para anexar em qualquer outra instância.

## Pré-requisitos

*   O volume deve estar no estado disponível (available)
*   A VM deve estar no estado ligada ou desligada (running, stopped). Recomendamos que faça essa operação com a máquina desligada (stopped) para não gerar inconsistência nos seus dados.
*   A VM e o Volume não devem ter nenhuma ação em progresso.

Você pode desanexar um volume por meio de Block Storage ou Virtual Machines.

## Por Block Storage

👣 *Inicio > Menu > Block Storage > Volumes > Desanexar Volume*

Na listagem de volumes da página de Block Storage:

1.  Clique no menu do volume que deseja desanexar
2.  Clique em "Desanexar Volume"
3.  Confirme a operação clicando em "Desanexar"

## Por Virtual Machines

👣 *Inicio > Menu > Virtual Machines > Instâncias > Detalhes da Instâncias > Volume > Desanexar Volume*

Na listagem de volumes da página de Volumes em Detalhes de Instância:

1.  Clique no menu do volume que deseja desanexar
2.  Clique em "Desanexar Volume"
3.  Confirme a operação clicando em "Desanexar"

## Via CLI

Para desanexar um volume de uma instância execute o seguinte comando ajustando a flag:

| Nome | Tipo | Descrição | Obrigatório |
|------|------|-----------|------------|
| id | string | O id do volume | Yes |

```bash
mgc block-storage volumes detach --id "ccea5ec2-851a-4c76-b8dd-dd53a025c96e"
```
