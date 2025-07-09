import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const getDjTip = async (): Promise<string> => {
  if (!apiKey) {
    return "AI features are disabled because the API key is not configured.";
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash"});
    const prompt = "Give me a single, concise, and creative DJing tip. For example, a mixing technique, a way to read the crowd, or an interesting track selection idea for an open-format set. Keep it to one or two sentences.";

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate content from Gemini API.");
  }
};
