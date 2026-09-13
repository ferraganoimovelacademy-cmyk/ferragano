import { createFileRoute } from "@tanstack/react-router";

const ROBOTS = [
  "User-agent: *",
  "Allow: /",
  "Sitemap: https://ferragano.lovable.app/sitemap.xml",
].join("\n");

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(ROBOTS, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
