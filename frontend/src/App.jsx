import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ShoppingBag, Flower2, MessageSquare, Send, X, Search, Trash2, Plus, Minus, CheckCircle2, Lock, LayoutDashboard, PackagePlus, ListOrdered, LogOut, SearchCode, Eye, ShieldCheck, Truck, Sparkles, DollarSign, TrendingUp, ShoppingCart, Package, RefreshCw, QrCode, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = "https://flower-shop-backend.xuanthinhtoiday.workers.dev";

// 🏦 CẤU HÌNH NGÂN HÀNG CỦA SHOP CỦA BẠN
const BANK_ID = "BIDV"; 
const ACCOUNT_NO = "8884416572"; 
const ACCOUNT_NAME = "CAO XUÂN THỊNH";

export default function App() {
  const [currentView, setCurrentView] = useState('store');
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // State Chi Tiết Sản Phẩm (Modal)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  // Tracking State
  const [trackQuery, setTrackQuery] = useState('');
  const [trackedOrders, setTrackedOrders] = useState([]);
  const [isTrackLoading, setIsTrackLoading] = useState(false);

  // Checkout State
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [orderSuccessId, setOrderSuccessId] = useState(null);
  const [orderSuccessTotal, setOrderSuccessTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Admin State
  const [adminTab, setAdminTab] = useState('orders');
  const [ordersList, setOrdersList] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductImage, setNewProductImage] = useState('');

  // AI Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Xin chào! Bạn cần tư vấn chọn hoa cho dịp nào ạ? 🌸' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const fetchProducts = useCallback(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Bộ lọc sản phẩm
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchTerm.trim() || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = selectedCategory === 'ALL' || 
        (selectedCategory === 'LOVE' && (p.name.includes('Hồng') || p.name.includes('Tình Yêu'))) ||
        (selectedCategory === 'BIRTHDAY' && (p.name.includes('Cầu Vồng') || p.name.includes('Hướng Dương'))) ||
        (selectedCategory === 'CHEAP' && Number(p.price) <= 500000);

      return matchSearch && matchCategory;
    });
  }, [searchTerm, selectedCategory, products]);

  const fetchAdminOrders = useCallback(() => {
    fetch(`${API_URL}/api/admin/orders`)
      .then(res => res.json())
      .then(data => setOrdersList(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (currentView === 'admin_dashboard') {
      fetchAdminOrders();
    }
  }, [currentView, fetchAdminOrders]);

  const adminStats = useMemo(() => {
    const totalRevenue = ordersList
      .filter(o => o.status === 'COMPLETED' || o.status === 'CONFIRMED' || !o.status || o.status === 'PENDING')
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const completedCount = ordersList.filter(o => o.status === 'COMPLETED').length;
    const pendingCount = ordersList.filter(o => o.status === 'PENDING' || !o.status).length;
    return { totalRevenue, completedCount, pendingCount };
  }, [ordersList]);

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;

    setIsTrackLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/track?query=${encodeURIComponent(trackQuery)}`);
      const data = await res.json();
      setTrackedOrders(data);
    } catch {
      alert("Lỗi tra cứu đơn hàng!");
    } finally {
      setIsTrackLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminToken(data.token);
        localStorage.setItem('adminToken', data.token);
        setCurrentView('admin_dashboard');
        setAdminPasswordInput('');
      } else {
        alert(data.message || "Sai mật khẩu Admin!");
      }
    } catch {
      alert("Lỗi kết nối!");
    }
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    localStorage.removeItem('adminToken');
    setCurrentView('store');
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus })
      });
      if (res.ok) fetchAdminOrders();
    } catch {
      alert("Lỗi cập nhật!");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) return;

    try {
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName,
          price: Number(newProductPrice),
          description: newProductDesc,
          image_url: newProductImage || 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500'
        })
      });

      if (res.ok) {
        alert("Thêm hoa thành công!");
        setNewProductName('');
        setNewProductPrice('');
        setNewProductDesc('');
        setNewProductImage('');
        fetchProducts();
      }
    } catch {
      alert("Lỗi thêm sản phẩm!");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Xóa hoa này khỏi cửa hàng?")) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProducts();
    } catch {
      alert("Lỗi xóa sản phẩm!");
    }
  };

  const addToCart = useCallback((product, qty = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prevCart, { ...product, quantity: qty }];
    });
  }, []);

  const updateQuantity = useCallback((id, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  }, [cart]);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          card_message: cardMessage,
          total_price: cartTotal
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOrderSuccessId(data.orderId);
        setOrderSuccessTotal(cartTotal);
        setCheckoutStep('success');
        setCart([]);
      }
    } catch {
      alert("Có lỗi đặt hàng!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'bot', text: data.reply || 'Cửa hàng đã nhận thông tin!' }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Có lỗi kết nối với AI Gemini!' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED': return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>✅ Đã xác nhận</span>;
      case 'COMPLETED': return <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #bfdbfe' }}>🎉 Hoàn thành</span>;
      case 'CANCELED': return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecaca' }}>❌ Đã hủy</span>;
      default: return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fde68a' }}>🕒 Chờ duyệt</span>;
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", backgroundColor: '#fff5f7', minHeight: '100vh', width: '100%', margin: 0, padding: 0, color: '#334155' }}>
      
      {/* CSS STYLES */}
      <style>{`
        html, body, #root {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden;
        }
        * { box-sizing: border-box; }
        
        .main-container {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 24px !important;
        }

        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0;
          width: 100%;
        }

        .search-box {
          flex: 1;
          max-width: 500px;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
          width: 100%;
        }

        .product-card {
          background-color: #fff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          border: 1px solid #f1f5f9;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 28px rgba(219, 39, 119, 0.15);
          border-color: #fbcfe8;
        }

        .product-img-wrapper {
          overflow: hidden;
          position: relative;
        }
        .product-img {
          width: 100%;
          height: 210px;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .product-card:hover .product-img {
          transform: scale(1.08);
        }

        .pulse-btn {
          animation: pulseGlow 2s infinite;
          transition: all 0.2s ease;
        }
        .pulse-btn:hover {
          transform: scale(1.05);
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(219, 39, 119, 0.5); }
          70% { box-shadow: 0 0 0 12px rgba(219, 39, 119, 0); }
          100% { box-shadow: 0 0 0 0 rgba(219, 39, 119, 0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in { animation: fadeInUp 0.5s ease-out forwards; }
        .category-btn { transition: all 0.2s ease; }
        .category-btn:hover { transform: translateY(-2px); }

        .admin-stat-card-light {
          background: #ffffff;
          border-radius: 18px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 20px rgba(219, 39, 119, 0.06);
          border: 1px solid #fce7f3;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-stat-card-light:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 30px rgba(219, 39, 119, 0.15);
          border-color: #f472b6;
        }

        .admin-table-row-light { transition: background-color 0.2s ease; }
        .admin-table-row-light:hover { background-color: #fff1f2 !important; }

        .chat-widget {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 360px;
          height: 500px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 120px);
          z-index: 1000;
          animation: fadeInUp 0.3s ease-out;
        }
        .cart-drawer {
          width: 420px;
          max-width: 100vw;
          animation: slideInRight 0.3s ease-out;
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @media (max-width: 768px) {
          .header-inner { flex-wrap: wrap; }
          .search-box { order: 3; width: 100%; max-width: 100%; }
          .main-container { padding: 0 12px !important; }
        }
        @media (max-width: 480px) {
          .btn-text-hide { display: none; }
        }
      `}</style>

      {/* Top Banner */}
      <div style={{ backgroundColor: '#be185d', color: '#fff', padding: '8px 16px', fontSize: '12px', textAlign: 'center', fontWeight: '500', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={14} />
        <span>🚚 Giao hoa hỏa tốc 2H | 📸 Chụp hình hoa thực tế | 🎁 Tặng thiệp chúc mừng miễn phí</span>
      </div>

      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(219, 39, 119, 0.05)', position: 'sticky', top: 0, zIndex: 100, width: '100%' }}>
        <div className="main-container">
          <div className="header-inner">
            <div onClick={() => setCurrentView('store')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#db2777', fontWeight: '800', fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ backgroundColor: '#fce7f3', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <Flower2 size={22} color="#db2777" />
              </div>
              <span style={{ background: 'linear-gradient(45deg, #db2777, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BloomArt</span>
              {currentView === 'admin_dashboard' && (
                <span style={{ backgroundColor: '#be185d', color: '#fff', fontSize: '10px', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', marginLeft: '6px' }}>ADMIN PANEL</span>
              )}
            </div>

            {currentView === 'store' && (
              <div className="search-box" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', transition: 'all 0.3s' }}>
                <Search size={16} color="#94a3b8" />
                <input 
                  type="text" 
                  placeholder="Tìm tên hoa..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', marginLeft: '8px', width: '100%', fontSize: '13px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <button 
                onClick={() => setCurrentView(currentView === 'track_order' ? 'store' : 'track_order')}
                className="category-btn"
                style={{ border: '1px solid #fbcfe8', background: currentView === 'track_order' ? '#db2777' : '#fdf2f8', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: currentView === 'track_order' ? '#fff' : '#be185d', fontSize: '13px', fontWeight: 'bold' }}
              >
                <SearchCode size={16} /> <span className="btn-text-hide">Tra Cứu Đơn</span>
              </button>

              {currentView === 'store' ? (
                <>
                  <button 
                    onClick={() => { setIsCartOpen(true); setCheckoutStep('cart'); }}
                    className="category-btn"
                    style={{ border: 'none', background: '#fce7f3', padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#db2777', fontWeight: '600', fontSize: '13px' }}
                  >
                    <ShoppingBag size={18} />
                    <span className="btn-text-hide">Giỏ</span>
                    {cart.length > 0 && (
                      <span style={{ backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setCurrentView(adminToken ? 'admin_dashboard' : 'admin_login')}
                    className="category-btn"
                    style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}
                  >
                    <Lock size={15} /> <span className="btn-text-hide">Admin</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleAdminLogout}
                  className="category-btn"
                  style={{ border: 'none', background: '#fee2e2', padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: '600', fontSize: '13px' }}
                >
                  <LogOut size={16} /> <span className="btn-text-hide">Thoát Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* VIEW KHÁCH HÀNG */}
      {currentView === 'store' && (
        <>
          <section className="animate-fade-in" style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', padding: '45px 16px', textAlign: 'center', width: '100%' }}>
            <div style={{ width: '100%', margin: '0 auto' }}>
              <span style={{ backgroundColor: '#fff', color: '#db2777', padding: '5px 14px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Sparkles size={14} color="#db2777" /> SHOP HOA TƯƠI ONLINE 2026
              </span>
              <h1 style={{ color: '#831843', fontSize: 'clamp(24px, 4.5vw, 38px)', fontWeight: '800', margin: '14px 0 8px 0', lineHeight: '1.2' }}>
                Trao Gửi Cảm Xúc Qua Nhành Hoa Tươi 
              </h1>
              <p style={{ color: '#9d174d', fontSize: 'clamp(13px, 2.5vw, 15px)', marginBottom: '22px' }}>
                Đặt hoa nhanh chóng - Trợ lý AI tư vấn mẫu hoa phù hợp theo từng dịp
              </p>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="pulse-btn"
                style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '12px 26px', borderRadius: '25px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <MessageSquare size={18} /> Tư Vấn Hoa AI 24/7
              </button>
            </div>
          </section>

          <div className="main-container animate-fade-in" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
              <button onClick={() => setSelectedCategory('ALL')} className="category-btn" style={{ border: 'none', background: selectedCategory === 'ALL' ? '#db2777' : '#fff', color: selectedCategory === 'ALL' ? '#fff' : '#475569', padding: '9px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>Tất Cả Mẫu Hoa</button>
              <button onClick={() => setSelectedCategory('LOVE')} className="category-btn" style={{ border: 'none', background: selectedCategory === 'LOVE' ? '#db2777' : '#fff', color: selectedCategory === 'LOVE' ? '#fff' : '#475569', padding: '9px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>❤️ Hoa Tình Yêu</button>
              <button onClick={() => setSelectedCategory('BIRTHDAY')} className="category-btn" style={{ border: 'none', background: selectedCategory === 'BIRTHDAY' ? '#db2777' : '#fff', color: selectedCategory === 'BIRTHDAY' ? '#fff' : '#475569', padding: '9px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>🎂 Hoa Sinh Nhật</button>
              <button onClick={() => setSelectedCategory('CHEAP')} className="category-btn" style={{ border: 'none', background: selectedCategory === 'CHEAP' ? '#db2777' : '#fff', color: selectedCategory === 'CHEAP' ? '#fff' : '#475569', padding: '9px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>🏷️ Tiết Kiệm (≤ 500k)</button>
            </div>
          </div>

          <main className="main-container" style={{ margin: '20px 0 60px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#1e293b', margin: 0, fontWeight: '700' }}>Danh Sách Sản Phẩm</h2>
              <span style={{ color: '#64748b', fontSize: '13px' }}>{filteredProducts.length} sản phẩm</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#db2777' }}>
                <p>Đang tải hoa tươi...</p>
              </div>
            ) : (
              <div className="product-grid">
                {filteredProducts.map((item, idx) => (
                  <div key={item.id} className="product-card" style={{ animationDelay: `${idx * 0.08}s` }}>
                    <div className="product-img-wrapper" style={{ cursor: 'pointer' }} onClick={() => { setSelectedProduct(item); setModalQuantity(1); }}>
                      <img className="product-img" src={item.image_url || 'https://via.placeholder.com/300'} alt={item.name} loading="lazy" />
                      <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '6px', borderRadius: '50%', color: '#db2777', display: 'flex', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                        <Eye size={16} />
                      </div>
                    </div>

                    <div style={{ padding: '14px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div onClick={() => { setSelectedProduct(item); setModalQuantity(1); }} style={{ cursor: 'pointer' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>{item.name}</h3>
                        <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px 0', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                      </div>
                      <div>
                        <div style={{ color: '#db2777', fontWeight: '800', fontSize: '17px', marginBottom: '10px' }}>
                          {Number(item.price).toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setSelectedProduct(item); setModalQuantity(1); }} className="category-btn" style={{ flex: 1, border: '1px solid #fbcfe8', background: '#fdf2f8', color: '#be185d', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xem</button>
                          <button onClick={() => addToCart(item)} className="category-btn" style={{ flex: 1.2, backgroundColor: '#be185d', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>+ Mua</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* VIEW ADMIN DASHBOARD */}
      {currentView === 'admin_dashboard' && (
        <div className="main-container animate-fade-in" style={{ padding: '30px 24px 60px 24px' }}>
          
          <div style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', borderRadius: '20px', padding: '24px 28px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', boxShadow: '0 8px 20px rgba(219, 39, 119, 0.08)' }}>
            <div>
              <span style={{ backgroundColor: '#fff', color: '#be185d', padding: '4px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: '800' }}>
                🌸 BLOOMART MANAGEMENT
              </span>
              <h1 style={{ fontSize: '26px', color: '#831843', margin: '8px 0 4px 0', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LayoutDashboard color="#be185d" size={28} /> Bảng Điều Khiển Quản Trị
              </h1>
              <p style={{ color: '#9d174d', fontSize: '13px', margin: 0 }}>Quản lý doanh thu, danh sách đơn hàng và kho hoa tươi realtime</p>
            </div>

            <button 
              onClick={fetchAdminOrders} 
              className="category-btn"
              style={{ backgroundColor: '#fff', color: '#be185d', border: '1px solid #fbcfe8', padding: '10px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <RefreshCw size={16} /> Tải Lại Dữ Liệu
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="admin-stat-card-light">
              <div style={{ backgroundColor: '#fce7f3', padding: '14px', borderRadius: '14px', display: 'flex', color: '#db2777' }}>
                <DollarSign size={26} />
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '700' }}>TỔNG DOANH THU</span>
                <div style={{ color: '#be185d', fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
                  {adminStats.totalRevenue.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            <div className="admin-stat-card-light">
              <div style={{ backgroundColor: '#e0f2fe', padding: '14px', borderRadius: '14px', display: 'flex', color: '#0284c7' }}>
                <ShoppingCart size={26} />
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '700' }}>TỔNG ĐƠN HÀNG</span>
                <div style={{ color: '#0369a1', fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
                  {ordersList.length} đơn
                </div>
              </div>
            </div>

            <div className="admin-stat-card-light">
              <div style={{ backgroundColor: '#dcfce7', padding: '14px', borderRadius: '14px', display: 'flex', color: '#16a34a' }}>
                <TrendingUp size={26} />
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '700' }}>ĐƠN HOÀN THÀNH</span>
                <div style={{ color: '#15803d', fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
                  {adminStats.completedCount} đơn
                </div>
              </div>
            </div>

            <div className="admin-stat-card-light">
              <div style={{ backgroundColor: '#fef3c7', padding: '14px', borderRadius: '14px', display: 'flex', color: '#d97706' }}>
                <Package size={26} />
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '700' }}>MẪU HOA TRONG KHO</span>
                <div style={{ color: '#b45309', fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
                  {products.length} mẫu
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
            <button 
              onClick={() => setAdminTab('orders')} 
              className="category-btn"
              style={{ border: 'none', background: adminTab === 'orders' ? '#db2777' : '#fff', color: adminTab === 'orders' ? '#fff' : '#475569', padding: '10px 22px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            >
              <ListOrdered size={18} /> Quản Lý Đơn Hàng ({ordersList.length})
            </button>
            <button 
              onClick={() => setAdminTab('products')} 
              className="category-btn"
              style={{ border: 'none', background: adminTab === 'products' ? '#db2777' : '#fff', color: adminTab === 'products' ? '#fff' : '#475569', padding: '10px 22px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            >
              <PackagePlus size={18} /> Quản Lý Kho Hoa ({products.length})
            </button>
          </div>

          {adminTab === 'orders' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
              {ordersList.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>Chưa có đơn hàng nào phát sinh 🌸</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '14px 12px' }}>MÃ ĐƠN</th>
                        <th style={{ padding: '14px 12px' }}>KHÁCH HÀNG</th>
                        <th style={{ padding: '14px 12px' }}>SĐT</th>
                        <th style={{ padding: '14px 12px' }}>ĐỊA CHỈ GIAO</th>
                        <th style={{ padding: '14px 12px' }}>LỜI CHÚC</th>
                        <th style={{ padding: '14px 12px' }}>TỔNG TIỀN</th>
                        <th style={{ padding: '14px 12px' }}>TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.map((ord) => (
                        <tr key={ord.id} className="admin-table-row-light" style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                          <td style={{ padding: '14px 12px', fontWeight: '800', color: '#be185d' }}>#{ord.id}</td>
                          <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>{ord.customer_name}</td>
                          <td style={{ padding: '14px 12px', color: '#475569' }}>{ord.customer_phone}</td>
                          <td style={{ padding: '14px 12px', color: '#475569', maxWidth: '200px' }}>{ord.delivery_address || ord.address}</td>
                          <td style={{ padding: '14px 12px', color: '#64748b', fontStyle: 'italic', maxWidth: '180px' }}>{ord.card_message || 'Không có'}</td>
                          <td style={{ padding: '14px 12px', fontWeight: '800', color: '#db2777' }}>{Number(ord.total_price).toLocaleString('vi-VN')} đ</td>
                          <td style={{ padding: '14px 12px' }}>
                            <select 
                              value={ord.status || 'PENDING'} 
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              style={{ backgroundColor: '#fff', color: '#0f172a', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                            >
                              <option value="PENDING">🕒 Chờ duyệt</option>
                              <option value="CONFIRMED">✅ Đã xác nhận</option>
                              <option value="COMPLETED">🎉 Hoàn thành</option>
                              <option value="CANCELED">❌ Hủy đơn</option>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '18px', border: '1px solid #f1f5f9', boxShadow: '0 6px 20px rgba(0,0,0,0.03)', height: 'fit-content' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                  <PackagePlus color="#db2777" size={20} /> Thêm Mẫu Hoa Mới
                </h3>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TÊN BÓ HOA</label>
                    <input type="text" required value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Nhập tên bó hoa..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px', outline: 'none', marginTop: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>GIÁ BÁN (VNĐ)</label>
                    <input type="number" required value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Ví dụ: 500000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px', outline: 'none', marginTop: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>MÔ TẢ NGẮN</label>
                    <textarea value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} placeholder="Mô tả loại hoa, ý nghĩa..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px', outline: 'none', marginTop: '4px', height: '70px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>LINK HÌNH ẢNH (URL)</label>
                    <input type="url" value={newProductImage} onChange={e => setNewProductImage(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px', outline: 'none', marginTop: '4px' }} />
                  </div>
                  <button type="submit" className="pulse-btn" style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', marginTop: '10px' }}>
                    + Đăng Hoa Lên Cửa Hàng
                  </button>
                </form>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '18px', border: '1px solid #f1f5f9', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                  <Package color="#db2777" size={20} /> Danh Sách Hoa Trong Kho
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', marginTop: '16px' }}>
                  {products.map(p => (
                    <div key={p.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px' }}>
                      <img src={p.image_url} alt={p.name} loading="lazy" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '13px', color: '#0f172a', fontWeight: 'bold' }}>{p.name}</h4>
                        <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold' }}>{Number(p.price).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <button onClick={() => handleDeleteProduct(p.id)} className="category-btn" style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL CHI TIẾT SẢN PHẨM KHÁCH HÀNG */}
      {selectedProduct && currentView === 'store' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div className="animate-fade-in" style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ flex: '1 1 260px', width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '12px' }} />

              <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ backgroundColor: '#fce7f3', color: '#db2777', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                    Hoa Tươi Chọn Lọc 🌸
                  </span>
                  <h2 style={{ fontSize: '20px', color: '#0f172a', margin: '8px 0', fontWeight: '800' }}>{selectedProduct.name}</h2>
                  <div style={{ fontSize: '22px', color: '#db2777', fontWeight: '800', marginBottom: '12px' }}>
                    {Number(selectedProduct.price).toLocaleString('vi-VN')} đ
                  </div>

                  <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', marginBottom: '15px' }}>
                    {selectedProduct.description}
                  </p>

                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={15} color="#db2777" /> Giao hỏa tốc 2 giờ</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={15} color="#db2777" /> Gửi ảnh hoa duyệt trước khi giao</div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Số lượng:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px' }}>
                      <button onClick={() => setModalQuantity(q => Math.max(1, q - 1))} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Minus size={13} /></button>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '18px', textAlign: 'center' }}>{modalQuantity}</span>
                      <button onClick={() => setModalQuantity(q => q + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Plus size={13} /></button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { addToCart(selectedProduct, modalQuantity); setSelectedProduct(null); }} className="category-btn" style={{ flex: 1, backgroundColor: '#fce7f3', color: '#db2777', border: '1px solid #fbcfe8', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                      + Giỏ Hàng
                    </button>
                    <button onClick={() => { addToCart(selectedProduct, modalQuantity); setSelectedProduct(null); setIsCartOpen(true); setCheckoutStep('form'); }} className="pulse-btn" style={{ flex: 1, backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                      Mua Ngay
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW TRA CỨU ĐƠN HÀNG */}
      {currentView === 'track_order' && (
        <div className="animate-fade-in" style={{ maxWidth: '580px', margin: '40px auto', padding: '20px', backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
            <SearchCode color="#db2777" /> Tra Cứu Trạng Thái Đơn Hàng
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Nhập Số điện thoại hoặc Mã đơn hàng để kiểm tra tiến độ giao hoa</p>
          
          <form onSubmit={handleTrackOrder} style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
            <input 
              type="text" 
              required
              placeholder="Nhập SĐT hoặc Mã đơn (vd: 0989767545)..." 
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              style={{ flexGrow: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
            <button type="submit" style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              {isTrackLoading ? 'Đang tìm...' : 'Tra Cứu'}
            </button>
          </form>

          {trackedOrders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {trackedOrders.map(ord => (
                <div key={ord.id} style={{ border: '1px solid #f1f5f9', borderRadius: '14px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#be185d' }}>Mã đơn: #{ord.id}</span>
                    {renderStatusBadge(ord.status)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    <div>Khách hàng: <strong>{ord.customer_name}</strong> ({ord.customer_phone})</div>
                    <div>Địa chỉ: {ord.delivery_address || ord.address}</div>
                    <div>Tổng tiền: <strong style={{ color: '#db2777', fontSize: '14px' }}>{Number(ord.total_price).toLocaleString('vi-VN')} đ</strong></div>
                  </div>

                  {(!ord.status || ord.status === 'PENDING') && (
                    <div style={{ backgroundColor: '#fff', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <QrCode size={16} /> Mã VietQR Thanh Toán Đơn #{ord.id}
                      </p>
                      <img 
                        src={`https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${ord.total_price}&addInfo=BLOOMART%20${ord.id}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`}
                        alt="VietQR Payment"
                        style={{ width: '180px', height: '180px', borderRadius: '8px', border: '1px solid #f1f5f9' }}
                      />
                      <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        Quét mã trên App Ngân hàng (Nội dung: <strong>BLOOMART {ord.id}</strong>)
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            trackQuery && !isTrackLoading && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                🌸 Không tìm thấy đơn hàng nào với từ khóa "<strong>{trackQuery}</strong>".
              </div>
            )
          )}
        </div>
      )}

      {/* VIEW ADMIN LOGIN */}
      {currentView === 'admin_login' && (
        <div className="animate-fade-in" style={{ maxWidth: '380px', margin: '70px auto', padding: '25px', backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Lock size={36} color="#db2777" style={{ marginBottom: '12px' }} />
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '18px' }}>Đăng Nhập Admin</h2>
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="password" 
              required
              placeholder="Nhập mật khẩu Admin..." 
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }}
            />
            <button type="submit" style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              Xác Nhận Đăng Nhập
            </button>
          </form>
        </div>
      )}

      {/* DRAWER GIỎ HÀNG */}
      {isCartOpen && currentView === 'store' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="cart-drawer" style={{ backgroundColor: '#fff', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
            {checkoutStep === 'cart' && (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                      <ShoppingBag color="#db2777" size={20} /> Giỏ Hàng Của Bạn
                    </h3>
                    <button onClick={() => setIsCartOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                  </div>

                  {cart.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: '40px 0', fontSize: '13px' }}>Giỏ hàng đang trống 🌸</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                      {cart.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                          <img src={item.image_url} alt={item.name} loading="lazy" style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} />
                          <div style={{ flexGrow: 1 }}>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '12px' }}>{item.name}</h4>
                            <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold' }}>{Number(item.price).toLocaleString('vi-VN')} đ</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 6px' }}>
                            <button onClick={() => updateQuantity(item.id, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}><Minus size={13} /></button>
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}><Plus size={13} /></button>
                          </div>

                          <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' }}>
                      <span>Tổng tiền:</span>
                      <span style={{ color: '#db2777' }}>{cartTotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <button onClick={() => setCheckoutStep('form')} style={{ width: '100%', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                      Tiếp Tục Đặt Hàng
                    </button>
                  </div>
                )}
              </>
            )}

            {checkoutStep === 'form' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px' }}>📝 Thông Tin Giao Hoa</h3>
                  <button onClick={() => setCheckoutStep('cart')} style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>Quay lại</button>
                </div>

                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tên người nhận *" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                  <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Số điện thoại *" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                  <textarea required value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Địa chỉ giao hoa *" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', height: '55px' }} />
                  <textarea value={cardMessage} onChange={e => setCardMessage(e.target.value)} placeholder="Lời chúc thiệp (Tùy chọn)..." style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', height: '55px' }} />

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold', fontSize: '13px' }}>
                      <span>Tổng thanh toán:</span>
                      <span style={{ color: '#db2777' }}>{cartTotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <button type="submit" disabled={isSubmitting} style={{ width: '100%', backgroundColor: '#be185d', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                      {isSubmitting ? 'Đang gửi...' : 'Xác Nhận Đặt Hàng'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '10px 5px' }}>
                <CheckCircle2 color="#22c55e" size={48} style={{ margin: '0 auto 8px auto' }} />
                <h3 style={{ color: '#0f172a', margin: '0 0 4px 0', fontSize: '16px' }}>Đặt Hàng Thành Công!</h3>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 14px 0' }}>Mã đơn hàng của bạn: <strong style={{ color: '#be185d' }}>#{orderSuccessId}</strong></p>

                <div style={{ backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                  <span style={{ backgroundColor: '#db2777', color: '#fff', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <QrCode size={13} /> THANH TOÁN QUA VIETQR
                  </span>

                  <div style={{ margin: '12px 0' }}>
                    <img 
                      src={`https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${orderSuccessTotal}&addInfo=BLOOMART%20${orderSuccessId}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`}
                      alt="VietQR Code"
                      style={{ width: '200px', height: '200px', borderRadius: '10px', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                  </div>

                  <div style={{ textAlign: 'left', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px' }}>
                    <div>Ngân hàng: <strong>{BANK_ID}</strong></div>
                    <div>Chủ TK: <strong>{ACCOUNT_NAME}</strong></div>
                    <div>Số TK: <strong>{ACCOUNT_NO}</strong></div>
                    <div>Số tiền: <strong style={{ color: '#db2777' }}>{orderSuccessTotal.toLocaleString('vi-VN')} đ</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '6px 8px', borderRadius: '6px' }}>
                      <span>Nội dung: <strong>BLOOMART {orderSuccessId}</strong></span>
                      <button 
                        onClick={() => handleCopyText(`BLOOMART ${orderSuccessId}`)}
                        style={{ border: 'none', background: '#db2777', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => setIsCartOpen(false)} style={{ width: '100%', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  Đã Thanh Toán / Quay Lại
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING CHAT AI GEMINI NGUYÊN BẢN */}
      {currentView === 'store' && (
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="pulse-btn" style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '50%', width: '56px', height: '56px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      )}

      {isChatOpen && currentView === 'store' && (
        <div className="chat-widget" style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          <div style={{ backgroundColor: '#db2777', color: '#fff', padding: '12px 16px', fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={16} /> Trợ Lý Tư Vấn Hoa AI</span>
            <button onClick={() => setIsChatOpen(false)} style={{ border: 'none', background: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          
          <div style={{ flexGrow: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? '#db2777' : '#f8fafc', color: msg.sender === 'user' ? '#fff' : '#1e293b', padding: '8px 12px', borderRadius: '12px', maxWidth: '85%', fontSize: '12px', lineHeight: '1.4' }}>
                {msg.sender === 'bot' ? (
                  <ReactMarkdown components={{ p: ({ node, ...props }) => <p style={{ margin: 0 }} {...props} /> }}>
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isTyping && <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontSize: '11px' }}>AI đang suy nghĩ...</div>}
          </div>

          <div style={{ padding: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px' }}>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Nhập câu hỏi..." style={{ flexGrow: 1, border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', outline: 'none' }} />
            <button onClick={handleSendMessage} style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: '#fff', borderTop: '1px solid #f1f5f9', padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '12px', width: '100%' }}>
        <p style={{ margin: 0 }}>© 2026 BloomArt Flower Shop - Clean Gemini AI Chatbot</p>
      </footer>
    </div>
  );
}