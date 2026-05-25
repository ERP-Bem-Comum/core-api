# Visão Geral

A **Magalu Cloud (MGC)** oferece uma plataforma de rede moderna e robusta, desenvolvida para atender às demandas de conectividade, desempenho e segurança de empresas de todos os portes.

Nossa infraestrutura de rede permite a criação e o gerenciamento de **redes privadas virtuais (VPCs)**, com suporte a múltiplas zonas de disponibilidade e sub-redes configuráveis. Com a MGC, você tem total controle sobre o tráfego de rede, pode aplicar **políticas de segurança avançadas** por meio de **Grupos de Segurança**, e garantir **alta disponibilidade** e **escalabilidade** para suas aplicações.

---

## Componentes Principais da Rede

### Virtual Private Cloud (VPC)

A VPC é uma rede virtual isolada dentro da Magalu Cloud que fornece um ambiente seguro e privado para execução de recursos, com controle total sobre a configuração de rede.

Com uma VPC, você pode realizar as seguintes configurações:

* Definir o seu próprio bloco de endereçamento IP (CIDR), escolhendo o intervalo de IPs que melhor atenda às necessidades do seu ambiente
* Criar sub-redes (subnets) associadas a Zonas de Disponibilidade (AZs), permitindo segmentar seus recursos de forma organizada e com isolamento físico e lógico
* Gerenciar o tráfego de entrada e saída por meio de Grupos de Segurança, criando regras que controlam o acesso de forma granular e segura

#### Exemplos de uso de VPCs na Magalu Cloud

* **Hospedagem de aplicações web:** Utilize a VPC para distribuir os diferentes componentes da aplicação entre sub-redes em diferentes AZs, aumentando a disponibilidade e a resiliência do ambiente
* **Ambientes de desenvolvimento, teste e produção:** Crie VPCs distintas para cada estágio do ciclo de desenvolvimento, garantindo isolamento e controle de acesso entre os ambientes
* **Implantação de bancos de dados gerenciados:** Aloque bancos de dados em sub-redes específicas dentro de AZs distintas para aumentar a segurança e reduzir a superfície de exposição
* **Provisionamento de máquinas virtuais (VMs):** Provisione VMs em sub-redes vinculadas a AZs específicas, aplicando Grupos de Segurança para controlar o tráfego de rede e garantir isolamento, segurança e alta disponibilidade

---

### Grupos de Segurança

Os Grupos de Segurança na Magalu Cloud são conjuntos de regras de controle de tráfego que definem explicitamente quais conexões de rede são permitidas no recurso vinculado. Eles funcionam como uma camada essencial de proteção, garantindo que apenas o tráfego autorizado alcance seus recursos.

**Principais características dos Grupos de Segurança:**

* **Definição por direção de tráfego:** As regras de um Grupo de Segurança são separadas em duas categorias: entrada (inbound) e saída (outbound). É necessário especificar o sentido de cada regra. O tráfego só será permitido se houver uma regra explícita liberando-o na direção correspondente
* **Negação implícita:** Qualquer tráfego que não corresponda a uma regra explícita de permissão é automaticamente bloqueado. Não é necessário criar regras de bloqueio
* **Modelo de permissão explícita:** Todo o tráfego permitido precisa estar definido nas regras. Caso contrário, será rejeitado por padrão

**Com os Grupos de Segurança, você pode:**

* Criar regras específicas para entrada (inbound) e saída (outbound), com base em IPs ou Redes de origem ou destino, intervalos de portas e protocolos
* Associar múltiplos Grupos de Segurança a uma mesma instância, permitindo a combinação de diferentes conjuntos de regras para maior flexibilidade
* Realizar a gestão centralizada das regras de segurança, facilitando o controle e a manutenção de políticas de acesso ao ambiente

---

### Sub-redes (Subnets)

As Sub-redes (Subnets) são divisões lógicas dentro de uma VPC que permitem organizar e distribuir os recursos da sua infraestrutura de forma eficiente.

Na Magalu Cloud, todas as subnets dentro de uma mesma VPC possuem comunicação interna liberada por padrão. Isso significa que, independentemente da Zona de Disponibilidade (AZ) onde estejam, os recursos em diferentes subnets podem se comunicar entre si automaticamente, sem a necessidade de configurações adicionais de roteamento.

