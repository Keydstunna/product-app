import { useEffect, useMemo, useRef, useState } from 'react'
import api, { saveSession, clearSession, getUser } from './api'

const emptyForm = { product_name: '', description: '', price: '', quantity: '' }
const PAGE_SIZE = 6
const LOW_STOCK = 10

const errorMessage = (err) =>
  err.response?.data?.error || 'Cannot reach the server'

const peso = (n) =>
  Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

const pesoShort = (n) =>
  Number(n).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  })

const whole = (n) => Math.round(n).toLocaleString('en-PH')

const stockOf = (qty) => {
  const q = Number(qty)
  if (q <= 0) return { key: 'out', label: 'Out of stock' }
  if (q <= LOW_STOCK) return { key: 'low', label: 'Low stock' }
  return { key: 'in', label: 'In stock' }
}

const addedOn = (value) => {
  if (!value) return '—'
  const d = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ---------- icons ---------- */

const paths = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="m13.5 6.5 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="m6 7 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="m16 8 4 4-4 4M20 12H9" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4" />
      <path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  box: (
    <>
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  coins: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2C14.3 8.4 13.3 8 12 8c-1.7 0-2.8.8-2.8 2 0 1.3 1.2 1.7 2.8 2s2.8.7 2.8 2c0 1.2-1.1 2-2.8 2-1.4 0-2.4-.5-2.9-1.3M12 6.5V8m0 8v1.5" />
    </>
  ),
  warn: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
      <path d="M12 10v4.2M12 17h.01" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevL: <path d="m15 6-6 6 6 6" />,
  chevR: <path d="m9 6 6 6-6 6" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
}

function Icon({ name, size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <span className="orb o1" />
      <span className="orb o2" />
      <span className="orb o3" />
      <span className="orb o4" />
      <span className="dots" />
    </div>
  )
}

function Logo({ size = 'md' }) {
  return (
    <span className={'logo ' + size}>
      <Icon name="box" size={size === 'lg' ? 30 : 20} />
    </span>
  )
}

