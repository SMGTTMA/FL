import { gridCashKeypointsScenario } from "./gridCashKeypointsScenario";
import { trendStrengthScenario } from "./trendStrengthScenario";
import type { BacktestScenarioDefinition, BacktestScenarioId } from "./types";

export const backtestScenarios: BacktestScenarioDefinition[] = [
  gridCashKeypointsScenario,
  trendStrengthScenario,
];

export const getBacktestScenarioById = (id: BacktestScenarioId) =>
  backtestScenarios.find((scenario) => scenario.id === id) ?? backtestScenarios[0];
