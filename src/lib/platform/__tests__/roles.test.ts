import { describe, expect, it } from "vitest";
import { ADMIN_ROLES, isAdminRole, roleLabels } from "../roles";
import { GESTAO_ROLES, isGestaoRole } from "../insights";

describe("roles: hierarquia de papéis", () => {
  it("todo papel admin tem label", () => {
    for (const r of ADMIN_ROLES) expect(roleLabels[r]).toBeTruthy();
  });

  it("isAdminRole reconhece proprietário e administrador", () => {
    expect(isAdminRole(["proprietario"])).toBe(true);
    expect(isAdminRole(["administrador"])).toBe(true);
  });

  it("isAdminRole rejeita papéis não administrativos", () => {
    for (const r of ["diretor", "gerente", "corretor", "marketing", "financeiro", "suporte", "cliente"]) {
      expect(isAdminRole([r])).toBe(false);
    }
  });

  it("isAdminRole trata lista vazia, null e undefined como falso", () => {
    expect(isAdminRole([])).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it("hierarquia: todo papel admin também é papel de gestão (GESTAO_ROLES é superset)", () => {
    for (const r of ADMIN_ROLES) {
      expect((GESTAO_ROLES as readonly string[]).includes(r)).toBe(true);
    }
  });

  it("gerente e diretor têm visão de gestão mas não são admin", () => {
    expect(isGestaoRole(["gerente"])).toBe(true);
    expect(isAdminRole(["gerente"])).toBe(false);
    expect(isGestaoRole(["diretor"])).toBe(true);
    expect(isAdminRole(["diretor"])).toBe(false);
  });

  it("corretor não tem nem visão de gestão nem admin", () => {
    expect(isGestaoRole(["corretor"])).toBe(false);
    expect(isAdminRole(["corretor"])).toBe(false);
  });
});
