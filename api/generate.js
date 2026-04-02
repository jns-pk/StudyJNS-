import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, topic, subject, pdfText, count = 10, previousQuestions = [] } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = '';

    if (type === 'topic_mcq') {
      prompt = `You are an expert Pakistani entry test preparation teacher for ECAT and MDCAT exams.

Generate exactly ${count} HARD multiple choice questions about "${topic}" from ${subject} for Pakistani students in class 11/12.

These questions should be at ECAT/MDCAT difficulty level - tricky, concept-based, not just memorization.

${previousQuestions.length > 0 ? `Do NOT repeat these questions: ${previousQuestions.slice(-20).join(' | ')}` : ''}

Return ONLY a valid JSON array. No markdown, no explanation, just the JSON:
[
  {
    "q": "question text",
    "opts": ["option A", "option B", "option C", "option D"],
    "ans": 0,
    "exp": "detailed explanation of why this answer is correct and why others are wrong"
  }
]

Make sure:
- ans is the index (0-3) of the correct option
- Questions are genuinely hard, testing deep understanding
- Explanations are detailed and educational
- All 4 options are plausible`;
    }

    else if (type === 'pdf_mcq') {
      prompt = `You are an expert MCQ generator for Pakistani entry test exams (ECAT/MDCAT).

Based on this text from a student's book/notes:
"""
${pdfText.substring(0, 8000)}
"""

Generate exactly ${count} HARD multiple choice questions from this content.

${previousQuestions.length > 0 ? `Do NOT repeat these questions: ${previousQuestions.slice(-20).join(' | ')}` : ''}

Return ONLY a valid JSON array:
[
  {
    "q": "question text",
    "opts": ["option A", "option B", "option C", "option D"],
    "ans": 0,
    "exp": "explanation citing the relevant content from the uploaded material"
  }
]`;
    }

    else if (type === 'topic_content') {
      prompt = `You are an expert Pakistani curriculum teacher for class 11/12.

Provide comprehensive study content for "${topic}" from ${subject}.

Return ONLY valid JSON:
{
  "title": "${topic}",
  "subject": "${subject}",
  "definition": "Clear, detailed definition in simple English",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "formulas": [
    {"name": "Formula name", "formula": "formula here", "description": "what it means"}
  ],
  "examples": ["example 1", "example 2"],
  "ecat_mdcat_tip": "Specific tip for how this topic appears in ECAT/MDCAT"
}`;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json({ success: true, data: parsed });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
  }
