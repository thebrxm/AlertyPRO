import { GoogleGenAI, Type } from "@google/genai";
import { SeverityLevel, GeminiAnalysisResult } from '../types';

export const analyzeIncident = async (incident: string, location: string): Promise<GeminiAnalysisResult> => {
  if (!process.env.API_KEY) {
    // Fallback if no API key is present
    return {
      formattedMessage: `ALERTA: ${incident} en ${location}`,
      severity: SeverityLevel.INFO
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Analiza el siguiente reporte de incidente y ubicación.
      Incidente: "${incident}"
      Ubicación: "${location}"
      
      Tareas:
      1. Determina la severidad (CRITICAL, WARNING, o INFO). Incendios, robos activos o accidentes graves son CRITICAL. Tráfico o clima moderado son WARNING. Noticias generales son INFO.
      2. Redacta un mensaje de notificación corto, urgente y profesional (máximo 15 palabras).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: {
              type: Type.STRING,
              enum: [SeverityLevel.CRITICAL, SeverityLevel.WARNING, SeverityLevel.INFO],
              description: "The severity level of the incident"
            },
            formattedMessage: {
              type: Type.STRING,
              description: "A short, urgent notification message"
            }
          },
          required: ["severity", "formattedMessage"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      formattedMessage: result.formattedMessage || `${incident} en ${location}`,
      severity: result.severity as SeverityLevel || SeverityLevel.INFO
    };

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      formattedMessage: `ALERTA: ${incident} en ${location}`,
      severity: SeverityLevel.INFO
    };
  }
};