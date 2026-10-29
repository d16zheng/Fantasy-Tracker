from datetime import date

from schema import GameLogEntry, GameStats, STAT_FIELDS


def available_games(
    games: list[GameLogEntry],
    as_of_date: date,
) -> list[GameLogEntry]:
    return sorted(
        [
            game
            for game in games
            if game.phase == "regular" and game.date.date() < as_of_date
        ],
        key=lambda game: game.date,
    )


def average_stats(games: list[GameLogEntry]) -> GameStats:
    if not games:
        raise ValueError("No games available")

    values = {
        field: sum(getattr(game, field) for game in games) / len(games)
        for field in STAT_FIELDS
    }
    return GameStats(**values)


def season_average(games: list[GameLogEntry]) -> GameStats:
    return average_stats(games)


def recent_average(
    games: list[GameLogEntry],
    window: int = 10,
) -> GameStats:
    return average_stats(games[-window:])


def weighted_average(
    games: list[GameLogEntry],
    decay: float = 0.9,
) -> GameStats:
    if not games:
        raise ValueError("No games available")
    if not 0 < decay <= 1:
        raise ValueError("Decay must be between 0 and 1")

    weights = [decay ** (len(games) - 1 - i) for i in range(len(games))]
    total_weight = sum(weights)
    values = {
        field: sum(
            getattr(game, field) * weight
            for game, weight in zip(games, weights)
        )
        / total_weight
        for field in STAT_FIELDS
    }
    return GameStats(**values)


def predict_baseline(games: list[GameLogEntry], model: str) -> GameStats:
    if model == "seasonAverage":
        return season_average(games)
    if model == "recentAverage":
        return recent_average(games)
    if model == "weightedAverage":
        return weighted_average(games)
    raise ValueError(f"Unsupported baseline model: {model}")
