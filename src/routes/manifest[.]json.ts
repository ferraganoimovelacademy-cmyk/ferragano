import { createFileRoute } from "@tanstack/react-router";

const MANIFEST = {
  name: "Ferragano One",
  short_name: "Ferragano",
  start_url: "/",
  display: "standalone",
  background_color: "#0a192f",
  theme_color: "#c5a059",
  icons: [{ src: "/favicon.png", sizes: "512x512", type: "image/png" }],
};

export const Route = createFileRoute("/manifest.json")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(MANIFEST), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
