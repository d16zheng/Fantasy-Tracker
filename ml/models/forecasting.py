from datetime import date

from models.baseline import available_games, predict_baseline
from schema import (
    ForecastPoint,
    GameStats,
    PredictionRequest,
    PredictionResult,
    STAT_FIELDS,
)


def get_training_games(request: PredictionRequest, cutoff: date):
    seasons = sorted(
        request.gameLogs,
        key=lambda season: season.seasonEndYear,
        reverse=True,
    )

    # Prefer the selected season's available games, then fall back to earlier seasons.
    for season in seasons:
        if season.seasonEndYear > request.seasonEndYear:
            continue
        games = available_games(season.games, cutoff)
        if games:
            return games

    raise ValueError("No historical games available before cutoff")


def get_current_season_games(request: PredictionRequest, cutoff: date):
    games = [
        game
        for season in request.gameLogs
        if season.seasonEndYear == request.seasonEndYear
        for game in season.games
    ]
    return available_games(games, cutoff)


def calculate_final_average(
    current_games,
    future_average: GameStats,
    remaining_games: int,
) -> GameStats:
    played = len(current_games)
    total_games = played + remaining_games
    if total_games == 0:
        raise ValueError("No games to average")

    actual_totals = {
        field: sum(getattr(game, field) for game in current_games)
        for field in STAT_FIELDS
    }
    final = {
        field: (
            actual_totals[field]
            + getattr(future_average, field) * remaining_games
        )
        / total_games
        for field in STAT_FIELDS
    }
    return GameStats(**final)


def generate_forecast(request: PredictionRequest) -> PredictionResult:
    cutoff = date.fromisoformat(request.asOfDate)
    if request.model == "ridge":
        raise ValueError("Ridge model is not implemented yet")

    training_games = get_training_games(request, cutoff)
    predicted = predict_baseline(training_games, request.model)

    if request.horizon == "next5":
        expected_games = 5
    elif request.horizon == "next10":
        expected_games = 10
    else:
        if request.expectedRemainingGames is None:
            raise ValueError(
                "expectedRemainingGames is required for season forecasts"
            )
        expected_games = request.expectedRemainingGames

    forecast = [
        ForecastPoint(gameNumber=game_number, predictedStats=predicted)
        for game_number in range(1, expected_games + 1, 5)
    ]

    if request.horizon == "finalSeason":
        current_games = get_current_season_games(request, cutoff)
        final_average = calculate_final_average(
            current_games,
            predicted,
            expected_games,
        )
        return PredictionResult(
            predictedStats=final_average,
            forecast=forecast,
            expectedGames=expected_games,
        )

    return PredictionResult(
        predictedStats=predicted,
        forecast=forecast,
        expectedGames=expected_games,
    )
