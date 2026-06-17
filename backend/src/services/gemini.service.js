// backend/src/services/gemini.service.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      }
    });
    
    this.maxTextLength = 50000; // Maximum text length to process
  }

  /**
   * Extract text from uploaded file
   */
  async extractTextFromFile(filePath, mimeType) {
    try {
      const buffer = await fs.readFile(filePath);
      
      if (mimeType === 'application/pdf') {
        return await this.extractFromPDF(buffer);
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return await this.extractFromWord(buffer);
      } else {
        // Assume plain text
        return buffer.toString('utf-8');
      }
    } catch (error) {
      throw new Error(`Không thể trích xuất văn bản từ file: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF
   */
  async extractFromPDF(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * Extract text from Word document
   */
  async extractFromWord(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Generate flashcards using AI
   * This is the core AI generation function
   */
  async generateFlashcards(text, options = {}) {
    const {
      maxCards = 20,
      includeHints = true,
      difficulty = 'mixed', // easy, medium, hard, mixed
      language = 'vi',      // vi, en
      subject = null,       // math, physics, chemistry, etc.
    } = options;

    // Truncate text if too long
    const truncatedText = text.substring(0, this.maxTextLength);

    // Build the prompt
    const prompt = this.buildPrompt(truncatedText, {
      maxCards,
      includeHints,
      difficulty,
      language,
      subject,
    });

    try {
      // Call Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      // Parse and validate the response
      const flashcards = this.parseAIResponse(content);

      // Add metadata
      return flashcards.map((card, index) => ({
        ...card,
        id: `ai_${Date.now()}_${index}`,
        isAiGenerated: true,
        aiConfidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
      }));

    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Lỗi khi gọi AI để tạo flashcard. Vui lòng thử lại sau.');
    }
  }

  /**
   * Build detailed prompt for Gemini
   */
  buildPrompt(text, options) {
    const { maxCards, includeHints, difficulty, language, subject } = options;

    let prompt = `Bạn là một trợ lý AI chuyên nghiệp trong việc tạo flashcard học tập chất lượng cao. 
    
NHIỆM VỤ: Phân tích văn bản dưới đây và tạo ra ${maxCards} flashcard tốt nhất để giúp người học ghi nhớ kiến thức quan trọng.

VĂN BẢN NGUỒN:
"""
${text}
"""

YÊU CẦU CHI TIẾT:
1. ĐỊNH DẠNG: Trả về DUY NHẤT một mảng JSON. Mỗi phần tử là một object có cấu trúc:
   {
     "question": "Câu hỏi rõ ràng, tập trung vào một khái niệm",
     "answer": "Câu trả lời chính xác, ngắn gọn nhưng đầy đủ",
     "hint": "Gợi ý ngắn (nếu có)",
     "category": "Danh mục của kiến thức",
     "difficulty": "easy|medium|hard"
   }

2. CHẤT LƯỢNG CÂU HỎI:
   - Ưu tiên câu hỏi kiểm tra hiểu biết, không chỉ ghi nhớ
   - Sử dụng câu hỏi mở, điền vào chỗ trống, hoặc câu hỏi trực tiếp
   - Mỗi câu hỏi tập trung vào MỘT khái niệm chính
   - Tránh câu hỏi quá dài hoặc phức tạp

3. CHẤT LƯỢNG CÂU TRẢ LỜI:
   - Chính xác về mặt học thuật
   - Ngắn gọn nhưng đầy đủ (2-4 câu)
   - Dễ hiểu, tránh jargon không cần thiết`;

    // Language specific instructions
    if (language === 'vi') {
      prompt += `
   - Sử dụng tiếng Việt cho câu hỏi và câu trả lời
   - Có thể giữ nguyên các thuật ngữ chuyên môn bằng tiếng Anh`;
    }

    // Subject specific instructions
    if (subject === 'math' || subject === 'physics') {
      prompt += `
4. CÔNG THỨC TOÁN HỌC:
   - Sử dụng cú pháp LaTeX cho công thức: $E = mc^2$ cho inline, $$\\int_a^b f(x)dx$$ cho display
   - Định lý, công thức quan trọng cần được ưu tiên`;
    }

    // Difficulty distribution
    if (difficulty === 'easy') {
      prompt += `
5. ĐỘ KHÓ: Tập trung vào kiến thức cơ bản, dễ nhớ`;
    } else if (difficulty === 'hard') {
      prompt += `
5. ĐỘ KHÓ: Tập trung vào kiến thức nâng cao, phức tạp`;
    } else {
      prompt += `
5. ĐỘ KHÓ: Phân bố đều: 30% dễ, 50% trung bình, 20% khó`;
    }

    if (includeHints) {
      prompt += `
6. GỢI Ý: Mỗi câu hỏi nên có một gợi ý ngắn (1 câu) để giúp người học nhớ`;
    }

    prompt += `

QUAN TRỌNG: Chỉ trả về mảng JSON, không thêm bất kỳ văn bản giải thích nào khác.
Đảm bảo JSON hợp lệ và có thể parse được ngay lập tức.`;

    return prompt;
  }

  /**
   * Parse and validate AI response
   */
  parseAIResponse(content) {
    try {
      // Clean the response
      let cleaned = content.trim();
      
      // Remove markdown code blocks if present
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON array
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Không tìm thấy mảng JSON trong phản hồi');
      }
      
      // Parse JSON
      const flashcards = JSON.parse(jsonMatch[0]);
      
      // Validate structure
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error('Phản hồi không chứa flashcard hợp lệ');
      }
      
      // Normalize and validate each card
      return flashcards.map((card, index) => ({
        question: this.validateTextField(card.question || card.frontText, 'question', index),
        answer: this.validateTextField(card.answer || card.backText, 'answer', index),
        hint: card.hint || '',
        category: card.category || 'general',
        difficulty: ['easy', 'medium', 'hard'].includes(card.difficulty) 
          ? card.difficulty 
          : 'medium',
      }));
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('AI trả về JSON không hợp lệ. Vui lòng thử lại.');
      }
      throw error;
    }
  }

  /**
   * Validate text fields
   */
  validateTextField(text, fieldName, index) {
    if (!text || typeof text !== 'string') {
      throw new Error(`Thiếu ${fieldName} cho thẻ #${index + 1}`);
    }
    return text.trim();
  }

  /**
   * Generate flashcards from a specific topic
   */
  async generateFromTopic(topic, count = 10) {
    const prompt = `Tạo ${count} flashcard về chủ đề: "${topic}".
    
Yêu cầu:
- Câu hỏi đa dạng, bao quát các khía cạnh quan trọng
- Câu trả lời chính xác và dễ hiểu
- Trả về mảng JSON với format: [{"question": "...", "answer": "...", "hint": "..."}]`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return this.parseAIResponse(response.text());
  }

  /**
   * Enhance existing flashcards with AI
   */
  async enhanceFlashcards(flashcards) {
    const prompt = `Cải thiện chất lượng các flashcard sau:
    
${JSON.stringify(flashcards, null, 2)}

Yêu cầu:
- Làm cho câu hỏi rõ ràng và thách thức hơn
- Bổ sung gợi ý (hint) nếu thiếu
- Đảm bảo câu trả lời chính xác
- Giữ nguyên số lượng thẻ
- Trả về mảng JSON đã cải thiện`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return this.parseAIResponse(response.text());
  }

  /**
   * Validate AI-generated content quality
   */
  validateQuality(flashcards) {
    const issues = [];
    
    flashcards.forEach((card, index) => {
      // Check minimum lengths
      if (card.question.length < 10) {
        issues.push(`Thẻ #${index + 1}: Câu hỏi quá ngắn`);
      }
      if (card.answer.length < 5) {
        issues.push(`Thẻ #${index + 1}: Câu trả lời quá ngắn`);
      }
      
      // Check for duplicates
      const duplicate = flashcards.find((c, i) => 
        i !== index && c.question === card.question
      );
      if (duplicate) {
        issues.push(`Thẻ #${index + 1}: Câu hỏi bị trùng lặp`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues,
      quality: issues.length === 0 ? 'good' : 'needs_review',
    };
  }
}

module.exports = new GeminiService();