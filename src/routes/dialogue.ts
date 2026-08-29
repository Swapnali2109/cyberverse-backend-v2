import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { getNode, getChoice, serializeNodeForClient, scenarios } from "../data/scenario1";
import * as admin from "firebase-admin";

const router = Router();

const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * POST /api/dialogue/start
 * Body: { session_id, scenario_id }
 *
 * Called when Unity loads a scenario scene. Returns the FIRST node of the
 * conversation graph - Iris's opening lines and the choice buttons to show.
 * Also stores which node the player is currently on, so /choice knows
 * where they were.
 */
router.post("/start", async (req: Request, res: Response) => {
  const { session_id, scenario_id } = req.body ?? {};
  if (!session_id || !scenario_id) {
    return res.status(400).json({ error: "session_id and scenario_id are required" });
  }

  const sessionRef = db.collection("sessions").doc(session_id);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Every scenario's graph knows its own start node id
  const startNodeId = scenarios[scenario_id]?.startNode;
  const node = startNodeId ? getNode(scenario_id, startNodeId) : undefined;

  if (!node) {
    return res.status(404).json({ error: "Unknown scenario_id" });
  }

  await sessionRef.update({ currentScenarioId: scenario_id, currentNodeId: node.id });

  res.json(serializeNodeForClient(node));
});

/**
 * POST /api/dialogue/choice
 * Body: { session_id, scenario_id, node_id, choice_id }
 *
 * Called every time the player clicks a dialogue option. This is the core
 * of the "server-driven scenario engine": Unity never decides what happens
 * next - it just tells the server what was clicked, and the server decides
 * the next node (which might be a fresh beat, a forced retry, or the end
 * of the scenario).
 */
router.post("/choice", async (req: Request, res: Response) => {
  const { session_id, scenario_id, node_id, choice_id } = req.body ?? {};

  if (!session_id || !scenario_id || !node_id || !choice_id) {
    return res.status(400).json({
      error: "session_id, scenario_id, node_id and choice_id are all required",
    });
  }

  const choice = getChoice(scenario_id, node_id, choice_id);
  if (!choice) {
    return res.status(404).json({ error: "Unknown node_id or choice_id" });
  }

  const sessionRef = db.collection("sessions").doc(session_id);

  try {
    await db.runTransaction(async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists) throw new Error("SESSION_NOT_FOUND");

      // Log every choice, even neutral pushback ones - full behavioral history
      const decisionRef = sessionRef.collection("decisions").doc();
      transaction.set(decisionRef, {
        scenarioId: scenario_id,
        nodeId: node_id,
        choiceId: choice_id,
        isSafe: choice.isSafe,
        category: choice.category,
        points: choice.points,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Only update a score if this choice actually has a category (skips neutral pushbacks)
      if (choice.category && choice.points !== 0) {
        const currentScores: Record<string, number> = sessionDoc.data()?.scores || {};
        const currentValue = currentScores[choice.category] ?? 50;
        const updatedValue = Math.max(MIN_SCORE, Math.min(MAX_SCORE, currentValue + choice.points));
        transaction.update(sessionRef, {
          [`scores.${choice.category}`]: updatedValue,
          currentNodeId: choice.next,
        });
      } else {
        transaction.update(sessionRef, { currentNodeId: choice.next });
      }

      // The scenario just ended - mark the session finished RIGHT HERE, don't
      // wait for Unity to separately call /result. This means a session is
      // correctly marked "completed" even if the results screen never loads,
      // the app crashes, or the player quits immediately after finishing.
      if (choice.next === "SCENARIO_COMPLETE" && !sessionDoc.data()?.finishedAt) {
        transaction.update(sessionRef, { finishedAt: new Date() });
      }
    });

    // Scenario finished - tell Unity to move on, no next node to show
    if (choice.next === "SCENARIO_COMPLETE") {
      return res.json({
        feedback: choice.feedback,
        scenario_complete: true,
        next_node: null,
      });
    }

    const nextNode = getNode(scenario_id, choice.next);
    res.json({
      feedback: choice.feedback,
      scenario_complete: false,
      next_node: nextNode ? serializeNodeForClient(nextNode) : null,
    });
  } catch (err: any) {
    if (err.message === "SESSION_NOT_FOUND") {
      return res.status(404).json({ error: "Session not found" });
    }
    console.error("Failed to process dialogue choice:", err);
    res.status(500).json({ error: "Failed to process choice" });
  }
});

export default router;
