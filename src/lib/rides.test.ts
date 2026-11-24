import { describe, expect, it } from "vitest";
import { ridesToCsv } from "./rides";
describe("CSV export", () => {
  it("bevat kop en rit met puntkomma en komma-decimaal", () => {
    const csv = ridesToCsv([{ id: "1", datum: "2026-11-20", km: 40, minuten: 100, opmerking: 'naar "Temse"', weer: "zonnig", gevoel: "goed" }]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain('"Datum";"Afstand (km)"');
    expect(lines[1]).toBe('"2026-11-20";"40,0";"100";"1u40";"24,0";"naar ""Temse""";"zonnig";"goed"');
  });
});
