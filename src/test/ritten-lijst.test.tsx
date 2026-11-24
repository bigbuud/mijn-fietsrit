import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
import { fireEvent } from "@testing-library/react";

const r = (id: string, datum: string, km: number) => ({ id, datum, km, minuten: 60, opmerking: "", weer: "", gevoel: "" });
const ritten = [r("a", "2026-11-02", 20), r("b", "2026-11-20", 30.4), r("c", "2026-10-05", 40), r("d", "2025-03-01", 10), r("e", "2025-02-01", 15)];

describe("ritten per maand", () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const json = (d: unknown) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
      if (url === "/api/auth/status") return json({ ingesteld: true, ingelogd: true, gebruikersnaam: "jan" });
      return json(ritten);
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("groepeert per maand met aantal ritten en kilometers", async () => {
    const App = Route.options.component!;
    render(<App />);
    fireEvent.click(await screen.findByText("Ritten", { selector: "nav button" }));
    expect(await screen.findByText("2 ritten · 50 km")).toBeInTheDocument(); // november 2026
    expect(screen.getByText("1 rit · 40 km")).toBeInTheDocument(); // oktober 2026
    expect(screen.getAllByLabelText("Bewerken")).toHaveLength(5);
  });
});
