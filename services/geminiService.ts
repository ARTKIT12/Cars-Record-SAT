import { GoogleGenAI } from "@google/genai";

// Initialize with environment variable
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const extractLicensePlate = async (base64Image: string): Promise<string | null> => {
  if (!apiKey) {
    console.warn("No API Key provided for Gemini");
    return null;
  }

  try {
    const model = 'gemini-2.5-flash';
    
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
            text: "Identify the license plate number from this vehicle image. Return ONLY the license plate text. If no visible plate, return 'UNKNOWN'. Format: Thai characters followed by numbers (e.g. 1กข-1234)."
          }
        ]
      },
    });

    const text = response.text?.trim();
    if (text && text !== 'UNKNOWN') {
      return text;
    }
    return null;

  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return null;
  }
};