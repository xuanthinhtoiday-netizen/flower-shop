import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  ShoppingBag, Flower2, MessageSquare, Send, X, Search, Trash2, Plus, Minus,
  CheckCircle2, Lock, LayoutDashboard, PackagePlus, ListOrdered, LogOut, SearchCode,
  Eye, ShieldCheck, Truck, Sparkles, DollarSign, TrendingUp, ShoppingCart, Package, RefreshCw, Play, Film
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = "https://flower-shop-backend.xuanthinhtoiday.workers.dev";

/* ---------- Helpers ---------- */
const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;

const store = {
  get: (k, d = '') => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* bỏ qua */ } },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* bỏ qua */ } },
};

const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#fce7f3'/><text x='50%' y='52%' font-size='64' text-anchor='middle'>🌸</text></svg>`
  );

const CATEGORIES = [
  { key: 'ALL', label: 'Tất cả mẫu hoa' },
  { key: 'LOVE', label: 'Hoa tình yêu', test: (p) => /hồng|tình yêu|valentine/i.test(p.name) || /tình yêu/i.test(p.description || '') },
  { key: 'BIRTHDAY', label: 'Hoa sinh nhật', test: (p) => /cầu vồng|hướng dương|sinh nhật/i.test(`${p.name} ${p.description || ''}`) },
  { key: 'CHEAP', label: 'Tiết kiệm (≤ 500k)', test: (p) => Number(p.price) <= 500000 },
];

const STATUS = {
  PENDING: { label: 'Chờ duyệt', cls: 'pending' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'confirmed' },
  COMPLETED: { label: 'Hoàn thành', cls: 'completed' },
  CANCELED: { label: 'Đã hủy', cls: 'canceled' },
};

const CHAT_SUGGESTIONS = ['Hoa sinh nhật mẹ', 'Hoa tặng người yêu', 'Hoa dưới 500k', 'Hoa chúc mừng khai trương'];

