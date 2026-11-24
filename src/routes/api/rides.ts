import { createFileRoute } from "@tanstack/react-router";

// Self-hosted opslag: de ritten staan in een JSON-bestand op de server (DATA_DIR, standaard ./data).
// Alleen toegankelijk voor wie is ingelogd.
async function paths() {
  const path = await import("node:path");
  const dir = process.env["DATA_DIR"] || path.join(process.cwd(), "data");
  return { dir, file: path.join(dir, "rides.json") };
}

const isRit = (r: unknown) => {
  const x = r as Record<string, unknown> | null;
  return (
    !!x && typeof x === "object" &&
    typeof x["id"] === "string" && typeof x["datum"] === "string" &&
    typeof x["km"] === "number" && typeof x["minuten"] === "number" &&
    typeof x["opmerking"] === "string" && typeof x["weer"] === "string" && typeof x["gevoel"] === "string"
  );
};

export const Route = createFileRoute("/api/rides")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const a = await import("@/lib/auth-server");
        const sessie = await a.leesSessie(request);
        if (!sessie.ingelogd) return a.json({ fout: "Niet ingelogd" }, 401);
        const fs = await import("node:fs/promises");
        const { file } = await paths();
        let ritten: unknown = [];
        try { ritten = JSON.parse(await fs.readFile(file, "utf8")); } catch { /* nog geen ritten */ }
        return a.json(ritten, 200, sessie.setCookie);
      },
      PUT: async ({ request }) => {
        const a = await import("@/lib/auth-server");
        const sessie = await a.leesSessie(request);
        if (!sessie.ingelogd) return a.json({ fout: "Niet ingelogd" }, 401);
        const fs = await import("node:fs/promises");
        const body = await request.json().catch(() => null);
        if (!Array.isArray(body) || !body.every(isRit)) return a.json({ fout: "Ongeldige gegevens" }, 400);
        const { dir, file } = await paths();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file + ".tmp", JSON.stringify(body, null, 2));
        await fs.rename(file + ".tmp", file);
        return a.json({ ok: true }, 200, sessie.setCookie);
      },
    },
  },
});
