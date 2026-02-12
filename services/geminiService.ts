
import { GoogleGenAI, Type } from "@google/genai";
import { CountryInfo } from "../types";

export const getCountryData = async (countryName: string): Promise<CountryInfo> => {
  // Create a new instance right before call as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    // Use gemini-3-pro-preview for advanced reasoning and creative output
    model: 'gemini-3-pro-preview',
    contents: `Tell a soul-stirring story about ${countryName}. Include its capital, central coordinates [lon, lat], 3 profound facts about its heritage, a short evocative description, a visual description for a cinematic zoom, and a short 'cultural essence' phrase.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          capital: { type: Type.STRING },
          coordinates: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "[longitude, latitude]"
          },
          facts: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          description: { type: Type.STRING },
          landscapeDescription: { type: Type.STRING },
          culturalEssence: { type: Type.STRING }
        },
        required: ["name", "capital", "coordinates", "facts", "description", "landscapeDescription", "culturalEssence"]
      }
    }
  });

  return JSON.parse(response.text.trim()) as CountryInfo;
};

export const generateCinematicZoom = async (
  country: string, 
  landscapeDescription: string,
  onUpdate: (msg: string) => void
): Promise<string> => {
  // Create a new instance right before call as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onUpdate("Aligning with the heartbeat of " + country + "...");
  
  const prompt = `An ultra-high-definition cinematic journey into ${country}. Starting from a distant golden sunset view of the planet, smoothly descending through ethereal clouds to reveal the stunning, vibrant ${landscapeDescription}. Emotional, cinematic lighting, 8k, photorealistic, awe-inspiring movement. No text.`;

  // Upgrade to veo-3.1-generate-preview for high-quality requirements (8k/photorealistic)
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '16:9'
    }
  });

  onUpdate("Capturing the essence...");

  while (!operation.done) {
    // 10 second delay for operations as per guideline examples
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
    onUpdate(`Synthesizing the landscape...`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("The vision was lost in transit.");

  // Fetch MP4 bytes and append the API key
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
