export const NBA_TEAM_ABBREVIATIONS = new Set([
    "ATL", "BOS", "BKN", "CHA", "CHI",
    "CLE", "DAL", "DEN", "DET", "GS", "GSW",
    "HOU", "IND", "LAC", "LAL", "MEM",
    "MIA", "MIL", "MIN", "NO", "NOP", "NY", "NYK",
    "OKC", "ORL", "PHI", "PHO", "PHX", "POR",
    "SAC", "SA", "SAS", "TOR", "UTA", "UTAH", "WAS", "WSH"
]);

export function isNbaTeam(
    abbreviation: string
): boolean {
    return NBA_TEAM_ABBREVIATIONS.has(
        abbreviation.toUpperCase()
    );
}
