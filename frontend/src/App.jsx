import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ShoppingBag, Flower2, MessageSquare, Send, X, Search, Trash2, Plus, Minus, CheckCircle2, Lock, LayoutDashboard, PackagePlus, ListOrdered, LogOut, Truck, Gift, ShieldCheck, Clock, SearchCode } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = "https://flower-shop-backend.xuanthinhtoiday.workers.dev";

export default function App() {
  const [currentView, setCurrentView] = useState('store'); // 'store' | 'track_order' | 'admin_login' | 'admin_dashboard'
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isCartOpen, setIsCartOpen] = useState(false);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Bộ lọc sản phẩm nâng cao
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

  const addToCart = useCallback((product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...product, quantity: 1 }];
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
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Có lỗi kết nối với AI!' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED': return <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>✅ Đã xác nhận</span>;
      case 'COMPLETED': return <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>🎉 Hoàn thành</span>;
      case 'CANCELED': return <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>❌ Đã hủy</span>;
      default: return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>🕒 Chờ duyệt</span>;
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", backgroundColor: '#fff5f7', minHeight: '100vh', color: '#334155' }}>
      
      <style>{`
        .header-container { display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 12px 20px; gap: 12px; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 180px; max-width: 320px; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .chat-widget { position: fixed; bottom: 90px; right: 20px; width: 360px; height: 500px; max-width: calc(100vw - 40px); max-height: calc(100vh - 120px); z-index: 1000; }
        .cart-drawer { width: 400px; max-width: 100vw; }
        img { content-visibility: auto; }
        @media (max-width: 640px) {
          .header-container { padding: 10px 15px; }
          .search-box { order: 3; width: 100%; max-width: 100%; min-width: 100%; }
          .chat-widget { bottom: 0; right: 0; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; border-radius: 0 !important; }
        }
      `}</style>

      {/* Top Banner Cam Kết */}
      <div style={{ backgroundColor: '#be185d', color: '#fff', padding: '6px 12px', fontSize: '12px', textAlign: 'center', fontWeight: '500' }}>
        🚚 Giao hoa hỏa tốc 2H | 📸 Chụp hình hoa trước & sau khi giao | 🎁 Tặng thiệp chúc mừng
      </div>

      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(219, 39, 119, 0.05)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div onClick={() => setCurrentView('store')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#db2777', fontWeight: '800', fontSize: '20px', cursor: 'pointer' }}>
            <div style={{ backgroundColor: '#fce7f3', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Flower2 size={22} color="#db2777" />
            </div>
            <span style={{ background: 'linear-gradient(45deg, #db2777, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BloomArt</span>
          </div>

          {currentView === 'store' && (
            <div className="search-box" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
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

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => setCurrentView(currentView === 'track_order' ? 'store' : 'track_order')}
              style={{ border: '1px solid #fbcfe8', background: currentView === 'track_order' ? '#db2777' : '#fdf2f8', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: currentView === 'track_order' ? '#fff' : '#be185d', fontSize: '13px', fontWeight: 'bold' }}
            >
              <SearchCode size={16} /> Tra Cứu Đơn
            </button>

            {currentView === 'store' ? (
              <>
                <button 
                  onClick={() => { setIsCartOpen(true); setCheckoutStep('cart'); }}
                  style={{ border: 'none', background: '#fce7f3', padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#db2777', fontWeight: '600', fontSize: '13px' }}
                >
                  <ShoppingBag size={18} />
                  <span>Giỏ</span>
                  {cart.length > 0 && (
                    <span style={{ backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>
                      {cart.reduce((a, b) => a + b.quantity, 0)}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setCurrentView(adminToken ? 'admin_dashboard' : 'admin_login')}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}
                >
                  <Lock size={15} /> Admin
                </button>
              </>
            ) : (
              <button 
                onClick={handleAdminLogout}
                style={{ border: 'none', background: '#fee2e2', padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: '600', fontSize: '13px' }}
              >
                <LogOut size={16} /> Thoát Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* VIEW KHÁCH HÀNG */}
      {currentView === 'store' && (
        <>
          <section style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', padding: '40px 15px', textAlign: 'center' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <span style={{ backgroundColor: '#fff', color: '#db2777', padding: '4px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                🌸 SHOP HOA TƯƠI ONLINE 2026
              </span>
              <h1 style={{ color: '#831843', fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: '800', margin: '15px 0 10px 0', lineHeight: '1.2' }}>
                Trao Gửi Cảm Xúc Qua Nhành Hoa Tươi 
              </h1>
              <p style={{ color: '#9d174d', fontSize: 'clamp(13px, 3vw, 15px)', marginBottom: '20px' }}>
                Đặt hoa nhanh chóng - Trợ lý AI tư vấn mẫu hoa phù hợp theo từng dịp
              </p>
              <button 
                onClick={() => setIsChatOpen(true)}
                style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '25px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(219, 39, 119, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <MessageSquare size={16} /> Tư Vấn Hoa AI 24/7
              </button>
            </div>
          </section>

          {/* Thanh Bảng Bộ Lọc Danh Mục Nhanh */}
          <div style={{ maxWidth: '1100px', margin: '20px auto 0 auto', padding: '0 15px', display: 'flex', gap: '10px', overflowX: 'auto' }}>
            <button onClick={() => setSelectedCategory('ALL')} style={{ border: 'none', background: selectedCategory === 'ALL' ? '#db2777' : '#fff', color: selectedCategory === 'ALL' ? '#fff' : '#475569', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>Tất Cả Mẫu Hoa</button>
            <button onClick={() => setSelectedCategory('LOVE')} style={{ border: 'none', background: selectedCategory === 'LOVE' ? '#db2777' : '#fff', color: selectedCategory === 'LOVE' ? '#fff' : '#475569', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>❤️ Hoa Tình Yêu</button>
            <button onClick={() => setSelectedCategory('BIRTHDAY')} style={{ border: 'none', background: selectedCategory === 'BIRTHDAY' ? '#db2777' : '#fff', color: selectedCategory === 'BIRTHDAY' ? '#fff' : '#475569', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>🎂 Hoa Sinh Nhật</button>
            <button onClick={() => setSelectedCategory('CHEAP')} style={{ border: 'none', background: selectedCategory === 'CHEAP' ? '#db2777' : '#fff', color: selectedCategory === 'CHEAP' ? '#fff' : '#475569', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>🏷️ Tiết Kiệm (≤ 500k)</button>
          </div>

          <main style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 15px 50px 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, fontWeight: '700' }}>Danh Sách Sản Phẩm</h2>
              <span style={{ color: '#64748b', fontSize: '13px' }}>{filteredProducts.length} sản phẩm</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#db2777' }}>
                <p>Đang tải hoa tươi...</p>
              </div>
            ) : (
              <div className="product-grid">
                {filteredProducts.map((item) => (
                  <div key={item.id} style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={item.image_url || 'https://via.placeholder.com/300'} 
                        alt={item.name} 
                        loading="lazy"
                        style={{ width: '100%', height: '220px', objectFit: 'cover' }} 
                      />
                    </div>
                    <div style={{ padding: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#0f172a', fontWeight: '700' }}>{item.name}</h3>
                        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px 0', lineHeight: '1.4' }}>{item.description}</p>
                      </div>
                      <div>
                        <div style={{ color: '#db2777', fontWeight: '800', fontSize: '18px', marginBottom: '12px' }}>
                          {Number(item.price).toLocaleString('vi-VN')} đ
                        </div>
                        <button 
                          onClick={() => addToCart(item)}
                          style={{ width: '100%', backgroundColor: '#be185d', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                        >
                          + Thêm vào giỏ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* VIEW TRA CỨU ĐƠN HÀNG */}
      {currentView === 'track_order' && (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#0f172a', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
            <SearchCode color="#db2777" /> Tra Cứu Trạng Thái Đơn Hàng
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Nhập Số điện thoại hoặc Mã đơn hàng của bạn để kiểm tra tiến độ giao hoa</p>
          
          <form onSubmit={handleTrackOrder} style={{ display: 'flex', gap: '8px', margin: '20px 0' }}>
            <input 
              type="text" 
              required
              placeholder="Nhập SĐT hoặc Mã đơn (vd: 0987... hoặc #1)..." 
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              style={{ flexGrow: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
            <button type="submit" style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
              {isTrackLoading ? 'Đang tìm...' : 'Tra Cứu'}
            </button>
          </form>

          {trackedOrders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {trackedOrders.map(ord => (
                <div key={ord.id} style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '15px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Mã đơn: #{ord.id}</span>
                    {renderStatusBadge(ord.status)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Khách hàng: <strong>{ord.customer_name}</strong> ({ord.customer_phone})</div>
                    <div>Tổng tiền: <strong style={{ color: '#db2777' }}>{Number(ord.total_price).toLocaleString('vi-VN')} đ</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW ADMIN LOGIN */}
      {currentView === 'admin_login' && (
        <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Lock size={40} color="#db2777" style={{ marginBottom: '15px' }} />
          <h2 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Đăng Nhập Admin</h2>
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              required
              placeholder="Nhập mật khẩu Admin..." 
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
            />
            <button type="submit" style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Xác Nhận Đăng Nhập
            </button>
          </form>
        </div>
      )}

      {/* VIEW ADMIN DASHBOARD */}
      {currentView === 'admin_dashboard' && (
        <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 15px 50px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard color="#db2777" /> Bảng Điều Khiển Quản Trị
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
            <button 
              onClick={() => setAdminTab('orders')} 
              style={{ border: 'none', background: adminTab === 'orders' ? '#db2777' : '#f1f5f9', color: adminTab === 'orders' ? '#fff' : '#475569', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ListOrdered size={18} /> Đơn Hàng ({ordersList.length})
            </button>
            <button 
              onClick={() => setAdminTab('products')} 
              style={{ border: 'none', background: adminTab === 'products' ? '#db2777' : '#f1f5f9', color: adminTab === 'products' ? '#fff' : '#475569', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <PackagePlus size={18} /> Kho Hoa ({products.length})
            </button>
          </div>

          {adminTab === 'orders' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              {ordersList.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Chưa có đơn hàng nào 🌸</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px' }}>Mã Đơn</th>
                        <th style={{ padding: '12px' }}>Khách Hàng</th>
                        <th style={{ padding: '12px' }}>SĐT</th>
                        <th style={{ padding: '12px' }}>Địa Chỉ Giao</th>
                        <th style={{ padding: '12px' }}>Lời Chúc</th>
                        <th style={{ padding: '12px' }}>Tổng Tiền</th>
                        <th style={{ padding: '12px' }}>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.map((ord) => (
                        <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>#{ord.id}</td>
                          <td style={{ padding: '12px' }}>{ord.customer_name}</td>
                          <td style={{ padding: '12px' }}>{ord.customer_phone}</td>
                          <td style={{ padding: '12px' }}>{ord.delivery_address || ord.address}</td>
                          <td style={{ padding: '12px', color: '#64748b' }}>{ord.card_message || 'Không có'}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#db2777' }}>{Number(ord.total_price).toLocaleString('vi-VN')} đ</td>
                          <td style={{ padding: '12px' }}>
                            <select 
                              value={ord.status || 'PENDING'} 
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
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
              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0f172a' }}>➕ Thêm Mẫu Hoa Mới</h3>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" required value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Tên bó hoa..." style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  <input type="number" required value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Giá bán..." style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  <textarea value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} placeholder="Mô tả ngắn..." style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', height: '60px' }} />
                  <input type="url" value={newProductImage} onChange={e => setNewProductImage(e.target.value)} placeholder="Link ảnh URL..." style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  <button type="submit" style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Tải Hoa Lên Cửa Hàng
                  </button>
                </form>
              </div>

              <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0f172a' }}>🌸 Danh Sách Hoa Cửa Hàng</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                  {products.map(p => (
                    <div key={p.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <img src={p.image_url} alt={p.name} loading="lazy" style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '13px' }}>{p.name}</h4>
                        <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold' }}>{Number(p.price).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <button onClick={() => handleDeleteProduct(p.id)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
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

      {/* DRAWER GIỎ HÀNG */}
      {isCartOpen && currentView === 'store' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="cart-drawer" style={{ backgroundColor: '#fff', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {checkoutStep === 'cart' && (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                      <ShoppingBag color="#db2777" size={20} /> Giỏ Hàng Của Bạn
                    </h3>
                    <button onClick={() => setIsCartOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={22} /></button>
                  </div>

                  {cart.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: '40px 0', fontSize: '14px' }}>Giỏ hàng đang trống 🌸</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto' }}>
                      {cart.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                          <img src={item.image_url} alt={item.name} loading="lazy" style={{ width: '55px', height: '55px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div style={{ flexGrow: 1 }}>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px' }}>{item.name}</h4>
                            <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold' }}>{Number(item.price).toLocaleString('vi-VN')} đ</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 6px' }}>
                            <button onClick={() => updateQuantity(item.id, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}><Minus size={14} /></button>
                            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}><Plus size={14} /></button>
                          </div>

                          <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 'bold', fontSize: '15px' }}>
                      <span>Tổng tiền:</span>
                      <span style={{ color: '#db2777' }}>{cartTotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <button onClick={() => setCheckoutStep('form')} style={{ width: '100%', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                      Tiếp Tục Đặt Hàng
                    </button>
                  </div>
                )}
              </>
            )}

            {checkoutStep === 'form' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>📝 Thông Tin Giao Hoa</h3>
                  <button onClick={() => setCheckoutStep('cart')} style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>Quay lại</button>
                </div>

                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tên người nhận *" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Số điện thoại *" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  <textarea required value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Địa chỉ giao hoa *" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', height: '60px' }} />
                  <textarea value={cardMessage} onChange={e => setCardMessage(e.target.value)} placeholder="Lời chúc thiệp (Tùy chọn)..." style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', height: '60px' }} />

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                      <span>Tổng thanh toán:</span>
                      <span style={{ color: '#db2777' }}>{cartTotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <button type="submit" disabled={isSubmitting} style={{ width: '100%', backgroundColor: '#be185d', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                      {isSubmitting ? 'Đang gửi...' : 'Xác Nhận Đặt Hàng'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <CheckCircle2 color="#22c55e" size={60} style={{ margin: '0 auto 15px auto' }} />
                <h3 style={{ color: '#0f172a', margin: '0 0 10px 0' }}>Đặt Hàng Thành Công!</h3>
                <p style={{ color: '#64748b', fontSize: '13px' }}>Mã đơn hàng của bạn là: <strong>#{orderSuccessId}</strong></p>
                <button onClick={() => setIsCartOpen(false)} style={{ marginTop: '20px', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  Tiếp Tục Mua Sắm
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING CHAT AI */}
      {currentView === 'store' && (
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '50%', width: '56px', height: '56px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(219, 39, 119, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      )}

      {isChatOpen && currentView === 'store' && (
        <div className="chat-widget" style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          <div style={{ backgroundColor: '#db2777', color: '#fff', padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🤖 Trợ Lý Tư Vấn Hoa AI</span>
            <button onClick={() => setIsChatOpen(false)} style={{ border: 'none', background: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          
          <div style={{ flexGrow: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? '#db2777' : '#f8fafc', color: msg.sender === 'user' ? '#fff' : '#1e293b', padding: '8px 12px', borderRadius: '12px', maxWidth: '85%', fontSize: '13px', lineHeight: '1.4' }}>
                {msg.sender === 'bot' ? (
                  <ReactMarkdown components={{ p: ({ node, ...props }) => <p style={{ margin: 0 }} {...props} /> }}>
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isTyping && <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontSize: '12px' }}>AI đang tìm câu trả lời...</div>}
          </div>

          <div style={{ padding: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px' }}>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Nhập câu hỏi..." 
              style={{ flexGrow: 1, border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', outline: 'none' }}
            />
            <button onClick={handleSendMessage} style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: '#fff', borderTop: '1px solid #f1f5f9', padding: '30px 15px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        <p style={{ margin: 0 }}>© 2026 BloomArt Flower Shop - Powered by Cloudflare Workers & Pages</p>
      </footer>
    </div>
  );
}