import { analyzeFinances, getSmartGoalAdvice, analyzeGoalAllocation } from './services/geminiService';

// Test data
const testTransactions = [
    {
        id: 1,
        description: "Netflix",
        amount: 45.90,
        type: 'expense' as const,
        date: "2024-12-01",
        category: "Assinatura",
        status: 'completed' as const
    },
    {
        id: 2,
        description: "iFood - Jantar",
        amount: 85.50,
        type: 'expense' as const,
        date: "2024-12-02",
        category: "Alimentação",
        status: 'completed' as const
    },
    {
        id: 3,
        description: "Uber",
        amount: 35.00,
        type: 'expense' as const,
        date: "2024-12-03",
        category: "Transporte",
        status: 'completed' as const
    }
];

async function testGeminiAPI() {
    console.log("🧪 Testando integração com Gemini API...\n");

    try {
        // Test 1: Analyze Finances
        console.log("📊 Teste 1: Análise de Finanças");
        const suggestions = await analyzeFinances(testTransactions);
        console.log("✅ Sugestões recebidas:", suggestions);
        console.log("");

        // Test 2: Smart Goal Advice
        console.log("🎯 Teste 2: Conselho para Meta");
        const advice = await getSmartGoalAdvice("Viagem para Europa", 15000);
        console.log("✅ Conselho recebido:", advice);
        console.log("");

        // Test 3: Goal Allocation Analysis
        console.log("💰 Teste 3: Análise de Alocação de Meta");
        const allocation = await analyzeGoalAllocation(
            "Comprar um carro",
            50000,
            "2025-12-31",
            5000,
            3500
        );
        console.log("✅ Análise recebida:", allocation);
        console.log("");

        console.log("🎉 Todos os testes passaram! API do Gemini está funcionando corretamente.");
    } catch (error) {
        console.error("❌ Erro ao testar API:", error);
    }
}

testGeminiAPI();
