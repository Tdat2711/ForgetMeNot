// backend/src/config/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiConfig {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not found. AI features will be disabled.');
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    this.models = {
      pro: this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
        }
      }),
      flash: this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.5,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 4096,
        }
      }),
    };
  }

  getModel(type = 'pro') {
    if (!this.enabled) {
      throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY.');
    }
    return this.models[type] || this.models.pro;
  }

  async generateContent(prompt, modelType = 'pro') {
    const model = this.getModel(modelType);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async generateStreamContent(prompt, modelType = 'pro') {
    const model = this.getModel(modelType);
    const result = await model.generateContentStream(prompt);
    return result.stream;
  }
}

module.exports = new GeminiConfig();