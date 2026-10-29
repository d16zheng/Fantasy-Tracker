from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class GameStats(BaseModel):
    minutes: float = 0
    fgm: float = 0
    fga: float = 0
    ftm: float = 0
    fta: float = 0
    threepm: float = 0
    threepa: float = 0
    rebounds: float = 0
    assists: float = 0
    steals: float = 0
    blocks: float = 0
    to: float = 0
    points: float = 0


STAT_FIELDS = list(GameStats.model_fields.keys())


class GameLogEntry(GameStats):
    date: datetime
    seasonEndYear: int
    phase: Literal["regular", "postseason"]


class SeasonHistory(BaseModel):
    seasonEndYear: int
    games: list[GameLogEntry]


class PredictionRequest(BaseModel):
    playerId: str
    seasonEndYear: int
    horizon: Literal["next5", "next10", "restOfSeason", "finalSeason"]
    model: Literal["seasonAverage", "recentAverage", "weightedAverage", "ridge"]
    asOfDate: str
    expectedRemainingGames: Optional[int] = Field(default=None, ge=0)
    gameLogs: list[SeasonHistory]


class ForecastPoint(BaseModel):
    gameNumber: int
    predictedStats: GameStats


class PredictionResult(BaseModel):
    predictedStats: GameStats
    forecast: list[ForecastPoint]
    expectedGames: int


class SimulationPlayer(BaseModel):
    playerId: str
    scheduledGames: int = Field(ge=0, le=10)
    projectedStats: GameStats
    history: list[GameStats] = Field(min_length=1)


class SimulationTeam(BaseModel):
    teamId: str
    name: str
    players: list[SimulationPlayer] = Field(min_length=1)


MatchupCategory = Literal[
    "fgPercentage",
    "ftPercentage",
    "threepm",
    "points",
    "rebounds",
    "assists",
    "steals",
    "blocks",
    "to",
]


class CategoryProbability(BaseModel):
    category: MatchupCategory
    firstTeamWinProbability: float
    secondTeamWinProbability: float
    tieProbability: float


class MatchupSimulationRequest(BaseModel):
    firstTeam: SimulationTeam
    secondTeam: SimulationTeam
    simulations: int = Field(default=10000, ge=100, le=50000)
    seed: Optional[int] = None


class MatchupSimulationResult(BaseModel):
    firstTeamId: str
    secondTeamId: str
    simulationCount: int
    categoryProbabilities: list[CategoryProbability]
    firstTeamMoreCategoryWinsProbability: float
    secondTeamMoreCategoryWinsProbability: float
    categoryWinTieProbability: float
    firstTeamAtLeastFiveCategoriesProbability: float
    secondTeamAtLeastFiveCategoriesProbability: float
    neitherTeamReachesFiveCategoriesProbability: float
    fourFourOneTieProbability: float
