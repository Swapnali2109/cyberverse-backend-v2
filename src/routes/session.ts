import { Router, Request, Response } from "express";
import { db } from "../firebase";
import { scenarios } from "../data/scenario1";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const CATEGORIES = [
  "phishing",
  "social_engineering",
  "password_security",
  "device_security",
  "privacy",
];

const FIRST_SCENARIO_ID = "scenario_1_the_big_day";

/**
 * POST /api/session/start
 * Body (optional): { player_id: string }
 *
 * If Unity sends a player_id (generated once and saved on the player's
 * device), sessions are linked to that player so history/improvement can
 * be tracked across playthroughs. If no player_id is sent (first time
 * playing), the server generates one and returns it - Unity should save
 * that and send it on every future session/start call.
 *
 * No login, no password, no email required - just a random ID.
 */
router.post("/start", async (req: Request, res: Response) => {
  try {
    const providedPlayerId = req.body?.player_id;
    const playerId = providedPlayerId || uuidv4();

    const initialScores: Record<string, number> = {};
    CATEGORIES.forEach((category) => (initialScores[category] = 50));

    const sessionRef = await db.collection("sessions").add({
      playerId,
      startedAt: new Date(),
      finishedAt: null,
      currentScenarioId: FIRST_SCENARIO_ID,
      currentNodeId: scenarios[FIRST_SCENARIO_ID].startNode,
      scores: initialScores,
    });

    res.status(201).json({
      session_id: sessionRef.id,
      player_id: playerId, // Unity saves this locally (PlayerPrefs) if it's new
      is_new_player_id: !providedPlayerId,
      started_at: new Date().toISOString(),
      first_scenario_id: FIRST_SCENARIO_ID,
    });
  } catch (err) {
    console.error("Failed to start session:", err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

/**
 * GET /api/session/:id/result
 * Reads the session document (for scores) and the "decisions" subcollection
 * (for full history), then computes overall/strongest/weakest.
 */
router.get("/:id/result", async (req: Request, res: Response) => {
  const sessionId = req.params.id;

  try {
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    const sessionData = sessionDoc.data()!;
    const scores: Record<string, number> = sessionData.scores || {};

    const overall =
      Math.round(
        (Object.values(scores).reduce((sum, v) => sum + v, 0) /
          Object.values(scores).length) *
          10
      ) / 10;

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0]?.[0] ?? null;
    const weakest = sorted[sorted.length - 1]?.[0] ?? null;

    const decisionsSnap = await db
      .collection("sessions")
      .doc(sessionId)
      .collection("decisions")
      .orderBy("createdAt", "asc")
      .get();

    const decisions = decisionsSnap.docs.map((d) => d.data());

    await db.collection("sessions").doc(sessionId).update({
      finishedAt: sessionData.finishedAt || new Date(),
    });

    res.json({
      session_id: sessionId,
      player_id: sessionData.playerId ?? null,
      scores,
      overall_score: overall,
      strongest_area: strongest,
      weakest_area: weakest,
      decisions,
    });
  } catch (err) {
    console.error("Failed to fetch result:", err);
    res.status(500).json({ error: "Failed to fetch result" });
  }
});

export default router;
