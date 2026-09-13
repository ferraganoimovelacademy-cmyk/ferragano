import type {
  CuryAtivo,
  CuryConhecimento,
  CuryDetalhe,
  CuryEmpreendimento,
  CuryUnidade,
} from "@/lib/site/cury";

/** Colunas públicas — espelham o que a RLS anon libera. */
export const EMP_FIELDS =
  "id, nome, slug, construtora, cidade, uf, bairro, status, segmento, preco_min, preco_max, entrega_prevista, capa_url, descricao, destaque";

export const EMP_FIELDS_DETALHE = `${EMP_FIELDS}, galeria` as const;

export const MEDIA_FIELDS =
  "id, tipo, titulo, url, alt, legenda, largura, altura, ordem";

export const UNI_FIELDS =
  "id, identificador, tipologia, andar, final, dormitorios, suites, vagas, varanda, area_privativa, area_total, preco, status";

type EmpRow = Record<string, unknown>;
type UniAgg = { empreendimento_id: string; dormitorios: number | null; area_privativa: number | null; status: string };

function base(emp: EmpRow): Omit<
  CuryEmpreendimento,
  "dormitorios" | "area_min" | "area_max" | "disponiveis" | "total_unidades"
> {
  return {
    id: String(emp.id),
    nome: String(emp.nome),
    slug: String(emp.slug),
    construtora: (emp.construtora as string) ?? null,
    cidade: (emp.cidade as string) ?? null,
    uf: (emp.uf as string) ?? null,
    bairro: (emp.bairro as string) ?? null,
    status: emp.status as CuryEmpreendimento["status"],
    segmento: emp.segmento as CuryEmpreendimento["segmento"],
    preco_min: emp.preco_min == null ? null : Number(emp.preco_min),
    preco_max: emp.preco_max == null ? null : Number(emp.preco_max),
    entrega_prevista: (emp.entrega_prevista as string) ?? null,
    capa_url: (emp.capa_url as string) ?? null,
    descricao: (emp.descricao as string) ?? null,
    destaque: Boolean(emp.destaque),
  };
}

/** Agrega o estoque público por empreendimento (dormitórios, áreas, disponibilidade). */
export function agregarUnidades(emps: EmpRow[], unidades: UniAgg[]): CuryEmpreendimento[] {
  return emps.map((emp) => {
    const doEmp = unidades.filter((u) => u.empreendimento_id === emp.id);
    const areas = doEmp.map((u) => Number(u.area_privativa)).filter((n) => Number.isFinite(n) && n > 0);
    return {
      ...base(emp),
      dormitorios: [...new Set(doEmp.map((u) => u.dormitorios).filter((d): d is number => !!d))].sort(),
      area_min: areas.length ? Math.min(...areas) : null,
      area_max: areas.length ? Math.max(...areas) : null,
      disponiveis: doEmp.filter((u) => u.status === "disponivel").length,
      total_unidades: doEmp.length,
    };
  });
}

function mapearAtivo(m: Record<string, unknown>): CuryAtivo {
  return {
    id: String(m.id),
    tipo: m.tipo as CuryAtivo["tipo"],
    titulo: (m.titulo as string) ?? null,
    url: String(m.url),
    alt: (m.alt as string) ?? null,
    legenda: (m.legenda as string) ?? null,
    largura: m.largura == null ? null : Number(m.largura),
    altura: m.altura == null ? null : Number(m.altura),
  };
}

export function montarDetalhe(
  emp: EmpRow,
  unidades: Record<string, unknown>[],
  conhecimento: Record<string, unknown>[],
  midia: Record<string, unknown>[] = [],
): CuryDetalhe {
  const uni: CuryUnidade[] = unidades.map((u) => ({
    id: String(u.id),
    identificador: String(u.identificador),
    tipologia: (u.tipologia as string) ?? null,
    andar: u.andar == null ? null : Number(u.andar),
    final: (u.final as string) ?? null,
    dormitorios: u.dormitorios == null ? null : Number(u.dormitorios),
    suites: u.suites == null ? null : Number(u.suites),
    vagas: u.vagas == null ? null : Number(u.vagas),
    varanda: Boolean(u.varanda),
    area_privativa: u.area_privativa == null ? null : Number(u.area_privativa),
    area_total: u.area_total == null ? null : Number(u.area_total),
    preco: u.preco == null ? null : Number(u.preco),
    status: u.status as CuryUnidade["status"],
  }));

  const [agregado] = agregarUnidades(
    [emp],
    uni.map((u) => ({
      empreendimento_id: String(emp.id),
      dormitorios: u.dormitorios,
      area_privativa: u.area_privativa,
      status: u.status,
    })),
  );

  const ativos = midia.map(mapearAtivo);
  const daGaleria = Array.isArray(emp.galeria)
    ? (emp.galeria.filter((g): g is string => typeof g === "string") as string[])
    : [];
  // A galeria pública é a união do campo do empreendimento com as imagens
  // oficiais publicadas na biblioteca de mídia — sem duplicar URLs.
  const galeria = [...new Set([...daGaleria, ...ativos.filter((a) => a.tipo === "imagem").map((a) => a.url)])];

  const itens: CuryConhecimento[] = conhecimento.map((k) => ({
    id: String(k.id),
    tipo: String(k.tipo),
    titulo: String(k.titulo),
    corpo: (k.corpo as string) ?? null,
  }));

  return {
    empreendimento: { ...agregado!, galeria },
    unidades: uni,
    conhecimento: itens,
    ativos: {
      plantas: ativos.filter((a) => a.tipo === "planta"),
      videos: ativos.filter((a) => a.tipo === "video"),
      tours: ativos.filter((a) => a.tipo === "tour"),
      pdfs: ativos.filter((a) => a.tipo === "pdf"),
    },
  };
}