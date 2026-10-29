from fastapi import FastAPI, HTTPException

from models.forecasting import generate_forecast
from models.matchup_simulation import generate_matchup_simulation
from schema import (
    MatchupSimulationRequest,
    MatchupSimulationResult,
    PredictionRequest,
    PredictionResult,
)


app = FastAPI(
    title="NBA Player Prediction API",
    version="0.1.0",
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "player-predictions"}


@app.post("/predict", response_model=PredictionResult)
def predict(request: PredictionRequest):
    try:
        return generate_forecast(request)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/simulate-matchup", response_model=MatchupSimulationResult)
def simulate_matchup(request: MatchupSimulationRequest):
    if request.firstTeam.teamId == request.secondTeam.teamId:
        raise HTTPException(status_code=422, detail="The matchup must have two different teams")
    try:
        return generate_matchup_simulation(request)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
