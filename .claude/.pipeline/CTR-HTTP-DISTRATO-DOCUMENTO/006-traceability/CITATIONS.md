# Citação canônica (Princípio IX) — CTR-HTTP-DISTRATO-DOCUMENTO

**Decisão**: o motivo do distrato é persistido **no agregado** (coluna + detalhe) **e no evento**
`ContractEnded` (opção c). O lado do evento fundamenta-se em DDD.

**Fonte** (via MCP `acdg-skills`, domínio ddd):

> "The When and Why of Domain Events (…) consider the contemporary definition: **Something happened
> that domain experts care about.** Model information about activity in the domain as a series of
> discrete events. Represent each event as a domain object. (…) A domain event is a full-fledged part
> of the domain model, **a representation of something that happened in the domain**."
> — _(Vaughn Vernon, Implementing Domain-Driven Design, p. 369, linha 7045; citando Evans, Ref p.20)_

**Aplicação**: o motivo do distrato é informação que os domain experts se importam (o "porquê" do
encerramento) → carregado pelo evento `ContractEnded`. A persistência em coluna (`termination_reason`)
é a fonte de verdade para a **consulta de detalhe O(1)** (recomendação do agente `mysql-database-expert`):
o motivo é atributo do contrato distratado, como `ended_at`. Os dois usos são ortogonais — coluna para
leitura de detalhe; evento para propagação/timeline/auditoria.
