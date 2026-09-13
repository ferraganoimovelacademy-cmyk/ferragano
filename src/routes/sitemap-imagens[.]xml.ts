import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Sprint UI 04.2 — GATE 05: sitemap de imagens.
 * Fonte única: capa/galeria do empreendimento e ativos publicados na
 * biblioteca de mídia (property_media, publico = true).
 */
const BASE_URL = "https://ferragano.lovable.app";

const escapar = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function cliente() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const Route = createFileRoute("/sitemap-imagens.xml")({
  server: {
    handlers: {
      GET: async () => {
        const client = cliente();
        const blocos: string[] = [];

        if (client) {
          const { data: emps } = await client
            .from("empreendimentos")
            .select("id, slug, nome, capa_url, galeria")
            .eq("publico", true)
            .order("nome");

          const ids = (emps ?? []).map((e) => e.id);
          const { data: midia } = ids.length
            ? await client
                .from("property_media")
                .select("empreendimento_id, url, alt, titulo, tipo")
                .in("empreendimento_id", ids)
                .eq("publico", true)
                .in("tipo", ["imagem", "planta"])
                .order("ordem")
            : { data: [] };

          for (const emp of emps ?? []) {
            if (!emp.slug) continue;
            const doEmp = (midia ?? []).filter((m) => m.empreendimento_id === emp.id);
            const galeria = Array.isArray(emp.galeria)
              ? (emp.galeria.filter((g): g is string => typeof g === "string") as string[])
              : [];
            const imagens = [
              ...new Set([
                ...(emp.capa_url ? [emp.capa_url] : []),
                ...galeria,
                ...doEmp.map((m) => String(m.url)),
              ]),
            ];
            if (!imagens.length) continue;

            const legendas = new Map(
              doEmp.map((m) => [String(m.url), String(m.alt ?? m.titulo ?? emp.nome)]),
            );

            blocos.push(
              [
                `  <url>`,
                `    <loc>${BASE_URL}/empreendimentos/cury/${escapar(emp.slug)}</loc>`,
                ...imagens.map((url) =>
                  [
                    `    <image:image>`,
                    `      <image:loc>${escapar(url)}</image:loc>`,
                    `      <image:title>${escapar(legendas.get(url) ?? emp.nome)}</image:title>`,
                    `    </image:image>`,
                  ].join("\n"),
                ),
                `  </url>`,
              ].join("\n"),
            );
          }
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
          ...blocos,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
