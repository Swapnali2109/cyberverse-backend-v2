// Encodes "Scene 2: The Front Door Trap (Tailgating)" exactly as written.
//
// NOTE: Unity now owns all dialogue display and flow (per Chirayu). The
// "next" field and dialogue "lines" below are kept for documentation/
// reference only - the backend's /api/decision endpoint doesn't use them
// to control anything. Only id, category, points, isSafe, and feedback
// actually matter for scoring. Category used: "social_engineering"
// (tailgating is a physical social-engineering attack).

import { DialogueScenario } from "./scenario1";

const TAILGATING_FEEDBACK_UNSAFE =
  "BEEP! BEEP! Oh no, you fell for it! You just let a complete stranger sneak into our secure office! In the cybersecurity world, this is called \"Tailgating.\" Never let anyone follow you inside without swiping their own keycard!";

const TAILGATING_FEEDBACK_SAFE =
  "DING DING DING! Perfect score! You just stopped a \"Tailgating\" attack! Hackers will use panic and urgency to make you forget the rules. By making him go to the front desk, you kept the whole company safe. Awesome job!";

export const scenario2: DialogueScenario = {
  id: "scenario_2_front_door_trap",
  title: "Scene 2: The Front Door Trap (Tailgating)",
  startNode: "node_tailgating_initial",

  nodes: {
    // --- The man at the door asks for entry ---
    node_tailgating_initial: {
      id: "node_tailgating_initial",
      speaker: "???",
      lines: [
        "Excuse me! Can you hold the door?",
        "I have a critical meeting in 5 mins and I forgot my keycard.",
        "Can you give me entry with your keycard? It's really urgent. We both work in the same company!",
      ],
      choices: [
        {
          id: "let_him_in",
          label: "Let him enter with your keycard",
          isSafe: false,
          category: "social_engineering",
          points: -15,
          feedback: TAILGATING_FEEDBACK_UNSAFE,
          next: "SCENARIO_COMPLETE",
        },
        {
          id: "ask_who_he_is",
          label: "Ask who he is",
          isSafe: null,
          category: null,
          points: 0,
          feedback: "Is now really the time for introductions? I'm running late.",
          next: "node_tailgating_pushback",
        },
        {
          id: "reject_close_door",
          label: "Close the door behind you. Reject him.",
          isSafe: true,
          category: "social_engineering",
          points: 15,
          feedback: TAILGATING_FEEDBACK_SAFE,
          next: "SCENARIO_COMPLETE",
        },
      ],
    },

    // --- Reached after asking who he is - he deflects, pushes urgency ---
    node_tailgating_pushback: {
      id: "node_tailgating_pushback",
      speaker: "???",
      lines: ["Is now really the time for introductions? I'm running late."],
      choices: [
        {
          id: "hold_door",
          label: "Hold the door",
          isSafe: false,
          category: "social_engineering",
          points: -15,
          feedback: TAILGATING_FEEDBACK_UNSAFE,
          next: "SCENARIO_COMPLETE",
        },
        {
          id: "press_for_info",
          label: "Press for more information",
          isSafe: null,
          category: null,
          points: 0,
          feedback:
            "You notice a flicker of unease cross the man's face. \"Ugh fine, my name is Peter Benston. I work in Sales. If I'm late to this meeting, I could be in serious trouble.\"",
          next: "node_tailgating_info",
        },
      ],
    },

    // --- He gives a name and reason - final decision point ---
    node_tailgating_info: {
      id: "node_tailgating_info",
      speaker: "Peter Benston",
      lines: [
        "Ugh fine, my name is Peter Benston. I work in Sales.",
        "If I'm late to this meeting, I could be in serious trouble.",
      ],
      choices: [
        {
          id: "hold_door_final",
          label: "Hold the door",
          isSafe: false,
          category: "social_engineering",
          points: -15,
          feedback: TAILGATING_FEEDBACK_UNSAFE,
          next: "SCENARIO_COMPLETE",
        },
        {
          id: "close_door_final",
          label: "Close the door behind you",
          isSafe: true,
          category: "social_engineering",
          points: 15,
          feedback: TAILGATING_FEEDBACK_SAFE,
          next: "SCENARIO_COMPLETE",
        },
      ],
    },
  },
};
