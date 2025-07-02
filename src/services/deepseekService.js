const fs = require("fs");
const Tesseract = require("tesseract.js");
const axios = require("axios");

// Use your DeepSeek model (free) on OpenRouter
const DEEPSEEK_MODEL = "deepseek/deepseek-r1-0528:free"; // You can swap with another free DeepSeek model if needed

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

async function extractCNICWithDeepSeek(ocrText) {
  // The prompt ensures the model returns *exact* JSON (no extra explanation)
  const prompt = `
You are a professional Pakistani CNIC parser. 
Given the following raw OCR text of a CNIC card, extract the information and return **EXACTLY** this JSON (no explanation, no extra text):

{
  "name": "",
  "fatherOrHusbandName": "",
  "cnic": "",
  "gender": "",
  "nationality": "",
  "dateOfBirth": "",
  "dateOfIssue": "",
  "dateOfExpiry": ""
}

Text:
"""${ocrText}"""
`;

  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 512,
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const content = res.data.choices?.[0]?.message?.content || "";
  let info = {};
  try {
    info = JSON.parse(content);
  } catch {
    // fallback: Try to extract JSON from any extra stuff
    const jsonText = content.match(/\{[\s\S]*?\}/);
    if (jsonText) info = JSON.parse(jsonText[0]);
    else throw new Error("DeepSeek did not return JSON!");
  }
  return info;
}

async function extractCNICUsingOCR(fileData) {
  // 1. OCR
  const ocrText = await extractTextFromImage(fileData);
  console.log("OCR Result:\n", ocrText);

  // 2. DeepSeek LLM Extraction
  try {
    const info = await extractCNICWithDeepSeek(ocrText);
    // Defensive clean: fallback to "" for missing fields
    return {
      name: info.name || "",
      fatherOrHusbandName: info.fatherOrHusbandName || "",
      cnic: info.cnic || "",
      gender: info.gender || "",
      nationality: info.nationality || "",
      dateOfBirth: info.dateOfBirth || "",
      dateOfIssue: info.dateOfIssue || "",
      dateOfExpiry: info.dateOfExpiry || "",
    };
  } catch (err) {
    console.error("DeepSeek extraction failed, falling back to manual regex:", err);
    // Fallback: use your regex/extraction code (you can import your regex fallback here)
    return {}; // or call your fallback function
  }
}

module.exports = { extractCNICUsingOCR };
exports.extractCNICUsingOCR = extractCNICUsingOCR;
