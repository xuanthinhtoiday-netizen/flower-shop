import React, { useEffect, useState } from 'react';
import { ShoppingBag, Flower2, MessageSquare, Send, X, Search, Truck, Heart, ShieldCheck, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = "https://flower-shop-backend.xuanthinhtoiday.workers.dev";

export default function App() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  // Lọc sản phẩm theo từ khóa
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

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

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
      
      {/* CSS Responsive Styles Injection */}
      <style>{`
        .header-container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          gap: 15px;
          flex-wrap: wrap;
        }
        .search-box {
          flex: 1;
          min-width: 200px;
          max-width: 360px;
        }
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .chat-widget {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 360px;
          height: 500px;
          max-width: calc(100vw - 40px);
          max-height: calc(100vh - 120px);
          z-index: 1000;
        }
        .cart-drawer {
          width: 380px;
          max-width: 100vw;
        }
        @media (max-width: 640px) {
          .header-container {
            padding: 10px 15px;
          }
          .search-box {
            order: 3;
            width: 100%;
            max-width: 100%;
            min-width: 100%;
          }
          .chat-widget {
            bottom: 0;
            right: 0;
            width: 100vw;
            height: 100vh;
            max-width: 100vw;
            max-height: 100vh;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Top Banner */}
      <div style={{ backgroundColor: '#be185d', color: '#fff', padding: '6px 12px', fontSize: '12px', textAlign: 'center', fontWeight: '500' }}>
        🚀 Miễn phí giao hoa từ 500k | 🎁 Tặng thiệp chúc mừng cao cấp
      </div>

      {/* Header Responsive */}
      <header style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(219, 39, 119, 0.05)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#db2777', fontWeight: '800', fontSize: '20px' }}>
            <div style={{ backgroundColor: '#fce7f3', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Flower2 size={22} color="#db2777" />
            </div>
            <span style={{ background: 'linear-gradient(45deg, #db2777, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BloomArt</span>
          </div>

          {/* Search Box */}
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

          {/* Cart Button */}
          <button 
            onClick={() => setIsCartOpen(true)}
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

      {/* Hero Banner Responsive */}
      <section style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', padding: '40px 15px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ backgroundColor: '#fff', color: '#db2777', padding: '4px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
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

      {/* Cam Kết Dịch Vụ */}
      <section style={{ maxWidth: '1100px', margin: '-20px 15px 30px 15px', backgroundColor: '#fff', borderRadius: '14px', padding: '15px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Truck color="#db2777" size={24} />
          <div>
            <h4 style={{ margin: 0, fontSize: '13px' }}>Giao Hàng Hoả Tốc</h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Nhận hoa sau 2 tiếng</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Heart color="#db2777" size={24} />
          <div>
            <h4 style={{ margin: 0, fontSize: '13px' }}>Hoa Tươi Tự Nhiên</h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Tuyển chọn mỗi ngày</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck color="#db2777" size={24} />
          <div>
            <h4 style={{ margin: 0, fontSize: '13px' }}>Đảm Bảo Chất Lượng</h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Đổi trả nếu không hài lòng</p>
          </div>
        </div>
      </section>

      {/* Main Product Section */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 15px 50px 15px' }}>
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
                  <span style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#db2777', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>Bán Chạy</span>
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

      {/* Drawer Giỏ Hàng Responsive */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="cart-drawer" style={{ backgroundColor: '#fff', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                  <ShoppingBag color="#db2777" size={20} /> Giỏ Hàng Của Bạn
                </h3>
                <button onClick={() => setIsCartOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>

              {cart.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', margin: '30px 0', fontSize: '14px' }}>Giỏ hàng chưa có sản phẩm 🌸</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                      <img src={item.image_url} alt={item.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '13px' }}>{item.name}</h4>
                        <span style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold' }}>{Number(item.price).toLocaleString('vi-VN')} đ x {item.quantity}</span>
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
                <button onClick={() => alert("Chức năng đặt hàng đang kết nối cổng thanh toán!")} style={{ width: '100%', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                  Thanh Toán
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

      {/* Chatbot AI Widget Responsive */}
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