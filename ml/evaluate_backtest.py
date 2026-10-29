"""Walk-forward evaluation of the player-stat baseline models."""

from __future__ import annotations

import argparse
import csv
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

from models.baseline import predict_baseline
from schema import GameLogEntry, STAT_FIELDS


MODELS = ("seasonAverage", "recentAverage", "weightedAverage")
STAT_LABELS = {
    "fgPercentage": "FG%",
    "ftPercentage": "FT%",
    "threepm": "3PM",
    "points": "PTS",
    "rebounds": "REB",
    "assists": "AST",
    "steals": "STL",
    "blocks": "BLK",
    "to": "TO",
}
METRIC_FIELDS = [*STAT_FIELDS, "fgPercentage", "ftPercentage"]


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def load_game_logs(database_path: Path) -> dict[tuple[str, int], list[GameLogEntry]]:
    if not database_path.is_file():
        raise FileNotFoundError(f"Database not found: {database_path}")

    grouped: dict[tuple[str, int], list[GameLogEntry]] = defaultdict(list)
    database_uri = f"{database_path.resolve().as_uri()}?mode=ro"
    with sqlite3.connect(database_uri, uri=True) as connection:
        rows = connection.execute(
            'SELECT "playerId", "seasonEndYear", data '
            'FROM "GamePerformanceRecord" WHERE phase = \'regular\' '
            'ORDER BY "date" ASC'
        )
        for player_id, season_end_year, raw_data in rows:
            value = json.loads(raw_data)
            value["seasonEndYear"] = season_end_year
            grouped[(player_id, season_end_year)].append(GameLogEntry(**value))

    for games in grouped.values():
        games.sort(key=lambda game: game.date)
    return grouped


def percentages(stats: Any) -> dict[str, float | None]:
    return {
        "fgPercentage": stats.fgm / stats.fga if stats.fga > 0 else None,
        "ftPercentage": stats.ftm / stats.fta if stats.fta > 0 else None,
    }


def actual_values(game: GameLogEntry) -> dict[str, float | None]:
    return {
        **{field: getattr(game, field) for field in STAT_FIELDS},
        **percentages(game),
    }


def predicted_values(stats: Any) -> dict[str, float | None]:
    return {
        **{field: getattr(stats, field) for field in STAT_FIELDS},
        **percentages(stats),
    }


def walk_forward(
    grouped_games: dict[tuple[str, int], list[GameLogEntry]],
    minimum_history: int,
    selected_season: int | None,
) -> dict[tuple[str, str], dict[str, float]]:
    errors: dict[tuple[str, str], list[tuple[str, float, float]]] = defaultdict(list)

    for (player_id, season_end_year), games in grouped_games.items():
        if selected_season is not None and season_end_year != selected_season:
            continue

        for target_index, target in enumerate(games):
            # Match the live API's date cutoff: no appearance on the target date
            # can be used, even if its game timestamp happens to be earlier.
            prior_games = [game for game in games[:target_index] if game.date.date() < target.date.date()]
            if len(prior_games) < minimum_history:
                continue

            actual = actual_values(target)
            for model in MODELS:
                predicted = predicted_values(predict_baseline(prior_games, model))
                for stat in METRIC_FIELDS:
                    actual_value = actual[stat]
                    predicted_value = predicted[stat]
                    if actual_value is None or predicted_value is None:
                        continue
                    unit_scale = 100 if stat in ("fgPercentage", "ftPercentage") else 1
                    error = (predicted_value - actual_value) * unit_scale
                    errors[(model, stat)].append(
                        (player_id, error, abs(error))
                    )

    summary: dict[tuple[str, str], dict[str, float]] = {}
    for key, entries in errors.items():
        summary[key] = {
            "sample_count": len(entries),
            "player_count": len({entry[0] for entry in entries}),
            "mae": sum(entry[2] for entry in entries) / len(entries),
            "mean_error": sum(entry[1] for entry in entries) / len(entries),
        }
    return summary


def write_csv(summary: dict[tuple[str, str], dict[str, float]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(
            output,
            fieldnames=["model", "stat", "sample_count", "player_count", "mae", "mean_error"],
        )
        writer.writeheader()
        for (model, stat), metrics in sorted(summary.items()):
            writer.writerow(
                {
                    "model": model,
                    "stat": stat,
                    "sample_count": int(metrics["sample_count"]),
                    "player_count": int(metrics["player_count"]),
                    "mae": f'{metrics["mae"]:.4f}',
                    "mean_error": f'{metrics["mean_error"]:.4f}',
                }
            )


def print_summary(
    summary: dict[tuple[str, str], dict[str, float]],
    minimum_history: int,
    selected_season: int | None,
) -> None:
    seasons = f"season {selected_season}" if selected_season else "all cached seasons"
    print(f"Walk-forward baseline evaluation · {seasons} · minimum prior games: {minimum_history}")
    print(f"{'Model':<18} {'Stat':<14} {'MAE':>10} {'Mean error':>12} {'Samples':>10} {'Players':>9}")
    print("-" * 78)
    for model in MODELS:
        for stat in METRIC_FIELDS:
            metrics = summary.get((model, stat))
            if metrics is None:
                continue
            label = STAT_LABELS.get(stat, stat)
            unit = " pp" if stat in ("fgPercentage", "ftPercentage") else ""
            print(
                f"{model:<18} {label:<14} {metrics['mae']:>9.3f}{unit:<3} "
                f"{metrics['mean_error']:>10.3f}{unit:<3} {int(metrics['sample_count']):>10} "
                f"{int(metrics['player_count']):>9}"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        type=Path,
        default=project_root() / "dev.db",
        help="SQLite database path (default: project dev.db)",
    )
    parser.add_argument(
        "--min-history",
        type=int,
        default=10,
        help="Minimum earlier regular-season appearances required (default: 10)",
    )
    parser.add_argument(
        "--season",
        type=int,
        help="Evaluate only this season end year; by default use every cached season",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        help="Optional path to write the summary as CSV",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.min_history < 1:
        print("--min-history must be at least 1", file=sys.stderr)
        return 2

    try:
        grouped_games = load_game_logs(args.db)
        summary = walk_forward(grouped_games, args.min_history, args.season)
    except (OSError, sqlite3.Error, json.JSONDecodeError, ValueError) as error:
        print(f"Backtest failed: {error}", file=sys.stderr)
        return 1

    if not summary:
        print("No predictions could be evaluated; check the database and history threshold.")
        return 1

    print_summary(summary, args.min_history, args.season)
    if args.csv:
        write_csv(summary, args.csv)
        print(f"\nCSV written to {args.csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
