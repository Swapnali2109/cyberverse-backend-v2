import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { getChoice } from "../data/registry";
import * as admin from "firebase-admin";

const router = Router();

const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * POST /api/decision
 * Body: { session_id, scenario_id, node_id, choice_id }
 *
 * Unity owns the dialogue/UI flow entirely - what text shows, what happens
 * next, all of that lives in the Unity scenes/scripts already. This backend
 * ONLY needs to know which choice was made, so it can score it and log it.
 *
 * node_id here just means "which question/moment in the scenario" - it's a
 * lookup key into the scoring table in scenario1.ts, matching whatever
 * Unity already has hardcoded for that beat (e.g. "node_email",
 * "node_pet_name"). It does NOT control what Unity shows next - Unity
 * decides that on its own.
 */
router.post("/", async (req: Request, res: Response) => {
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
    const newScore = await db.runTransaction(async (transaction) => {
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

      let updatedValue: number | null = null;

      // Only update a score if this choice actually has a category (skips neutral pushbacks)
      if (choice.category && choice.points !== 0) {
        const currentScores: Record<string, number> = sessionDoc.data()?.scores || {};
        const currentValue = currentScores[choice.category] ?? 50;
        updatedValue = Math.max(MIN_SCORE, Math.min(MAX_SCORE, currentValue + choice.points));
        transaction.update(sessionRef, { [`scores.${choice.category}`]: updatedValue });
      }

      return updatedValue;
    });

    res.json({
      is_safe: choice.isSafe,
      category: choice.category,
      points_awarded: choice.points,
      new_category_score: newScore,
      feedback: choice.feedback, // optional - use it or ignore it, Unity's dialogue already covers this
    });
  } catch (err: any) {
    if (err.message === "SESSION_NOT_FOUND") {
      return res.status(404).json({ error: "Session not found" });
    }
    console.error("Failed to process decision:", err);
    res.status(500).json({ error: "Failed to process decision" });
  }
});

export default router;
