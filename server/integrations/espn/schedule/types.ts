export interface EspnScheduleEvent {
  id: string;
  competitions: {
    competitors: {
      team: {
        abbreviation: string;
      };
    }[];
  }[];
}

export interface EspnScoreboardResponse {
  events: EspnScheduleEvent[];
}
