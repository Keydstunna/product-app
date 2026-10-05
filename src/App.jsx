import { useEffect, useState } from 'react'
import api, { saveSession, clearSession, getUser } from './api'

const emptyForm = { product_name: '', description: '', price: '', quantity: '' }

const errorMessage = (err) =>
  err.response?.data?.error || 'Cannot reach the server'

const peso = (n) =>
  Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/login', { username, password })
      saveSession(data)
      onLogin(data.user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card login">
      <h1>Product Manager</h1>
      <p className="muted">Sign in to continue</p>
      {error && <div className="alert">{error}</div>}
      <form onSubmit={submit}>
        <label>Username or email</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="primary" disabled={busy}>
          {busy ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

function Products({ user, onLogout }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data } = await api.get('/api/products')
      setProducts(data.data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
      price: Number(form.price),
      quantity: Number(form.quantity),
    }
    try {
      if (editingId) await api.put('/api/products/' + editingId, payload)
      else await api.post('/api/products', payload)
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const edit = (p) => {
    setEditingId(p.id)
    setForm({
      product_name: p.product_name,
      description: p.description || '',
      price: p.price,
      quantity: p.quantity,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancel = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return
    setError('')
    try {
      await api.delete('/api/products/' + id)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {
        refresh_token: localStorage.getItem('refresh_token'),
      })
    } catch {
      /* ignore */
    }
    clearSession()
    onLogout()
  }

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Products</h1>
          <span className="muted">Signed in as {user.username}</span>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        <h2>{editingId ? 'Edit product' : 'Add product'}</h2>
        <form onSubmit={submit}>
          <label>Product name</label>
          <input name="product_name" maxLength={100} value={form.product_name} onChange={change} required />
          <label>Description</label>
          <textarea name="description" rows={2} value={form.description} onChange={change} />
          <div className="row">
            <div>
              <label>Price</label>
              <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={change} required />
            </div>
            <div>
              <label>Quantity</label>
              <input name="quantity" type="number" step="1" min="0" value={form.quantity} onChange={change} required />
            </div>
          </div>
          <div className="actions">
            <button className="primary">{editingId ? 'Update' : 'Add product'}</button>
            {editingId && (
              <button type="button" onClick={cancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Product list</h2>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : products.length === 0 ? (
          <p className="muted">No products yet.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.product_name}</td>
                    <td>{p.description}</td>
                    <td>{peso(p.price)}</td>
                    <td>{p.quantity}</td>
                    <td className="actions">
                      <button onClick={() => edit(p)}>Edit</button>
                      <button className="danger" onClick={() => remove(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(getUser())
  return user ? (
    <Products user={user} onLogout={() => setUser(null)} />
  ) : (
    <Login onLogin={setUser} />
  )
}