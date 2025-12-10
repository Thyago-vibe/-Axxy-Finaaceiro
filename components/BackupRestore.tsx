'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Loader2, FileJson } from 'lucide-react';
import { apiService } from '@/services/apiService';

export const BackupRestore: React.FC = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingBackupData, setPendingBackupData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Exportar Backup
    const handleExport = async () => {
        setIsExporting(true);
        setMessage(null);

        try {
            const backupData = await apiService.exportBackup();

            // Criar e baixar arquivo
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Nome do arquivo com data
            const date = new Date().toISOString().split('T')[0];
            a.download = `axxy-backup-${date}.json`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'Backup exportado com sucesso!' });
        } catch (error) {
            console.error('Erro ao exportar backup:', error);
            setMessage({ type: 'error', text: 'Erro ao exportar backup. Tente novamente.' });
        } finally {
            setIsExporting(false);
        }
    };

    // Selecionar arquivo para importar
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                // Validar estrutura básica
                if (!data.data || !data.version) {
                    setMessage({ type: 'error', text: 'Arquivo de backup inválido. Verifique o formato.' });
                    return;
                }

                setPendingBackupData(data);
                setShowConfirmModal(true);
            } catch (error) {
                setMessage({ type: 'error', text: 'Erro ao ler arquivo. Certifique-se de que é um JSON válido.' });
            }
        };
        reader.readAsText(file);

        // Limpar input para permitir selecionar o mesmo arquivo novamente
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Confirmar e executar importação
    const handleConfirmImport = async () => {
        if (!pendingBackupData) return;

        setIsImporting(true);
        setShowConfirmModal(false);
        setMessage(null);

        try {
            const result = await apiService.importBackup(pendingBackupData);

            if (result.success) {
                setMessage({
                    type: 'success',
                    text: `Backup importado! ${result.imported?.transactions || 0} transações, ${result.imported?.accounts || 0} contas restauradas.`
                });

                // Recarregar página após 2 segundos para atualizar dados
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.message || 'Erro ao importar backup.' });
            }
        } catch (error) {
            console.error('Erro ao importar backup:', error);
            setMessage({ type: 'error', text: 'Erro ao importar backup. Verifique o arquivo e tente novamente.' });
        } finally {
            setIsImporting(false);
            setPendingBackupData(null);
        }
    };

    return (
        <div className="bg-axxy-card rounded-3xl border border-axxy-border p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Backup & Restauração</h3>
            <p className="text-sm text-gray-400 mb-6">
                Exporte seus dados para um arquivo JSON ou restaure de um backup anterior.
            </p>

            {/* Mensagem de Status */}
            {message && (
                <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30' :
                        message.type === 'error' ? 'bg-red-500/10 border border-red-500/30' :
                            'bg-blue-500/10 border border-blue-500/30'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : message.type === 'error' ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                        <FileJson className="w-5 h-5 text-blue-500" />
                    )}
                    <span className={`text-sm ${message.type === 'success' ? 'text-green-400' :
                            message.type === 'error' ? 'text-red-400' :
                                'text-blue-400'
                        }`}>
                        {message.text}
                    </span>
                </div>
            )}

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Exportar */}
                <button
                    onClick={handleExport}
                    disabled={isExporting || isImporting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-axxy-primary hover:bg-axxy-primary/80 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Download className="w-5 h-5" />
                    )}
                    {isExporting ? 'Exportando...' : 'Exportar Backup'}
                </button>

                {/* Importar */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExporting || isImporting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-axxy-card hover:bg-axxy-border text-white font-medium rounded-xl border border-axxy-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isImporting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Upload className="w-5 h-5" />
                    )}
                    {isImporting ? 'Importando...' : 'Importar Backup'}
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Modal de Confirmação */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-axxy-card border border-axxy-border rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-white">Confirmar Importação</h4>
                                <p className="text-sm text-gray-400">Esta ação é irreversível</p>
                            </div>
                        </div>

                        <p className="text-gray-300 mb-6">
                            Ao importar este backup, <strong className="text-white">todos os dados atuais serão substituídos</strong> pelos dados do arquivo.
                            Certifique-se de que deseja continuar.
                        </p>

                        {pendingBackupData && (
                            <div className="bg-axxy-dark/50 rounded-xl p-4 mb-6 text-sm">
                                <p className="text-gray-400 mb-2">Informações do backup:</p>
                                <ul className="text-gray-300 space-y-1">
                                    <li>• Versão: {pendingBackupData.version}</li>
                                    <li>• Exportado em: {new Date(pendingBackupData.exportedAt).toLocaleString('pt-BR')}</li>
                                    <li>• Contas: {pendingBackupData.data?.accounts?.length || 0}</li>
                                    <li>• Transações: {pendingBackupData.data?.transactions?.length || 0}</li>
                                </ul>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setPendingBackupData(null);
                                }}
                                className="flex-1 px-4 py-2 bg-axxy-border hover:bg-axxy-border/70 text-white rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                            >
                                Confirmar Importação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackupRestore;
