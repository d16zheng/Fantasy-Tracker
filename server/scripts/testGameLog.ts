import { fetchEspnGameLog } from "../integrations/espn/gameLogClient";

async function main() {
    const result = await fetchEspnGameLog(
        "3112335",
        2025
    );

    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);