import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AISuggestion } from "../types";

const apiKey = process.env.VITE_GEMINI_API_KEY || 'AIzaSyANvpW4OCVfLCupMEl-O9O3o8jHP25dPJc';

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

export interface GoalAnalysis {
  suggestedAllocation: number;
  suggestedPriority: 'Alta' | 'Média' | 'Baixa';
  reasoning: string;
}

export const analyzeGoalAllocation = async (
  goalName: string,
  targetAmount: number,
  deadline: string,
  monthlyIncome: number,
  monthlyExpenses: number
): Promise<GoalAnalysis> => {
  if (!apiKey) {
    // Mock fallback
    const disposable = monthlyIncome - monthlyExpenses;
    const safeAllocation = disposable > 0 ? disposable * 0.2 : 50;
    return {
      suggestedAllocation: Math.max(50, safeAllocation),
      suggestedPriority: 'Média',
      reasoning: "Baseado em uma análise simples do seu saldo disponível (Simulação sem API Key)."
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Atue como um consultor financeiro pessoal.
    O usuário quer criar uma meta: "${goalName}" de R$ ${targetAmount} para atingir até ${deadline}.
    
    Dados Financeiros Mensais:
    - Receita: R$ ${monthlyIncome}
    - Despesas: R$ ${monthlyExpenses}
    
    Tarefa:
    1. Calcule quanto ele precisa economizar por mês para atingir a meta no prazo.
    2. Analise se isso é viável dado o saldo (Receita - Despesas).
    3. Sugira uma alocação mensal realista.
    4. Defina uma prioridade (Alta, Média, Baixa) baseada na viabilidade e impacto financeiro.
    
    Retorne APENAS um JSON com este formato:
    {
      "suggestedAllocation": number (valor em reais),
      "suggestedPriority": "Alta" | "Média" | "Baixa",
      "reasoning": "string curta explicando o porquê (max 2 frases)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedAllocation: { type: Type.NUMBER },
            suggestedPriority: { type: Type.STRING, enum: ["Alta", "Média", "Baixa"] },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text) as GoalAnalysis;

  } catch (error) {
    console.error("Goal analysis failed", error);
    return {
      suggestedAllocation: 0,
      suggestedPriority: 'Média',
      reasoning: "Não foi possível analisar no momento."
    };
  }
};

export interface DebtAnalysis {
  strategyName: string;
  description: string;
  recommendedOrder: string[];
  negotiationTips: string[];
}

export const analyzeDebtStrategy = async (
  debts: { name: string; remaining: number; monthly: number; category: string; status: string }[],
  monthlyIncome: number,
  monthlyExpenses: number
): Promise<DebtAnalysis> => {
  if (!apiKey) {
    return {
      strategyName: "Método Bola de Neve (Simulado)",
      description: "Foque em pagar as dívidas menores primeiro para ganhar tração psicológica.",
      recommendedOrder: debts.sort((a, b) => a.remaining - b.remaining).map(d => d.name),
      negotiationTips: ["Tente renegociar a taxa de juros do cartão.", "Busque portabilidade de crédito."]
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Atue como um especialista em renegociação de dívidas.
    Analise o perfil de dívidas abaixo e sugira a melhor estratégia (ex: Avalanche vs Bola de Neve).
    
    Contexto Financeiro:
    - Renda Mensal: R$ ${monthlyIncome}
    - Despesas Fixas: R$ ${monthlyExpenses}
    
    Dívidas:
    ${JSON.stringify(debts)}
    
    Retorne APENAS um JSON com este formato:
    {
      "strategyName": "Nome da Estratégia",
      "description": "Explicação curta de por que essa estratégia é a melhor para este caso.",
      "recommendedOrder": ["Nome Dívida 1", "Nome Dívida 2"],
      "negotiationTips": ["Dica prática 1", "Dica prática 2"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategyName: { type: Type.STRING },
            description: { type: Type.STRING },
            recommendedOrder: { type: Type.ARRAY, items: { type: Type.STRING } },
            negotiationTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text) as DebtAnalysis;

  } catch (error) {
    console.error("Debt analysis failed", error);
    return {
      strategyName: "Erro na Análise",
      description: "Não foi possível gerar uma estratégia no momento.",
      recommendedOrder: [],
      negotiationTips: ["Verifique sua conexão e tente novamente."]
    };
  }
};