/* ---------- login ---------- */

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
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
      setShake((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <section key={shake} className={'glass auth-card rise' + (shake ? ' shake' : '')}>
        <Logo size="lg" />
        <h1 className="auth-title">Product Manager</h1>
        <p className="auth-sub">Sign in to manage your inventory</p>

        {error && (
          <div className="alert pop" role="alert">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="stack">
          <label className="field">
            <span className="field-label">Username or email</span>
            <span className="field-box">
              <Icon name="user" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
              />
            </span>
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <span className="field-box">
              <Icon name="lock" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="peek"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                <Icon name={show ? 'eyeOff' : 'eye'} />
              </button>
            </span>
          </label>

          <button className="btn primary block" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" /> Signing in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </section>
    </main>
  )
}

/* ---------- small pieces ---------- */

function useCountUp(target, ms = 900) {
  const [val, setVal] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = a + (target - a) * eased
      setVal(v)
      from.current = v
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return val
}

function Stat({ icon, label, value, format, tone, delay }) {
  const v = useCountUp(value)
  return (
    <div className={'glass stat rise tone-' + tone} style={{ '--d': delay + 'ms' }}>
      <span className="stat-icon">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{format(v)}</div>
      </div>
    </div>
  )
}

function Modal({ children, onClose, label }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass modal" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

/* ---------- products ---------- */

function Products({ user, onLogout }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { id: number | null }
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [loggingOut, setLoggingOut] = useState(false)

  const notify = (type, msg) => setToast({ type, msg, id: Date.now() })

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const load = async () => {
    try {
      const { data } = await api.get('/api/products')
      setProducts(data.data)
    } catch (err) {
      notify('error', errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    const c = { all: products.length, in: 0, low: 0, out: 0 }
    products.forEach((p) => {
      c[stockOf(p.quantity).key] += 1
    })
    return c
  }, [products])

  const stats = useMemo(
    () => ({
      items: products.length,
      units: products.reduce((s, p) => s + Number(p.quantity), 0),
      value: products.reduce((s, p) => s + Number(p.price) * Number(p.quantity), 0),
      attention: counts.low + counts.out,
    }),
    [products, counts],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (filter !== 'all' && stockOf(p.quantity).key !== filter) return false
      if (!q) return true
      return (
        p.product_name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    })
  }, [products, query, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const openAdd = () => {
    setForm(emptyForm)
    setFormError('')
    setModal({ id: null })
  }

  const openEdit = (p) => {
    setForm({
      product_name: p.product_name,
      description: p.description || '',
      price: p.price,
      quantity: p.quantity,
    })
    setFormError('')
    setModal({ id: p.id })
  }

  const closeModal = () => {
    if (!saving) setModal(null)
  }

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      ...form,
      price: Number(form.price),
      quantity: Number(form.quantity),
    }
    try {
      if (modal.id) await api.put('/api/products/' + modal.id, payload)
      else await api.post('/api/products', payload)
      notify('success', modal.id ? 'Product updated' : 'Product added')
      setModal(null)
      await load()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await api.delete('/api/products/' + confirm.id)
      notify('success', 'Product deleted')
      setConfirm(null)
      await load()
    } catch (err) {
      notify('error', errorMessage(err))
      setConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  const logout = async () => {
    setLoggingOut(true)
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

  const tabs = [
    ['all', 'All'],
    ['in', 'In stock'],
    ['low', 'Low stock'],
    ['out', 'Out of stock'],
  ]

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="shell">
      <header className="topbar rise">
        <div className="brand">
          <Logo />
          <span className="brand-name">Product Manager</span>
        </div>
        <div className="glass pill-user">
          <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
          <span className="who">{user.username}</span>
          <button
            className="icon-btn"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Logout"
            title="Logout"
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <section className="hello rise" style={{ '--d': '60ms' }}>
        <h1>
          {greeting()}, <span className="grad">{user.username}</span> <span className="wave">👋</span>
        </h1>
        <p>Here&apos;s what&apos;s happening with your inventory.</p>
      </section>

      <section className="stats">
        <Stat icon="layers" label="Products" value={stats.items} format={whole} tone="blue" delay={120} />
        <Stat icon="box" label="Total units" value={stats.units} format={whole} tone="cyan" delay={180} />
        <Stat icon="coins" label="Inventory value" value={stats.value} format={pesoShort} tone="indigo" delay={240} />
        <Stat icon="warn" label="Needs restock" value={stats.attention} format={whole} tone="amber" delay={300} />
      </section>

      <section className="glass panel rise" style={{ '--d': '360ms' }}>
        <div className="tabs" role="tablist">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              className={'tab' + (filter === key ? ' on' : '')}
              onClick={() => {
                setFilter(key)
                setPage(1)
              }}
            >
              {label}
              <span className="count">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <button className="btn primary" onClick={openAdd}>
            <Icon name="plus" size={18} /> Add Product
          </button>
          <label className="search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search products"
              aria-label="Search products"
            />
          </label>
        </div>

        {loading ? (
          <div className="skeletons" aria-label="Loading">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ '--d': i * 120 + 'ms' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty pop">
            <svg viewBox="0 0 120 100" width="150" aria-hidden="true">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7fb0ff" />
                  <stop offset="1" stopColor="#2f6bff" />
                </linearGradient>
              </defs>
              <ellipse cx="60" cy="90" rx="38" ry="6" fill="#2f6bff" opacity=".12" />
              <g className="float-a">
                <path d="M60 18 90 34v32L60 82 30 66V34z" fill="url(#g1)" opacity=".92" />
                <path d="M30 34 60 50l30-16M60 50v32" stroke="#fff" strokeOpacity=".7" strokeWidth="2" fill="none" />
              </g>
              <circle cx="96" cy="22" r="4" fill="#22c5ff" className="float-b" />
              <circle cx="22" cy="46" r="3" fill="#5b6dff" className="float-b" />
            </svg>
            <h3>{products.length === 0 ? 'No products yet' : 'No matches found'}</h3>
            <p>
              {products.length === 0
                ? 'Add your first product to get started.'
                : 'Try a different search or filter.'}
            </p>
            {products.length === 0 && (
              <button className="btn primary" onClick={openAdd}>
                <Icon name="plus" size={18} /> Add your first product
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody key={current + filter + query}>
                {rows.map((p, i) => {
                  const s = stockOf(p.quantity)
                  return (
                    <tr key={p.id} className="row-in" style={{ '--d': i * 55 + 'ms' }}>
                      <td className="cell-name">
                        <div className="p-name">{p.product_name}</div>
                        {p.description && <div className="p-desc">{p.description}</div>}
                      </td>
                      <td data-label="Price" className="num">{peso(p.price)}</td>
                      <td data-label="Quantity" className="num">{whole(p.quantity)}</td>
                      <td data-label="Status">
                        <span className={'badge ' + s.key}>
                          <i /> {s.label}
                        </span>
                      </td>
                      <td data-label="Added" className="soft">{addedOn(p.created_at)}</td>
                      <td className="cell-actions">
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(p)}
                            aria-label={'Edit ' + p.product_name}
                            title="Edit"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => setConfirm(p)}
                            aria-label={'Delete ' + p.product_name}
                            title="Delete"
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="foot">
              <span className="soft">
                Showing {(current - 1) * PAGE_SIZE + 1}–{(current - 1) * PAGE_SIZE + rows.length} of {filtered.length}
              </span>
              {totalPages > 1 && (
                <nav className="pager" aria-label="Pagination">
                  <button
                    className="pg round"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                    aria-label="Previous page"
                  >
                    <Icon name="chevL" size={16} />
                  </button>
                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      className={'pg' + (n === current ? ' on' : '')}
                      onClick={() => setPage(n)}
                      aria-current={n === current ? 'page' : undefined}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    className="pg round"
                    disabled={current === totalPages}
                    onClick={() => setPage(current + 1)}
                    aria-label="Next page"
                  >
                    <Icon name="chevR" size={16} />
                  </button>
                </nav>
              )}
            </div>
          </>
        )}
      </section>

      {modal && (
        <Modal onClose={closeModal} label={modal.id ? 'Edit product' : 'Add product'}>
          <div className="modal-head">
            <div>
              <h2>{modal.id ? 'Edit product' : 'Add product'}</h2>
              <p className="soft">
                {modal.id ? 'Update the details below.' : 'Fill in the details of your new product.'}
              </p>
            </div>
            <button className="icon-btn" onClick={closeModal} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>

          {formError && (
            <div className="alert pop" role="alert">
              <Icon name="alert" size={18} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={submit} className="stack">
            <label className="field">
              <span className="field-label">Product name</span>
              <span className="field-box plain">
                <input
                  name="product_name"
                  maxLength={100}
                  value={form.product_name}
                  onChange={change}
                  placeholder="e.g. Wireless Mouse"
                  autoFocus
                  required
                />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Description</span>
              <span className="field-box plain">
                <textarea
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={change}
                  placeholder="Short description (optional)"
                />
              </span>
            </label>

            <div className="two">
              <label className="field">
                <span className="field-label">Price (₱)</span>
                <span className="field-box plain">
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={change}
                    placeholder="0.00"
                    required
                  />
                </span>
              </label>
              <label className="field">
                <span className="field-label">Quantity</span>
                <span className="field-box plain">
                  <input
                    name="quantity"
                    type="number"
                    step="1"
                    min="0"
                    value={form.quantity}
                    onChange={change}
                    placeholder="0"
                    required
                  />
                </span>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" /> Saving...
                  </>
                ) : modal.id ? (
                  'Save changes'
                ) : (
                  'Add product'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <Modal onClose={() => !deleting && setConfirm(null)} label="Delete product">
          <div className="confirm">
            <span className="confirm-icon">
              <Icon name="trash" size={26} />
            </span>
            <h2>Delete this product?</h2>
            <p className="soft">
              <strong>{confirm.product_name}</strong> will be removed permanently. This can&apos;t be undone.
            </p>
            <div className="modal-actions center">
              <button className="btn" onClick={() => setConfirm(null)} disabled={deleting}>
                Keep it
              </button>
              <button className="btn danger-solid" onClick={remove} disabled={deleting}>
                {deleting ? (
                  <>
                    <span className="spinner" /> Deleting...
                  </>
                ) : (
                  'Yes, delete'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div key={toast.id} className={'glass toast ' + toast.type} role="status">
          <span className="toast-dot">
            <Icon name={toast.type === 'success' ? 'check' : 'alert'} size={16} />
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ---------- root ---------- */

export default function App() {
  const [user, setUser] = useState(getUser())

  // click ripple for every .btn
  useEffect(() => {
    const onDown = (e) => {
      const b = e.target.closest?.('.btn')
      if (!b || b.disabled) return
      const r = b.getBoundingClientRect()
      const d = Math.max(r.width, r.height)
      const s = document.createElement('span')
      s.className = 'ripple'
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`
      b.appendChild(s)
      setTimeout(() => s.remove(), 650)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  return (
    <>
      <Background />
      {user ? (
        <Products user={user} onLogout={() => setUser(null)} />
      ) : (
        <Login onLogin={setUser} />
      )}
    </>
  )
}
