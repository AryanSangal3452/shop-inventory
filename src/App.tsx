import { useState, useEffect } from 'react'
import { Search, Plus, X, Package, ChevronDown, ImageIcon, Trash2, Edit2, Check } from 'lucide-react'
import { supabase, type Product, type Category } from './lib/supabase'
import { offlineDb } from './lib/offlineDb'

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    cost_price: '',
    selling_price: '',
    max_retail_price: '',
    category_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initial Data Load
  useEffect(() => {
    fetchData()
  }, [])

  // Auto-Sync Network Listener
  useEffect(() => {
    async function syncOfflineData() {
      if (!navigator.onLine) return

      try {
        const unsynced = await offlineDb.products.where('synced').equals(0).toArray()

        for (const item of unsynced) {
          const { id, synced, ...cleanData } = item
          let error, data

          if (typeof id === 'string' && id.startsWith('local_')) {
            const res = await supabase.from('products').insert(cleanData).select().single()
            error = res.error
            data = res.data
          } else {
            const res = await supabase.from('products').update(cleanData).eq('id', id).select().single()
            error = res.error
            data = res.data
          }

          if (!error && data) {
            await offlineDb.products.delete(item.id!)
            await offlineDb.products.put({ ...data, synced: 1 })
          }
        }
        if (unsynced.length > 0) fetchData()
      } catch (syncError) {
        console.error('Background sync failed:', syncError)
      }
    }

    window.addEventListener('online', syncOfflineData)
    return () => window.removeEventListener('online', syncOfflineData)
  }, [])

  async function fetchData() {
    if (navigator.onLine) {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
          supabase.from('categories').select('*').order('name')
        ])

        if (productsRes.data) {
          setProducts(productsRes.data)
          await offlineDb.products.clear()
          await offlineDb.products.bulkAdd(productsRes.data.map(p => ({ ...p, synced: 1 })))
        }
        if (categoriesRes.data) setCategories(categoriesRes.data)
        return
      } catch (e) {
        console.log('Using browser offline storage backup.')
      }
    }

    const offlineProducts = await offlineDb.products.toArray()
    setProducts(offlineProducts as any)
  }

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return product.name.toLowerCase().includes(query) || product.name.toLowerCase().startsWith(query)
  })

  async function handleDelete(id: string | number, name: string) {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`)
    if (!confirmDelete) return

    try {
      await offlineDb.products.delete(id)
      if (navigator.onLine) {
        await supabase.from('products').delete().eq('id', id)
      }
      setProducts(products.filter(p => p.id !== id))
    } catch (err) {
      alert('Failed to delete item.')
    }
  }

  function startEditing(product: Product) {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      image_url: product.image_url || '',
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      max_retail_price: String(product.max_retail_price),
      category_id: product.category_id ? String(product.category_id) : ''
    })
    setIsModalOpen(true)
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: newCategoryName.trim() })
        .select()
        .single()
        
      if (!error && data) {
        setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)))
        setFormData({ ...formData, category_id: String(data.id) })
        setNewCategoryName('')
        setIsAddingCategory(false)
      } else if (error) {
        throw error
      }
    } catch (err: any) {
      alert('Failed to create category: ' + err.message)
    }
  }

  // New Delete Category function
  async function handleDeleteCategory() {
    if (!formData.category_id) return
    
    const selectedCat = categories.find(c => String(c.id) === formData.category_id)
    if (!selectedCat) return

    const confirmDelete = window.confirm(`Are you sure you want to delete the category "${selectedCat.name}"?\nProducts assigned to this category will become unassigned.`)
    if (!confirmDelete) return

    try {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', selectedCat.id)

        if (error) throw error
      } else {
        alert("You must be online to delete categories from the cloud database.")
        return
      }

      // Remove from state array and clear form selection field
      setCategories(categories.filter(c => String(c.id) !== formData.category_id))
      setFormData({ ...formData, category_id: '' })
      
      // Refresh list to show updated structures immediately
      fetchData()
    } catch (err: any) {
      alert('Failed to delete category: ' + err.message)
    }
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
      category_id: formData.category_id ? parseInt(formData.category_id) : null
    }

    if (editingProduct) {
      if (navigator.onLine) {
        const { data } = await supabase.from('products').update(productData).eq('id', editingProduct.id).select('*, categories(*)').single()
        if (data) {
          setProducts(products.map(p => p.id === editingProduct.id ? data : p))
          await offlineDb.products.put({ ...data, synced: 1 })
        }
      } else {
        const offlineProduct = { ...productData, id: editingProduct.id, synced: 0 }
        await offlineDb.products.put(offlineProduct)
        setProducts(products.map(p => p.id === editingProduct.id ? (offlineProduct as any) : p))
        alert('Updated locally! Changes sync when online.')
      }
    } else {
      if (navigator.onLine) {
        const { data } = await supabase.from('products').insert(productData).select('*, categories(*)').single()
        if (data) {
          setProducts([data, ...products])
          await offlineDb.products.add({ ...data, synced: 1 })
        }
      } else {
        const localId = 'local_' + Date.now()
        const offlineProduct = { ...productData, id: localId, synced: 0 }
        await offlineDb.products.add(offlineProduct)
        setProducts([offlineProduct as any, ...products])
        alert('Saved locally!')
      }
    }
    resetForm()
    setIsModalOpen(false)
    setIsSubmitting(false)
  }

  function resetForm() {
    setFormData({ name: '', image_url: '', cost_price: '', selling_price: '', max_retail_price: '', category_id: '' })
    setIsAddingCategory(false)
    setNewCategoryName('')
    setEditingProduct(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-7 h-7 text-emerald-600" /> Inventory Manager
            </h1>
            <span className="text-sm text-slate-500">{filteredProducts.length} products</span>
          </div>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
          />
        </div>
      </header>

      {/* Product List */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-4 relative">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex-1 pr-20">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-slate-800 text-sm truncate">{product.name}</h3>
                  {product.categories && <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">{product.categories.name}</span>}
                  {('synced' in product) && product.synced === 0 && <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0.5 rounded border border-amber-200 animate-pulse">Offline Changes</span>}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>CP: <span className="font-semibold text-rose-500">₹{product.cost_price.toFixed(2)}</span></div>
                  <div>SP: <span className="font-semibold text-emerald-600">₹{product.selling_price.toFixed(2)}</span></div>
                  <div>MRP: <span className="font-semibold text-slate-700">₹{product.max_retail_price.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 ml-auto absolute right-3 top-1/2 -translate-y-1/2">
                <button type="button" onClick={() => startEditing(product)} className="p-2 text-slate-400 hover:text-emerald-600"><Edit2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleDelete(product.id, product.name)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Action Button */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center"><Plus className="w-7 h-7" /></button>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); resetForm() }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800">{editingProduct ? 'Edit Product Prices' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                <input type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CP (₹)</label>
                  <input type="number" step="0.01" required value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SP (₹)</label>
                  <input type="number" step="0.01" required value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MRP (₹)</label>
                  <input type="number" step="0.01" required value={formData.max_retail_price} onChange={(e) => setFormData({ ...formData, max_retail_price: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                </div>
              </div>
              
              {/* Category Management Block */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                {isAddingCategory ? (
                  <div className="flex gap-2 animate-fadeIn">
                    <input
                      type="text"
                      required
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                      title="Save Category"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingCategory(false); setNewCategoryName('') }}
                      className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          value={formData.category_id}
                          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                          className="w-full px-4 py-2 border rounded-xl bg-white appearance-none pr-10"
                        >
                          <option value="">None</option>
                          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="px-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center"
                        title="Create New Category"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Delete Current Category Button */}
                    {formData.category_id && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleDeleteCategory}
                          className="text-xs font-medium text-rose-500 hover:text-rose-700 flex items-center gap-1 p-1 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete this category from list
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm() }} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium">{isSubmitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App