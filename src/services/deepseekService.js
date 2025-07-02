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
    // Try direct parse
    info = JSON.parse(content);
  } catch {
    // Try to extract JSON object from messy output
    const jsonText = content.match(/\{[\s\S]*?\}/);
    if (jsonText) {
      try {
        info = JSON.parse(jsonText[0]);
      } catch (e2) {
        throw new Error("DeepSeek did not return valid JSON!");
      }
    } else {
      throw new Error("DeepSeek did not return JSON!");
    }
  }
  return info;
}

// Fallback: Manual Regex extractor (improve patterns as needed)
function fallbackCNICExtractor(ocrText) {
  // Very basic demo patterns. Improve these for your actual OCR format!
  const name = (ocrText.match(/Name\s*[:\-]?\s*([A-Z ]+)/i) || [])[1] || "";
  const fatherOrHusbandName = (ocrText.match(/Father(?:'s)? Name\s*[:\-]?\s*([A-Z ]+)/i) || [])[1] || "";
  const cnic = (ocrText.match(/\b\d{5}-\d{7}-\d{1}\b/) || [])[0] || "";
  const gender = (ocrText.match(/Gender\s*[:\-]?\s*(Male|Female)/i) || [])[1] || "";
  const nationality = (ocrText.match(/Nationality\s*[:\-]?\s*([A-Z ]+)/i) || [])[1] || "";
  const dateOfBirth = (ocrText.match(/Date of Birth\s*[:\-]?\s*([\d\/\-]+)/i) || [])[1] || "";
  const dateOfIssue = (ocrText.match(/Date of Issue\s*[:\-]?\s*([\d\/\-]+)/i) || [])[1] || "";
  const dateOfExpiry = (ocrText.match(/Date of Expiry\s*[:\-]?\s*([\d\/\-]+)/i) || [])[1] || "";

  return {
    name: name.trim(),
    fatherOrHusbandName: fatherOrHusbandName.trim(),
    cnic: cnic.trim(),
    gender: gender.trim(),
    nationality: nationality.trim(),
    dateOfBirth: dateOfBirth.trim(),
    dateOfIssue: dateOfIssue.trim(),
    dateOfExpiry: dateOfExpiry.trim(),
  };
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
    // Fallback: use regex-based extraction
    const fallbackInfo = fallbackCNICExtractor(ocrText);
    return fallbackInfo;
  }
}

module.exports = { extractCNICUsingOCR };
exports.extractCNICUsingOCR = extractCNICUsingOCR;