Caso o cliente deseje isolamento completo entre ambientes, a abordagem recomendada é a utilização de VPCs separadas, uma vez que o isolamento de rede por padrão não ocorre entre subnets da mesma VPC.

**Principais características das Subnets na Magalu Cloud:**

* Cada subnet é criada dentro de uma Zona de Disponibilidade (AZ) específica, possibilitando a distribuição de recursos para maior disponibilidade e tolerância a falhas
* Por padrão, a VPC já vem configurada com um Shared NAT, permitindo a saída para a internet dos recursos presentes nas subnets que tenham rotas para ele
* Caso o cliente precise de saída específica por zona (AZ), é possível configurar um NAT Gateway individual por AZ, criando rotas específicas para cada subnet que necessite acesso externo de forma controlada
* O controle de entrada e saída de tráfego é realizado através dos Grupos de Segurança, que atuam como a principal camada de filtragem de acesso

**Benefícios do uso de Subnets:**

* Criar subnets em múltiplas AZs para garantir alta disponibilidade dos serviços distribuídos
* Utilizar NAT Gateway por AZ caso seja necessário que instâncias nas subnets realizem acesso à internet de forma controlada e com saída específica por zona
* Para isolamento de tráfego entre diferentes ambientes (como desenvolvimento e produção), a recomendação é realizar a separação por VPCs distintas

---

### IP Público

Na Magalu Cloud, os IPs Públicos permitem que suas instâncias de VM sejam acessíveis diretamente pela internet. Esses endereços IPv4 são essenciais para a exposição de serviços externos e o gerenciamento remoto dos recursos.

**Principais casos de uso para IP Público:**

* Hospedagem de serviços web, como sites, APIs e aplicações que precisam ser acessíveis globalmente
* Permitir acesso remoto para administração, manutenção e troubleshooting de instâncias e serviços

**Gerenciamento de IP Público na Magalu Cloud:**

* Quando um endereço IPv4 público é desalocado de uma instância, ele permanece vinculado à sua conta na MGC. Isso facilita a reutilização futura e evita a perda de endereços IP previamente provisionados
* Caso o cliente deseje liberar permanentemente o endereço IP, é necessário realizar a exclusão manual do IP público do pool disponível em sua conta
* A alocação e desalocação de IPs Públicos podem ser feitas de forma independente das instâncias, permitindo maior flexibilidade na gestão de endereçamento externo

---

### NAT Gateway

O **NAT Gateway** da Magalu Cloud é um serviço gerenciado que permite que instâncias nas sub-redes acessem a internet ou outros serviços externos, sem a necessidade de terem um IP Público associado diretamente a elas. Ele funciona como um intermediário seguro, traduzindo os endereços IP privados das suas instâncias para um único IP público na saída para a internet.

Isso garante que suas instâncias possam buscar atualizações, baixar pacotes ou se comunicar com APIs externas, enquanto permanecem isoladas e não acessíveis diretamente pelo tráfego de entrada da internet.

**Principais características do NAT Gateway:**

* **Acesso Seguro de Saída:** Garante que instâncias sem IP Público possam se conectar à internet. Todo o tráfego de saída passa pelo NAT Gateway, que utiliza seu próprio IP Público, mascarando os IPs internos das instâncias.
* **Bloqueio de Entrada:** Impede que qualquer entidade externa inicie uma conexão com suas instâncias através dele, reforçando a segurança do seu ambiente.
* **Serviço Gerenciado e Escalável:** Sendo um recurso gerenciado, sua operação e escalabilidade de largura de banda são gerenciadas pela Magalu Cloud, simplificando sua infraestrutura de rede.
* **Alta Disponibilidade por Zona:** Para arquiteturas resilientes, recomenda-se provisionar um NAT Gateway em cada Zona de Disponibilidade (AZ) onde existam instâncias que necessitem deste tipo de acesso.

**Principais casos de uso do NAT Gateway:**

* **Atualizações de Software e Pacotes:** Permite que servidores de backend acessem repositórios de software para aplicar patches e atualizações de segurança.
* **Acesso a APIs Externas:** Possibilita que aplicações se conectem a serviços de terceiros, como gateways de pagamento ou provedores de dados, sem expor as instâncias.
* **Coleta de Dados e Processamento:** Ideal para instâncias que precisam buscar dados na internet para processamento, atuando como workers em um ambiente seguro e isolado.

---

