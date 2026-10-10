import type {
    BalldontliePlayerSearchResponse
} from "./types"

export async function searchBalldontliePlayers(
    search: string
): Promise<BalldontliePlayerSearchResponse> {
    const url = `${BALLDONTLIE_BASE_URL}/players` + `?search=${encodeURIComponent(search)}`;

    const response = await fetch(url, {
        headers: {
            Authorization: process.env.BALLDONTLIE_API_KEY ?? "",
            Accept: "application/json"
        },
    });

    if (!response.ok) {
        throw new Error(
            'BALLDONTLIE request failed: ${response.status} ${response.statusText}' 
        );
    }
    
    return response.json()
}