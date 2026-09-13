import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { publicClient } from "@/lib/platform/public-client.server";
import {
  agregarUnidades,
  montarDetalhe,
  EMP_FIELDS,
  EMP_FIELDS_DETALHE,
  MEDIA_FIELDS,
  UNI_FIELDS,
} from "@/lib/platform/cury.server";

/**
 * Property Experience (CURY) — leitura pública do catálogo por construtora.
 * Só trafega o que está marcado como público (RLS anon). Sem sessão, sem escrita.
 */

export const listCuryEmpreendimentos = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();

  const { data: emps, error } = await supabase
    .from("empreendimentos")
    .select(EMP_FIELDS)
    .eq("publico", true)
    .ilike("construtora", "%cury%")
    .order("destaque", { ascending: false })
    .order("nome");

  if (error) {
    console.error("[listCuryEmpreendimentos]", error.message);
    throw new Error("Não foi possível carregar o portfólio.");
  }
  if (!emps?.length) return [];

  const { data: unidades } = await supabase
    .from("unidades")
    .select("empreendimento_id, dormitorios, area_privativa, status")
    .in(
      "empreendimento_id",
      emps.map((e) => e.id),
    );

  return agregarUnidades(emps as never[], (unidades ?? []) as never[]);
});

export const getCuryEmpreendimento = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();

    const { data: emp, error } = await supabase
      .from("empreendimentos")
      .select(EMP_FIELDS_DETALHE)
      .eq("publico", true)
      .eq("slug", data.slug)
      .maybeSingle();

    if (error) {
      console.error("[getCuryEmpreendimento]", error.message);
      throw new Error("Não foi possível carregar o empreendimento.");
    }
    if (!emp) return null;

    const [{ data: unidades }, { data: conhecimento }, { data: midia }] = await Promise.all([
      supabase
        .from("unidades")
        .select(UNI_FIELDS)
        .eq("empreendimento_id", emp.id)
        .order("andar")
        .order("identificador"),
      supabase
        .from("property_knowledge")
        .select("id, tipo, titulo, corpo")
        .eq("empreendimento_id", emp.id)
        .eq("publico", true)
        .order("ordem"),
      supabase
        .from("property_media")
        .select(MEDIA_FIELDS)
        .eq("empreendimento_id", emp.id)
        .eq("publico", true)
        .order("tipo")
        .order("ordem"),
    ]);

    return montarDetalhe(
      emp as never,
      (unidades ?? []) as never[],
      (conhecimento ?? []) as never[],
      (midia ?? []) as never[],
    );
  });