### Shared NAT

O **Shared NAT** é um componente fundamental e totalmente gerenciado da sua VPC, projetado para ser redundante, altamente disponível e escalável. Ele funciona como o gateway padrão que permite a comunicação da sua VPC com a internet.

O termo "Shared" (Compartilhado) indica que este é um recurso comum, utilizado por padrão em todas as VPCs e que opera com um conjunto de endereços IP da própria Magalu Cloud. Sua operação é transparente e não requer qualquer configuração manual.

**Principais Funções do Shared NAT:**

* **Gateway Padrão de Internet:** Atua como o portão principal para o tráfego que sai da VPC para a internet ou que chega da internet para um IP Público.
* **Tradução de Endereços para IPs Públicos:** Realiza a tradução de endereços de rede (NAT) necessária para que instâncias com IP Público possam se comunicar com o exterior.
* **Definição do Caminho Padrão:** Define a rota padrão para a internet para os recursos da VPC.

**Integração com Outros Recursos de Rede:**

A função do Shared NAT fica clara ao entendermos como ele se diferencia de outras formas de conectividade:

* **IP Público:** É o Shared NAT que torna um **IP Público** funcional, gerenciando todo o tráfego de entrada e saída destinado a ele e conectando suas VMs à internet.

* **NAT Gateway:** Aqui reside a principal diferença. Enquanto o Shared NAT é o gateway padrão e compartilhado, o **NAT Gateway** é um recurso que você provisiona para ter um **gateway de saída exclusivo e controlado**. Ao usar um NAT Gateway, você faz com que suas instâncias sem IP Público passem a sair para a internet através de um IP fixo e dedicado (o do seu NAT Gateway), em vez de utilizarem o Shared NAT. É a escolha ideal para quando se necessita de um IP de origem conhecido e maior controle.

---

### Placa de Rede Virtual (VNIC)

A **Placa de Rede Virtual**, ou **VNIC** (Virtual Network Interface Card), é o componente que habilita e gerencia toda a conectividade de rede para uma instância de VM na Magalu Cloud. Pense nela como a versão virtual de uma placa de rede física. É na VNIC que os endereços IP são atribuídos e as políticas de segurança são aplicadas.

Cada instância de VM é criada com pelo menos uma VNIC principal, e é possível adicionar múltiplas VNICs a uma mesma instância para cenários de rede mais avançados.

**Principais Atributos de uma VNIC**

* **Endereçamento IP:** Toda VNIC possui um endereço IP privado principal, alocado a partir da faixa de IPs da sua subnet. A ela também podem ser associados outros IPs privados secundários e um IP Público, que permite o acesso direto pela internet.
* **Grupos de Segurança:** A segurança do tráfego é controlada anexando um ou mais Grupos de Segurança diretamente à VNIC. Eles atuam como um firewall, filtrando as conexões de entrada e saída permitidas para aquela interface específica.
* **Endereço MAC:** Assim como uma placa de rede física, cada VNIC possui um endereço MAC (Media Access Control) único, que a identifica na camada de enlace da rede.

**Uso de Múltiplas VNICs**

Anexar mais de uma VNIC a uma única instância de VM permite a criação de configurações de rede complexas e segmentadas. Cada VNIC pode pertencer a uma subnet diferente, oferecendo flexibilidade para:

* **Segmentar o tráfego:** Isolar diferentes tipos de tráfego, como separar uma rede de gerenciamento da rede de dados da aplicação.
* **Criar appliances de rede:** Construir soluções como firewalls, roteadores ou gateways de NAT personalizados, que precisam operar em múltiplos segmentos de rede simultaneamente.
* **Aumentar a segurança:** Aplicar políticas de segurança distintas para cada interface de rede, de acordo com a finalidade de cada uma.

Em resumo, a VNIC é o ponto central de conexão e segurança de rede para suas VMs na Magalu Cloud.

---

## Conclusão

A arquitetura de rede da Magalu Cloud oferece uma fundação segura e flexível para qualquer topologia. Com a **VPC** para isolamento, **Grupos de Segurança** para controle de tráfego em nível de firewall, e opções de conectividade versáteis como **IPs Públicos** e **NAT Gateways**, você tem os blocos de construção essenciais. Esses recursos integrados garantem que você possa projetar uma infraestrutura que atenda precisamente aos seus requisitos de segurança, performance e escala.
