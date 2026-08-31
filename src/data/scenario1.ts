// This file encodes Scenario 1 EXACTLY as written in the script:
// "Scene 1: The Big Day (and a Sneaky Tutorial!)"
//
// Unlike a simple "pick A or get consequence" list, this is a GRAPH:
// each node is one beat of the conversation, each choice can lead to
// a DIFFERENT node - including looping back to a "retry" node when
// the player pushes back instead of answering (exactly like Iris
// saying "just tell me!" and forcing the player to choose again).
//
// This is the lean, no-database-required version of what a "server-driven
// scenario engine" actually needs for a project this size - a JSON graph,
// not Neo4j.

export interface DialogueChoice {
  id: string;
  label: string;
  // null = neutral choice (a pushback that doesn't score, just re-asks)
  isSafe: boolean | null;
  category: string | null;
  points: number;
  feedback: string; // Iris's response line(s), joined
  next: string; // id of the next node, or "SCENARIO_COMPLETE"
}

export interface DialogueNode {
  id: string;
  speaker: string;
  lines: string[]; // Iris's dialogue shown before the choices
  choices: DialogueChoice[];
}

export interface DialogueScenario {
  id: string;
  title: string;
  startNode: string;
  nodes: Record<string, DialogueNode>;
}

export const scenario1: DialogueScenario = {
  id: "scenario_1_the_big_day",
  title: "Scene 1: The Big Day",
  startNode: "node_email",

  nodes: {
    // --- Beat 1: the phishing email tutorial (the "computer interaction") ---
    // This node IS the computer/email UI moment - report_phishing and link_clicked
    // are the two buttons Chaitrali's email interface offers. Same recording
    // path as every other choice: one call to /api/dialogue/choice, logged into
    // this session's decisions subcollection.
    node_email: {
      id: "node_email",
      speaker: "System",
      lines: [
        'Email from: HR-Director@IrisCorp-Super-Official.com',
        'Subject: URGENT: Confirm Your Job Offer NOW!',
        '"Congratulations, new recruit! To print your ID badge, reply with your Secret Aadhaar Identity Code. Do it now, or we give your job to someone else!"',
      ],
      choices: [
        {
          id: "link_clicked",
          label: "Reply with the Secret Code",
          isSafe: false,
          category: "phishing",
          points: -15,
          feedback:
            "BEEP! You fell for my trap! That email was a fraud email. Remember: real companies will never ask for your secret codes in an email.",
          next: "node_pet_name",
        },
        {
          id: "phishing_reported",
          label: "Click the 'Report Phishing' Button",
          isSafe: true,
          category: "phishing",
          points: 15,
          feedback:
            "DING DING DING! My eye-tracker saw you look right at that goofy 'Super-Official.com' domain name! You spotted the trick and didn't let the urgent tone scare you. Awesome job!",
          next: "node_pet_name",
        },
      ],
    },

    // --- Beat 2: pet name question ---
    // NOTE: in this version, pushing back ("why do you need that?") is NOT
    // a forced retry - Nova explains why asking "why" is a good habit, then
    // the scene moves on. Only Q2 (birth city) forces a retry in this script.
    node_pet_name: {
      id: "node_pet_name",
      speaker: "Nova",
      lines: ["What's the name of your first pet?"],
      choices: [
        {
          id: "tell_pet_name",
          label: "Tell Nova the pet's name",
          isSafe: false,
          category: "privacy",
          points: -10,
          feedback:
            "BEEP! BEEP! Gotcha again! You should never give away personal secrets to someone you just met. Hackers use pet names to guess passwords!",
          next: "node_birth_city",
        },
        {
          id: "why_need_it",
          label: "Why do you need to know that?",
          isSafe: true,
          category: "privacy",
          points: 8,
          feedback:
            "Good question. And honestly? I don't need it. That's the point. When someone asks for personal information, don't be afraid to ask why they need it. If there isn't a good reason, you don't have to provide it - even if they sound trustworthy.",
          next: "node_birth_city",
        },
        {
          id: "keep_private",
          label: "I'd rather keep that private.",
          isSafe: true,
          category: "privacy",
          points: 15,
          feedback:
            "DING DING DING! Perfect! You should never give your personal info to strangers, even friendly ones like me!",
          next: "node_birth_city",
        },
      ],
    },

    // --- Beat 3: birth city question ---
    // This one DOES force a retry if the player pushes back, per the script.
    node_birth_city: {
      id: "node_birth_city",
      speaker: "Nova",
      lines: ["Okay, one more. What city are you from?"],
      choices: [
        {
          id: "tell_city",
          label: "Tell Nova",
          isSafe: false,
          category: "privacy",
          points: -10,
          feedback:
            "BEEP! Oh no! Remember, birthplaces are secret keys to your identity. Keep them locked up!",
          next: "node_ready",
        },
        {
          id: "why_need_it",
          label: "Why do you need to know?",
          isSafe: null,
          category: null,
          points: 0,
          feedback: "*Sweats nervously* What? No! I'm just making conversation!",
          next: "node_birth_city_retry", // forced to choose between A or C
        },
        {
          id: "keep_private",
          label: "Nice try. I'm keeping that private.",
          isSafe: true,
          category: "privacy",
          points: 15,
          feedback: "Woohoo! Perfect score! You are a natural at this!",
          next: "node_ready",
        },
      ],
    },

    // Retry: only the two real options remain, matching "forced to choose between Option A or C"
    node_birth_city_retry: {
      id: "node_birth_city_retry",
      speaker: "Nova",
      lines: ["Come on, just answer the question!"],
      choices: [
        {
          id: "tell_city",
          label: "Tell Nova",
          isSafe: false,
          category: "privacy",
          points: -10,
          feedback: "BEEP! Oh no! Remember, birthplaces are secret keys to your identity.",
          next: "node_ready",
        },
        {
          id: "keep_private",
          label: "Nice try. I'm keeping that private.",
          isSafe: true,
          category: "privacy",
          points: 15,
          feedback: "Woohoo! Perfect score! You are a natural at this!",
          next: "node_ready",
        },
      ],
    },

    // --- Beat 4: readiness check, ends the scenario ---
    node_ready: {
      id: "node_ready",
      speaker: "Nova",
      lines: [
        "Okay, recruit. That's enough testing for one morning. Now, are you ready for your first real day at IrisCorp?",
      ],
      choices: [
        {
          id: "ready",
          label: "Let's go. I'm ready.",
          isSafe: null,
          category: null,
          points: 0,
          feedback: "That's the spirit!",
          next: "SCENARIO_COMPLETE",
        },
      ],
    },
  },
};

// registry (scenarios map, getNode, getChoice) now lives in ./registry.ts
// so scenario2.ts and future scenario files can be combined without a
// circular import back into this file.
