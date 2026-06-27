import { useState, useEffect } from 'react'
import { Search, Plus, X, Package, ChevronDown, ImageIcon, Trash2, Edit2, Check, LogOut, Lock, Mail, UserPlus, LogIn } from 'lucide-react'
import { supabase, type Product, type Category } from './lib/supabase'
import { offlineDb } from './lib/offlineDb'

interface UserProduct extends Product {
  user_email?: string;
}

function App() {
  // === PERSISTENT AUTH STATES ===
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  // === INVENTORY APP STATES ===
  const [products, setProducts] = useState<UserProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingProduct, setEditingProduct] = useState<UserProduct | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    cost_price: '',
    selling_price: '',
    max_retail_price: '',
    category_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check user session on start
  useEffect(() => {
    const savedUser = localStorage.getItem('inventory_logged_in_user')
    if (savedUser) {
      setIsLoggedIn(true)
      setCurrentUser(savedUser)
    }
  }, [])

  // Load user data whenever login user state updates
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // Run background migration to make sure any local stray items bind up cleanly
      runLocalFileMigration().then(() => {
        fetchData()
      })
    }
  }, [isLoggedIn, currentUser])

  // Forced File Migrator to make sure local computer items map cleanly to your global profile
  async function runLocalFileMigration() {
    if (!currentUser) return
    try {
      const allLocalItems = await offlineDb.products.toArray()
      const itemsToPush = allLocalItems.filter(item => 
        !item.user_email || 
        item.user_email.trim() === "" || 
        item.user_email === currentUser
      )

      if (itemsToPush.length > 0) {
        console.log(`Force-syncing ${itemsToPush.length} items to cloud account: ${currentUser}`)
        for (const item of itemsToPush) {
          const updatedItem = { ...item, user_email: currentUser, synced: 1 }
          await offlineDb.products.put(updatedItem)
          await supabase.from('products').upsert(updatedItem)
        }
        console.log(`Sync complete! Forced ${itemsToPush.length} items to cloud.`);
      }
    } catch (err) {
      console.error("Background file migration failed:", err)
    }
  }

  async function fetchData() {
    if (!currentUser) return;

    // 1. 🟢 FETCH LIVE DATA FROM THE CLOUD (Supabase)
    try {
      const { data: cloudProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_email', currentUser)

      if (!error && cloudProducts && cloudProducts.length > 0) {
        // Save cloud items directly into this device's offline file database
        for (const item of cloudProducts) {
          await offlineDb.products.put({ ...item, synced: 1 })
        }
      }
    } catch (err) {
      console.log("Device is offline, loading from local cache instead.")
    }

    // 2. 🟢 RENDER EVERYTHING FROM LOCAL STORAGE
    try {
      const offlineProducts = await offlineDb.products.where('user_email').equals(currentUser).toArray()
      
      if (offlineProducts && offlineProducts.length > 0) {
        setProducts(offlineProducts as any)
        localStorage.setItem(`local_products_backup_${currentUser}`, JSON.stringify(offlineProducts))
      } else {
        const backupProducts = localStorage.getItem(`local_products_backup_${currentUser}`)
        if (backupProducts) {
          setProducts(JSON.parse(backupProducts))
        } else {
          setProducts([])
        }
      }
    } catch (err) {
      const backupProducts = localStorage.getItem(`local_products_backup_${currentUser}`)
      if (backupProducts) setProducts(JSON.parse(backupProducts))
    }

    const savedCats = localStorage.getItem(`local_categories_${currentUser}`)
    if (savedCats) {
      setCategories(JSON.parse(savedCats))
    } else {
      setCategories([])
    }
  }

  // === SECURITY AUTH SYSTEM (CLOUD SYNCED FOR MULTI-DEVICE SUPPORT) ===
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    const email = authEmail.trim().toLowerCase()
    const password = authPassword

    if (!email || !password) return

    if (authMode === 'signup') {
      try {
        // 1. Verify if the account already exists globally on Supabase
        const { data: existingUser } = await supabase
          .from('inventory_users')
          .select('email')
          .eq('email', email)
          .maybeSingle()

        if (existingUser) {
          alert('This email profile is already registered!')
          return
        }

        // 2. Save account directly into the cloud database table
        const { error } = await supabase
          .from('inventory_users')
          .insert([{ email, password }])

        if (error) throw error

        alert('Account configured globally! You can now log in from any device.')
        setAuthMode('login')
        setAuthPassword('')
      } catch (err) {
        alert('Failed to register global account. Check internet connection!')
      }
    } else {
      try {
        // 3. Match credentials globally via Supabase lookup table
        const { data: userRecord } = await supabase
          .from('inventory_users')
          .select('password')
          .eq('email', email)
          .maybeSingle()

        if (userRecord && userRecord.password === password) {
          // Stash session context flag in browser memory
          localStorage.setItem('inventory_logged_in_user', email)
          setCurrentUser(email)
          setIsLoggedIn(true)
          setAuthEmail('')
          setAuthPassword('')
        } else {
          alert('Incorrect Gmail or Password. Try again!')
        }
      } catch (err) {
        alert('User profile sync failed. Check network connection!')
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem('inventory_logged_in_user')
    setIsLoggedIn(false)
    setCurrentUser('')
    setProducts([])
    setCategories([])
  }

  // === DATA ACTIONS ===
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
      const updatedProducts = products.filter(p => p.id !== id)
      setProducts(updatedProducts)
      localStorage.setItem(`local_products_backup_${currentUser}`, JSON.stringify(updatedProducts))
      
      await supabase.from('products').delete().eq('id', id)
    } catch (err) {
      alert('Failed to delete item.')
    }
  }

  function startEditing(product: UserProduct) {
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

  function handleAddCategory() {
    if (!newCategoryName.trim()) return
    
    const newCat: Category = {
      id: 'cat_' + Date.now() as any,
      name: newCategoryName.trim(),
      created_at: new Date().toISOString()
    }

    const updatedCats = [...categories, newCat].sort((a, b) => a.name.localeCompare(b.name))
    setCategories(updatedCats)
    localStorage.setItem(`local_categories_${currentUser}`, JSON.stringify(updatedCats))
    
    setFormData({ ...formData, category_id: String(newCat.id) })
    setNewCategoryName('')
    setIsAddingCategory(false)
  }

  function handleDeleteCategory() {
    if (!formData.category_id) return
    const selectedCat = categories.find(c => String(c.id) === formData.category_id)
    if (!selectedCat) return

    const confirmDelete = window.confirm(`Are you sure you want to delete "${selectedCat.name}"?`)
    if (!confirmDelete) return

    const updatedCats = categories.filter(c => String(c.id) !== formData.category_id)
    setCategories(updatedCats)
    localStorage.setItem(`local_categories_${currentUser}`, JSON.stringify(updatedCats))
    setFormData({ ...formData, category_id: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim() || !currentUser) return
    setIsSubmitting(true)

    const productData = {
      name: formData.name.trim(),
      image_url: formData.image_url.trim() || null,
      cost_price: parseFloat(formData.cost_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      max_retail_price: parseFloat(formData.max_retail_price) || 0,
      category_id: formData.category_id ? formData.category_id : null,
      user_email: currentUser
    }

    let nextProductsList = [...products]

    if (editingProduct) {
      const offlineProduct = { ...productData, id: editingProduct.id, synced: 0 }
      await offlineDb.products.put(offlineProduct)
      await supabase.from('products').upsert(offlineProduct)
      
      const currentCatObj = categories.find(c => String(c.id) === formData.category_id)
      const mappedUIProduct = { ...offlineProduct, categories: currentCatObj || null }
      nextProductsList = products.map(p => p.id === editingProduct.id ? (mappedUIProduct as any) : p)
    } else {
      const localId = 'local_' + Date.now()
      const offlineProduct = { ...productData, id: localId, synced: 0 }
      await offlineDb.products.add(offlineProduct)
      await supabase.from('products').insert(offlineProduct)
      
      const currentCatObj = categories.find(c => String(c.id) === formData.category_id)
      const mappedUIProduct = { ...offlineProduct, categories: currentCatObj || null }
      nextProductsList = [mappedUIProduct as any, ...products]
    }
    
    setProducts(nextProductsList)
    localStorage.setItem(`local_products_backup_${currentUser}`, JSON.stringify(nextProductsList))

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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-3 border border-emerald-100">
              <Package className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Local Gateway</h1>
            <p className="text-sm text-slate-500 mt-1">
              Log in to manage items.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gmail ID / Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="shopowner@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow transition-all flex items-center justify-center gap-2 mt-2"
            >
              {authMode === 'login' ? (
                <><LogIn className="w-4 h-4" /> Log In</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Sign Up</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthPassword('') }}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {authMode === 'login' ? "Don't have an account? Create one" : 'Already configured? Log In'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-7 h-7 text-emerald-600" /> Inventory Manager
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">Logged in: {currentUser}</p>
            </div>
            
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-all font-medium text-sm flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
            />
            <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-3 rounded-xl whitespace-nowrap">
              {filteredProducts.length} items
            </span>
          </div>
        </div>
      </header>

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
                    <button type="button" onClick={handleAddCategory} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                      <Check className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => { setIsAddingCategory(false); setNewCategoryName('') }} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200">
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
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="px-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {formData.category_id && (
                      <div className="flex justify-end">
                        <button type="button" onClick={handleDeleteCategory} className="text-xs font-medium text-rose-500 hover:text-rose-700 flex items-center gap-1 p-1 hover:bg-rose-50 rounded transition-colors">
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