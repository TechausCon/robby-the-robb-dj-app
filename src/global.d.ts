declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    getGenerativeModel(options: { model: string }): any;
  }
}
