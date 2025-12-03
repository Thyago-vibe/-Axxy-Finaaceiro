import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AISuggestion } from "../types";

const apiKey = process.env.API_KEY || '';

// Mock fail-safe if no key
const mockSuggestions: AISuggestion[] = [
  { item: "Assinatura Streaming X", category: "Assinaturas", savingPotential: 55.90, action: "Cancelar ou Downgrade" },
  { item: "Refeições - iFood", category: "Alimentação", savingPotential: 345.60, action: "Cozinhar mais em casa" },
  { item: "Plano de Celular Y", category: "Contas", savingPotential: 119.90, action: "Negociar plano atual" }
];

export const analyzeFinances = async (transactions: Transaction[]): Promise<AISuggestion[]> => {
  if (!apiKey) {
    console.warn("API Key missing, returning mocks");
    return mockSuggestions;
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analise as seguintes transações financeiras e sugira cortes de gastos específicos.
    Retorne APENAS um JSON array.
    
    Transações:
    ${JSON.stringify(transactions.slice(0, 20))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING, description: "Nome do gasto" },
              category: { type: Type.STRING, description: "Categoria do gasto" },
              savingPotential: { type: Type.NUMBER, description: "Valor mensal estimado de economia" },
              action: { type: Type.STRING, description: "Ação sugerida curta (ex: Cancelar)" }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return mockSuggestions;
    
    return JSON.parse(text) as AISuggestion[];

  } catch (error) {
    console.error("Gemini analysis failed", error);
    return mockSuggestions;
  }
};

export const getSmartGoalAdvice = async (goalName: string, amount: number): Promise<string> => {
   if (!apiKey) return "Dica simulada: Tente economizar 10% do seu salário mensalmente para atingir esta meta mais rápido.";

   const ai = new GoogleGenAI({ apiKey });
   try {
     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: `Dê uma dica curta e motivacional de uma frase para alguém que quer economizar R$${amount} para "${goalName}".`
     });
     return response.text || "Continue focado nos seus objetivos!";
   } catch (e) {
     return "Defina metas claras para alcançar seus sonhos.";
   }
}
