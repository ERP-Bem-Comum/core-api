# Como criar um Grupo de Segurança

## O que são os Grupos de Segurança

Os Grupos de Segurança na Magalu Cloud são conjuntos de regras que controlam o tráfego de rede de entrada e saída das instâncias na sua rede. Eles atuam como uma camada de segurança essencial, protegendo suas aplicações e dados contra acessos não autorizados. Com os Grupos de Segurança, você pode definir regras baseadas em critérios como endereços IP de origem e destino, protocolo e portas.

Cada instância de VM pode ter um ou mais Grupos de Segurança associados, e cada um pode conter múltiplas regras, permitindo uma configuração flexível e detalhada para atender às necessidades de segurança da sua aplicação.

Por questões de segurança toda nova instância de VM criada já nasce com um Grupo de Segurança padrão associado. Sempre se certifique que suas regras de segurança estão atualizadas e que estão sendo corretamente aplicadas as VMs correspondentes.

## Regras de Entrada e Saída

- **Regras de Entrada** (_Ingress_): Especificam o tráfego que é permitido entrar nas instâncias associadas ao Grupo de Segurança. Por exemplo, você pode criar uma regra para permitir conexões SSH (porta 22) apenas a partir de endereços IP específicos.
- **Regras de Saída** (_Egress_): Especificam o tráfego que é permitido sair das instâncias associadas ao Grupo de Segurança. Estas regras garantem que apenas o tráfego autorizado possa sair das suas instâncias, protegendo contra acessos indesejados.

> ⚠️ **Ponto de Atenção Essencial**: "Grupos de Segurança personalizados que não possuem uma regra de saída (_Egress_) para a internet (`0.0.0.0/0`) impedirão o boot da instância."

## Como criar um Grupo de Segurança

Para criar um Grupo de Segurança na Magalu Cloud:

1. **Acesse o Painel de Controle da Magalu Cloud**: Faça login na sua conta e navegue até a seção de redes.
2. **Crie um Novo Grupo de Segurança**: Clique na opção para criar um novo Grupo de Segurança e forneça um nome e descrição para facilitar a identificação.
3. **Defina Regras de Entrada**: Adicione regras de entrada especificando os critérios como protocolo, portas e endereços IP de origem.
4. **Defina Regras de Saída**: Adicione regras de saída especificando os critérios como protocolo, portas e endereços IP de destino.
5. **Associe o Grupo de Segurança às Instâncias de Máquinas Virtuais**: Após criar o Grupo de Segurança com as regras desejadas, associe-o às instâncias que precisam ser protegidas.

Os Grupos de Segurança na Magalu Cloud oferecem uma maneira eficiente de gerenciar e aplicar políticas de segurança, garantindo que suas aplicações permaneçam seguras e acessíveis apenas para tráfego autorizado.

### Criar o Grupo de Segurança (Console)

👣 *Inicio > Menu > Network > Grupos de Segurança*

Na página de Grupos de Segurança, clique no botão para `+ Criar grupo de segurança`.

1. Defina um nome para o grupo
2. Adicione uma descrição
3. Clique em "Criar grupo de segurança"

### Editar regras do Grupo de Segurança

👣 *Inicio > Menu > Network > Grupos de Segurança*

Na listagem de Grupos de Segurança:

1. Clique no ícone do menu "⋮"
2. Clique em "Editar grupo de segurança"
3. Clique em "+ Adicionar Regra"
4. Selecione o protocolo
5. Selecione a direção
6. Defina o ip de origem (só é permitido 1 IP por vez)
7. Clique em adicionar

### Criar o Grupo de Segurança (CLI)

Para criar um Grupo de Segurança pela CLI utilize o seguinte comando:

```bash
mgc network security-groups create --name="exemple"
```

A saída será o ID do Grupo de segurança criado:

```
┌──────────────────────────────────────┐
│ ID                                   │
├──────────────────────────────────────┤
│ 0377d966-4a2d-485f-81b9-37273ba9090 │
└──────────────────────────────────────┘
```

### Criar regras e associar ao Grupo de Seguranças

Para criar uma Regra associada ao Grupo de Segurança, execute o seguinte comando:

```bash
./mgc network security-groups rules create --security-group-id="0377d966-4a2d-485f-81b9-37273ba9090" --protocol="tcp" --direction="egress" --ethertype="IPv4" --remote-ip-prefix=201.23.14.214
```
