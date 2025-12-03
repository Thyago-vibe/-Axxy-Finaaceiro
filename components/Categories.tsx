import React, { useState, useEffect } from 'react';
import { Search, PenLine, Trash2, PlusCircle } from 'lucide-react';
import { Category } from '../types';
import { djangoService } from '../services/djangoService';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    djangoService.getCategories()
        .then(setCategories)
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white">Carregando categorias...</div>;

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold text-white">Gerenciar Categorias</h2>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 bg-axxy-card border border-axxy-border p-6 rounded-3xl h-fit">
            <h3 className="text-lg font-bold text-white mb-6">Nova Categoria</h3>
            <form className="space-y-4">
               <input type="text" placeholder="Nome" className="w-full bg-[#0b120f] border border-gray-700 rounded-xl px-4 py-3 text-white" />
               <button className="w-full bg-axxy-primary text-axxy-bg font-bold py-3 rounded-xl">Criar</button>
            </form>
         </div>

         <div className="lg:col-span-2 bg-axxy-card border border-axxy-border p-6 rounded-3xl">
           <h3 className="text-lg font-bold text-white mb-6">Categorias Existentes</h3>
           <table className="w-full">
               <tbody className="text-sm">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="py-4 pl-2 text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        {cat.name}
                      </td>
                      <td className="py-4 text-gray-400">{cat.type}</td>
                    </tr>
                  ))}
                  {categories.length === 0 && <tr><td className="py-4 text-gray-500">Nenhuma categoria encontrada.</td></tr>}
               </tbody>
             </table>
         </div>
       </div>
    </div>
  );
};