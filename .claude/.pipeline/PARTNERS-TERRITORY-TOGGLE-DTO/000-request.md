# PARTNERS-TERRITORY-TOGGLE-DTO — toggle territorial retorna o DTO

Size: S. Origem: divergência exposta pelas coleções Bruno (borda real) — toggle retornava 200 sem
corpo, mas o contrato (front 008-partners / contracts/README US-002) espera PartnerStateDto/
PartnerMunicipalityDto (atualização otimista do BFF, SC-005). Decisão do dono: corrigir a impl.
