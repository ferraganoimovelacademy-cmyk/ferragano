import { describe, expect, it } from "vitest";
import {
  PERSON_TIPOS,
  PERSON_ESTAGIOS,
  PERSON_ESTAGIOS_MANUAIS,
  CONTACT_CANAIS,
  ADDRESS_TIPOS,
  RELATIONSHIP_TIPOS,
  ACTIVITY_TIPOS,
  personTipoLabels,
  personEstagioLabels,
  contactCanalLabels,
  contactCanalIcons,
  addressTipoLabels,
  relationshipLabels,
  activityLabels,
  activityIcons,
  apenasDigitos,
} from "../relacionamento";

describe("relacionamento: completude de labels/ícones", () => {
  it("todo tipo de pessoa tem label", () => {
    for (const v of PERSON_TIPOS) expect(personTipoLabels[v]).toBeTruthy();
  });
  it("todo estágio de pessoa tem label", () => {
    for (const v of PERSON_ESTAGIOS) expect(personEstagioLabels[v]).toBeTruthy();
  });
  it("estágios manuais são um subconjunto dos estágios válidos", () => {
    for (const v of PERSON_ESTAGIOS_MANUAIS) expect(PERSON_ESTAGIOS).toContain(v);
  });
  it("todo canal de contato tem label e ícone", () => {
    for (const v of CONTACT_CANAIS) {
      expect(contactCanalLabels[v]).toBeTruthy();
      expect(contactCanalIcons[v]).toBeTruthy();
    }
  });
  it("todo tipo de endereço tem label", () => {
    for (const v of ADDRESS_TIPOS) expect(addressTipoLabels[v]).toBeTruthy();
  });
  it("todo tipo de relacionamento tem label", () => {
    for (const v of RELATIONSHIP_TIPOS) expect(relationshipLabels[v]).toBeTruthy();
  });
  it("todo tipo de atividade tem label e ícone", () => {
    for (const v of ACTIVITY_TIPOS) {
      expect(activityLabels[v]).toBeTruthy();
      expect(activityIcons[v]).toBeTruthy();
    }
  });
});

describe("apenasDigitos", () => {
  it("remove tudo que não é dígito", () => {
    expect(apenasDigitos("(34) 99999-8888")).toBe("34999998888");
  });
  it("string vazia continua vazia", () => {
    expect(apenasDigitos("")).toBe("");
  });
  it("string sem dígitos vira vazia", () => {
    expect(apenasDigitos("abc-def")).toBe("");
  });
});
