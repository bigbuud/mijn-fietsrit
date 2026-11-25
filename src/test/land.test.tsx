import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
import { getLand, KLASSIEKERS, setLand } from "@/lib/land";

const jaar = new Date().getFullYear();
const ritten = [{ id: "a", datum: `${jaar}-01-10`, km: 298, minuten: 600, opmerking: "", weer: "", gevoel: "" }, { id: "b", datum: `${jaar}-01-12`, km: 298, minuten: 600, opmerking: "", weer: "", gevoel: "" }];

describe("landenthema", () => {
  beforeEach(() => {
    localStorage.clear(); document.documentElement.removeAttribute("data-land");
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const json = (d: unknown) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
      if (url === "/api/auth/status") return json({ ingesteld: true, ingelogd: true, gebruikersnaam: "jan" });
      return json(ritten);
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("bewaart de keuze en zet het attribuut op de pagina", () => {
    expect(getLand()).toBe("it");
    setLand("fr");
    expect(getLand()).toBe("fr");
    expect(document.documentElement.getAttribute("data-land")).toBe("fr");
    setLand("it");
    expect(document.documentElement.hasAttribute("data-land")).toBe(false);
  });

  it("kent per land minstens twee klassiekers", () => {
    for (const l of ["be", "fr", "it"] as const) expect(KLASSIEKERS[l].length).toBeGreaterThanOrEqual(2);
  });

  it("toont in Overzicht de klassiekers van Italië, en van België na het kiezen", async () => {
    const App = Route.options.component!;
    render(<App />);
    fireEvent.click(await screen.findByText("Overzicht", { selector: "nav button" }));
    expect(await screen.findByText("Milaan–Sanremo")).toBeInTheDocument();
    expect(screen.getByText("2,0")).toBeInTheDocument(); // 596 km / 298 km
    fireEvent.click(screen.getByLabelText("Instellingen"));
    fireEvent.click(await screen.findByRole("button", { name: /België/ }));
    fireEvent.click(screen.getByText("Overzicht", { selector: "nav button" }));
    expect(await screen.findByText("Ronde van Vlaanderen")).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-land")).toBe("be");
  });
});
