import { createFileRoute } from "@tanstack/react-router";

// /api/auth/status (GET) · /api/auth/login · /api/auth/setup · /api/auth/logout (POST)
export const Route = createFileRoute("/api/auth/$action")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const a = await import("@/lib/auth-server");
        if (params.action !== "status") return a.json({ fout: "Niet gevonden" }, 404);
        const account = await a.getAccount();
        const sessie = await a.leesSessie(request);
        return a.json(
          { ingesteld: !!account, ingelogd: sessie.ingelogd, gebruikersnaam: sessie.gebruikersnaam ?? null },
          200,
          sessie.setCookie,
        );
      },
      POST: async ({ request, params }) => {
        const a = await import("@/lib/auth-server");
        if (!(request.headers.get("content-type") || "").includes("application/json")) {
          return a.json({ fout: "Ongeldig verzoek" }, 415);
        }
        const body = (await request.json().catch(() => null)) as
          | { gebruikersnaam?: unknown; wachtwoord?: unknown }
          | null;
        const naam = typeof body?.gebruikersnaam === "string" ? body.gebruikersnaam : "";
        const ww = typeof body?.wachtwoord === "string" ? body.wachtwoord : "";

        if (params.action === "logout") return a.json({ ok: true }, 200, a.wisCookie(request));

        if (params.action === "login") {
          const ip = a.clientIp(request);
          if (a.teVeelPogingen(ip)) return a.json({ fout: "Te veel pogingen. Probeer het over een kwartier opnieuw." }, 429);
          const account = await a.getAccount();
          if (!account) return a.json({ fout: "Er is nog geen account aangemaakt." }, 409);
          const naamOk = naam.trim().toLowerCase() === account.gebruikersnaam.toLowerCase();
          const wwOk = account.controleer(ww); // altijd uitvoeren (geen tijdverschil tussen foute naam/wachtwoord)
          if (!naamOk || !wwOk) {
            a.registreerFout(ip);
            await new Promise((r) => setTimeout(r, 500));
            return a.json({ fout: "Gebruikersnaam of wachtwoord klopt niet." }, 401);
          }
          a.wisFouten(ip);
          return a.json({ ok: true }, 200, await a.startSessie(request));
        }

        if (params.action === "setup") {
          const fout = await a.maakAccount(naam, ww);
          if (fout) return a.json({ fout }, 400);
          return a.json({ ok: true }, 200, await a.startSessie(request));
        }

        return a.json({ fout: "Niet gevonden" }, 404);
      },
    },
  },
});
