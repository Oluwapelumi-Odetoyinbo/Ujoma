
import { GoogleGenAI, Type } from "@google/genai";
import { CountryInfo } from "../types";

export const getCountryData = async (countryName: string): Promise<CountryInfo> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use googleMaps tool to ground the response in real-world geography
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze the location of ${countryName} for a satellite mission. Provide precise geographical data including capital, central coordinates [lon, lat], and heritage facts. Describe its landscape as seen from a satellite descending from orbit.`,
    config: {
      tools: [{ googleMaps: {} }],
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onUpdate("Establishing Orbital Lock...");
  
  // Refined prompt referencing Earth Studio quality
  const prompt = `A professional Google Earth Studio animation. A cinematic, smooth satellite zoom descending from the thermosphere down to the landscape of ${country}. Focus on ${landscapeDescription}. Clear atmospheric scattering, realistic lighting, 8k resolution, high-altitude photography, smooth camera ease-in. No text overlays.`;

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '16:9'
    }
  });

  onUpdate("Transmitting Data Stream...");

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
    onUpdate(`Synchronizing Satellite Feed...`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Connection lost.");

  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
