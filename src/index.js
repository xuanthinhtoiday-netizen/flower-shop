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

    // 5. API Tra cứu đơn hàng dành cho Khách hàng
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

           // 9. API Chatbot AI qua Cloudflare Workers AI (không cần API key)
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const userMessage = (body.message || "").slice(0, 500);

        const { results: products } = await env.DB.prepare(
          "SELECT name, price, description FROM products"
        ).all();
        const productListText = products
          .map(p => `- ${p.name}: ${Number(p.price).toLocaleString('vi-VN')} đ (${p.description})`)
          .join("\n");

        const systemPrompt = `Bạn là trợ lý tư vấn hoa tươi thân thiện của shop BloomArt. Luôn trả lời bằng tiếng Việt. Các mẫu hoa hiện có:\n${productListText}\nHãy trả lời ngắn gọn, tự nhiên, lịch sự, chỉ tư vấn các mẫu hoa có trong danh sách trên và luôn kết thúc bằng một câu hỏi gợi mở.`;

        if (!env.AI) {
          return Response.json(
            { reply: "⚠️ Chưa cấu hình binding AI (Workers AI) cho Worker!" },
            { headers: corsHeaders }
          );
        }

        const MODELS = [
          "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          "@cf/google/gemma-4-26b-a4b-it",
          "@cf/meta/llama-3.2-3b-instruct"
        ];

        let replyText = null;
        let lastError = "";

        for (const model of MODELS) {
          try {
            const aiRes = await env.AI.run(model, {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
              ],
              max_tokens: 500
            });
            // Mỗi model có thể trả về định dạng khác nhau, nên đọc cả hai kiểu
            replyText = aiRes?.response ?? aiRes?.choices?.[0]?.message?.content;
            if (replyText) break;
          } catch (e) {
            lastError = `${model}: ${e.message}`;
          }
        }

        if (replyText) {
          return Response.json({ reply: replyText }, { headers: corsHeaders });
        }
        return Response.json(
          { reply: `⚠️ Tất cả model AI đều lỗi. Chi tiết: ${lastError}` },
          { headers: corsHeaders }
        );

      } catch (error) {
        return Response.json({ reply: `⚠️ Lỗi hệ thống: ${error.message}` }, { headers: corsHeaders });
      }
    }

    return new Response("API Flower Shop OK!", { status: 200, headers: corsHeaders });
  },
};