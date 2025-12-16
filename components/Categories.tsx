import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Category, CreateCategoryDTO } from '../types';
import { apiService } from '../services/apiService';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Despesa' as 'Receita' | 'Despesa',
    color: '#fb923c'
  });

  // Cores predefinidas
  const colorPresets = [
    { name: 'Laranja', value: '#fb923c' },
    { name: 'Roxo', value: '#c084fc' },
    { name: 'Azul', value: '#38bdf8' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Amarelo', value: '#facc15' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Rosa', value: '#f472b6' },
    { name: 'Indigo', value: '#818cf8' }
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Por favor, insira um nome para a categoria.');
      return;
    }

    try {
      if (editingCategory) {
        const categoryData: Category = {
          id: editingCategory.id,
          name: formData.name,
          type: formData.type,
          color: formData.color
        };
        await apiService.updateCategory(editingCategory.id, categoryData);
      } else {
        const categoryData: CreateCategoryDTO = {
          name: formData.name,
          type: formData.type,
          color: formData.color
        };
        await apiService.createCategory(categoryData);
      }

      await loadCategories();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      alert('Erro ao salvar categoria. Verifique o console.');
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type as 'Receita' | 'Despesa',
        color: category.color
      });
    } else {
      setFormData({
        name: '',
        type: 'Despesa',
        color: '#fb923c'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (category: Category) => {
    if (confirm(`Deseja excluir a categoria "${category.name}"?`)) {
      try {
        await apiService.deleteCategory(category.id);
        await loadCategories();
      } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        alert('Erro ao excluir categoria. Verifique o console.');
      }
    }
  };

  if (loading) return <div className="text-white p-8">Carregando categorias...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Gerenciar Categorias</h2>
          <p className="text-gray-400">Organize suas transações em categorias personalizadas</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 bg-axxy-primary text-axxy-bg font-bold rounded-xl hover:bg-axxy-primaryHover transition-colors shadow-lg"
        >
          <Plus size={20} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-[#15221c] border border-[#1e332a] rounded-xl p-6 hover:border-axxy-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.color }}></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{cat.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cat.type === 'Receita'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                    }`}>
                    {cat.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal(cat)}
                  className="text-gray-400 hover:text-axxy-primary transition-colors p-2 hover:bg-axxy-primary/10 rounded-lg"
                  title="Editar categoria"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                  title="Excluir categoria"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <p>Nenhuma categoria cadastrada.</p>
            <p className="text-sm mt-2">Clique em "Nova Categoria" para começar.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gradient-to-b from-[#1c2e26] to-[#15221c] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl animate-fade-in relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="p-8">
              <h3 className="text-2xl font-bold text-white mb-6">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Categoria</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Alimentação, Transporte"
                    className="w-full bg-[#0b120f] border border-gray-700 text-white rounded-xl py-3 px-4 focus:ring-1 focus:ring-axxy-primary outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'Receita' })}
                      className={`py-3 rounded-xl border transition-all ${formData.type === 'Receita'
                        ? 'bg-green-500/10 border-green-500 text-green-400'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'Despesa' })}
                      className={`py-3 rounded-xl border transition-all ${formData.type === 'Despesa'
                        ? 'bg-red-500/10 border-red-500 text-red-400'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      Despesa
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: preset.value })}
                        className={`h-12 rounded-xl transition-all ${formData.color === preset.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#15221c] scale-110'
                          : 'hover:scale-105'
                          }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-axxy-primary hover:bg-axxy-primaryHover text-axxy-bg font-bold py-3 rounded-xl transition-colors shadow-lg"
                  >
                    {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
