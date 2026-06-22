import { useState, useEffect } from 'react'
import { Search, Plus, X, Package, FolderPlus, ChevronDown, ImageIcon, Trash2 } from 'lucide-react'
import { supabase, type Product, type Category } from './lib/supabase'

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    cost_price: '',
    selling_price: '',
    max_retail_price: '',
    category_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name')
    ])

    if (productsRes.data) setProducts(productsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
  }

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return product.name.toLowerCase().includes(query) || product.name.toLowerCase().startsWith(query)
  })

  // Delete handler function
  async function handleDelete(id: string | number, name: string) {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from UI state dynamically
      setProducts(products.filter(product => product.id !== id))
    } catch (err: any) {
      console.error('Error deleting product:', err.message)
      alert('Failed to delete product: ' + err.message)
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newCategoryName.trim() })
      .select()
      .single()

    if (!error && data) {
      setCategories([...categories, data])
      setFormData({ ...formData, category_id: data.id })
    }
    setNewCategoryName('')
    setIsAddingCategory(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)

    const productData = {
      name: formData.name.trim(),
      image_url: formData.image_url.trim() || null,
      cost_price: parseFloat(formData.cost_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      max_retail_price: parseFloat(formData.max_retail_price) || 0,
      category_id: formData.category_id || null
    }

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select('*, categories(*)')
      .single()

    if (!error && data) {
      setProducts([data, ...products])
      resetForm()
      setIsModalOpen(false)
    }
    setIsSubmitting(false)
  }

  function resetForm() {
    setFormData({
      name: '',
      image_url: '',
      cost_price: '',
      selling_price: '',
      max_retail_price: '',
      category_id: ''
    })
    setIsAddingCategory(false)
    setNewCategoryName('')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-7 h-7 text-emerald-600" />
              Inventory Manager
            </h1>
            <span className="text-sm text-slate-500">{filteredProducts.length} products</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-slate-700 bg-slate-50"
            />
          </div>
        </div>
      </header>

      {/* Product List */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No products found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different search or add new products</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-4 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group relative"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm truncate" title={product.name}>
                      {product.name}
                    </h3>
                    {product.categories && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                        {product.categories.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">CP</span>
                      <span className="font-semibold text-rose-500">${product.cost_price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">SP</span>
                      <span className="font-semibold text-emerald-600">${product.selling_price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">MRP</span>
                      <span className="font-semibold text-slate-700">${product.max_retail_price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Delete Button UI Container */}
                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ml-auto absolute right-3 top-1/2 -translate-y-1/2"
                  title="Delete product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-emerald-300"
        aria-label="Add new product"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => { setIsModalOpen(false); resetForm() }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">Add New Product</h2>
              <button
                onClick={() => { setIsModalOpen(false); resetForm() }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Selling Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">MRP</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.max_retail_price}
                      onChange={(e) => setFormData({ ...formData, max_retail_price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white pr-10"
                  >
                    <option value="">None</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {isAddingCategory ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                    >
                      Save Category
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingCategory(false); setNewCategoryName('') }}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="w-full px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" /> Add New Category
                </button>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm() }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App