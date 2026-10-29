"""Monte Carlo simulation for weekly nine-category fantasy matchups."""

from __future__ import annotations

import math
import random
from schema import (
    CategoryProbability,
    GameStats,
    MatchupSimulationRequest,
    MatchupSimulationResult,
    SimulationPlayer,
    SimulationTeam,
    STAT_FIELDS,
)


CATEGORIES = (
    "fgPercentage",
    "ftPercentage",
    "threepm",
    "points",
    "rebounds",
    "assists",
    "steals",
    "blocks",
    "to",
)
COUNTING_FIELDS = (
    "fgm",
    "fga",
    "ftm",
    "fta",
    "threepm",
    "threepa",
    "rebounds",
    "assists",
    "steals",
    "blocks",
    "to",
)
INTEGER_GAME_STATS = COUNTING_FIELDS


def _stochastic_round(value: float, rng: random.Random) -> int:
    """Round to a nearby integer while preserving the value in expectation."""
    bounded = max(0.0, value)
    lower = math.floor(bounded)
    return lower + int(rng.random() < bounded - lower)


def _sample_player_game(
    player: SimulationPlayer,
    history_means: dict[str, float],
    rng: random.Random,
) -> GameStats:
    historical = rng.choice(player.history)
    sampled = {
        field: getattr(player.projectedStats, field)
        + getattr(historical, field)
        - history_means[field]
        for field in STAT_FIELDS
    }

    for field in INTEGER_GAME_STATS:
        sampled[field] = float(_stochastic_round(sampled[field], rng))

    # Keep each sampled line internally valid. Three-pointers are included in
    # field goals, and all makes must be within their corresponding attempts.
    sampled["fga"] = max(0.0, sampled["fga"])
    sampled["fgm"] = min(max(0.0, sampled["fgm"]), sampled["fga"])
    sampled["threepa"] = min(max(0.0, sampled["threepa"]), sampled["fga"])
    sampled["threepm"] = min(
        max(0.0, sampled["threepm"]), sampled["threepa"], sampled["fgm"]
    )
    sampled["fta"] = max(0.0, sampled["fta"])
    sampled["ftm"] = min(max(0.0, sampled["ftm"]), sampled["fta"])
    for field in ("minutes", "rebounds", "assists", "steals", "blocks", "to"):
        sampled[field] = max(0.0, sampled[field])

    # Rebuild points from the simulated makes to preserve the box-score identity.
    sampled["points"] = 2 * sampled["fgm"] + sampled["threepm"] + sampled["ftm"]
    return GameStats(**sampled)


def _history_means(player: SimulationPlayer) -> dict[str, float]:
    return {
        field: sum(getattr(game, field) for game in player.history) / len(player.history)
        for field in STAT_FIELDS
    }


def _simulate_team(team: SimulationTeam, rng: random.Random) -> dict[str, float | None]:
    totals = {field: 0.0 for field in COUNTING_FIELDS}
    for player in team.players:
        if player.scheduledGames == 0:
            continue
        means = _history_means(player)
        for _ in range(player.scheduledGames):
            game = _sample_player_game(player, means, rng)
            for field in COUNTING_FIELDS:
                totals[field] += getattr(game, field)

    return {
        **totals,
        "fgPercentage": totals["fgm"] / totals["fga"] if totals["fga"] > 0 else None,
        "ftPercentage": totals["ftm"] / totals["fta"] if totals["fta"] > 0 else None,
    }


def _compare(first: float | None, second: float | None, category: str) -> int:
    """Return 1 for first-team win, -1 for second, or 0 for a category tie."""
    if first is None or second is None or math.isclose(first, second, abs_tol=1e-12):
        return 0
    if category == "to":
        return 1 if first < second else -1
    return 1 if first > second else -1


def generate_matchup_simulation(
    request: MatchupSimulationRequest,
) -> MatchupSimulationResult:
    rng = random.Random(request.seed)
    category_counts: dict[str, list[int]] = {category: [0, 0, 0] for category in CATEGORIES}
    first_more = 0
    second_more = 0
    tied_category_wins = 0
    first_five_plus = 0
    second_five_plus = 0
    neither_five = 0
    four_four_one = 0

    for _ in range(request.simulations):
        first = _simulate_team(request.firstTeam, rng)
        second = _simulate_team(request.secondTeam, rng)
        first_wins = 0
        second_wins = 0
        category_ties = 0

        for category in CATEGORIES:
            outcome = _compare(first[category], second[category], category)
            counts = category_counts[category]
            if outcome > 0:
                counts[0] += 1
                first_wins += 1
            elif outcome < 0:
                counts[1] += 1
                second_wins += 1
            else:
                counts[2] += 1
                category_ties += 1

        if first_wins > second_wins:
            first_more += 1
        elif second_wins > first_wins:
            second_more += 1
        else:
            tied_category_wins += 1

        if first_wins >= 5:
            first_five_plus += 1
        elif second_wins >= 5:
            second_five_plus += 1
        else:
            neither_five += 1

        if first_wins == 4 and second_wins == 4 and category_ties == 1:
            four_four_one += 1

    total = request.simulations
    return MatchupSimulationResult(
        firstTeamId=request.firstTeam.teamId,
        secondTeamId=request.secondTeam.teamId,
        simulationCount=total,
        categoryProbabilities=[
            CategoryProbability(
                category=category,
                firstTeamWinProbability=category_counts[category][0] / total,
                secondTeamWinProbability=category_counts[category][1] / total,
                tieProbability=category_counts[category][2] / total,
            )
            for category in CATEGORIES
        ],
        firstTeamMoreCategoryWinsProbability=first_more / total,
        secondTeamMoreCategoryWinsProbability=second_more / total,
        categoryWinTieProbability=tied_category_wins / total,
        firstTeamAtLeastFiveCategoriesProbability=first_five_plus / total,
        secondTeamAtLeastFiveCategoriesProbability=second_five_plus / total,
        neitherTeamReachesFiveCategoriesProbability=neither_five / total,
        fourFourOneTieProbability=four_four_one / total,
    )
