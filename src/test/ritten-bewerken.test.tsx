import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";

const ritten = [
  { id: "a", datum: "2023-04-02", km: 42.5, minuten: 100, opmerking: "oud", weer: "", gevoel: "" },
  { id: "b", datum: "2024-05-01", km: 30, minuten: 70, opmerking: "", weer: "regen", gevoel: "goed" },
];

describe("rit bewerken en wissen", () => {
  let puts: unknown[][];
  beforeEach(() => {
    localStorage.clear();
    puts = [];
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const json = (d: unknown) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
      if (url === "/api/auth/status") return json({ ingesteld: true, ingelogd: true, gebruikersnaam: "jan" });
      if (url === "/api/rides" && init?.method === "PUT") { puts.push(JSON.parse(String(init.body))); return json({ ok: true }); }
      return json(ritten);
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  const openRitten = async () => {
    const App = Route.options.component!;
    render(<App />);
    fireEvent.click(await screen.findByText("Ritten", { selector: "nav button" }));
    await screen.findAllByLabelText("Bewerken");
  };

  it("past een rit aan en bewaart die met hetzelfde id", async () => {
    await openRitten();
    fireEvent.click(screen.getAllByLabelText("Bewerken")[0]!); // nieuwste rit eerst: "b"
    const km = await screen.findByDisplayValue("30");
    fireEvent.change(km, { target: { value: "35,5" } });
    fireEvent.click(screen.getByText("Wijzigingen opslaan"));
    await waitFor(() => expect(puts).toHaveLength(1));
    const lijst = puts[0] as { id: string; km: number; weer: string }[];
    expect(lijst).toHaveLength(2);
    expect(lijst.find((r) => r.id === "b")).toMatchObject({ km: 35.5, weer: "regen" });
    expect(lijst.find((r) => r.id === "a")).toMatchObject({ km: 42.5 });
  });

  it("kan het weer wissen door nogmaals op de keuze te tikken", async () => {
    await openRitten();
    fireEvent.click(screen.getAllByLabelText("Bewerken")[0]!);
    fireEvent.click(await screen.findByText("regen")); // geselecteerd → leeg
    fireEvent.click(screen.getByText("Wijzigingen opslaan"));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect((puts[0] as { id: string; weer: string }[]).find((r) => r.id === "b")?.weer).toBe("");
  });

  it("wist een rit vanuit het bewerkformulier", async () => {
    vi.stubGlobal("confirm", () => true);
    await openRitten();
    fireEvent.click(screen.getAllByLabelText("Bewerken")[1]!); // rit "a"
    fireEvent.click(await screen.findByText("Deze rit verwijderen"));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect((puts[0] as { id: string }[]).map((r) => r.id)).toEqual(["b"]);
  });

  it("slaat een nieuwe rit op via http (zonder crypto.randomUUID)", async () => {
    // Op http://nas:5252 (geen https/localhost) bestaat crypto.randomUUID niet.
    const echt = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: echt.getRandomValues.bind(echt) });
    const App = Route.options.component!;
    render(<App />);
    await screen.findByText("Rit opslaan", { selector: "button" });
    fireEvent.change(screen.getByPlaceholderText("bv. 42,5"), { target: { value: "42,5" } });
    fireEvent.change(screen.getByPlaceholderText("uren"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("minuten"), { target: { value: "40" } });
    fireEvent.click(screen.getByText("Rit opslaan", { selector: "button" }));
    await waitFor(() => expect(puts).toHaveLength(1));
    const lijst = puts[0] as { id: string; km: number; minuten: number }[];
    expect(lijst).toHaveLength(3);
    const nieuw = lijst.find((r) => !["a", "b"].includes(r.id))!;
    expect(nieuw).toMatchObject({ km: 42.5, minuten: 100 });
    expect(nieuw.id.length).toBeGreaterThan(8);
  });
});
