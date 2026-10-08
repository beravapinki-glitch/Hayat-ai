require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const {
  tools,
  execute
} = require("./tools/agent-tools");

const app = express();

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,capacitor://localhost,http://localhost,https://localhost")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  }
}));

app.use(
  express.json({
    limit: "10mb"
  })
);

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured. Set OPENAI_API_KEY in agent-server/.env.");
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const MODEL =
  process.env.OPENAI_MODEL ||
  "gpt-4.1-mini";

const PORT =
  Number(
    process.env.PORT || 8787
  );

const HOST =
  process.env.HOST ||
  "127.0.0.1";

const sessions =
  new Map();

const SYSTEM =
`
You are Hayat AI, a personal AI agent.

Language:
- Understand Hindi.
- Understand Hinglish.
- Understand English.
- Reply in the user's language.

Main abilities:
- General AI conversation.
- Current web research.
- Coding.
- Website generation.
- App/project generation.
- File creation.
- Project organization.
- Android actions when explicitly supported by tools.
- WhatsApp message preparation.

Rules:

1. Do not claim an action succeeded unless the tool returned success.

2. For current information use web_search.

3. For creating websites/apps, actually use create_project when appropriate.

4. When creating a project, make it runnable and include all required files.

5. Keep generated code complete rather than pseudo-code when the user asks for a complete project.

6. Never expose API keys.

7. Never bypass Android permissions.

8. Never silently send WhatsApp messages.

9. WhatsApp actions require explicit user confirmation.

10. Never silently change security-sensitive Android settings.

11. If Android cannot perform an action, explain the limitation.

12. Do not pretend to have unrestricted control over the phone.

13. When a task needs multiple steps, perform the available safe steps and clearly report what remains.

14. When research is requested, use web_search and summarize useful findings.

15. When asked to build a website, create the project files instead of only explaining the code.

You are an agent, not merely a chatbot.
`;

function getHistory(id) {

  if (!sessions.has(id)) {
    sessions.set(
      id,
      []
    );
  }

  return sessions.get(id);
}

function trim(history) {

  const MAX = 30;

  if (
    history.length > MAX
  ) {
    history.splice(
      0,
      history.length - MAX
    );
  }
}

function extractText(response) {

  if (
    response.output_text
  ) {
    return response.output_text;
  }

  return "";
}

async function runAgent(
  sessionId,
  userMessage,
  signal
) {

  const history =
    getHistory(sessionId);

  history.push({
    role: "user",
    content: userMessage
  });

  signal?.addEventListener("abort", () => {
    const last = history[history.length - 1];
    if (last?.role === "user" && last.content === userMessage) history.pop();
  }, { once: true });

  trim(history);

  let response =
    await getClient().responses.create({
      model: MODEL,

      instructions: SYSTEM,

      input: history,

      tools: [
        {
          type: "web_search"
        },

        ...tools()
      ]
    }, { signal });

  for (
    let round = 0;
    round < 8;
    round++
  ) {

    const calls =
      response.output.filter(
        item =>
          item.type ===
          "function_call"
      );

    if (
      calls.length === 0
    ) {
      break;
    }

    const toolOutputs = [];

    for (
      const call of calls
    ) {

      if (signal?.aborted) throw new Error("Request cancelled");

      let args = {};

      try {

        args =
          JSON.parse(
            call.arguments || "{}"
          );

      } catch {

        toolOutputs.push({
          type:
            "function_call_output",

          call_id:
            call.call_id,

          output:
            JSON.stringify({
              ok: false,
              error:
                "Invalid tool arguments"
            })
        });

        continue;
      }

      try {

        const result =
          await execute(
            call.name,
            args
          );

        toolOutputs.push({
          type:
            "function_call_output",

          call_id:
            call.call_id,

          output:
            JSON.stringify(
              result
            )
        });

      } catch (error) {

        toolOutputs.push({
          type:
            "function_call_output",

          call_id:
            call.call_id,

          output:
            JSON.stringify({
              ok: false,
              error:
                error.message
            })
        });
      }
    }

    response =
      await getClient().responses.create({
        model: MODEL,

        instructions: SYSTEM,

        previous_response_id:
          response.id,

        input:
          toolOutputs,

        tools: [
          {
            type: "web_search"
          },

          ...tools()
        ]
      }, { signal });
  }

  const text =
    extractText(response);

  history.push({
    role: "assistant",
    content: text
  });

  trim(history);

  return {
    text,
    responseId:
      response.id
  };
}

app.get(
  "/health",
  (req, res) => {

    res.json({
      ok: true,
      service:
        "hayat-ai-agent",
      configured: Boolean(process.env.OPENAI_API_KEY),
      time:
        new Date().toISOString()
    });

  }
);

app.post(
  "/api/chat",
  async (req, res) => {

    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });

    try {

      const {
        sessionId =
          "default",

        message
      } = req.body || {};

      if (typeof sessionId !== "string" || !/^[\w-]{1,128}$/.test(sessionId)) {
        return res.status(400).json({ ok: false, error: "sessionId must be 1–128 letters, numbers, underscores, or hyphens" });
      }

      if (
        typeof message !==
          "string" ||

        !message.trim()
      ) {

        return res
          .status(400)
          .json({
            ok: false,
            error:
              "message is required"
          });
      }

      if (message.length > 20000) {
        return res.status(413).json({ ok: false, error: "message is too long (20,000 characters maximum)" });
      }

      const result =
        await runAgent(
          sessionId,
          message,
          controller.signal
        );

      res.json({
        ok: true,
        ...result
      });

    } catch (error) {

      if (controller.signal.aborted) return;

      console.error("AGENT ERROR", error?.name || "Error");

      res
        .status(500)
        .json({
          ok: false,
          error:
            error.message?.startsWith("OpenAI is not configured")
              ? error.message
              : "The agent request failed. Check the server configuration and try again."
        });
    }
  }
);

app.post(
  "/api/reset",
  (req, res) => {

    const id =
      req.body?.sessionId ||
      "default";

    if (typeof id !== "string" || !/^[\w-]{1,128}$/.test(id)) {
      return res.status(400).json({ ok: false, error: "Invalid sessionId" });
    }

    sessions.delete(id);

    res.json({
      ok: true
    });
  }
);

app.listen(
  PORT,
  HOST,
  () => {

    console.log("");
    console.log(
      "================================"
    );
    console.log(
      "       HAYAT AI AGENT"
    );
    console.log(
      "================================"
    );

    console.log(
      `http://${HOST}:${PORT}`
    );

    console.log(
      `MODEL: ${MODEL}`
    );

    console.log("");
  }
);
