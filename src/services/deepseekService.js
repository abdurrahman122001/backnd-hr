require("dotenv").config();
const fs = require("fs");
const Tesseract = require("tesseract.js");
const { OpenAI } = require("openai");

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts raw text from an image buffer or file path using Tesseract.js.
 */
async function extractTextFromImage(fileData) {
  const imageBuffer = Buffer.isBuffer(fileData)
    ? fileData
    : fs.readFileSync(fileData);

  const {
    data: { text },
  } = await Tesseract.recognize(imageBuffer, "eng", {
    logger: (m) => console.log(m.status, m.progress),
  });

  return text;
}

async function sendTextToAI(promptText, systemInstruction = "") {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: promptText },
    ],
    temperature: 0,
    max_tokens: 4000,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from AI");

  return content.trim();
}

// Only these two prompts are needed:
const prompts = {
  CV: `You are a professional CV parser. Return exactly this JSON format (no explanation):
{
  "phone": "Phone number",
  "fatherOrHusbandName": "Father or Husband Name",
  "skills": ["Skill1", "Skill2"],
  "education": [{"degree": "BSc", "institution": "XYZ University"}],
  "experience": [{"title": "Job Title", "company": "Company", "duration": "Years"}]
}`,

  CNIC: `You are a CNIC parser. Return exactly this JSON format (no explanation):
{
  "cnic": "#####-#######-#",
  "fatherOrHusbandName": "Father or Husband Name",
  "dateOfBirth": "DD-MM-YYYY",
  "gender": "Other",
  "nationality": "Pakistan",
  "dateOfIssue": "DD-MM-YYYY",
  "dateOfExpiry": "DD-MM-YYYY"
}`,
};

async function extractTextUsingAI(fileData, documentType = "generic") {
  let rawText;

  // 1) OCR step
  if (Buffer.isBuffer(fileData)) {
    rawText = await extractTextFromImage(fileData);
  } else if (typeof fileData === "string") {
    const ext = fileData.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg"].includes(ext)) {
      rawText = await extractTextFromImage(fileData);
    } else {
      throw new Error("Unsupported file type: only png, jpg, jpeg allowed");
    }
  } else {
    throw new Error("fileData must be a Buffer or file path string");
  }

  let systemInstruction = prompts[documentType];
  if (!systemInstruction) throw new Error("Unknown document type!");

  const promptText = `Extracted Text:\n\n${rawText}`;
  const result = await sendTextToAI(promptText, systemInstruction);
  return result;
}

module.exports = {
  extractTextUsingAI,
};
