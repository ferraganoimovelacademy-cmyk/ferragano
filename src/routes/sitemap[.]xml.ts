import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { POSTS } from "@/lib/site/blog";
import { IDIOMAS, IDIOMA_PADRAO, IDIOMA_META, PaginaKey, caminho } from "@/lib/site/i18n";
import { SLUG_POST } from "@/lib/site/i18n-blog";

const BASE_URL = "https://ferragano.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  alternates?: { lang: string; href: string }[];
}

const STATIC_MAP: { key: PaginaKey; priority: string; freq: SitemapEntry["changefreq"] }[] = [
  { key: "home", priority: "1.0", freq: "weekly" },
  { key: "metodo", priority: "0.8", freq: "monthly" },
  { key: "sobre", priority: "0.7", freq: "monthly" },
  { key: "manifesto", priority: "0.8", freq: "monthly" },
  { key: "contato", priority: "0.7", freq: "monthly" },
  { key: "simulacao", priority: "0.8", freq: "monthly" },
  { key: "blog", priority: "0.8", freq: "weekly" },
  { key: "lancamentos", priority: "0.9", freq: "daily" },
  { key: "carreiras", priority: "0.6", freq: "monthly" },
];

async function listarEmpreendimentosPublicos(): Promise<{ id: string; slug: string }[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  const client = createClient<Database>(url, key, {
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

  const { data, error } = await client
    .from("empreendimentos")
    .select("id, slug")
    .eq("publico", true);

  if (error) return [];
  return (data ?? []).map((row) => ({ id: row.id, slug: row.slug }));
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const publicos = await listarEmpreendimentosPublicos();
        const entries: SitemapEntry[] = [];

        // 1. Páginas Estáticas
        for (const s of STATIC_MAP) {
          for (const lang of IDIOMAS) {
            const path = caminho(s.key, lang);
            const alternates = IDIOMAS.map((l) => ({
              lang: IDIOMA_META[l].hreflang,
              href: `${BASE_URL}${caminho(s.key, l)}`,
            }));
            alternates.push({ lang: "x-default", href: `${BASE_URL}${caminho(s.key, IDIOMA_PADRAO)}` });

            entries.push({
              path,
              changefreq: s.freq,
              priority: s.priority,
              alternates,
            });
          }
        }

        // 2. Blog Posts
        for (const post of POSTS) {
          for (const lang of IDIOMAS) {
            const slugLang = SLUG_POST[post.slug]?.[lang] || post.slug;
            
            const path = caminho("blogPost", lang, slugLang);
            const alternates = IDIOMAS.map((l) => {
              const sLang = SLUG_POST[post.slug]?.[l] || post.slug;
              return {
                lang: IDIOMA_META[l].hreflang,
                href: `${BASE_URL}${caminho("blogPost", l, sLang)}`,
              };
            });
            alternates.push({ 
              lang: "x-default", 
              href: `${BASE_URL}${caminho("blogPost", IDIOMA_PADRAO, post.slug)}` 
            });

            entries.push({
              path,
              changefreq: "monthly",
              priority: "0.6",
              alternates,
            });
          }
        }

        // 3. Empreendimentos (Catálogo Cury)
        for (const p of publicos as { id: string, slug: string }[]) {
          if (!p.slug) continue;
          for (const lang of IDIOMAS) {
            const path = caminho("empreendimento", lang, p.slug);
            const alternates = IDIOMAS.map((l) => ({
              lang: IDIOMA_META[l].hreflang,
              href: `${BASE_URL}${caminho("empreendimento", l, p.slug)}`,
            }));
            alternates.push({ 
              lang: "x-default", 
              href: `${BASE_URL}${caminho("empreendimento", IDIOMA_PADRAO, p.slug)}` 
            });

            entries.push({
              path,
              changefreq: "weekly",
              priority: "0.9",
              alternates,
            });
          }
        }

        const xmlLines = entries.map((e) => {
          const loc = `${BASE_URL}${e.path}`;
          const lines = [
            `  <url>`,
            `    <loc>${loc}</loc>`,
          ];

          if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
          if (e.priority) lines.push(`    <priority>${e.priority}</priority>`);
          
          if (e.alternates) {
            for (const alt of e.alternates) {
              lines.push(`    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}" />`);
            }
          }

          lines.push(`  </url>`);
          return lines.join("\n");
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...xmlLines,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
