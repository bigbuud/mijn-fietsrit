import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallPopup } from "@/components/InstallPopup";

const zetUa = (ua: string) => vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);

describe("installatie-popup", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("legt op iPhone uit hoe je op het beginscherm zet", () => {
    zetUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1");
    render(<InstallPopup open onOpenChange={() => {}} />);
    expect(screen.getByText(/Zet op beginscherm/)).toBeInTheDocument();
  });

  it("legt op Android het browsermenu uit", () => {
    zetUa("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
    render(<InstallPopup open onOpenChange={() => {}} />);
    expect(screen.getByText(/App installeren/)).toBeInTheDocument();
  });

  it("toont niets als hij gesloten is", () => {
    render(<InstallPopup open={false} onOpenChange={() => {}} />);
    expect(screen.queryByText("Fietslog als app")).toBeNull();
  });
});
