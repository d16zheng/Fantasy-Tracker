import { afterEach, describe, expect, it, vi } from "vitest";
import { readSavedRosterSelection, saveRosterSelection } from "./rosterSelectionStorage";

function mockStorage(initialValue: string | null = null) {
  let value = initialValue;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => value,
      setItem: (_key: string, nextValue: string) => {
        value = nextValue;
      },
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("saved roster selection", () => {
  it("restores the team and stats season saved after a successful load", () => {
    mockStorage();
    saveRosterSelection({ leagueId: "123", teamId: "5" }, 2025);

    expect(readSavedRosterSelection([2027, 2026, 2025, 2024])).toEqual({
      leagueId: "123",
      teamId: "5",
      seasonEndYear: 2025,
    });
  });

  it("keeps the team but uses the current season when the saved season is no longer offered", () => {
    mockStorage(JSON.stringify({ leagueId: "123", teamId: "5", seasonEndYear: 2024 }));

    expect(readSavedRosterSelection([2028, 2027, 2026, 2025])).toEqual({
      leagueId: "123",
      teamId: "5",
      seasonEndYear: 2028,
    });
  });

  it.each(["not json", "{}", '{"leagueId":"123","teamId":"0"}', '{"leagueId":"bad","teamId":"5"}'])(
    "ignores invalid saved data: %s",
    (value) => {
      mockStorage(value);
      expect(readSavedRosterSelection([2027, 2026, 2025, 2024])).toBeNull();
    },
  );

  it("continues working if browser storage is unavailable", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(readSavedRosterSelection([2027])).toBeNull();
    expect(() => saveRosterSelection({ leagueId: "123", teamId: "5" }, 2027)).not.toThrow();
  });
});
