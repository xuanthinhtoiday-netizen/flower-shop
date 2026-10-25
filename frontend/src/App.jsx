import React, { useEffect, useState } from 'react';
import { ShoppingBag, Flower2, MessageSquare, Send, X, Search, Truck, Heart, ShieldCheck, Trash2, Plus, Minus, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = "https://flower-shop-backend.xuanthinhtoiday.workers.dev";

export default function App() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Form Đặt hàng State
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'form' | 'success'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [orderSuccessId, setOrderSuccessId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Chatbot AI
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Xin chào! Bạn cần tư vấn chọn hoa cho dịp nào ạ? 🌸' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setFilteredProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi lấy dữ liệu:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = products;
    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredProducts(result);
  }, [searchTerm, products]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress) {
      alert("Vui lòng điền đầy đủ Tên, SĐT và Địa chỉ giao hoa!");
      return;
    }

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
          total_price: cartTotal,
          items: cart
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOrderSuccessId(data.orderId);
        setCheckoutStep('success');
        setCart([]);
      } else {
        alert(`Đặt hàng thất bại: ${data.error}`);
      }
    } catch (error) {
      alert("Có lỗi kết nối khi đặt hàng!");
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
    } catch (error) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Có lỗi kết nối với AI, bạn thử lại sau nhé.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif", backgroundColor: '#fff5f7', minHeight: '100vh', color: '#334155' }}>
      
      <style>{`
        .header-container { display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 12px 20px; gap: 15px; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 200px; max-width: 360px; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .chat-widget { position: fixed; bottom: 90px; right: 20px; width: 360px; height: 500px; max-width: calc(100vw - 40px); max-height: calc(100vh - 120px); z-index: 1000; }
        .cart-drawer { width: 400px; max-width: 100vw; }
        @media (max-width: 640px) {
          .header-container { padding: 10px 15px; }
          .search-box { order: 3; width: 100%; max-width: 100%; min-width: 100%; }
          .chat-widget { bottom: 0; right: 0; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; border-radius: 0 !important; }
        }
      `}</style>

      {/* Top Banner */}
      <div style={{ backgroundColor: '#be185d', color: '#fff', padding: '6px 12px', fontSize: '12px', textAlign: 'center', fontWeight: '500' }}>
        🚀 Miễn phí giao hoa từ 500k | 🎁 Tặng thiệp chúc mừng cao cấp
      </div>

      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(219, 39, 119, 0.05)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#db2777', fontWeight: '800', fontSize: '20px' }}>
            <div style={{ backgroundColor: '#fce7f3', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Flower2 size={22} color="#db2777" />
            </div>
            <span style={{ background: 'linear-gradient(45deg, #db2777, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BloomArt</span>
          </div>

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
        </div>
      </header>

      {/* Hero Banner */}
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
            <MessageSquare size={16} /> Tư Vấn Hoa AI
          </button>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 15px 50px 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, fontWeight: '700' }}>Mẫu Hoa Nổi Bật</h2>
          <span style={{ color: '#64748b', fontSize: '13px' }}>{filteredProducts.length} sản phẩm</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#db2777' }}>
            <p>Đang tải danh sách hoa tươi...</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9' }}>
                <div style={{ position: 'relative' }}>
                  <img src={item.image_url || 'https://via.placeholder.com/300'} alt={item.name} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
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

      {/* Drawer Giỏ Hàng Nâng Cấp */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="cart-drawer" style={{ backgroundColor: '#fff', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)' }}>
            
            {/* Step 1: Xem Giỏ Hàng */}
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
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: '40px 0', fontSize: '14px' }}>Giỏ hàng chưa có sản phẩm nào 🌸</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto' }}>
                      {cart.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                          <img src={item.image_url} alt={item.name} style={{ width: '55px', height: '55px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div style={{ flexGrow: 1 }}>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px' }}>{item.name}</h4>
                            <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold' }}>{Number(item.price).toLocaleString('vi-VN')} đ</span>
                          </div>
                          
                          {/* Bộ tăng giảm số lượng */}
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

            {/* Step 2: Form Nhập Thông Tin Đặt Hàng */}
            {checkoutStep === 'form' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>📝 Thông Tin Giao Hoa</h3>
                  <button onClick={() => setCheckoutStep('cart')} style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>Quay lại</button>
                </div>

                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Họ và tên người nhận *</label>
                    <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nhập tên..." style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Số điện thoại *</label>
                    <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Nhập SĐT..." style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Địa chỉ giao hoa *</label>
                    <textarea required value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Nhập địa chỉ nhận hoa..." style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '13px', height: '60px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Lời chúc viết trên thiệp (Tùy chọn)</label>
                    <textarea value={cardMessage} onChange={e => setCardMessage(e.target.value)} placeholder="Nhập lời chúc muốn gửi..." style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '13px', height: '60px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                      <span>Tổng thanh toán:</span>
                      <span style={{ color: '#db2777' }}>{cartTotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <button type="submit" disabled={isSubmitting} style={{ width: '100%', backgroundColor: '#be185d', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                      {isSubmitting ? 'Đang gửi đơn hàng...' : 'Xác Nhận Đặt Hàng'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Đặt Hàng Thành Công */}
            {checkoutStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <CheckCircle2 color="#22c55e" size={60} style={{ margin: '0 auto 15px auto' }} />
                <h3 style={{ color: '#0f172a', margin: '0 0 10px 0' }}>Đặt Hàng Thành Công!</h3>
                <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5' }}>
                  Cảm ơn bạn đã tin tưởng BloomArt. Mã đơn hàng của bạn là <strong>#{orderSuccessId}</strong>. Shop sẽ liên hệ xác nhận đơn qua SĐT sớm nhất!
                </p>
                <button onClick={() => setIsCartOpen(false)} style={{ marginTop: '20px', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  Tiếp Tục Mua Sắm
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Floating Chat AI Nút Bật */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '50%', width: '56px', height: '56px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(219, 39, 119, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
      >
        {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chatbot AI Widget */}
      {isChatOpen && (
        <div className="chat-widget" style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          <div style={{ backgroundColor: '#db2777', color: '#fff', padding: '12px 16px', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🤖 Trợ Lý Tư Vấn Hoa AI</span>
            <button onClick={() => setIsChatOpen(false)} style={{ border: 'none', background: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          
          <div style={{ flexGrow: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', 
                  backgroundColor: msg.sender === 'user' ? '#db2777' : '#f8fafc', 
                  color: msg.sender === 'user' ? '#fff' : '#1e293b', 
                  padding: '8px 12px', 
                  borderRadius: '12px', 
                  maxWidth: '85%', 
                  fontSize: '13px', 
                  lineHeight: '1.4'
                }}
              >
                {msg.sender === 'bot' ? (
                  <ReactMarkdown 
                    components={{
                      p: ({ node, ...props }) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: '4px 0', paddingLeft: '16px' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ marginBottom: '2px' }} {...props} />
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isTyping && <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontSize: '12px' }}>AI đang tìm bó hoa...</div>}
          </div>

          <div style={{ padding: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px' }}>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Nhập câu hỏi (vd: hoa tặng mẹ)..." 
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
        <p style={{ margin: '0 0 5px 0' }}>© 2026 BloomArt Flower Shop - Powered by Cloudflare Workers & Pages</p>
        <p style={{ margin: 0, fontSize: '11px' }}>Tích hợp trí tuệ nhân tạo Gemini AI</p>
      </footer>
    </div>
  );
}