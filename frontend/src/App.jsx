import React, { useEffect, useState } from 'react';
import { ShoppingBag, Flower2, MessageSquare, Send, X, Search, Truck, Heart, CheckCircle, ShieldCheck, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = "https://flower-shop-backend.xuanthinhtoiday.workers.dev";

export default function App() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
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
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: '#fff5f7', minHeight: '100vh', color: '#334155' }}>
      
      {/* Top Banner Thông Báo */}
      <div style={{ backgroundColor: '#be185d', color: '#fff', padding: '8px 20px', fontSize: '13px', textAlign: 'center', fontWeight: '500' }}>
        🚀 Miễn phí vận chuyển cho đơn hàng từ 500.000đ | 🎁 Tặng kèm thiệp chúc mừng cao cấp
      </div>

      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(219, 39, 119, 0.05)', sticky: 'top', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#db2777', fontWeight: '800', fontSize: '24px', cursor: 'pointer' }}>
          <div style={{ backgroundColor: '#fce7f3', padding: '10px', borderRadius: '12px', display: 'flex' }}>
            <Flower2 size={26} color="#db2777" />
          </div>
          <span style={{ background: 'linear-gradient(45deg, #db2777, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BloomArt Flower</span>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 16px', borderRadius: '25px', border: '1px solid #f1f5f9', width: '320px' }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Tìm mẫu hoa, màu sắc..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '14px' }}
          />
        </div>

        {/* Cart Icon Button */}
        <button 
          onClick={() => setIsCartOpen(true)}
          style={{ position: 'relative', border: 'none', background: '#fce7f3', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#db2777', fontWeight: '600' }}
        >
          <ShoppingBag size={22} />
          <span>Giỏ hàng</span>
          {cart.length > 0 && (
            <span style={{ backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 8px', fontSize: '12px', fontWeight: 'bold' }}>
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Hero Banner Section */}
      <section style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', padding: '60px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <span style={{ backgroundColor: '#fff', color: '#db2777', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>
            🌸 BỘ SƯU TẬP HOA TƯƠI 2026
          </span>
          <h1 style={{ color: '#831843', fontSize: '42px', fontWeight: '800', margin: '20px 0 15px 0', lineHeight: '1.2' }}>
            Trao Gửi Cảm Xúc Qua Những Nhành Hoa Tươi 
          </h1>
          <p style={{ color: '#9d174d', fontSize: '16px', marginBottom: '30px' }}>
            Thiết kế độc đáo theo yêu cầu - Đặt hoa nhanh chóng chỉ trong 30 giây cùng Trợ Lý AI
          </p>
          <button 
            onClick={() => setIsChatOpen(true)}
            style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(219, 39, 119, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
          >
            <MessageSquare size={18} /> Tư Vấn Chọn Hoa Cùng AI
          </button>
        </div>
      </section>

      {/* Cam Kết Dịch Vụ */}
      <section style={{ maxWidth: '1100px', margin: '-30px auto 40px auto', backgroundColor: '#fff', borderRadius: '16px', padding: '20px 30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Truck color="#db2777" size={32} />
          <div>
            <h4 style={{ margin: 0, fontSize: '15px' }}>Giao Hàng Hoả Tốc</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>Giao tận nơi trong 2 giờ</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Heart color="#db2777" size={32} />
          <div>
            <h4 style={{ margin: 0, fontSize: '15px' }}>Hoa Tươi 100%</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>Tuyển chọn mới mỗi ngày</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <ShieldCheck color="#db2777" size={32} />
          <div>
            <h4 style={{ margin: 0, fontSize: '15px' }}>Đổi Trả Dễ Dàng</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>Cam kết hoa giống hình mẫu</p>
          </div>
        </div>
      </section>

      {/* Main Content Products */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px 60px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ fontSize: '24px', color: '#1e293b', margin: 0 }}>Danh Sách Bó Hoa Nổi Bật</h2>
          <span style={{ color: '#64748b', fontSize: '14px' }}>Hiển thị {filteredProducts.length} sản phẩm</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#db2777' }}>
            <p>Đang tải danh sách hoa tươi...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
            {filteredProducts.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9' }}>
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <img src={item.image_url || 'https://via.placeholder.com/300'} alt={item.name} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#db2777', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>Bán Chạy</span>
                </div>
                <div style={{ padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>{item.name}</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 15px 0', lineHeight: '1.5' }}>{item.description}</p>
                  </div>
                  <div>
                    <div style={{ color: '#db2777', fontWeight: '800', fontSize: '20px', marginBottom: '15px' }}>
                      {Number(item.price).toLocaleString('vi-VN')} đ
                    </div>
                    <button 
                      onClick={() => addToCart(item)}
                      style={{ width: '100%', backgroundColor: '#be185d', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background 0.2s' }}
                    >
                      + Thêm vào giỏ hàng
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Drawer Giỏ Hàng Slide-Out */}
      {isCartOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '380px', backgroundColor: '#fff', height: '100%', padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag color="#db2777" /> Giỏ Hàng Của Bạn
                </h3>
                <button onClick={() => setIsCartOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>

              {cart.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', margin: '40px 0' }}>Giỏ hàng đang trống 🌸</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                      <img src={item.image_url} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>{item.name}</h4>
                        <span style={{ fontSize: '13px', color: '#db2777', fontWeight: 'bold' }}>{Number(item.price).toLocaleString('vi-VN')} đ x {item.quantity}</span>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: 'bold', fontSize: '16px' }}>
                  <span>Tổng tiền:</span>
                  <span style={{ color: '#db2777' }}>{cartTotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <button onClick={() => alert("Chức năng đặt hàng đang kết nối cổng thanh toán!")} style={{ width: '100%', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Tiến Hành Đặt Hàng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Chat AI Button */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '50%', width: '60px', height: '60px', cursor: 'pointer', boxShadow: '0 8px 25px rgba(219, 39, 119, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
      >
        {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {/* Floating Chatbot AI Widget */}
      {isChatOpen && (
        <div style={{ position: 'fixed', bottom: '100px', right: '30px', width: '360px', height: '480px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000, border: '1px solid #f1f5f9' }}>
          <div style={{ backgroundColor: '#db2777', color: '#fff', padding: '15px 20px', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🤖 Trợ Lý Tư Vấn Hoa AI
          </div>
          
          <div style={{ flexGrow: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', 
                  backgroundColor: msg.sender === 'user' ? '#db2777' : '#f8fafc', 
                  color: msg.sender === 'user' ? '#fff' : '#1e293b', 
                  padding: '10px 14px', 
                  borderRadius: '14px', 
                  maxWidth: '85%', 
                  fontSize: '14px', 
                  lineHeight: '1.5',
                  boxShadow: msg.sender === 'bot' ? '0 2px 5px rgba(0,0,0,0.03)' : 'none'
                }}
              >
                {msg.sender === 'bot' ? (
                  <ReactMarkdown 
                    components={{
                      p: ({ node, ...props }) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: '5px 0', paddingLeft: '18px' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ marginBottom: '3px' }} {...props} />
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isTyping && <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontSize: '13px' }}>AI đang tìm bó hoa phù hợp...</div>}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Nhập câu hỏi (ví dụ: tìm hoa tặng mẹ)..." 
              style={{ flexGrow: 1, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', outline: 'none' }}
            />
            <button onClick={handleSendMessage} style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 15px', cursor: 'pointer' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: '#fff', borderTop: '1px solid #f1f5f9', padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
        <p style={{ margin: '0 0 10px 0' }}>© 2026 BloomArt Flower Shop - Chạy trên Cloudflare Workers & Pages</p>
        <p style={{ margin: 0, fontSize: '12px' }}>Tích hợp trí tuệ nhân tạo tư vấn tự động Gemini AI</p>
      </footer>
    </div>
  );
}