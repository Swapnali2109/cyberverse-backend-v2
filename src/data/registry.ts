// Combines every scenario file into one lookup registry.
// Add new scenario files (scenario3.ts, etc.) by importing them here and
// adding to the `scenarios` map below - nothing else needs to change.

import { DialogueScenario, DialogueNode, DialogueChoice, scenario1 } from "./scenario1";
import { scenario2 } from "./scenario2";

export const scenarios: Record<string, DialogueScenario> = {
  [scenario1.id]: scenario1,
  [scenario2.id]: scenario2,
};

export function getNode(scenarioId: string, nodeId: string): DialogueNode | undefined {
  return scenarios[scenarioId]?.nodes[nodeId];
}

export function getChoice(
  scenarioId: string,
  nodeId: string,
  choiceId: string
): DialogueChoice | undefined {
  return getNode(scenarioId, nodeId)?.choices.find((c) => c.id === choiceId);
}
