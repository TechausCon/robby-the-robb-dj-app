// KORREKTUR: Verwendet import.meta.env für den Zugriff auf Umgebungsvariablen in Vite
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

export async function getDjTip(): Promise<string> {
  if (!API_KEY) {
    return "Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.";
  }

  const prompt = "Gib mir einen kurzen, nützlichen DJ-Tipp für Anfänger (auf Deutsch).";

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error fetching DJ tip from Gemini:", error);
    throw error;
  }
}
