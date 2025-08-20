const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Set the region for all functions
setGlobalOptions({ region: "us-central1" });

// Initialize the AI client. It automatically uses GOOGLE_APPLICATION_CREDENTIALS.
// We'll set the API key in the environment variables instead of using functions.config()
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

exports.aiCoach = onRequest({ cors: true, secrets: ["GOOGLE_AI_KEY"] }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "No prompt provided." });
      return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text });

  } catch (error) {
    console.error("Error calling Google AI API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});