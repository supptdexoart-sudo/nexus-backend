
import { GoogleGenAI, Type } from "@google/genai";
import { GameEvent, GameEventType } from "../types";

// Fix for TS2580: Cannot find name 'process' in Vite/Browser environment
declare const process: any;

export const interpretCode = async (code: string): Promise<GameEvent> => {
  try {
    /** 
     * Inicializace Gemini AI. 
     * Vite automaticky nahradí process.env.API_KEY během buildu.
     */
    // Fixed: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Interpretuj tento čárový kód/sériové číslo "${code}" jako unikátní prvek do sci-fi deskové hry Nexus. 
                 Vytvoř zajímavý název, atmosférický popis a herní statistiky. Vše generuj v českém jazyce.`,
      config: {
        systemInstruction: "Jsi generátor obsahu pro kyberpunkovou deskovou hru. Generuj pouze validní JSON v češtině.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { 
              type: Type.STRING, 
              enum: Object.values(GameEventType) 
            },
            rarity: { 
              type: Type.STRING, 
              enum: ['Common', 'Rare', 'Epic', 'Legendary'] 
            },
            stats: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ["label", "value"]
              }
            },
            flavorText: { type: Type.STRING },
            isConsumable: { type: Type.BOOLEAN },
            price: { type: Type.NUMBER }
          },
          required: ["title", "description", "type", "rarity", "stats"]
        }
      }
    });

    // Fixed: response.text is a property, not a method.
    const jsonText = response.text || "{}";
    const result = JSON.parse(jsonText);
    
    return {
      ...result,
      id: code,
      canBeSaved: true,
      isShareable: true
    };
  } catch (error) {
    console.error("Gemini Interpretation Error:", error);
    return {
      id: code,
      title: "Neznámý Artefakt",
      description: "Tento kód vykazuje anomálie v datech. Původ neznámý (Chyba spojení se sektorem).",
      type: GameEventType.ITEM,
      rarity: "Common",
      stats: [{ label: "STATUS", value: "OFFLINE" }],
      canBeSaved: true
    };
  }
};
