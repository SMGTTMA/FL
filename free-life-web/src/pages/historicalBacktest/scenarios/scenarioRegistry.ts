import { gridCashKeypointsScenario } from "./gridCashKeypointsScenario";
import { keypointsV3Scenario } from "./keypointsV3Scenario";
import { trendStrengthScenario } from "./trendStrengthScenario";
import type { BacktestScenarioDefinition, BacktestScenarioId } from "./types";

export const backtestScenarios: BacktestScenarioDefinition[] = [
  gridCashKeypointsScenario,
  keypointsV3Scenario,
  trendStrengthScenario,
];

export const getBacktestScenarioById = (id: BacktestScenarioId) =>
  backtestScenarios.find((scenario) => scenario.id === id) ?? backtestScenarios[0];
