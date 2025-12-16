
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Eye, EyeOff, Link, Save, CheckCircle, AlertTriangle, Bot } from 'lucide-react';

export const AISettings: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [instructions, setInstructions] = useState('');
    const [provider, setProvider] = useState('openai');
    const [showKey, setShowKey] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ status: string; message: string; response_time: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await apiService.getAISettings();
            setApiKey(settings.api_key || '');
            setInstructions(settings.instructions || '');
            setProvider(settings.provider || 'openai');
            setIsConnected(settings.is_connected);
        } catch (err) {
            console.error("Failed to load AI settings:", err);
        }
    };

    const handleSaveKey = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await apiService.saveAISettings({
                api_key: apiKey,
                instructions: instructions,
                provider: provider
            });
            // Recarregar para pegar o estado atualizado (ex: mascarado)
            await loadSettings();
        } catch (err) {
            setError("Erro ao salvar chave de API.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveInstructions = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await apiService.saveAISettings({
                api_key: apiKey, // Manda a chave atual (pode ser a mascarada, mas o back trata)
                instructions: instructions,
                provider: provider
            });
        } catch (err) {
            setError("Erro ao salvar instruções.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveKey = async () => {
        if (confirm("Tem certeza que deseja remover a chave da API?")) {
            setApiKey('');
            setIsConnected(false);
            await apiService.saveAISettings({ api_key: '', instructions, provider });
        }
    };

    const handleTestConnection = async () => {
        setIsLoading(true);
        setTestResult(null);
        setError(null);
        try {
            const result = await apiService.testAIConnection();
            if (result) {
                setTestResult({
                    status: result.status,
                    message: result.message,
                    response_time: result.response_time
                });
                setIsConnected(true);
            }
        } catch (err: any) {
            setError(err.message || "Erro ao conectar com a IA.");
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto w-full py-8">
            {/* PageHeading */}
            <div className="flex flex-col gap-1 mb-8 text-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">Configurações da IA</h1>
                <p className="text-gray-400">Escolha o provedor de inteligência artificial para o Axxy.</p>
            </div>

            <div className="space-y-8">

                {/* Provider Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => { setProvider('openai'); setIsConnected(false); }}
                        className={`relative rounded-xl border p-4 text-left transition-all hover:border-axxy-primary/50 flex flex-col gap-2 ${provider === 'openai'
                                ? 'bg-axxy-primary/10 border-axxy-primary ring-1 ring-axxy-primary'
                                : 'bg-white/5 border-white/10'
                            }`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-white text-lg">OpenAI (GPT-4o)</span>
                            {provider === 'openai' && <CheckCircle size={20} className="text-axxy-primary" />}
                        </div>
                        <p className="text-sm text-gray-400">Modelo oficial do ChatGPT. Rápido, inteligente e estável. Recomendado.</p>
                    </button>

                    <button
                        onClick={() => { setProvider('openrouter'); setIsConnected(false); }}
                        className={`relative rounded-xl border p-4 text-left transition-all hover:border-axxy-primary/50 flex flex-col gap-2 ${provider === 'openrouter'
                                ? 'bg-axxy-primary/10 border-axxy-primary ring-1 ring-axxy-primary'
                                : 'bg-white/5 border-white/10'
                            }`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-white text-lg">Amazon Nova (via OpenRouter)</span>
                            {provider === 'openrouter' && <CheckCircle size={20} className="text-axxy-primary" />}
                        </div>
                        <p className="text-sm text-gray-400">Modelo alternativo da Amazon. Use se preferir ou se tiver créditos OpenRouter.</p>
                    </button>
                </div>

                {/* Model Info Banner */}
                <div className="rounded-xl border border-axxy-primary/20 bg-axxy-primary/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-axxy-primary/10 rounded-lg text-axxy-primary">
                            <Bot size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-axxy-primary uppercase font-bold tracking-wider">Modelo Ativo</p>
                            <h3 className="text-white font-medium text-lg">
                                {provider === 'openai' ? 'GPT-4o Mini (OpenAI)' : 'Amazon Nova 2 Lite (OpenRouter)'}
                            </h3>
                        </div>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-500">Provedor</p>
                        <p className="text-sm text-gray-300 font-mono">
                            {provider === 'openai' ? 'OpenAI' : 'OpenRouter'}
                        </p>
                    </div>
                </div>

                {/* API Key Management Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Chave da API {provider === 'openai' ? 'OpenAI' : 'OpenRouter'}</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Insira sua chave para ativar os insights. Você pode obter uma chave em <a href={provider === 'openai' ? "https://platform.openai.com/api-keys" : "https://openrouter.ai/keys"} target="_blank" rel="noreferrer" className="text-axxy-primary hover:underline">{provider === 'openai' ? 'OpenAI Platform' : 'OpenRouter Dashboard'}</a>.
                            </p>
                        </div>

                        {isConnected ? (
                            <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400 border border-green-500/30">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                                </span>
                                Conectado & Verificado
                            </div>
                        ) : apiKey ? (
                            <div className="flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400 border border-yellow-500/30">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                                Chave Salva (Teste Necessário)
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 border border-red-500/30">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                                Desconectado
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="api-key">
                                Sua Chave de API
                            </label>
                            <div className="relative">
                                <input
                                    id="api-key"
                                    type={showKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Cole sua chave de API aqui"
                                    className="w-full rounded-lg border border-white/10 bg-[#0b120f] px-4 py-3 text-white placeholder-gray-600 focus:border-axxy-primary focus:ring-1 focus:ring-axxy-primary transition-colors outline-none font-mono text-sm"
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {apiKey && (
                                <button
                                    onClick={handleRemoveKey}
                                    className="flex-1 md:flex-none items-center justify-center rounded-lg h-[42px] px-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium text-sm transition-colors border border-red-500/20"
                                >
                                    Remover
                                </button>
                            )}
                            <button
                                onClick={handleSaveKey}
                                disabled={isSaving || !apiKey}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg h-[42px] px-6 bg-axxy-primary text-black hover:bg-[#11d650] font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Chave'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Instructions Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white">Comportamento da IA</h2>
                    <p className="text-gray-400 text-sm mt-1 mb-6">
                        Dê instruções para que a IA analise suas finanças com uma personalidade específica e foque no que é mais importante para você.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="ai-instructions">
                            Instruções / Persona
                        </label>
                        <textarea
                            id="ai-instructions"
                            rows={6}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Ex: Aja como um consultor financeiro amigável. Analise meus gastos mensais e me dê 3 dicas práticas para economizar em lazer e alimentação."
                            className="w-full rounded-lg border border-white/10 bg-[#0b120f] px-4 py-3 text-white placeholder-gray-600 focus:border-axxy-primary focus:ring-1 focus:ring-axxy-primary transition-colors outline-none resize-none leading-relaxed"
                        />
                        <div className="flex justify-between items-center mt-3">
                            <p className="text-xs text-gray-500">
                                {instructions.length} / 1000 caracteres
                            </p>
                            <button
                                onClick={handleSaveInstructions}
                                disabled={isSaving}
                                className="flex items-center justify-center gap-2 rounded-lg h-10 px-5 bg-axxy-primary text-black hover:bg-[#11d650] font-bold text-sm transition-colors disabled:opacity-50"
                            >
                                <Save size={16} />
                                Salvar Instruções
                            </button>
                        </div>
                    </div>
                </div>

                {/* Connection Test Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-white">Teste de Conexão</h2>
                    <p className="text-gray-400 text-sm mt-1 mb-6">
                        Verifique se sua chave de API está funcionando corretamente antes de salvar.
                    </p>

                    <div className="flex flex-col items-start gap-4">
                        <button
                            onClick={handleTestConnection}
                            disabled={isLoading || !apiKey}
                            className={`flex items-center justify-center gap-2 rounded-lg h-10 px-6 font-bold text-sm transition-colors
                                ${apiKey
                                    ? 'bg-axxy-primary/10 text-axxy-primary hover:bg-axxy-primary/20 border border-axxy-primary/30'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}
                            `}
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Link size={18} />
                            )}
                            {isLoading ? 'Testando...' : 'Testar Conexão'}
                        </button>

                        {!apiKey && !isLoading && (
                            <p className="text-xs text-yellow-500 flex items-center gap-1">
                                <AlertTriangle size={12} /> Salve uma chave válida primeiro para testar.
                            </p>
                        )}

                        {testResult && (
                            <div className="w-full rounded-lg bg-[#0b120f] p-4 border border-green-500/20 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                                <div className="flex items-start gap-3">
                                    <div className="p-1 bg-green-500/10 rounded-full text-green-500 mt-0.5">
                                        <CheckCircle size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-mono text-green-400 font-bold mb-1">
                                            status: {testResult.message}
                                        </p>
                                        <p className="text-xs font-mono text-gray-400">
                                            response_time: {testResult.response_time}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="w-full rounded-lg bg-[#0b120f] p-4 border border-red-500/20 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                <div className="flex items-start gap-3">
                                    <div className="p-1 bg-red-500/10 rounded-full text-red-500 mt-0.5">
                                        <AlertTriangle size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-mono text-red-400 font-bold mb-1">
                                            Erro: {error}
                                        </p>
                                        <p className="text-xs font-mono text-gray-500">
                                            Verifique se a chave está correta e tente novamente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