// Nhận link YouTube (watch, youtu.be, shorts, embed) hoặc link file .mp4/.webm (https)
function parseVideoUrl(raw) {
  const input = (raw || '').trim();
  if (!input) return null;
  const yt = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (yt) return { youtube_id: yt[1], ratio: /\/shorts\//.test(input) ? '9 / 16' : '16 / 9' };
  if (/^[\w-]{11}$/.test(input)) return { youtube_id: input, ratio: '16 / 9' };
  if (/^https:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(input)) return { video_url: input, ratio: '16 / 9' };
  return null;
}

function Img({ src, alt, className }) {
  return (
    <img
      className={className}
      src={src || FALLBACK_IMG}
      alt={alt}
      loading="lazy"
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
    />
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.PENDING;
  return <span className={`badge badge-${s.cls}`}>{s.label}</span>;
}

function VideoCard({ v }) {
  const [playing, setPlaying] = useState(false);
  const ratio = v.ratio || '16 / 9';
  const thumb = v.poster || (v.youtube ? `https://img.youtube.com/vi/${v.youtube}/hqdefault.jpg` : undefined);
  return (
    <figure className="video-card">
      <div className="video-frame" style={{ aspectRatio: ratio }}>
        {v.src ? (
          <video src={v.src} poster={thumb} controls playsInline preload="metadata" />
        ) : playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.youtube}?autoplay=1&rel=0`}
            title={v.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button className="video-play" onClick={() => setPlaying(true)} aria-label={`Phát video ${v.title}`}>
            {thumb && <img src={thumb} alt="" loading="lazy" />}
            <span className="play-icon"><Play size={26} /></span>
          </button>
        )}
      </div>
      <figcaption>
        <strong>{v.title}</strong>
        {v.caption && <span>{v.caption}</span>}
      </figcaption>
    </figure>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [currentView, setCurrentView] = useState('store');
  const [adminToken, setAdminToken] = useState(() => store.get('adminToken'));
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const [products, setProducts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(store.get('bloom_cart', '[]')) || []; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  const [trackQuery, setTrackQuery] = useState('');
  const [trackedOrders, setTrackedOrders] = useState([]);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [orderSuccessId, setOrderSuccessId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [adminTab, setAdminTab] = useState('orders');
  const [ordersList, setOrdersList] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductImage, setNewProductImage] = useState('');

  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoCaption, setNewVideoCaption] = useState('');
  const [newVideoRatio, setNewVideoRatio] = useState('16 / 9');
  const [newVideoPoster, setNewVideoPoster] = useState('');
  const parsedVideo = useMemo(() => parseVideoUrl(newVideoUrl), [newVideoUrl]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Xin chào! Bạn cần tư vấn chọn hoa cho dịp nào ạ? 🌸' },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /* ----- Dữ liệu ----- */
  const fetchProducts = useCallback(() => {
    setLoadError(false);
    fetch(`${API_URL}/api/products`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  const fetchVideos = useCallback(() => {
    fetch(`${API_URL}/api/videos`, { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => setVideos(Array.isArray(data) ? data : []))
      .catch(() => { /* không có video thì ẩn khu video */ });
  }, []);

  useEffect(() => { fetchProducts(); fetchVideos(); }, [fetchProducts, fetchVideos]);

  // Lưu giỏ hàng để không mất khi tải lại trang
  useEffect(() => { store.set('bloom_cart', JSON.stringify(cart)); }, [cart]);

  // Tự cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages, isTyping, isChatOpen]);

  // Nhấn Esc để đóng cửa sổ phủ
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setSelectedProduct(null);
      setIsCartOpen(false);
      setIsChatOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const cat = CATEGORIES.find((c) => c.key === selectedCategory);
    return products.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      const matchCat = !cat?.test || cat.test(p);
      return matchSearch && matchCat;
    });
  }, [searchTerm, selectedCategory, products]);

  const videoItems = useMemo(
    () => videos.map((v) => ({
      id: v.id, title: v.title, caption: v.caption,
      youtube: v.youtube_id, src: v.video_url, poster: v.poster_url, ratio: v.ratio,
    })),
    [videos]
  );

  /* ----- Admin ----- */
  const handleAdminLogout = useCallback(() => {
    setAdminToken('');
    store.remove('adminToken');
    setCurrentView('store');
  }, []);

  // Mọi request admin đều gửi kèm token trong header Authorization
  const adminFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, ...(options.headers || {}) },
    });
    if (res.status === 401 || res.status === 403) {
      handleAdminLogout();
      showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'err');
      throw new Error('unauthorized');
    }
    return res;
  }, [adminToken, handleAdminLogout, showToast]);

  const fetchAdminOrders = useCallback(() => {
    adminFetch('/api/admin/orders')
      .then((res) => res.json())
      .then((data) => setOrdersList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [adminFetch]);

  useEffect(() => {
    if (currentView === 'admin_dashboard' && adminToken) fetchAdminOrders();
  }, [currentView, adminToken, fetchAdminOrders]);

  const adminStats = useMemo(() => {
    // Doanh thu chỉ tính đơn đã xác nhận hoặc hoàn thành (không tính đơn chờ và đơn hủy)
    const totalRevenue = ordersList
      .filter((o) => o.status === 'CONFIRMED' || o.status === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const completedCount = ordersList.filter((o) => o.status === 'COMPLETED').length;
    const pendingCount = ordersList.filter((o) => !o.status || o.status === 'PENDING').length;
    return { totalRevenue, completedCount, pendingCount };
  }, [ordersList]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminToken(data.token);
        store.set('adminToken', data.token);
        setCurrentView('admin_dashboard');
        setAdminPasswordInput('');
      } else {
        showToast(data.message || 'Sai mật khẩu Admin!', 'err');
      }
    } catch {
      showToast('Không kết nối được máy chủ.', 'err');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await adminFetch('/api/admin/orders/status', {
        method: 'PUT',
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      if (res.ok) { fetchAdminOrders(); showToast('Đã cập nhật trạng thái đơn.'); }
    } catch { /* đã xử lý trong adminFetch */ }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice) return;
    try {
      const res = await adminFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newProductName.trim(),
          price: Number(newProductPrice),
          description: newProductDesc.trim(),
          image_url: newProductImage.trim() || 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500',
        }),
      });
      if (res.ok) {
        showToast('Đã đăng hoa lên cửa hàng.');
        setNewProductName(''); setNewProductPrice(''); setNewProductDesc(''); setNewProductImage('');
        fetchProducts();
      } else {
        showToast('Không thêm được sản phẩm.', 'err');
      }
    } catch { /* đã xử lý */ }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Xóa hoa này khỏi cửa hàng?')) return;
    try {
      const res = await adminFetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchProducts(); showToast('Đã xóa sản phẩm.'); }
    } catch { /* đã xử lý */ }
  };

  const handleVideoUrlChange = (value) => {
    setNewVideoUrl(value);
    const p = parseVideoUrl(value);
    if (p) setNewVideoRatio(p.ratio);
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!parsedVideo) return showToast('Link chưa hợp lệ. Hãy dùng link YouTube hoặc link file .mp4 (https).', 'err');
    try {
      const res = await adminFetch('/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          title: newVideoTitle.trim(),
          caption: newVideoCaption.trim(),
          youtube_id: parsedVideo.youtube_id || null,
          video_url: parsedVideo.video_url || null,
          poster_url: parsedVideo.video_url ? newVideoPoster.trim() || null : null,
          ratio: newVideoRatio,
        }),
      });
      if (res.ok) {
        showToast('Đã đăng video lên trang chủ.');
        setNewVideoUrl(''); setNewVideoTitle(''); setNewVideoCaption(''); setNewVideoPoster(''); setNewVideoRatio('16 / 9');
        fetchVideos();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Không thêm được video.', 'err');
      }
    } catch { /* đã xử lý */ }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Xóa video này khỏi trang chủ?')) return;
    try {
      const res = await adminFetch(`/api/videos/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchVideos(); showToast('Đã xóa video.'); }
    } catch { /* đã xử lý */ }
  };

  /* ----- Khách hàng ----- */
  const handleTrackOrder = async (e) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    setIsTrackLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/track?query=${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      setTrackedOrders(Array.isArray(data) ? data : []);
      setHasSearched(true);
    } catch {
      showToast('Không tra cứu được đơn hàng, thử lại sau.', 'err');
    } finally {
      setIsTrackLoading(false);
    }
  };

  const addToCart = useCallback((product, qty = 1, silent = false) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + qty } : i));
      return [...prev, { ...product, quantity: qty }];
    });
    if (!silent) showToast(`Đã thêm "${product.name}" vào giỏ.`);
  }, [showToast]);

  const updateQuantity = useCallback((id, delta) => {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)));
  }, []);

  const removeFromCart = useCallback((id) => setCart((prev) => prev.filter((i) => i.id !== id)), []);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return showToast('Giỏ hàng đang trống.', 'err');
    const phone = customerPhone.replace(/\s+/g, '');
    if (!/^(0|\+84)\d{9,10}$/.test(phone)) return showToast('Số điện thoại chưa đúng định dạng.', 'err');

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: phone,
          delivery_address: deliveryAddress.trim(),
          card_message: cardMessage.trim(),
          total_price: cartTotal,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderSuccessId(data.orderId);
        setCheckoutStep('success');
        setCart([]);
        setCustomerName(''); setCustomerPhone(''); setDeliveryAddress(''); setCardMessage('');
      } else {
        showToast(data.error || 'Đặt hàng chưa thành công, thử lại nhé.', 'err');
      }
    } catch {
      showToast('Không kết nối được máy chủ, thử lại sau.', 'err');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendChat = async (text) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || isTyping) return;
    setChatMessages((prev) => [...prev, { sender: 'user', text: msg }]);
    setChatInput('');
    setIsTyping(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { sender: 'bot', text: data.reply || 'Shop đã nhận được tin nhắn của bạn.' }]);
    } catch {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Mình chưa kết nối được, bạn thử lại sau ít phút nhé.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const openProduct = (item) => { setSelectedProduct(item); setModalQuantity(1); };

  // Mua ngay: thêm vào giỏ rồi mở thẳng bước nhập thông tin giao hoa
  const buyNow = (product, qty = 1) => {
    addToCart(product, qty, true);
    setSelectedProduct(null);
    setCheckoutStep('form');
    setIsCartOpen(true);
  };

  const view = currentView === 'admin_dashboard' && !adminToken ? 'admin_login' : currentView;

  return (
    <div className="bloom">
      <style>{CSS}</style>

      <div className="topbar">
        <Sparkles size={14} />
        <span>Giao hoa hỏa tốc 2 giờ · Chụp ảnh hoa thực tế · Tặng thiệp miễn phí</span>
      </div>

      <header className="header">
        <div className="container header-inner">
          <button className="brand" onClick={() => setCurrentView('store')} aria-label="Về trang chủ BloomArt">
            <span className="brand-icon"><Flower2 size={22} /></span>
            <span className="brand-name">BloomArt</span>
            {view === 'admin_dashboard' && <span className="admin-tag">Quản trị</span>}
          </button>

          {view === 'store' && (
            <label className="search-box">
              <Search size={16} />
              <input type="text" placeholder="Tìm tên hoa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {searchTerm && (
                <button type="button" className="icon-btn" onClick={() => setSearchTerm('')} aria-label="Xóa tìm kiếm"><X size={14} /></button>
              )}
            </label>
          )}

          <nav className="header-actions">
            <button className={`pill ${view === 'track_order' ? 'pill-active' : ''}`} onClick={() => setCurrentView(view === 'track_order' ? 'store' : 'track_order')}>
              <SearchCode size={16} /> <span className="hide-sm">Tra cứu đơn</span>
            </button>
            {view === 'admin_dashboard' ? (
              <button className="pill pill-danger" onClick={handleAdminLogout}><LogOut size={16} /> <span className="hide-sm">Thoát</span></button>
            ) : (
              <>
                <button className="pill pill-cart" onClick={() => { setIsCartOpen(true); setCheckoutStep('cart'); setCurrentView('store'); }}>
                  <ShoppingBag size={18} /> <span className="hide-sm">Giỏ hàng</span>
                  {cartCount > 0 && <span className="count">{cartCount}</span>}
                </button>
                <button className="pill pill-ghost" onClick={() => setCurrentView(adminToken ? 'admin_dashboard' : 'admin_login')}>
                  <Lock size={15} /> <span className="hide-sm">Admin</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ======== CỬA HÀNG ======== */}
      {view === 'store' && (
        <>
          <section className="hero">
            <div className="container hero-inner">
              <p className="hero-kicker"><Sparkles size={14} /> Shop hoa tươi online 2026</p>
              <h1>Trao gửi cảm xúc qua từng nhành hoa tươi</h1>
              <p className="hero-sub">Đặt hoa nhanh chóng, nhờ trợ lý AI gợi ý mẫu hoa hợp từng dịp.</p>
              <div className="hero-actions">
                <button className="btn btn-primary btn-lg" onClick={() => setIsChatOpen(true)}>
                  <MessageSquare size={18} /> Hỏi trợ lý chọn hoa
                </button>
                <a className="btn btn-light btn-lg" href="#san-pham">Xem mẫu hoa</a>
              </div>
            </div>
          </section>

          <div className="container">
            <div className="chips" role="tablist" aria-label="Lọc theo dịp">
              {CATEGORIES.map((c) => (
                <button key={c.key} role="tab" aria-selected={selectedCategory === c.key} className={`chip ${selectedCategory === c.key ? 'chip-active' : ''}`} onClick={() => setSelectedCategory(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <main className="container section" id="san-pham">
            <div className="section-head">
              <h2>Danh sách sản phẩm</h2>
              <span className="muted">{filteredProducts.length} mẫu hoa</span>
            </div>

            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" />)}
              </div>
            ) : loadError ? (
              <div className="empty">
                <p>Chưa tải được danh sách hoa. Bạn kiểm tra mạng rồi thử lại nhé.</p>
                <button className="btn btn-primary" onClick={() => { setLoading(true); fetchProducts(); }}><RefreshCw size={15} /> Tải lại</button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty">
                <p>Không có mẫu hoa nào khớp với bộ lọc hiện tại.</p>
                <button className="btn btn-light" onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}>Xóa bộ lọc</button>
              </div>
            ) : (
              <div className="product-grid">
                {filteredProducts.map((item) => (
                  <article key={item.id} className="product-card">
                    <button className="product-img-wrap" onClick={() => openProduct(item)} aria-label={`Xem chi tiết ${item.name}`}>
                      <Img className="product-img" src={item.image_url} alt={item.name} />
                      <span className="eye"><Eye size={16} /></span>
                    </button>
                    <div className="product-body">
                      <h3 title={item.name}>{item.name}</h3>
                      <p className="clamp-2">{item.description}</p>
                      <div className="price">{vnd(item.price)}</div>
                      <div className="card-actions">
                        <button className="btn btn-light btn-sm" onClick={() => addToCart(item)} aria-label={`Thêm ${item.name} vào giỏ`}><ShoppingBag size={15} /> Thêm giỏ</button>
                        <button className="btn btn-primary btn-sm" onClick={() => buyNow(item)}>Mua ngay</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>

          {videoItems.length > 0 && (
            <section className="video-section" id="video-hoa">
              <div className="container">
                <div className="section-head video-head">
                  <div>
                    <h2>Hoa nở trong từng khoảnh khắc</h2>
                    <p className="muted">Xem cách các bó hoa được cắm và trao tận tay người nhận.</p>
                  </div>
                </div>
                <div className="video-grid">
                  {videoItems.map((v) => <VideoCard key={v.id} v={v} />)}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ======== ADMIN ======== */}
      {view === 'admin_dashboard' && (
        <div className="container section">
          <div className="admin-hero">
            <div>
              <h1><LayoutDashboard size={26} /> Bảng điều khiển quản trị</h1>
              <p>Theo dõi doanh thu, đơn hàng, kho hoa và video của BloomArt.</p>
            </div>
            <button className="btn btn-light" onClick={() => { fetchAdminOrders(); fetchVideos(); fetchProducts(); }}><RefreshCw size={16} /> Tải lại dữ liệu</button>
          </div>

          <div className="stats">
            <div className="stat"><span className="stat-icon s-pink"><DollarSign size={24} /></span><div><small>Doanh thu (đã xác nhận)</small><strong>{vnd(adminStats.totalRevenue)}</strong></div></div>
            <div className="stat"><span className="stat-icon s-blue"><ShoppingCart size={24} /></span><div><small>Tổng đơn hàng</small><strong>{ordersList.length} đơn</strong></div></div>
            <div className="stat"><span className="stat-icon s-amber"><Package size={24} /></span><div><small>Đơn chờ duyệt</small><strong>{adminStats.pendingCount} đơn</strong></div></div>
            <div className="stat"><span className="stat-icon s-green"><TrendingUp size={24} /></span><div><small>Đơn hoàn thành</small><strong>{adminStats.completedCount} đơn</strong></div></div>
          </div>

          <div className="tabs">
            <button className={`chip ${adminTab === 'orders' ? 'chip-active' : ''}`} onClick={() => setAdminTab('orders')}><ListOrdered size={16} /> Đơn hàng ({ordersList.length})</button>
            <button className={`chip ${adminTab === 'products' ? 'chip-active' : ''}`} onClick={() => setAdminTab('products')}><PackagePlus size={16} /> Kho hoa ({products.length})</button>
            <button className={`chip ${adminTab === 'videos' ? 'chip-active' : ''}`} onClick={() => setAdminTab('videos')}><Film size={16} /> Video ({videos.length})</button>
          </div>

          {adminTab === 'orders' && (
            <div className="panel">
              {ordersList.length === 0 ? (
                <p className="empty-text">Chưa có đơn hàng nào.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Mã đơn</th><th>Khách hàng</th><th>Số điện thoại</th><th>Địa chỉ giao</th><th>Lời chúc</th><th>Tổng tiền</th><th>Trạng thái</th></tr>
                    </thead>
                    <tbody>
                      {ordersList.map((o) => (
                        <tr key={o.id}>
                          <td className="t-id">#{o.id}</td>
                          <td><strong>{o.customer_name}</strong></td>
                          <td>{o.customer_phone}</td>
                          <td className="t-wrap">{o.delivery_address || o.address}</td>
                          <td className="t-wrap muted">{o.card_message || 'Không có'}</td>
                          <td className="t-money">{vnd(o.total_price)}</td>
                          <td>
                            <select value={o.status || 'PENDING'} onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)} aria-label={`Trạng thái đơn ${o.id}`}>
                              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === 'products' && (
            <div className="admin-grid">
              <div className="panel">
                <h3 className="panel-title"><PackagePlus size={20} /> Thêm mẫu hoa mới</h3>
                <form onSubmit={handleAddProduct} className="form">
                  <label>Tên bó hoa<input type="text" required value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="Ví dụ: Bó hoa hồng pastel" /></label>
                  <label>Giá bán (VNĐ)<input type="number" min="0" required value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="500000" /></label>
                  <label>Mô tả ngắn<textarea value={newProductDesc} onChange={(e) => setNewProductDesc(e.target.value)} placeholder="Loại hoa, ý nghĩa, dịp phù hợp..." /></label>
                  <label>Link hình ảnh<input type="url" value={newProductImage} onChange={(e) => setNewProductImage(e.target.value)} placeholder="https://..." /></label>
                  {newProductImage && <Img className="preview" src={newProductImage} alt="Xem trước" />}
                  <button type="submit" className="btn btn-primary"><Plus size={16} /> Đăng hoa lên cửa hàng</button>
                </form>
              </div>

              <div className="panel">
                <h3 className="panel-title"><Package size={20} /> Hoa trong kho</h3>
                <div className="stock-list">
                  {products.map((p) => (
                    <div key={p.id} className="stock-item">
                      <Img className="stock-img" src={p.image_url} alt={p.name} />
                      <div className="grow"><h4>{p.name}</h4><span className="price-sm">{vnd(p.price)}</span></div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p.id)}><Trash2 size={14} /> Xóa</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'videos' && (
            <div className="admin-grid">
              <div className="panel">
                <h3 className="panel-title"><Film size={20} /> Thêm video mới</h3>
                <form onSubmit={handleAddVideo} className="form">
                  <label>Link video
                    <input type="text" required value={newVideoUrl} onChange={(e) => handleVideoUrlChange(e.target.value)} placeholder="Link YouTube hoặc link file .mp4" />
                  </label>
                  {newVideoUrl && !parsedVideo && (
                    <p className="hint-err">Link chưa hợp lệ. Hãy dùng link YouTube (youtube.com, youtu.be, shorts) hoặc link file .mp4 bắt đầu bằng https://</p>
                  )}
                  {parsedVideo?.youtube_id && (
                    <Img className="preview" src={`https://img.youtube.com/vi/${parsedVideo.youtube_id}/hqdefault.jpg`} alt="Xem trước video" />
                  )}
                  <label>Tiêu đề
                    <input type="text" required maxLength={120} value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} placeholder="Ví dụ: Cắm bó hoa hồng pastel" />
                  </label>
                  <label>Mô tả ngắn (không bắt buộc)
                    <input type="text" maxLength={200} value={newVideoCaption} onChange={(e) => setNewVideoCaption(e.target.value)} placeholder="Ví dụ: Quy trình làm hoa tại xưởng" />
                  </label>
                  <label>Kiểu khung hình
                    <select value={newVideoRatio} onChange={(e) => setNewVideoRatio(e.target.value)}>
                      <option value="16 / 9">Ngang (16:9)</option>
                      <option value="9 / 16">Dọc (9:16, kiểu Shorts/TikTok)</option>
                    </select>
                  </label>
                  {parsedVideo?.video_url && (
                    <label>Link ảnh bìa (không bắt buộc)
                      <input type="url" value={newVideoPoster} onChange={(e) => setNewVideoPoster(e.target.value)} placeholder="https://..." />
                    </label>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={!parsedVideo}><Plus size={16} /> Đăng video lên trang chủ</button>
                </form>
              </div>

              <div className="panel">
                <h3 className="panel-title"><Film size={20} /> Video đang hiển thị</h3>
                {videoItems.length === 0 ? (
                  <p className="empty-text">Chưa có video nào. Khu video trên trang chủ đang được ẩn.</p>
                ) : (
                  <div className="stock-list">
                    {videoItems.map((v) => (
                      <div key={v.id} className="stock-item">
                        <Img
                          className="stock-img"
                          src={v.poster || (v.youtube ? `https://img.youtube.com/vi/${v.youtube}/hqdefault.jpg` : '')}
                          alt={v.title}
                        />
                        <div className="grow">
                          <h4>{v.title}</h4>
                          <span className="muted">{v.youtube ? 'YouTube' : 'File video'} · {v.ratio === '9 / 16' ? 'Dọc' : 'Ngang'}</span>
                        </div>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteVideo(v.id)}><Trash2 size={14} /> Xóa</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== TRA CỨU ĐƠN ======== */}
      {view === 'track_order' && (
        <div className="card-narrow">
          <h2 className="panel-title"><SearchCode size={22} /> Tra cứu đơn hàng</h2>
          <p className="muted">Nhập số điện thoại hoặc mã đơn để xem tiến độ giao hoa.</p>
          <form onSubmit={handleTrackOrder} className="track-form">
            <input type="text" required placeholder="Số điện thoại hoặc mã đơn" value={trackQuery} onChange={(e) => setTrackQuery(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={isTrackLoading}>{isTrackLoading ? 'Đang tìm...' : 'Tra cứu'}</button>
          </form>

          {trackedOrders.length > 0 && (
            <div className="track-list">
              {trackedOrders.map((o) => (
                <div key={o.id} className="track-item">
                  <div className="track-top"><strong>Mã đơn #{o.id}</strong><StatusBadge status={o.status} /></div>
                  <div className="muted">Khách hàng: <strong>{o.customer_name}</strong> ({o.customer_phone})</div>
                  <div className="muted">Tổng tiền: <strong className="price-sm">{vnd(o.total_price)}</strong></div>
                </div>
              ))}
            </div>
          )}
          {hasSearched && !isTrackLoading && trackedOrders.length === 0 && (
            <p className="empty-text">Không tìm thấy đơn nào với “{trackQuery}”. Bạn kiểm tra lại số điện thoại hoặc mã đơn nhé.</p>
          )}
        </div>
      )}

      {/* ======== ĐĂNG NHẬP ADMIN ======== */}
      {view === 'admin_login' && (
        <div className="card-narrow login">
          <Lock size={34} className="login-icon" />
          <h2>Đăng nhập quản trị</h2>
          <form onSubmit={handleAdminLogin} className="form">
            <input type="password" required autoFocus placeholder="Mật khẩu admin" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} />
            <button type="submit" className="btn btn-primary">Đăng nhập</button>
          </form>
        </div>
      )}

      {/* ======== MODAL CHI TIẾT ======== */}
      {selectedProduct && view === 'store' && (
        <div className="overlay center" onClick={() => setSelectedProduct(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={selectedProduct.name} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)} aria-label="Đóng"><X size={18} /></button>
            <Img className="modal-img" src={selectedProduct.image_url} alt={selectedProduct.name} />
            <div className="modal-info">
              <h2>{selectedProduct.name}</h2>
              <div className="price price-lg">{vnd(selectedProduct.price)}</div>
              <p className="modal-desc">{selectedProduct.description}</p>
              <ul className="perks">
                <li><Truck size={16} /> Giao hỏa tốc 2 giờ</li>
                <li><ShieldCheck size={16} /> Gửi ảnh hoa để bạn duyệt trước khi giao</li>
              </ul>
              <div className="qty-row">
                <span>Số lượng</span>
                <div className="qty">
                  <button onClick={() => setModalQuantity((q) => Math.max(1, q - 1))} aria-label="Giảm"><Minus size={14} /></button>
                  <span>{modalQuantity}</span>
                  <button onClick={() => setModalQuantity((q) => q + 1)} aria-label="Tăng"><Plus size={14} /></button>
                </div>
              </div>
              <div className="card-actions">
                <button className="btn btn-light" onClick={() => { addToCart(selectedProduct, modalQuantity); setSelectedProduct(null); }}>Thêm vào giỏ</button>
                <button className="btn btn-primary" onClick={() => buyNow(selectedProduct, modalQuantity)}>Mua ngay</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== GIỎ HÀNG ======== */}
      {isCartOpen && view === 'store' && (
        <div className="overlay right" onClick={() => setIsCartOpen(false)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Giỏ hàng" onClick={(e) => e.stopPropagation()}>
            {checkoutStep === 'cart' && (
              <>
                <div className="drawer-head">
                  <h3><ShoppingBag size={20} /> Giỏ hàng của bạn</h3>
                  <button className="icon-btn" onClick={() => setIsCartOpen(false)} aria-label="Đóng giỏ hàng"><X size={20} /></button>
                </div>
                <div className="drawer-body">
                  {cart.length === 0 ? (
                    <p className="empty-text">Giỏ hàng đang trống. Chọn vài nhành hoa bạn thích nhé 🌸</p>
                  ) : cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <Img className="stock-img" src={item.image_url} alt={item.name} />
                      <div className="grow"><h4>{item.name}</h4><span className="price-sm">{vnd(item.price)}</span></div>
                      <div className="qty qty-sm">
                        <button onClick={() => updateQuantity(item.id, -1)} aria-label="Giảm"><Minus size={13} /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} aria-label="Tăng"><Plus size={13} /></button>
                      </div>
                      <button className="icon-btn danger" onClick={() => removeFromCart(item.id)} aria-label="Xóa khỏi giỏ"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="drawer-foot">
                    <div className="total"><span>Tổng tiền</span><strong>{vnd(cartTotal)}</strong></div>
                    <button className="btn btn-primary btn-block" onClick={() => setCheckoutStep('form')}>Tiếp tục đặt hàng</button>
                  </div>
                )}
              </>
            )}

            {checkoutStep === 'form' && (
              <>
                <div className="drawer-head">
                  <h3>Thông tin giao hoa</h3>
                  <button className="link-btn" onClick={() => setCheckoutStep('cart')}>Quay lại giỏ</button>
                </div>
                <form onSubmit={handleCheckout} className="drawer-body form">
                  <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tên người nhận *" autoComplete="name" />
                  <input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Số điện thoại *" autoComplete="tel" />
                  <textarea required value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Địa chỉ giao hoa *" />
                  <textarea value={cardMessage} onChange={(e) => setCardMessage(e.target.value)} placeholder="Lời chúc trên thiệp (không bắt buộc)" />
                  <div className="summary">
                    {cart.map((i) => (
                      <div key={i.id}><span>{i.name} × {i.quantity}</span><b>{vnd(Number(i.price) * i.quantity)}</b></div>
                    ))}
                  </div>
                  <div className="total"><span>Tổng thanh toán</span><strong>{vnd(cartTotal)}</strong></div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>{isSubmitting ? 'Đang gửi...' : 'Xác nhận đặt hàng'}</button>
                </form>
              </>
            )}

            {checkoutStep === 'success' && (
              <div className="success">
                <CheckCircle2 size={56} />
                <h3>Đặt hàng thành công!</h3>
                <p className="muted">Mã đơn của bạn là <strong>#{orderSuccessId}</strong>. Hãy lưu lại để tra cứu tiến độ giao hoa.</p>
                <button className="btn btn-primary" onClick={() => setIsCartOpen(false)}>Tiếp tục mua sắm</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ======== CHAT AI ======== */}
      {view === 'store' && (
        <button className={`fab ${isChatOpen ? '' : 'fab-pulse'}`} onClick={() => setIsChatOpen((o) => !o)} aria-label={isChatOpen ? 'Đóng trợ lý' : 'Mở trợ lý tư vấn hoa'}>
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      )}

      {isChatOpen && view === 'store' && (
        <section className="chat" aria-label="Trợ lý tư vấn hoa">
          <div className="chat-head">
            <span><Sparkles size={16} /> Trợ lý tư vấn hoa</span>
            <button className="icon-btn light" onClick={() => setIsChatOpen(false)} aria-label="Đóng"><X size={18} /></button>
          </div>
          <div className="chat-body">
            {chatMessages.map((m, i) => (
              <div key={i} className={`msg msg-${m.sender}`}>
                {m.sender === 'bot' ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
              </div>
            ))}
            {chatMessages.length === 1 && (
              <div className="suggest">
                {CHAT_SUGGESTIONS.map((s) => <button key={s} onClick={() => sendChat(s)}>{s}</button>)}
              </div>
            )}
            {isTyping && <div className="msg msg-bot typing"><i /><i /><i /></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Nhập câu hỏi..." maxLength={500} />
            <button className="send" onClick={() => sendChat()} disabled={isTyping || !chatInput.trim()} aria-label="Gửi"><Send size={16} /></button>
          </div>
        </section>
      )}

      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.msg}</div>}

      <footer className="footer">© 2026 BloomArt · Hoa tươi giao tận nơi</footer>
    </div>
  );
}

/* ---------- CSS ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

:root {
  --rose-900:#831843; --rose-700:#be185d; --rose-600:#db2777; --rose-200:#fbcfe8; --rose-100:#fce7f3; --rose-50:#fff5f7;
  --ink:#1f1a1d; --muted:#6b6168; --line:#f0e4ea; --white:#fff;
}
html, body, #root { margin:0; padding:0; width:100%; max-width:100%; overflow-x:hidden; }
* { box-sizing:border-box; }
.bloom { font-family:'Be Vietnam Pro',system-ui,sans-serif; background:var(--rose-50); color:var(--ink); min-height:100vh; line-height:1.5; text-align:left; }
.bloom .hero-inner, .bloom .topbar, .bloom .footer, .bloom .empty, .bloom .success, .bloom .card-narrow.login { text-align:center; }
.bloom h1, .bloom h2 { font-family:'Playfair Display',Georgia,serif; letter-spacing:-.01em; }
.bloom button, .bloom input, .bloom textarea, .bloom select { font-family:inherit; font-size:14px; }
.bloom button { cursor:pointer; }
.bloom :focus-visible { outline:3px solid var(--rose-600); outline-offset:2px; }
.container { width:100%; max-width:1280px; margin:0 auto; padding:0 24px; }
.section { padding-top:24px; padding-bottom:64px; }
.muted { color:var(--muted); font-size:13px; }
.grow { flex:1; min-width:0; }
.hint-err { margin:0; color:#b91c1c; font-size:12.5px; }

.topbar { background:var(--rose-700); color:#fff; font-size:12px; padding:8px 16px; display:flex; gap:8px; justify-content:center; align-items:center; }
.header { background:#fff; position:sticky; top:0; z-index:100; border-bottom:1px solid var(--line); }
.header-inner { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-top:12px; padding-bottom:12px; }
.brand { display:flex; align-items:center; gap:10px; background:none; border:0; padding:0; color:var(--rose-600); flex-shrink:0; }
.brand-icon { background:var(--rose-100); padding:8px; border-radius:12px; display:flex; }
.brand-name { font-family:'Playfair Display',serif; font-weight:700; font-size:22px; color:var(--rose-700); }
.admin-tag { background:var(--rose-700); color:#fff; font-size:11px; font-weight:600; padding:3px 10px; border-radius:999px; }
.search-box { flex:1; max-width:460px; display:flex; align-items:center; gap:8px; background:#faf6f8; border:1px solid var(--line); padding:9px 14px; border-radius:999px; color:var(--muted); }
.search-box:focus-within { border-color:var(--rose-600); background:#fff; }
.bloom .search-box input[type=text] { flex:1; width:auto; border:0; background:transparent; outline:none; box-shadow:none; padding:0; border-radius:0; min-width:0; }
.bloom .chat-input input[type=text] { border-radius:999px; padding:10px 16px; }
.bloom .track-form input[type=text] { flex:1; }
.header-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; }
.icon-btn { border:0; background:none; display:flex; padding:4px; color:inherit; border-radius:6px; }
.icon-btn.danger { color:#dc2626; } .icon-btn.light { color:#fff; }
.link-btn { border:0; background:none; color:var(--muted); font-size:13px; text-decoration:underline; }

.pill { display:flex; align-items:center; gap:6px; border:1px solid var(--rose-200); background:#fff; color:var(--rose-700); padding:8px 14px; border-radius:999px; font-weight:600; font-size:13px; }
.pill:hover { background:var(--rose-50); }
.pill-active { background:var(--rose-600); color:#fff; border-color:var(--rose-600); }
.pill-cart { background:var(--rose-100); border-color:var(--rose-100); }
.pill-ghost { color:var(--muted); border-color:#e2dbe0; }
.pill-danger { background:#fee2e2; border-color:#fee2e2; color:#dc2626; }
.count { background:#ef4444; color:#fff; border-radius:999px; padding:1px 7px; font-size:11px; font-weight:700; }

.btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; border:1px solid transparent; border-radius:10px; padding:10px 18px; font-weight:600; transition:background .15s, transform .15s; text-decoration:none; }
.btn:disabled { opacity:.55; cursor:not-allowed; }
.btn:active:not(:disabled) { transform:scale(.98); }
.btn-primary { background:var(--rose-600); color:#fff; } .btn-primary:hover:not(:disabled) { background:var(--rose-700); }
.btn-light { background:#fff; color:var(--rose-700); border-color:var(--rose-200); } .btn-light:hover { background:var(--rose-50); }
.btn-danger { background:#fee2e2; color:#dc2626; } .btn-danger:hover { background:#fecaca; }
.btn-sm { padding:8px 12px; font-size:13px; } .btn-lg { padding:13px 26px; font-size:15px; border-radius:999px; } .btn-block { width:100%; }

.hero { background:linear-gradient(160deg,#fde4ef 0%,#fbcfe8 100%); padding:56px 0 52px; }
.hero-inner { max-width:760px; }
.hero-kicker { display:inline-flex; align-items:center; gap:6px; background:#fff; color:var(--rose-700); padding:6px 14px; border-radius:999px; font-size:12.5px; font-weight:600; margin:0 0 16px; }
.hero h1 { color:var(--rose-900); font-size:clamp(30px,5vw,50px); line-height:1.15; margin:0 0 14px; }
.hero-sub { color:#9d174d; font-size:clamp(14px,2.4vw,17px); margin:0 0 26px; }
.hero-actions { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }

.chips, .tabs { display:flex; gap:10px; overflow-x:auto; padding:20px 0 6px; scrollbar-width:none; }
.tabs { padding:0 0 18px; margin-bottom:6px; }
.chip { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--line); background:#fff; color:var(--muted); padding:9px 18px; border-radius:999px; font-weight:600; font-size:13px; white-space:nowrap; }
.chip:hover { border-color:var(--rose-200); color:var(--rose-700); }
.chip-active, .chip-active:hover { background:var(--rose-600); border-color:var(--rose-600); color:#fff; }

.section-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:16px; }
.section-head h2 { margin:0; font-size:24px; }
.product-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:22px; }
.product-card { background:#fff; border-radius:16px; overflow:hidden; border:1px solid var(--line); display:flex; flex-direction:column; transition:transform .25s, box-shadow .25s, border-color .25s; }
.product-card:hover { transform:translateY(-5px); box-shadow:0 14px 30px rgba(219,39,119,.14); border-color:var(--rose-200); }
.product-img-wrap { position:relative; display:block; width:100%; padding:0; border:0; background:var(--rose-100); overflow:hidden; aspect-ratio:4/4.2; }
.product-img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s; }
.product-card:hover .product-img { transform:scale(1.05); }
.eye { position:absolute; top:10px; right:10px; background:rgba(255,255,255,.92); color:var(--rose-600); padding:7px; border-radius:50%; display:flex; }
.product-body { padding:14px 16px 16px; display:flex; flex-direction:column; gap:6px; flex:1; }
.product-body h3 { margin:0; font-size:15.5px; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:42px; }
.clamp-2 { margin:0; color:var(--muted); font-size:12.5px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:38px; }
.price { color:var(--rose-600); font-weight:700; font-size:18px; margin-top:auto; padding-top:6px; }
.price-lg { font-size:26px; margin:6px 0 12px; padding:0; }
.price-sm { color:var(--rose-600); font-weight:700; font-size:13px; }
.card-actions { display:flex; gap:8px; margin-top:8px; }
.card-actions .btn { flex:1; }

.skeleton { height:380px; border-radius:16px; background:linear-gradient(90deg,#f9eef3 25%,#fdf6f9 50%,#f9eef3 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position:-200% 0; } }
.empty { padding:48px 16px; background:#fff; border:1px dashed var(--rose-200); border-radius:16px; display:flex; flex-direction:column; gap:14px; align-items:center; color:var(--muted); }
.empty p { margin:0; } .empty-text { text-align:center; color:var(--muted); padding:28px 8px; margin:0; font-size:14px; }

.overlay { position:fixed; inset:0; background:rgba(31,26,29,.55); z-index:2000; display:flex; animation:fade .2s; }
.overlay.center { align-items:center; justify-content:center; padding:16px; z-index:3000; }
.overlay.right { justify-content:flex-end; }
@keyframes fade { from { opacity:0; } }
.modal { background:#fff; border-radius:20px; width:100%; max-width:780px; max-height:92vh; overflow-y:auto; display:grid; grid-template-columns:1fr 1fr; position:relative; }
.modal-img { width:100%; height:100%; min-height:300px; max-height:460px; object-fit:cover; border-radius:20px 0 0 20px; }
.modal-info { padding:28px 24px; display:flex; flex-direction:column; }
.modal-info h2 { margin:0; font-size:24px; line-height:1.25; }
.modal-desc { color:#4b4248; font-size:14px; margin:0 0 14px; }
.modal-close { position:absolute; top:12px; right:12px; width:34px; height:34px; border-radius:50%; border:0; background:rgba(255,255,255,.95); display:flex; align-items:center; justify-content:center; z-index:2; box-shadow:0 2px 8px rgba(0,0,0,.15); }
.perks { list-style:none; padding:12px; margin:0 0 16px; background:var(--rose-50); border-radius:12px; display:flex; flex-direction:column; gap:8px; font-size:13px; color:#4b4248; }
.perks li { display:flex; align-items:center; gap:8px; } .perks svg { color:var(--rose-600); flex-shrink:0; }
.qty-row { display:flex; align-items:center; gap:12px; margin-bottom:14px; font-weight:600; font-size:14px; }
.qty { display:flex; align-items:center; border:1px solid #e2dbe0; border-radius:10px; }
.qty button { border:0; background:none; padding:8px 11px; display:flex; }
.qty span { min-width:26px; text-align:center; font-weight:700; font-size:14px; }
.qty-sm button { padding:5px 7px; } .qty-sm span { font-size:13px; }

.drawer { width:420px; max-width:100vw; height:100%; background:#fff; display:flex; flex-direction:column; animation:slide .25s ease-out; }
@keyframes slide { from { transform:translateX(100%); } }
.drawer-head { display:flex; justify-content:space-between; align-items:center; padding:18px 20px; border-bottom:1px solid var(--line); }
.drawer-head h3 { margin:0; font-size:16px; display:flex; align-items:center; gap:8px; }
.drawer-body { flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:12px; }
.drawer-foot { border-top:1px solid var(--line); padding:16px 20px; }
.cart-item { display:flex; align-items:center; gap:10px; padding-bottom:12px; border-bottom:1px solid #f7f0f3; }
.cart-item h4, .stock-item h4 { margin:0 0 2px; font-size:13.5px; line-height:1.3; }
.stock-img { width:54px; height:54px; border-radius:10px; object-fit:cover; flex-shrink:0; }
.total { display:flex; justify-content:space-between; align-items:center; font-weight:600; margin-bottom:12px; }
.total strong { color:var(--rose-600); font-size:18px; }
.success { margin:auto; padding:24px; display:flex; flex-direction:column; align-items:center; gap:10px; color:#16a34a; }
.success h3 { color:var(--ink); margin:4px 0 0; font-size:20px; } .success p { margin:0 0 10px; }

.form { display:flex; flex-direction:column; gap:14px; }
.form label { display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:600; color:#4b4248; }
.bloom input[type=text], .bloom input[type=tel], .bloom input[type=password], .bloom input[type=number], .bloom input[type=url], .bloom textarea, .bloom select { width:100%; padding:11px 13px; border:1px solid #e2dbe0; border-radius:10px; background:#fff; color:var(--ink); outline:none; }
.bloom textarea { min-height:78px; resize:vertical; }
.bloom input:focus, .bloom textarea:focus, .bloom select:focus { border-color:var(--rose-600); box-shadow:0 0 0 3px rgba(219,39,119,.15); }
.preview { width:100%; max-height:160px; object-fit:cover; border-radius:12px; }

.card-narrow { max-width:600px; margin:40px auto; padding:28px 24px; background:#fff; border-radius:20px; border:1px solid var(--line); width:calc(100% - 32px); }
.card-narrow h2 { margin:0 0 6px; font-size:24px; }
.card-narrow.login { max-width:400px; margin-top:64px; }
.login-icon { color:var(--rose-600); }
.track-form { display:flex; gap:8px; margin:16px 0; }
.track-list { display:flex; flex-direction:column; gap:12px; }
.track-item { border:1px solid var(--line); border-radius:12px; padding:14px; background:#fdfafb; display:flex; flex-direction:column; gap:4px; }
.track-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
.badge { padding:4px 12px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid; }
.badge-pending { background:#fef3c7; color:#b45309; border-color:#fde68a; } .badge-confirmed { background:#dcfce7; color:#15803d; border-color:#bbf7d0; }
.badge-completed { background:#dbeafe; color:#1d4ed8; border-color:#bfdbfe; } .badge-canceled { background:#fee2e2; color:#b91c1c; border-color:#fecaca; }

.admin-hero { background:linear-gradient(160deg,#fde4ef,#fbcfe8); border-radius:20px; padding:24px 28px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
.admin-hero h1 { margin:0 0 4px; font-size:26px; color:var(--rose-900); display:flex; align-items:center; gap:10px; }
.admin-hero p { margin:0; color:#9d174d; font-size:14px; }
.stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-bottom:26px; }
.stat { background:#fff; border:1px solid var(--line); border-radius:16px; padding:18px; display:flex; gap:14px; align-items:center; }
.stat small { color:var(--muted); font-size:12px; display:block; } .stat strong { font-size:20px; display:block; }
.stat-icon { padding:13px; border-radius:14px; display:flex; }
.s-pink { background:var(--rose-100); color:var(--rose-600); } .s-blue { background:#e0f2fe; color:#0284c7; } .s-green { background:#dcfce7; color:#16a34a; } .s-amber { background:#fef3c7; color:#d97706; }
.panel { background:#fff; border:1px solid var(--line); border-radius:16px; padding:22px; }
.panel-title { margin:0 0 14px; font-size:17px; display:flex; align-items:center; gap:8px; }
.panel-title svg { color:var(--rose-600); }
.table-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-size:13px; text-align:left; min-width:820px; }
th { background:#faf6f8; color:var(--muted); font-weight:600; padding:12px; border-bottom:1px solid var(--line); white-space:nowrap; }
td { padding:12px; border-bottom:1px solid #f7f0f3; vertical-align:middle; }
tbody tr:hover { background:#fff8fa; }
.t-id { font-weight:700; color:var(--rose-700); } .t-money { font-weight:700; color:var(--rose-600); white-space:nowrap; } .t-wrap { max-width:200px; }
td select { width:auto; padding:7px 10px; font-weight:600; }
.admin-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:22px; align-items:start; }
.stock-list { display:flex; flex-direction:column; gap:10px; max-height:520px; overflow-y:auto; }
.stock-item { display:flex; gap:12px; align-items:center; background:#fdfafb; border:1px solid var(--line); border-radius:12px; padding:10px 12px; }

.fab { position:fixed; bottom:20px; right:20px; width:58px; height:58px; border-radius:50%; border:0; background:var(--rose-600); color:#fff; display:flex; align-items:center; justify-content:center; z-index:1001; box-shadow:0 8px 20px rgba(219,39,119,.4); }
.fab-pulse { animation:pulse 2.4s infinite; }
@keyframes pulse { 0% { box-shadow:0 0 0 0 rgba(219,39,119,.5); } 70% { box-shadow:0 0 0 14px rgba(219,39,119,0); } 100% { box-shadow:0 0 0 0 rgba(219,39,119,0); } }
.chat { position:fixed; bottom:90px; right:20px; width:370px; height:520px; max-width:calc(100vw - 32px); max-height:calc(100vh - 110px); background:#fff; border-radius:18px; box-shadow:0 16px 44px rgba(31,26,29,.22); display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--line); z-index:1000; animation:fade .2s; }
.chat-head { background:var(--rose-600); color:#fff; padding:14px 16px; font-weight:600; font-size:14px; display:flex; justify-content:space-between; align-items:center; }
.chat-head span { display:flex; align-items:center; gap:8px; }
.chat-body { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#fffafc; }
.msg { max-width:86%; padding:10px 14px; border-radius:16px; font-size:13.5px; line-height:1.5; word-wrap:break-word; text-align:left; }
.msg-bot { align-self:flex-start; background:#fff; border:1px solid var(--line); border-bottom-left-radius:4px; max-width:92%; }
.msg-user { align-self:flex-end; background:var(--rose-600); color:#fff; border-bottom-right-radius:4px; }
.msg p { margin:0 0 8px; } .msg p:last-child { margin:0; }
.msg ul, .msg ol { margin:6px 0 8px; padding-left:18px; display:flex; flex-direction:column; gap:8px; }
.msg li { padding-left:2px; line-height:1.5; }
.msg li::marker { color:var(--rose-600); }
.msg strong { color:var(--rose-700); font-weight:600; }
.suggest { display:flex; flex-wrap:wrap; gap:8px; }
.suggest button { border:1px solid var(--rose-200); background:#fff; color:var(--rose-700); padding:7px 12px; border-radius:999px; font-size:12.5px; font-weight:500; }
.suggest button:hover { background:var(--rose-100); }
.typing { display:flex; gap:4px; padding:12px 14px; }
.typing i { width:7px; height:7px; background:#cdb7c3; border-radius:50%; animation:bounce 1.2s infinite; }
.typing i:nth-child(2) { animation-delay:.15s; } .typing i:nth-child(3) { animation-delay:.3s; }
@keyframes bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-5px); } }
.chat-input { display:flex; gap:8px; padding:10px; border-top:1px solid var(--line); background:#fff; }
.chat-input input { flex:1; min-width:0; }
.send { border:0; background:var(--rose-600); color:#fff; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.send:disabled { background:#e5c7d6; cursor:not-allowed; }

.summary { display:flex; flex-direction:column; gap:6px; padding:12px; background:var(--rose-50); border-radius:12px; font-size:13px; }
.summary div { display:flex; justify-content:space-between; gap:12px; }
.summary span { color:#4b4248; } .summary b { color:var(--rose-600); white-space:nowrap; }

.video-section { background:linear-gradient(180deg,var(--rose-50) 0%,#fde4ef 100%); padding:56px 0 72px; }
.video-head { margin-bottom:24px; align-items:flex-end; }
.video-head h2 { font-size:28px; }
.video-head p { margin:6px 0 0; }
.video-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:24px; align-items:start; }
.video-card { margin:0; background:#fff; border-radius:18px; overflow:hidden; border:1px solid var(--line); }
.video-frame { width:100%; background:#2a1620; position:relative; }
.video-frame video, .video-frame iframe { width:100%; height:100%; border:0; display:block; background:#000; }
.video-play { position:absolute; inset:0; width:100%; height:100%; border:0; padding:0; background:linear-gradient(135deg,#f9a8d4,#be185d); overflow:hidden; }
.video-play img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s; }
.video-play:hover img { transform:scale(1.04); }
.play-icon { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,.95); color:var(--rose-600); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(0,0,0,.25); }
.play-icon svg { margin-left:3px; }
.video-card figcaption { padding:14px 16px 16px; display:flex; flex-direction:column; gap:2px; }
.video-card figcaption strong { font-size:15px; }
.video-card figcaption span { color:var(--muted); font-size:13px; }

.toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--ink); color:#fff; padding:12px 20px; border-radius:12px; font-size:13.5px; z-index:4000; max-width:calc(100vw - 32px); animation:fade .2s; box-shadow:0 8px 24px rgba(0,0,0,.25); }
.toast-err { background:#b91c1c; }
.footer { background:#fff; border-top:1px solid var(--line); padding:24px 16px; color:var(--muted); font-size:13px; }

@media (max-width:768px) {
  .container { padding:0 14px; }
  .header-inner { flex-wrap:wrap; }
  .search-box { order:3; max-width:100%; flex-basis:100%; }
  .hero { padding:40px 0; }
  .modal { grid-template-columns:1fr; }
  .modal-img { border-radius:20px 20px 0 0; min-height:220px; max-height:300px; }
  .product-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
  .product-body { padding:10px 12px 12px; } .product-body h3 { font-size:14px; }
  .card-actions { flex-direction:column; }
  .skeleton { height:300px; }
  .video-section { padding:40px 0 56px; }
  .video-grid { grid-template-columns:1fr; gap:16px; }
}
@media (max-width:480px) {
  .hide-sm { display:none; }
  .topbar { font-size:11px; }
  .chat { right:12px; bottom:84px; }
}
@media (prefers-reduced-motion:reduce) {
  .bloom *, .bloom *::before, .bloom *::after { animation:none !important; transition:none !important; }
}
`;