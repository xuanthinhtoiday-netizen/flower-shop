import React, { useEffect, useState } from 'react';
import { ShoppingBag, Flower2, MessageSquare, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = "https://flower-shop-backend.xuanthinhtoiday.workers.dev";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi lấy dữ liệu:", err);
        setLoading(false);
      });
  }, []);

  const addToCart = (product) => {
    setCart([...cart, product]);
    alert(`Đã thêm "${product.name}" vào giỏ hàng!`);
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
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#fdf2f8', minHeight: '100vh', paddingBottom: '40px', position: 'relative' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#db2777', fontWeight: 'bold', fontSize: '20px' }}>
          <Flower2 /> Flower Shop
        </div>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <ShoppingBag color="#db2777" size={28} />
          {cart.length > 0 && (
            <span style={{ position: 'absolute', top: '-5px', right: '-8px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '12px' }}>
              {cart.length}
            </span>
          )}
        </div>
      </header>

      {/* Banner */}
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h1 style={{ color: '#831843', fontSize: '32px', marginBottom: '10px' }}>Hoa Tươi Trao Gửi Yêu Thương 🌸</h1>
        <p style={{ color: '#9d174d' }}>Món quà hoàn hảo cho mọi dịp đặc biệt</p>
      </div>

      {/* Danh sách sản phẩm */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center' }}>Đang tải danh sách hoa...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
            {products.map((item) => (
              <div key={item.id} style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <img src={item.image_url || 'https://via.placeholder.com/300'} alt={item.name} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                <div style={{ padding: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1f2937' }}>{item.name}</h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 15px 0' }}>{item.description}</p>
                  </div>
                  <div>
                    <div style={{ color: '#db2777', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
                      {Number(item.price).toLocaleString('vi-VN')} đ
                    </div>
                    <button 
                      onClick={() => addToCart(item)}
                      style={{ width: '100%', backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Thêm vào giỏ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Nút Chat AI Nổi */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{ position: 'fixed', bottom: '25px', right: '25px', backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '50%', width: '60px', height: '60px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {/* Cửa sổ Chat AI */}
      {isChatOpen && (
        <div style={{ position: 'fixed', bottom: '95px', right: '25px', width: '360px', height: '460px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#db2777', color: '#fff', padding: '12px 15px', fontWeight: 'bold', fontSize: '15px' }}>
            🤖 Trợ Lý Tư Vấn Hoa AI
          </div>
          
          {/* Nội dung tin nhắn chat */}
          <div style={{ flexGrow: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', 
                  backgroundColor: msg.sender === 'user' ? '#db2777' : '#f3f4f6', 
                  color: msg.sender === 'user' ? '#fff' : '#1f2937', 
                  padding: '8px 14px', 
                  borderRadius: '12px', 
                  maxWidth: '85%', 
                  fontSize: '14px', 
                  wordBreak: 'break-word',
                  textAlign: 'left',
                  lineHeight: '1.5'
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
            {isTyping && <div style={{ alignSelf: 'flex-start', color: '#9ca3af', fontSize: '13px' }}>AI đang suy nghĩ...</div>}
          </div>

          {/* Ô nhập câu hỏi */}
          <div style={{ padding: '10px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Nhập câu hỏi (ví dụ: tư vấn hoa sinh nhật)..." 
              style={{ flexGrow: 1, border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
            />
            <button onClick={handleSendMessage} style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}