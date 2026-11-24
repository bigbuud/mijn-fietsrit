import { describe, expect, it } from "vitest";
import { leesRitten, parseCsv, parseDatum, parseGetal, parseGevoel, parseTijd, parseWeer, vindKoppen, type Rij } from "./import";

const utc = (y: number, m: number, d: number, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min));
let teller = 0;
const id = () => `id${++teller}`;

describe("waarden lezen", () => {
  it("datums in veel notaties (dag eerst)", () => {
    expect(parseDatum(utc(2023, 4, 2))).toBe("2023-04-02");
    expect(parseDatum("3/11/2024")).toBe("2024-11-03");
    expect(parseDatum("12-04-23")).toBe("2023-04-12");
    expect(parseDatum("2023-04-15")).toBe("2023-04-15");
    expect(parseDatum("zondag 2 april 2023")).toBe("2023-04-02");
    expect(parseDatum("5 okt 2021")).toBe("2021-10-05");
    expect(parseDatum("04/13/2023")).toBe("2023-04-13"); // maand-dag als dag-maand onmogelijk is
    expect(parseDatum(45019)).toBe("2023-04-03"); // Excel-datumnummer
    expect(parseDatum("31/02/2023")).toBeNull();
    expect(parseDatum("abc")).toBeNull();
  });
  it("kilometers", () => {
    expect(parseGetal("61,2 km")).toBe(61.2);
    expect(parseGetal("42.5")).toBe(42.5);
    expect(parseGetal("1.234,5")).toBe(1234.5);
    expect(parseGetal(30)).toBe(30);
    expect(parseGetal("abc")).toBeNull();
  });
  it("tijd in veel notaties", () => {
    expect(parseTijd(utc(1899, 12, 30, 1, 40))).toBe(100);
    expect(parseTijd("1:40")).toBe(100);
    expect(parseTijd("01:40:00")).toBe(100);
    expect(parseTijd("1u40")).toBe(100);
    expect(parseTijd("3h05m")).toBe(185);
    expect(parseTijd("1,5 uur")).toBe(90);
    expect(parseTijd("100 min")).toBe(100);
    expect(parseTijd(0.0833333333)).toBe(120); // dagfractie
    expect(parseTijd(85, "min")).toBe(85);
    expect(parseTijd(1.5, "uur")).toBe(90);
    expect(parseTijd(1.5)).toBe(90);
    expect(parseTijd(95)).toBe(95);
    expect(parseTijd("snel")).toBeNull();
  });
  it("weer en gevoel", () => {
    expect(parseWeer("Zonnig")).toBe("zonnig");
    expect(parseWeer("☀️")).toBe("zonnig");
    expect(parseWeer("regenbui")).toBe("regen");
    expect(parseWeer("frisse bries")).toBe("");
    expect(parseGevoel("zeer goed")).toBe("zeer goed");
    expect(parseGevoel("goed")).toBe("goed");
    expect(parseGevoel("zwaar")).toBe("matig");
    expect(parseGevoel(5)).toBe("zeer goed");
    expect(parseGevoel("2/5")).toBe("slecht");
  });
});

describe("CSV", () => {
  it("puntkomma, aanhalingstekens en BOM", () => {
    const r = parseCsv('\uFEFFdatum;km;opmerking\r\n2024-04-02;42,5;"naar ""Temse""; langs de Schelde"\r\n');
    expect(r[0]).toEqual(["datum", "km", "opmerking"]);
    expect(r[1]).toEqual(["2024-04-02", "42,5", 'naar "Temse"; langs de Schelde']);
  });
  it("komma als scheidingsteken", () => {
    expect(parseCsv("datum,km\n2024-04-02,42.5\n")[1]).toEqual(["2024-04-02", "42.5"]);
  });
});

