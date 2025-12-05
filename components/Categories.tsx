import React, { useState, useEffect } from 'react';
import {
  PenLine, Trash2, Check, X,
  Tag, Utensils, Home, Car, DollarSign, ShoppingBag,
  Coffee, Briefcase, Heart, Zap, Smartphone, Gift
} from 'lucide-react';
import { Category } from '../types';
import { apiService } from '../services/apiService';

const ICONS = [
  { name: 'Tag', component: Tag },
  { name: 'Utensils', component: Utensils },
  { name: 'Home', component: Home },
  { name: 'Car', component: Car },
  { name: 'DollarSign', component: DollarSign },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Coffee', component: Coffee },
  { name: 'Briefcase', component: Briefcase },
  { name: 'Heart', component: Heart },
  { name: 'Zap', component: Zap },
  { name: 'Smartphone', component: Smartphone },
  { name: 'Gift', component: Gift },
];

const COLORS = [
  '#fb923c', '#c084fc', '#38bdf8', '#22c55e', '#ef4444',
  '#facc15', '#ec4899', '#6366f1', '#14b8a6', '#8b5cf6'
];

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    type: 'Despesa',
    color: COLORS[0],
    icon: 'Tag'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    apiService.getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'Despesa',
      color: COLORS[0],
      icon: 'Tag'
    });
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id!);
    setFormData({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon || 'Tag'
    });
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await apiService.deleteCategory(id);
        setCategories(prev => prev.filter(c => c.id !== id));
        if (editingId === id) resetForm();
      } catch (error) {
        console.error("Failed to delete category", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      if (editingId) {
        const updated = await apiService.updateCategory({ ...formData, id: editingId } as Category);
        setCategories(prev => prev.map(c => c.id === editingId ? updated : c));
      } else {
        const created = await apiService.createCategory(formData as Category);
        setCategories(prev => [...prev, created]);
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save category", error);
    }
  };

  const renderIcon = (iconName: string | undefined) => {
    const IconComponent = ICONS.find(i => i.name === iconName)?.component || Tag;
    return <IconComponent size={18} />;
  };

  if (loading) return <div className="text-white">Carregando categorias...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Gerenciar Categorias</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Form Section */}
        <div className="lg:col-span-1 bg-axxy-card border border-axxy-border p-6 rounded-3xl h-fit sticky top-6">
          <h3 className="text-lg font-bold text-white mb-6">
            {editingId ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome</label>
              <input
                type="text"
                placeholder="Ex: Alimentação"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#0b120f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-axxy-primary outline-none transition-colors"
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
              <div className="flex bg-[#0b120f] p-1 rounded-xl border border-gray-700">
                {['Despesa', 'Receita'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type as any })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === type
                        ? 'bg-gray-700 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                      }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Ícone</label>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(({ name, component: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: name })}
                    className={`p-2 rounded-lg flex items-center justify-center transition-all ${formData.icon === name
                        ? 'bg-axxy-primary text-axxy-bg'
                        : 'bg-[#0b120f] text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    title={name}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-900/20"
              >
                {editingId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 bg-axxy-card border border-axxy-border p-6 rounded-3xl">
          <h3 className="text-lg font-bold text-white mb-6">Categorias Existentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="text-sm">
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 group transition-colors">
                    <td className="py-4 pl-2 text-white flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white/90 shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      >
                        {renderIcon(cat.icon)}
                      </div>
                      <span className="font-medium">{cat.name}</span>
                    </td>
                    <td className="py-4 text-gray-400">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${cat.type === 'Receita'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                        }`}>
                        {cat.type}
                      </span>
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PenLine size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id!)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-gray-500">Nenhuma categoria encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
