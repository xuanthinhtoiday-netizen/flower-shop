export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. API Lấy danh sách sản phẩm (Bật Cache 60s)
    if (url.pathname === "/api/products" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY id DESC").all();
        return Response.json(results, { 
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=60" } 
        });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 2. API Thêm sản phẩm (Admin)
    if (url.pathname === "/api/products" && request.method === "POST") {
      try {
        const body = await request.json();
        const { category_id, name, description, price, image_url } = body;

        await env.DB.prepare(
          "INSERT INTO products (category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)"
        ).bind(category_id || 1, name, description, price, image_url).run();

        return Response.json({ message: "Thêm hoa thành công!" }, { status: 201, headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 3. API Xóa sản phẩm (Admin)
    if (url.pathname.startsWith("/api/products/") && request.method === "DELETE") {
      try {
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
        return Response.json({ message: "Xóa thành công!" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 4. API Tạo đơn hàng
    if (url.pathname === "/api/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        const { customer_name, customer_phone, delivery_address, card_message, total_price } = body;

        const info = await env.DB.prepare(
          "INSERT INTO orders (customer_name, customer_phone, address, delivery_address, card_message, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(customer_name, customer_phone, delivery_address, delivery_address, card_message || '', total_price, 'PENDING').run();

        return Response.json({ message: "Đặt hàng thành công!", orderId: info.meta.last_row_id }, { status: 201, headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 5. API Tra cứu đơn hàng dành cho Khách hàng (Nhập SĐT hoặc Mã đơn)
    if (url.pathname === "/api/orders/track" && request.method === "GET") {
      try {
        const q = url.searchParams.get("query");
        if (!q) return Response.json([], { headers: corsHeaders });

        const { results } = await env.DB.prepare(
          "SELECT id, customer_name, customer_phone, total_price, status, created_at FROM orders WHERE customer_phone = ? OR id = ? ORDER BY id DESC"
        ).bind(q, q).all();

        return Response.json(results, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 6. API Admin Login
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      try {
        const body = await request.json();
        const { password } = body;
        const secretPassword = env.ADMIN_PASSWORD || "admin123456";

        if (password === secretPassword) {
          return Response.json({ success: true, token: "admin-token" }, { headers: corsHeaders });
        }
        return Response.json({ success: false, message: "Mật khẩu Admin sai!" }, { status: 401, headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 7. API Admin Orders
    if (url.pathname === "/api/admin/orders" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY id DESC").all();
        return Response.json(results, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 8. API Admin Update Order Status
    if (url.pathname === "/api/admin/orders/status" && request.method === "PUT") {
      try {
        const body = await request.json();
        const { order_id, status } = body;
        await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, order_id).run();
        return Response.json({ message: "Cập nhật thành công!" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 8. API Chatbot AI (Tối ưu hóa phản hồi thông minh, tránh lặp lại)
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const userMessage = body.message || "";

        // Lấy danh sách hoa trong DB D1
        const { results: products } = await env.DB.prepare("SELECT name, price, description FROM products").all();
        const productListText = products.map(p => `- ${p.name}: ${p.price} VNĐ (${p.description})`).join("\n");

        const systemPrompt = `Bạn là tư vấn viên thân thiện của shop hoa tươi BloomArt. Cửa hàng đang bán các mẫu hoa sau:\n${productListText}\n\nHãy tư vấn ngắn gọn, lịch sự, đúng trọng tâm câu hỏi của khách.`;

        const GEMINI_API_KEY = env.GEMINI_API_KEY;

        if (GEMINI_API_KEY) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
              },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nKhách hàng hỏi: ${userMessage}` }] }]
              })
            });

            const data = await res.json();

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
              const replyText = data.candidates[0].content.parts[0].text;
              return Response.json({ reply: replyText }, { headers: corsHeaders });
            }
          } catch (e) {
            console.error("Gemini API direct error:", e);
          }
        }

        // Xử lý Phản Hồi Thông Minh theo Từ Khóa (Tránh bị lặp lại một câu cứng nhắc)
        const msg = userMessage.toLowerCase();
        let fallbackReply = "";

        if (msg.includes("xin chào") || msg.includes("chào") || msg.includes("hi") || msg.includes("hello")) {
          fallbackReply = "Dạ BloomArt xin chào bạn! Hôm nay bạn cần tư vấn chọn hoa tươi cho dịp gì ạ (sinh nhật, tặng người yêu, hay kỷ niệm)? 🌸";
        } else if (msg.includes("giá") || msg.includes("bao nhiêu") || msg.includes("rẻ")) {
          fallbackReply = "Shop có các mẫu hoa từ 350.000đ đến 850.000đ ạ. Bạn có thể bấm vào mục '🏷️ Tiết Kiệm (≤ 500k)' ở trên để xem các mẫu vừa túi tiền nhé!";
        } else if (msg.includes("mẹ") || msg.includes("sinh nhật") || msg.includes("tặng")) {
          fallbackReply = "Cho dịp đặc biệt này, BloomArt gợi ý bạn mẫu **Bó Hoa Hướng Dương Rạng Rỡ** (350k) hoặc **Bó Hoa Cầm Tay Cầu Vồng** rất sang trọng và ý nghĩa ạ!";
        } else if (msg.includes("yêu") || msg.includes("bạn gái") || msg.includes("hồng")) {
          fallbackReply = "Tặng người yêu thì chuẩn nhất là **Bó Hoa Hồng Đỏ Tình Yêu** (99 bông tượng trưng cho tình yêu vĩnh cửu) hoặc **Bó Hoa Cầm Tay Cầu Vồng** ngọt ngào bạn nha! ❤️";
        } else {
          const sampleProducts = products.slice(0, 3).map(p => `• **${p.name}** (${Number(p.price).toLocaleString('vi-VN')} đ)`).join("\n");
          fallbackReply = `Dạ shop có sẵn nhiều mẫu hoa đẹp lắm ạ! Bạn xem thử một số mẫu nổi bật này nhé:\n\n${sampleProducts}\n\nBạn cần ship hoa đến khu vực nào ạ?`;
        }

        return Response.json({ reply: fallbackReply }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ reply: "Dạ BloomArt nhận được thông tin rồi ạ, bạn cần tư vấn thêm mẫu hoa nào nhắn shop nhé! 🌸" }, { status: 500, headers: corsHeaders });
      }
    }
    return new Response("API Flower Shop OK!", { status: 200, headers: corsHeaders });
  },
};