describe("hele bestanden", () => {
  const rijen: Rij[] = [
    ["Mijn fietsritten 2023", null, null, null, null, null],
    [null, null, null, null, null, null],
    ["Datum", "Afstand (km)", "Duur", "Opmerking", "Weer", "Gevoel"],
    [utc(2023, 4, 2), 42.5, utc(1899, 12, 30, 1, 40), "Schelde naar Temse", "zonnig", "goed"],
    [utc(2023, 4, 9), "61,2 km", "2:05", "Kasseien", "wind", "zwaar"],
    ["12/04/2023", 30, "1u10", null, "regen", null],
    ["2023-04-15", 75, "3h05m", "lange rit", "☀️", 5],
    [utc(2023, 4, 20), "abc", utc(1899, 12, 30, 1), "kapot", null, null],
    [utc(2023, 4, 22), 55, 0.0833333333, "dagfractie", "frisse bries", "matig"],
    [utc(2023, 4, 2), 42.5, utc(1899, 12, 30, 1, 40), "dubbel in bestand", null, null],
    [null, null, null, null, null, null],
  ];

  it("vindt de kopregel onder een titel", () => {
    const { kopRij, koppeling } = vindKoppen(rijen);
    expect(kopRij).toBe(2);
    expect(koppeling).toMatchObject({ datum: 0, km: 1, tijd: 2, opmerking: 3, weer: 4, gevoel: 5 });
  });

  it("importeert, meldt fouten en slaat dubbels over", () => {
    const { kopRij, koppeling } = vindKoppen(rijen);
    const items = leesRitten(rijen, kopRij, koppeling, [], { id });
    const rides = items.filter((i) => i.ride).map((i) => i.ride!);
    expect(rides.map((r) => [r.datum, r.km, r.minuten, r.weer, r.gevoel])).toEqual([
      ["2023-04-02", 42.5, 100, "zonnig", "goed"],
      ["2023-04-09", 61.2, 125, "wind", "matig"],
      ["2023-04-12", 30, 70, "regen", ""],
      ["2023-04-15", 75, 185, "zonnig", "zeer goed"],
      ["2023-04-22", 55, 120, "", "matig"],
    ]);
    expect(rides[4]!.opmerking).toBe("dagfractie (weer: frisse bries)"); // onbekend weer gaat niet verloren
    expect(items.filter((i) => i.fout).map((i) => [i.rij, i.fout])).toEqual([[8, "Afstand “abc” niet te lezen"]]);
    expect(items.filter((i) => i.dubbel).map((i) => i.rij)).toEqual([10]);
  });

  it("slaat ritten over die al bestaan", () => {
    const { kopRij, koppeling } = vindKoppen(rijen);
    const bestaand = [{ id: "x", datum: "2023-04-02", km: 42.5, minuten: 100, opmerking: "", weer: "" as const, gevoel: "" as const }];
    const items = leesRitten(rijen, kopRij, koppeling, bestaand, { id });
    expect(items.filter((i) => i.ride)).toHaveLength(4);
    expect(items.filter((i) => i.dubbel)).toHaveLength(2);
  });

  it("tijd uit snelheid, of geschat, of overgeslagen", () => {
    const r: Rij[] = [["datum", "km", "gem. snelheid"], ["2023-05-01", 50, 25], ["2023-05-02", 40, null]];
    const { kopRij, koppeling } = vindKoppen(r);
    expect(koppeling.snelheid).toBe(2);
    const zonder = leesRitten(r, kopRij, koppeling, [], { id });
    expect(zonder[0]!.ride!.minuten).toBe(120);
    expect(zonder[1]).toMatchObject({ rij: 3, fout: "Geen tijd", geenTijd: true });
    const met = leesRitten(r, kopRij, koppeling, [], { id, schatKmU: 20 });
    expect(met[1]!.ride).toMatchObject({ minuten: 120, opmerking: "(tijd geschat)" });
  });

  it("zonder kopregel: volgorde datum, km, tijd", () => {
    const r: Rij[] = [["2023-05-01", "50", "2:00"], ["2023-05-08", "40", "1:30"]];
    const { kopRij, koppeling } = vindKoppen(r);
    expect(kopRij).toBe(-1);
    expect(leesRitten(r, kopRij, koppeling, [], { id }).filter((i) => i.ride)).toHaveLength(2);
  });

  it("let op onwaarschijnlijke snelheden", () => {
    const r: Rij[] = [["datum", "km", "tijd (min)"], ["2023-05-01", 100, 20]];
    const { kopRij, koppeling } = vindKoppen(r);
    expect(leesRitten(r, kopRij, koppeling, [], { id })[0]!.fout).toMatch(/onwaarschijnlijk/);
  });
});
