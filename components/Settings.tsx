import React, { useState, useRef } from 'react';
import { Upload, Trash2, Puzzle, ChevronDown, Camera } from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsProps {
    userProfile: UserProfile;
    onUpdateProfile: (profile: UserProfile) => void;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdateProfile }) => {
    // State for toggles
    const [emailResumos, setEmailResumos] = useState(true);
    const [emailAlertas, setEmailAlertas] = useState(false);
    const [twoFactor, setTwoFactor] = useState(false);

    // State for Profile Form
    const [name, setName] = useState(userProfile.name);
    const [email, setEmail] = useState(userProfile.email);
    const [avatar, setAvatar] = useState(userProfile.avatar);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        onUpdateProfile({
            name,
            email,
            avatar
        });
    };

    const handleRemovePhoto = () => {
        // Reset to a default placeholder or empty
        setAvatar("https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png");
    };

    // Custom Toggle Component
    const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
        <button
            onClick={onToggle}
            className={`w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${active ? 'bg-axxy-primary' : 'bg-gray-600'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm ${active ? 'left-7' : 'left-1'}`}></div>
        </button>
    );

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Configurações</h2>
                <p className="text-gray-400">Gerencie as configurações da sua conta e preferências do aplicativo.</p>
            </div>

            {/* Profile Section */}
            <section>
                <h3 className="text-xl font-bold text-white mb-6">Perfil do Usuário</h3>

                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-8 space-y-8">
                    {/* Avatar Row */}
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-orange-200 overflow-hidden border-2 border-[#1e332a] shrink-0">
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <Camera className="text-white" size={24} />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className="text-white font-bold text-lg">{name}</h4>
                            <p className="text-sm text-gray-400 mt-1">Atualize sua foto de perfil.<br />Recomendado: 400x400px.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-5 py-2.5 bg-axxy-primary text-axxy-bg font-bold rounded-xl text-sm hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20"
                            >
                                Carregar Imagem
                            </button>
                            <button
                                onClick={handleRemovePhoto}
                                className="px-5 py-2.5 bg-[#2a3832] text-gray-300 font-medium rounded-xl text-sm hover:text-white transition-colors border border-transparent hover:border-gray-600"
                            >
                                Remover
                            </button>
                        </div>
                    </div>

                    {/* Form Row */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end border-t border-white/5 pt-8">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-all placeholder-gray-600"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Endereço de Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-all placeholder-gray-600"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <button
                                onClick={handleSaveProfile}
                                className="w-full bg-axxy-primary text-axxy-bg font-bold py-3 rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Preferences Section */}
            <section>
                <h3 className="text-xl font-bold text-white mb-6">Preferências do Aplicativo</h3>
                <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-8 space-y-8">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Idioma</label>
                        <p className="text-xs text-gray-400 mb-3">Selecione o idioma da interface do aplicativo.</p>
                        <div className="relative">
                            <select className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 appearance-none focus:ring-1 focus:ring-axxy-primary outline-none cursor-pointer">
                                <option>Português (Brasil)</option>
                                <option>English (US)</option>
                                <option>Español</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <h4 className="text-white font-medium mb-1">Notificações por Email</h4>
                        <p className="text-sm text-gray-400 mb-6">Gerencie quais emails você deseja receber.</p>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300 text-sm">Resumos semanais</span>
                                <Toggle active={emailResumos} onToggle={() => setEmailResumos(!emailResumos)} />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300 text-sm">Alertas de orçamento</span>
                                <Toggle active={emailAlertas} onToggle={() => setEmailAlertas(!emailAlertas)} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section>
                <h3 className="text-xl font-bold text-white mb-6">Segurança</h3>
                <div className="space-y-6">
                    {/* Password */}
                    <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-8">
                        <h4 className="text-white font-medium mb-1">Alterar Senha</h4>
                        <p className="text-sm text-gray-400 mb-6">Para sua segurança, recomendamos o uso de uma senha forte.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Senha Atual</label>
                                <input type="password" placeholder="••••••••" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-all placeholder-gray-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Nova Senha</label>
                                <input type="password" placeholder="••••••••" className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-all placeholder-gray-600" />
                            </div>
                        </div>

                        <button className="bg-axxy-primary text-axxy-bg font-bold px-6 py-3 rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg shadow-green-900/20">
                            Atualizar Senha
                        </button>
                    </div>

                    {/* 2FA */}
                    <div className="bg-[#15221c] border border-[#1e332a] rounded-3xl p-6 flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-medium">Autenticação de Dois Fatores (2FA)</h4>
                            <p className="text-sm text-gray-400 mt-1">Adicione uma camada extra de segurança à sua conta.</p>
                        </div>
                        <Toggle active={twoFactor} onToggle={() => setTwoFactor(!twoFactor)} />
                    </div>
                </div>
            </section>

            {/* Integrations */}
            <section>
                <h3 className="text-xl font-bold text-white mb-6">Integrações</h3>
                <div className="border-2 border-dashed border-[#1e332a] rounded-3xl p-16 flex flex-col items-center justify-center text-center bg-[#15221c]/30 hover:bg-[#15221c]/50 transition-colors">
                    <Puzzle size={48} className="text-gray-600 mb-4" />
                    <h4 className="text-white font-bold mb-2">Conecte com outros serviços</h4>
                    <p className="text-gray-500 text-sm">Nenhuma integração disponível no momento. Volte em breve!</p>
                </div>
            </section>
        </div>
    );
}