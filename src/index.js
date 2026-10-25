export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Xử lý CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. API Lấy danh sách sản phẩm
      if (url.pathname === "/api/products" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY id DESC").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 2. API Thêm sản phẩm mới (Admin)
      if (url.pathname === "/api/products" && request.method === "POST") {
        const body = await request.json();
        const { name, price, description, image_url } = body;
        
        await env.DB.prepare(
          "INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)"
        ).bind(name, price, description || '', image_url || '').run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 3. API Xóa sản phẩm (Admin)
      if (url.pathname.startsWith("/api/products/") && request.method === "DELETE") {
        const id = url.pathname.split("/")[3];
        await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 4. API Tạo đơn hàng mới
      if (url.pathname === "/api/orders" && request.method === "POST") {
        const body = await request.json();
        const { customer_name, customer_phone, delivery_address, card_message, total_price } = body;

        const res = await env.DB.prepare(
          "INSERT INTO orders (customer_name, customer_phone, delivery_address, card_message, total_price, status) VALUES (?, ?, ?, ?, ?, 'PENDING')"
        ).bind(customer_name, customer_phone, delivery_address, card_message || '', total_price).run();

        return new Response(JSON.stringify({ success: true, orderId: res.meta.last_row_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 5. API Tra cứu đơn hàng
      if (url.pathname === "/api/orders/track" && request.method === "GET") {
        const query = url.searchParams.get("query") || "";
        const { results } = await env.DB.prepare(
          "SELECT * FROM orders WHERE customer_phone LIKE ? OR id = ? ORDER BY id DESC"
        ).bind(`%${query}%`, query).all();

        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 6. API Admin Đăng nhập
      if (url.pathname === "/api/admin/login" && request.method === "POST") {
        const body = await request.json();
        if (body.password === "admin123") {
          return new Response(JSON.stringify({ success: true, token: "admin-authenticated-token" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, message: "Sai mật khẩu!" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 7. API Admin Lấy danh sách đơn hàng
      if (url.pathname === "/api/admin/orders" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY id DESC").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 8. API Admin Cập nhật trạng thái đơn hàng
      if (url.pathname === "/api/admin/orders/status" && request.method === "PUT") {
        const body = await request.json();
        const { order_id, status } = body;
        await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, order_id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 9. API AI Chatbot Gọi Gemini API Chuẩn
      if (url.pathname === "/api/chat" && request.method === "POST") {
        const body = await request.json();
        const userMsg = body.message || "";

        const { results: allProducts } = await env.DB.prepare("SELECT name, price, description FROM products").all();

        const prompt = `
Bạn là Trợ lý tư vấn bán hoa chuyên nghiệp của shop BloomArt.
Danh sách các mẫu hoa hiện có tại cửa hàng: ${JSON.stringify(allProducts)}

Câu hỏi của khách hàng: "${userMsg}"

Hãy trả lời thật lịch sự, tự nhiên, thân thiện và đưa ra lời tư vấn phù hợp nhất cho khách hàng.
`;

        try {
          const apiKey = env.GEMINI_API_KEY || "";
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          const geminiData = await geminiRes.json();
          const replyText = geminiData.candidates[0].content.parts[0].text;

          return new Response(JSON.stringify({ reply: replyText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });

        } catch (err) {
          return new Response(JSON.stringify({ 
            reply: `Cảm ơn bạn đã nhắn tin! Về yêu cầu "${userMsg}", bạn có thể tham khảo các mẫu hoa tươi tuyệt đẹp trên cửa hàng BloomArt nhé 🌸` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      return new Response("API BloomArt Running!", { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};