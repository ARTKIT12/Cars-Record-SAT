import { GoogleGenAI } from "@google/genai";

// Initialize with environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractLicensePlate = async (base64Image: string): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key provided for Gemini");
    return null;
  }

  try {
    const model = 'gemini-2.5-flash';
    
    // Improved Prompt for High Accuracy Thai OCR
    const prompt = `
      Analyze this image and identify the vehicle license plate number.
      Context: This is a Thai vehicle license plate.
      
      Rules:
      1. Look for Thai characters (ก-ฮ) and Hindu-Arabic numerals (0-9).
      2. Common Format: [Number] [Thai Char] [Thai Char] - [Number] [Number] [Number] [Number] (e.g., 1กข 1234).
      3. Sometimes it is just: [Thai Char] [Thai Char] - [Number]...
      4. Auto-correct common OCR errors:
         - 'O', 'o', 'Q', 'D' -> '0' (if in number position)
         - 'I', 'l', 'L' -> '1' (if in number position)
         - 'Z' -> '2'
         - 'S' -> '5'
         - 'B' -> '8'
      5. Ignore the province name (usually smaller text at the bottom).
      6. Return ONLY the license plate characters string without spaces or dashes.
      7. If no plate is clearly visible, return 'UNKNOWN'.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] // Remove data:image/jpeg;base64, prefix
            }
          },
          {
            text: prompt
          }
        ]
      },
    });

    const text = response.text?.trim();
    if (text && text !== 'UNKNOWN') {
      // Post-processing: remove all non-alphanumeric (keep Thai chars)
      // Remove spaces, dashes, dots
      const cleanText = text.replace(/[^a-zA-Z0-9ก-ฮ]/g, '');
      return cleanText;
    }
    return null;

  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return null;
  }
};