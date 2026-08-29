import { Router, Request, Response } from "express";
import { db } from "../firebase";

const router = Router();

/**
 * GET /api/player/:playerId/history
 *
 * Returns every session this player_id has ever played, oldest first,
 * plus a simple improvement trend (comparing their first and most recent
 * completed session). This is what powers a "My Progress" screen in Unity.
 *
 * Note: we deliberately query by playerId ONLY (no orderBy in the Firestore
 * query itself) and sort in JavaScript afterward. Combining an equality
 * filter with orderBy on a different field in Firestore requires creating
 * a composite index in the console - sorting in code avoids that setup
 * step entirely, which matters for a beginner-friendly project.
 */
router.get("/:playerId/history", async (req: Request, res: Response) => {
  const playerId = req.params.playerId;

  try {
    const snap = await db.collection("sessions").where("playerId", "==", playerId).get();

    if (snap.empty) {
      return res.status(404).json({ error: "No history found for this player_id" });
    }

    const sessions = snap.docs.map((doc) => {
      const data = doc.data();
      const scores: Record<string, number> = data.scores || {};
      const values = Object.values(scores);
      const overall = values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : null;

      return {
        session_id: doc.id,
        started_at: data.startedAt?.toDate?.() ?? data.startedAt,
        finished_at: data.finishedAt?.toDate?.() ?? data.finishedAt,
        completed: !!data.finishedAt,
        overall_score: overall,
        scores,
      };
    });

    // Oldest first, so the player can see their progression over time
    sessions.sort((a: any, b: any) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

    const completedSessions = sessions.filter((s) => s.completed);
    let improvement = null;
    if (completedSessions.length >= 2) {
      const first = completedSessions[0].overall_score ?? 0;
      const latest = completedSessions[completedSessions.length - 1].overall_score ?? 0;
      improvement = Math.round((latest - first) * 10) / 10;
    }

    res.json({
      player_id: playerId,
      total_playthroughs: sessions.length,
      completed_playthroughs: completedSessions.length,
      improvement_since_first_playthrough: improvement,
      sessions,
    });
  } catch (err) {
    console.error("Failed to fetch player history:", err);
    res.status(500).json({ error: "Failed to fetch player history" });
  }
});

export default router;
