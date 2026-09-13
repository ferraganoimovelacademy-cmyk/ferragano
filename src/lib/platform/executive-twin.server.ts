import {
  compararCenarios,
  montarTwin,
  simulacaoExecutiva,
  type Comparacao,
  type EntradaTwin,
  type EsforcoArea,
  type ExecutiveTwin,
  type MesAgregado,
  type Simulacao,
  type VariavelSimulavel,
} from "@/lib/platform/executive-twin";

/**
 * SPRINT 30 — EXECUTIVE DIGITAL TWIN: agregação de leitura (server-only).
 * Sem escrita, sem efeito colateral. Todo cálculo fica no módulo puro.
 */

type Linha = Record<string, unknown>;

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const mesDe = (iso: unknown): string | null =>
  typeof iso === "string" && iso.length >= 7 ? iso.slice(0, 7) : null;

const MESES_JANELA = 12;

function mesesRecentes(qtd: number, agora = new Date()): string[] {
  const out: string[] = [];
  for (let i = qtd - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  const v = ord.length % 2 === 1 ? ord[meio]! : (ord[meio - 1]! + ord[meio]!) / 2;
  return Math.round(v * 10) / 10;
}

async function lerEntrada(
  supabase: {
    from: (t: string) => any;
    rpc: (f: string, p: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  },
  ws: string,
): Promise<EntradaTwin> {
  const inicioJanela = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (MESES_JANELA - 1), 1)).toISOString();
  const trintaDias = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const noventaDias = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const [
    exec,
    opps,
    visitas,
    propostas,
    atividades,
    decisoes,
    licoes,
    playbooks,
    versoes,
    usos,
    regras,
    outbox,
    alertas,
    tarefas,
    regioes,
    indicadores,
  ] = await Promise.all([
    supabase.rpc("read_executive_360", { _workspace_id: ws }),
    supabase.from("opportunities").select("created_at, estagio, valor, fechado_em").eq("workspace_id", ws).gte("created_at", inicioJanela).limit(5000),
    supabase.from("visits").select("created_at").eq("workspace_id", ws).gte("created_at", inicioJanela).limit(5000),
    supabase.from("proposals").select("created_at").eq("workspace_id", ws).gte("created_at", inicioJanela).limit(5000),
    supabase.from("activities").select("ocorreu_em, tipo").eq("workspace_id", ws).gte("ocorreu_em", inicioJanela).limit(10000),
    supabase.from("memory_decisions").select("created_at, avaliado_em").eq("workspace_id", ws).limit(2000),
    supabase.from("memory_lessons").select("created_at").eq("workspace_id", ws).limit(2000),
    supabase.from("memory_playbooks").select("id").eq("workspace_id", ws).limit(500),
    supabase.from("org_knowledge_versions").select("vigente_em").eq("workspace_id", ws).limit(2000),
    supabase.from("org_knowledge_usage").select("usado_em").eq("workspace_id", ws).limit(2000),
    supabase.from("automation_rules").select("ativa").eq("workspace_id", ws).limit(500),
    supabase.from("outbox_events").select("created_at, status").eq("workspace_id", ws).gte("created_at", inicioJanela).limit(5000),
    supabase.from("platform_alerts").select("status").eq("workspace_id", ws).limit(500),
    supabase.from("tasks").select("status, vence_em").eq("workspace_id", ws).limit(3000),
    supabase.from("market_regions").select("id").eq("workspace_id", ws).limit(200),
    supabase.from("market_indicator_values").select("referencia").gte("referencia", trintaDias.slice(0, 10)).limit(500),
  ]);

  const fontesIndisponiveis: string[] = [];
  const linhas = (res: { data: unknown; error: { message: string } | null }, nome: string): Linha[] => {
    if (res.error) {
      console.warn(`[executiveTwin] ${nome}`, res.error.message);
      fontesIndisponiveis.push(nome);
      return [];
    }
    return (res.data ?? []) as Linha[];
  };

  const oppRows = linhas(opps, "opportunities");
  const visitaRows = linhas(visitas, "visits");
  const propostaRows = linhas(propostas, "proposals");
  const atividadeRows = linhas(atividades, "activities");
  const decisaoRows = linhas(decisoes, "memory_decisions");
  const licaoRows = linhas(licoes, "memory_lessons");
  const playbookRows = linhas(playbooks, "memory_playbooks");
  const versaoRows = linhas(versoes, "org_knowledge_versions");
  const usoRows = linhas(usos, "org_knowledge_usage");
  const regraRows = linhas(regras, "automation_rules");
  const outboxRows = linhas(outbox, "outbox_events");
  const alertaRows = linhas(alertas, "platform_alerts");
  const tarefaRows = linhas(tarefas, "tasks");
  const regiaoRows = linhas(regioes, "market_regions");
  const indicadorRows = linhas(indicadores, "market_indicator_values");
  const execRow = (linhas(exec, "executive_360")[0] ?? null) as Linha | null;

  const meses = mesesRecentes(MESES_JANELA);
  const base = new Map<string, MesAgregado & { ciclos: number[] }>(
    meses.map((mes) => [
      mes,
      {
        mes,
        oportunidadesCriadas: 0,
        ganhas: 0,
        perdidas: 0,
        valorGanho: 0,
        visitas: 0,
        propostas: 0,
        atividades: 0,
        cicloMedianoDias: null,
        licoes: 0,
        versoesConhecimento: 0,
        automacoesEntregues: 0,
        ciclos: [],
      },
    ]),
  );

  const incr = (iso: unknown, fn: (m: MesAgregado & { ciclos: number[] }) => void) => {
    const mes = mesDe(iso);
    if (!mes) return;
    const alvo = base.get(mes);
    if (alvo) fn(alvo);
  };

  for (const o of oppRows) {
    incr(o["created_at"], (m) => {
      m.oportunidadesCriadas += 1;
    });
    const estagio = String(o["estagio"] ?? "");
    if (estagio === "ganho") {
      incr(o["fechado_em"] ?? o["created_at"], (m) => {
        m.ganhas += 1;
        m.valorGanho += num(o["valor"]) ?? 0;
        const criado = typeof o["created_at"] === "string" ? new Date(o["created_at"]).getTime() : NaN;
        const fechado = typeof o["fechado_em"] === "string" ? new Date(o["fechado_em"]).getTime() : NaN;
        if (Number.isFinite(criado) && Number.isFinite(fechado) && fechado >= criado)
          m.ciclos.push((fechado - criado) / 86_400_000);
      });
    } else if (estagio === "perdido") {
      incr(o["fechado_em"] ?? o["created_at"], (m) => {
        m.perdidas += 1;
      });
    }
  }
  for (const v of visitaRows) incr(v["created_at"], (m) => { m.visitas += 1; });
  for (const p of propostaRows) incr(p["created_at"], (m) => { m.propostas += 1; });
  for (const a of atividadeRows) incr(a["ocorreu_em"], (m) => { m.atividades += 1; });
  for (const l of licaoRows) incr(l["created_at"], (m) => { m.licoes += 1; });
  for (const v of versaoRows) incr(v["vigente_em"], (m) => { m.versoesConhecimento += 1; });
  for (const e of outboxRows)
    if (String(e["status"] ?? "") === "entregue") incr(e["created_at"], (m) => { m.automacoesEntregues += 1; });

  const serie: MesAgregado[] = meses.map((mes) => {
    const { ciclos, ...resto } = base.get(mes)!;
    return { ...resto, cicloMedianoDias: mediana(ciclos) };
  });

  const desde = (iso: unknown, limite: string) => typeof iso === "string" && iso >= limite;
  const contarOuNulo = (indisponivel: boolean, valor: number) => (indisponivel ? null : valor);
  const falhou = (nome: string) => fontesIndisponiveis.includes(nome);

  const esforco: EsforcoArea[] = [
    {
      area: "comercial",
      eventos: contarOuNulo(
        falhou("activities") && falhou("proposals"),
        atividadeRows.filter((a) => desde(a["ocorreu_em"], noventaDias)).length +
          propostaRows.filter((p) => desde(p["created_at"], noventaDias)).length,
      ),
      fonte: "activities + proposals (90 dias)",
    },
    {
      area: "marketing",
      eventos: contarOuNulo(
        falhou("activities"),
        atividadeRows.filter((a) => desde(a["ocorreu_em"], noventaDias) && ["email", "mensagem"].includes(String(a["tipo"] ?? ""))).length,
      ),
      fonte: "activities tipo email/mensagem (90 dias)",
    },
    {
      area: "operacao",
      eventos: contarOuNulo(
        falhou("visits") && falhou("outbox_events"),
        visitaRows.filter((v) => desde(v["created_at"], noventaDias)).length +
          outboxRows.filter((e) => desde(e["created_at"], noventaDias)).length,
      ),
      fonte: "visits + outbox_events (90 dias)",
    },
    {
      area: "inteligencia",
      eventos: contarOuNulo(
        falhou("memory_decisions"),
        decisaoRows.filter((d) => desde(d["created_at"], noventaDias)).length,
      ),
      fonte: "memory_decisions (90 dias)",
    },
    {
      area: "conhecimento",
      eventos: contarOuNulo(
        falhou("org_knowledge_versions") && falhou("org_knowledge_usage") && falhou("memory_lessons"),
        versaoRows.filter((v) => desde(v["vigente_em"], noventaDias)).length +
          usoRows.filter((u) => desde(u["usado_em"], noventaDias)).length +
          licaoRows.filter((l) => desde(l["created_at"], noventaDias)).length,
      ),
      fonte: "org_knowledge_* + memory_lessons (90 dias)",
    },
  ];

  const execNum = (campo: string) => (execRow ? num(execRow[campo]) : null);

  return {
    serie,
    esforco,
    pipeline: {
      oportunidadesAbertas: execNum("oportunidades_abertas"),
      pipelineTotal: execNum("pipeline_total"),
      ticketMedio: execNum("ticket_medio"),
      conversaoPercentual: execNum("conversao_percentual"),
      cicloMedioDias: execNum("tempo_medio_ciclo_dias"),
    },
    pessoas: {
      total: execNum("pessoas_total"),
      novas30d: execNum("pessoas_30d"),
      clientes: execNum("clientes_total"),
    },
    conhecimento: {
      playbooks: falhou("memory_playbooks") ? null : playbookRows.length,
      licoes: falhou("memory_lessons") ? null : licaoRows.length,
      versoes: falhou("org_knowledge_versions") ? null : versaoRows.length,
      usos: falhou("org_knowledge_usage") ? null : usoRows.length,
    },
    memoria: {
      decisoes: falhou("memory_decisions") ? null : decisaoRows.length,
      decisoesAvaliadas: falhou("memory_decisions") ? null : decisaoRows.filter((d) => d["avaliado_em"] != null).length,
      campanhas: null,
    },
    automacao: {
      regrasAtivas: falhou("automation_rules") ? null : regraRows.filter((r) => r["ativa"] === true).length,
      entregues30d: falhou("outbox_events") ? null : outboxRows.filter((e) => desde(e["created_at"], trintaDias) && String(e["status"] ?? "") === "entregue").length,
      falhas30d: falhou("outbox_events") ? null : outboxRows.filter((e) => desde(e["created_at"], trintaDias) && ["falhou", "descartado"].includes(String(e["status"] ?? ""))).length,
    },
    riscos: {
      alertasAbertos: falhou("platform_alerts") ? null : alertaRows.filter((a) => String(a["status"] ?? "") !== "resolvido").length,
      tarefasAtrasadas: falhou("tasks")
        ? null
        : tarefaRows.filter(
            (t) =>
              String(t["status"] ?? "") !== "concluida" &&
              typeof t["vence_em"] === "string" &&
              (t["vence_em"] as string) < new Date().toISOString(),
          ).length,
    },
    mercado: {
      indicadoresAtualizados: falhou("market_indicator_values") ? null : indicadorRows.length,
      regioes: falhou("market_regions") ? null : regiaoRows.length,
    },
    fontesIndisponiveis,
  };
}


export type SupabaseLike = Parameters<typeof lerEntrada>[0];

export async function lerTwin(supabase: SupabaseLike, ws: string): Promise<ExecutiveTwin> {
  return montarTwin(await lerEntrada(supabase, ws));
}

export async function lerComparacao(
  supabase: SupabaseLike,
  ws: string,
  mesA: string,
  mesB: string,
): Promise<Comparacao> {
  const entrada = await lerEntrada(supabase, ws);
  return compararCenarios(entrada.serie, mesA, mesB);
}

export async function lerSimulacao(
  supabase: SupabaseLike,
  ws: string,
  variavel: VariavelSimulavel,
  deltaPercentual: number,
): Promise<Simulacao> {
  const entrada = await lerEntrada(supabase, ws);
  return simulacaoExecutiva(entrada.serie, variavel, deltaPercentual);
}
