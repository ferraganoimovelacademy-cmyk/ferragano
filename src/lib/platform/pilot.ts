/**
 * FASE 1 — Pilot Operation · GATES P01, P02 e P03.
 *
 * Camada pura: recebe o retrato medido do workspace e deriva a prontidão do
 * piloto. Nenhum número é digitado à mão e nenhuma verificação é opinativa —
 * cada item declara a exigência do gate, o valor medido e a situação.
 */

export type PilotGate = "P01" | "P02" | "P03" | "P09";

export type PilotStatus = "pronto" | "parcial" | "pendente";

export const pilotStatusLabels: Record<PilotStatus, string> = {
  pronto: "Pronto",
  parcial: "Parcial",
  pendente: "Pendente",
};

export const pilotGateLabels: Record<PilotGate, string> = {
  P01: "P01 — Workspace do piloto",
  P02: "P02 — Usuários reais",
  P03: "P03 — Empreendimento real",
  P09: "P09 — Flags do piloto",
};

export type PilotCheck = {
  chave: string;
  gate: PilotGate;
  titulo: string;
  exigencia: string;
  medido: string;
  status: PilotStatus;
  /** Item que impede a abertura do piloto quando não está pronto. */
  bloqueante: boolean;
};

export type PilotSnapshot = {
  funis: number;
  funilPadrao: boolean;
  etapas: number;
  membrosAtivos: number;
  papeis: Record<string, number>;
  empreendimentos: number;
  empreendimentosPublicos: number;
  unidades: number;
  unidadesComPreco: number;
  importacoes: { pessoas: number; oportunidades: number; visitas: number; reservas: number };
  flags: Record<string, boolean>;
  academyMembrosConcluiram: number;
};

/** Metas de equipe do GATE P02 (papéis do RBAC). */
export const METAS_EQUIPE: { role: string; minimo: number; rotulo: string }[] = [
  { role: "proprietario", minimo: 1, rotulo: "Proprietário" },
  { role: "gerente", minimo: 2, rotulo: "Gerentes" },
  { role: "corretor", minimo: 10, rotulo: "Corretores" },
  { role: "suporte", minimo: 1, rotulo: "Assistente" },
  { role: "financeiro", minimo: 1, rotulo: "Administrativo" },
];

/** Estado esperado das flags durante o piloto (GATE P09). */
export const FLAGS_PILOTO: { module: string; esperado: boolean; rotulo: string }[] = [
  { module: "crm", esperado: true, rotulo: "CRM / Decision Center" },
  { module: "ia", esperado: false, rotulo: "Ferragano Advisor (IA)" },
  { module: "portal_cliente", esperado: false, rotulo: "Portal do Cliente" },
];

const situacao = (valor: number, meta: number): PilotStatus =>
  valor >= meta ? "pronto" : valor > 0 ? "parcial" : "pendente";

export function avaliarProntidaoPiloto(s: PilotSnapshot): PilotCheck[] {
  const checks: PilotCheck[] = [];

  // GATE P01 — workspace exclusivo, funil e permissões semeados.
  checks.push({
    chave: "funil_padrao",
    gate: "P01",
    titulo: "Funil de venda desenhado",
    exigencia: "ao menos um funil com etapas",
    medido: `${s.funis} funil(is) · ${s.etapas} etapa(s)${s.funilPadrao ? " · padrão definido" : ""}`,
    status: s.funis > 0 && s.etapas >= 3 ? (s.funilPadrao ? "pronto" : "parcial") : "pendente",
    bloqueante: true,
  });
  checks.push({
    chave: "equipe_ativa",
    gate: "P01",
    titulo: "Membros ativos no workspace",
    exigencia: "≥ 15 membros ativos (equipe do piloto)",
    medido: `${s.membrosAtivos} ativo(s)`,
    status: situacao(s.membrosAtivos, 15),
    bloqueante: true,
  });

  // GATE P02 — composição da equipe real.
  for (const meta of METAS_EQUIPE) {
    const valor = s.papeis[meta.role] ?? 0;
    checks.push({
      chave: `papel_${meta.role}`,
      gate: "P02",
      titulo: meta.rotulo,
      exigencia: `≥ ${meta.minimo}`,
      medido: `${valor}`,
      status: situacao(valor, meta.minimo),
      bloqueante: meta.role === "proprietario" || meta.role === "corretor",
    });
  }
  checks.push({
    chave: "academy_concluida",
    gate: "P02",
    titulo: "Onboarding concluído",
    exigencia: "todo membro ativo com a trilha obrigatória concluída",
    medido: `${s.academyMembrosConcluiram}/${s.membrosAtivos}`,
    status:
      s.membrosAtivos > 0 && s.academyMembrosConcluiram >= s.membrosAtivos
        ? "pronto"
        : s.academyMembrosConcluiram > 0
          ? "parcial"
          : "pendente",
    bloqueante: false,
  });

  // GATE P03 — empreendimento real com estoque e preço.
  checks.push({
    chave: "empreendimento_real",
    gate: "P03",
    titulo: "Empreendimento cadastrado",
    exigencia: "≥ 1 empreendimento real",
    medido: `${s.empreendimentos} cadastrado(s) · ${s.empreendimentosPublicos} na vitrine`,
    status: situacao(s.empreendimentos, 1),
    bloqueante: true,
  });
  checks.push({
    chave: "estoque",
    gate: "P03",
    titulo: "Unidades com preço",
    exigencia: "todo o estoque com preço definido",
    medido: `${s.unidadesComPreco}/${s.unidades} unidade(s)`,
    status:
      s.unidades > 0 && s.unidadesComPreco >= s.unidades
        ? "pronto"
        : s.unidadesComPreco > 0
          ? "parcial"
          : "pendente",
    bloqueante: true,
  });
  const migradas =
    s.importacoes.pessoas + s.importacoes.oportunidades + s.importacoes.visitas + s.importacoes.reservas;
  checks.push({
    chave: "migracao",
    gate: "P03",
    titulo: "Migração pelo Import Wizard",
    exigencia: "carteira migrada por importação, sem digitação manual",
    medido: `${migradas} importação(ões) auditada(s)`,
    status: situacao(migradas, 1),
    bloqueante: false,
  });

  // GATE P09 — flags no estado combinado.
  for (const flag of FLAGS_PILOTO) {
    const atual = s.flags[flag.module];
    checks.push({
      chave: `flag_${flag.module}`,
      gate: "P09",
      titulo: flag.rotulo,
      exigencia: flag.esperado ? "ligado" : "desligado",
      medido: atual === undefined ? "sem registro" : atual ? "ligado" : "desligado",
      status: atual === flag.esperado ? "pronto" : "pendente",
      bloqueante: false,
    });
  }

  return checks;
}

export type PilotResumo = {
  total: number;
  prontos: number;
  parciais: number;
  pendentes: number;
  bloqueantesAbertos: number;
  percentual: number;
  liberado: boolean;
};

export function resumirProntidao(checks: PilotCheck[]): PilotResumo {
  const total = checks.length;
  const prontos = checks.filter((c) => c.status === "pronto").length;
  const parciais = checks.filter((c) => c.status === "parcial").length;
  const pendentes = checks.filter((c) => c.status === "pendente").length;
  const bloqueantesAbertos = checks.filter((c) => c.bloqueante && c.status !== "pronto").length;

  return {
    total,
    prontos,
    parciais,
    pendentes,
    bloqueantesAbertos,
    percentual: total === 0 ? 0 : Math.round((prontos / total) * 100),
    liberado: total > 0 && bloqueantesAbertos === 0,
  };
}