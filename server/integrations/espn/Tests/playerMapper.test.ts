import { describe, expect, it } from "vitest";
import { mapEspnPlayer } from "../mapper";

describe("mapEspnPlayer", () => {
    it("keeps every NBA position listed in ESPN eligibleSlots", () => {
        expect(mapEspnPlayer({
            id: 1,
            proTeamId: 28,
            firstName: "Test",
            lastName: "Player",
            fullName: "Test Player",
            defaultPositionId: 2,
            eligibleSlots: [1, 2, 6, 8, 11],
        })).toMatchObject({
            position: "SG / SF",
            nbaTeamAbbreviation: "TOR",
        });
    });

    it("uses the default NBA position if ESPN supplies no eligible positions", () => {
        expect(mapEspnPlayer({
            id: 2,
            proTeamId: 7,
            fullName: "Test Center",
            defaultPositionId: 5,
            eligibleSlots: [4, 9, 10, 11],
        }).position).toBe("C");
    });
});
