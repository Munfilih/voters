import { ExtractionProgress, ExtractedVoter } from './voterParserUtils';
import { transliterateName } from './transliterate';

const PROMPT = `
Analyze the provided image, which is a page from the Kerala Election Commission Voter List.
Extract EVERY SINGLE voter box present in the image and return them strictly as a JSON array.
There are typically 30 boxes per page in a 3-column grid. Please extract them all.
Do NOT include the characters '#' in the serial number.
Extract exactly these fields per voter box:
- serialNumber (number): The sequential number at the top left of the box.
- voterId (string): The alphanumeric ID at the top right (e.g., WYO1234567 or KL/123...).
- nameMl (string): The voter's name in Malayalam (from the line that starts with "പേര് :", exclude the label itself).
- guardianNameMl (string): The guardian's name in Malayalam (exclude "അച്ഛന്റെ പേര് :", "ഭർത്താവിന്റെ പേര് :" etc).
- guardianRelation (string): Determine from the label: if it says "അച്ഛന്റെ പേര്" use "Father", "അമ്മയുടെ പേര്" use "Mother", "ഭർത്താവിന്റെ പേര്" use "Husband", "ഭാര്യയുടെ പേര്" use "Wife", otherwise "Guardian".
- houseNameMl (string): The house name in Malayalam extracted from "വീട്ടു നമ്പർ :". Discard the numeric ward and house number portions. Extract just the text part (usually after a comma).
- houseNumber (string): The core house number (the digits). Discard the ward prefix and letter modifiers (e.g. from "17/712 എ1", extract "712").
- age (number): The numerical age printed next to 'പ്രായം :'.
- gender (string): Either "Male", "Female", or "Other" translated from "ലിംഗം" (പുരുഷൻ -> Male / സ്ത്രീ -> Female / മറ്റു -> Other).

CRITICAL RULES:
1. Output ONLY pure, valid JSON. Do not include markdown formatting like \`\`\`json.
2. If a field is missing, use an empty string "" or 0 for numbers.
3. Ignore boilerplate text like "ഫോട്ടോ ലഭ്യമല്ല" (Photo not available) or "ഫോട്ടോ".
4. Do NOT translate the Malayalam names to English yourself! Keep nameMl, guardianNameMl, and houseNameMl strictly in native Malayalam characters.

Example Output format:
[
  {
    "serialNumber": 1,
    "voterId": "WYO0065789",
    "nameMl": "ആമിന",
    "guardianNameMl": "അസൈനാർ",
    "guardianRelation": "Husband",
    "houseNumber": "712",
    "houseNameMl": "പൂററൻകുന്ന്",
    "age": 64,
    "gender": "Female"
  }
]
`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Str = (reader.result as string).split(',')[1];
      resolve(base64Str);
    };
    reader.onerror = error => reject(error);
  });
}

export async function extractVotersFromImage(
  file: File,
  apiKey: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedVoter[]> {
  if (!apiKey) throw new Error("Gemini API key is required for image extraction. Please enter your API key.");

  onProgress?.({ stage: 'loading', message: `Converting ${file.name} for AI analysis...` });
  
  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  onProgress?.({ stage: 'extracting', message: `Sending to Gemini AI (gemini-2.5-flash)...` });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    onProgress?.({ stage: 'parsing', message: 'Parsing Gemini JSON result...' });

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    let votersResult: any[] = [];
    
    try {
      votersResult = JSON.parse(responseText);
    } catch(e) {
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      votersResult = JSON.parse(cleaned);
    }

    if (!Array.isArray(votersResult)) {
        throw new Error("Gemini returned invalid data structure instead of an array.");
    }

    onProgress?.({ stage: 'transliterating', message: `Transliterating ${votersResult.length} extracted records...` });

    const transliteratedVoters = votersResult.map(v => ({
      ...v,
      nameEn: v.nameMl ? transliterateName(v.nameMl) : '',
      guardianNameEn: v.guardianNameMl ? transliterateName(v.guardianNameMl) : '',
      houseNameEn: v.houseNameMl ? transliterateName(v.houseNameMl) : '',
    }));

    onProgress?.({ stage: 'done', votersFound: transliteratedVoters.length, message: `Successfully extracted ${transliteratedVoters.length} voters.` });

    return transliteratedVoters as ExtractedVoter[];

  } catch (err: any) {
    console.error("Gemini Error:", err);
    throw new Error(`Gemini AI Extraction Failed: ${err.message}`);
  }
}
