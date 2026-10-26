const enc = new TextEncoder();

// So sánh chuỗi an toàn (không lộ thông tin qua thời gian xử lý)
function safeEqual(a, b) {
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Token dạng "thời-điểm-hết-hạn.chữ-ký", hiệu lực 12 giờ
async function createToken(env) {
  const exp = String(Date.now() + 12 * 60 * 60 * 1000);
  return `${exp}.${await hmac(env.ADMIN_PASSWORD, exp)}`;
}

async function verifyToken(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.ADMIN_PASSWORD, exp));
}

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

    const unauthorized = () =>
      Response.json(
        { error: "Chưa đăng nhập hoặc phiên đã hết hạn" },
        { status: 401, headers: corsHeaders }
      );

    // 1. Lấy danh sách sản phẩm (cache 60s)
    if (url.pathname === "/api/products" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY id DESC").all();
        return Response.json(results, {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=60" },
        });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 2. Thêm sản phẩm (Admin)
    if (url.pathname === "/api/products" && request.method === "POST") {
      if (!(await verifyToken(request, env))) return unauthorized();
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

    // 3. Xóa sản phẩm (Admin)
    if (url.pathname.startsWith("/api/products/") && request.method === "DELETE") {
      if (!(await verifyToken(request, env))) return unauthorized();
      try {
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
        return Response.json({ message: "Xóa thành công!" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 4. Tạo đơn hàng
    if (url.pathname === "/api/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        const { customer_name, customer_phone, delivery_address, card_message, total_price } = body;

        const info = await env.DB.prepare(
          "INSERT INTO orders (customer_name, customer_phone, address, delivery_address, card_message, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(customer_name, customer_phone, delivery_address, delivery_address, card_message || "", total_price, "PENDING").run();

        return Response.json(
          { message: "Đặt hàng thành công!", orderId: info.meta.last_row_id },
          { status: 201, headers: corsHeaders }
        );
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 5. Tra cứu đơn hàng dành cho khách
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

    // 6. Admin đăng nhập
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      try {
        if (!env.ADMIN_PASSWORD) {
          return Response.json(
            { success: false, message: "Máy chủ chưa cấu hình ADMIN_PASSWORD trên Cloudflare." },
            { status: 500, headers: corsHeaders }
          );
        }
        const body = await request.json();
        if (safeEqual(body.password || "", env.ADMIN_PASSWORD)) {
          return Response.json(
            { success: true, token: await createToken(env) },
            { headers: corsHeaders }
          );
        }
        return Response.json(
          { success: false, message: "Mật khẩu Admin sai!" },
          { status: 401, headers: corsHeaders }
        );
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 7. Admin xem đơn hàng
    if (url.pathname === "/api/admin/orders" && request.method === "GET") {
      if (!(await verifyToken(request, env))) return unauthorized();
      try {
        const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY id DESC").all();
        return Response.json(results, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 8. Admin cập nhật trạng thái đơn
    if (url.pathname === "/api/admin/orders/status" && request.method === "PUT") {
      if (!(await verifyToken(request, env))) return unauthorized();
      try {
        const body = await request.json();
        const { order_id, status } = body;
        await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, order_id).run();
        return Response.json({ message: "Cập nhật thành công!" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 9. Chatbot AI qua Cloudflare Workers AI
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const userMessage = (body.message || "").slice(0, 500);

        const { results: products } = await env.DB.prepare(
          "SELECT name, price, description FROM products"
        ).all();
        const productListText = products
          .map((p) => `- ${p.name}: ${Number(p.price).toLocaleString("vi-VN")} đ (${p.description})`)
          .join("\n");

        const systemPrompt = `Bạn là trợ lý tư vấn hoa tươi thân thiện của shop BloomArt. Luôn trả lời bằng tiếng Việt. Các mẫu hoa hiện có:\n${productListText}\nHãy trả lời ngắn gọn, tự nhiên, lịch sự, chỉ tư vấn các mẫu hoa có trong danh sách trên, ghi đúng giá như trong danh sách (không tự làm tròn hay bịa giá) và luôn kết thúc bằng một câu hỏi gợi mở.`;

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
          "@cf/meta/llama-3.2-3b-instruct",
        ];

        let replyText = null;
        let lastError = "";

        for (const model of MODELS) {
          try {
            const aiRes = await env.AI.run(model, {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
              max_tokens: 500,
            });
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

    // 10. Lấy danh sách video (công khai)
    if (url.pathname === "/api/videos" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM videos ORDER BY id DESC").all();
        return Response.json(results, {
          headers: { ...corsHeaders, "Cache-Control": "no-cache" },
        });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 11. Thêm video (Admin)
    if (url.pathname === "/api/videos" && request.method === "POST") {
      if (!(await verifyToken(request, env))) return unauthorized();
      try {
        const body = await request.json();
        const title = String(body.title || "").trim().slice(0, 120);
        const caption = String(body.caption || "").trim().slice(0, 200);
        const youtube_id = body.youtube_id ? String(body.youtube_id).trim() : null;
        const video_url = body.video_url ? String(body.video_url).trim() : null;
        const poster_url = body.poster_url ? String(body.poster_url).trim() : null;
        const ratio = body.ratio === "9 / 16" ? "9 / 16" : "16 / 9";

        const bad = (message) =>
          Response.json({ error: message }, { status: 400, headers: corsHeaders });

        if (!title) return bad("Thiếu tiêu đề video");
        if (!youtube_id && !video_url) return bad("Cần link YouTube hoặc link file mp4");
        if (youtube_id && !/^[\w-]{11}$/.test(youtube_id)) return bad("Mã video YouTube không hợp lệ");
        if (video_url && !/^https:\/\//i.test(video_url)) return bad("Link video phải bắt đầu bằng https://");
        if (poster_url && !/^https:\/\//i.test(poster_url)) return bad("Link ảnh bìa phải bắt đầu bằng https://");

        const info = await env.DB.prepare(
          "INSERT INTO videos (title, caption, youtube_id, video_url, poster_url, ratio) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(title, caption, youtube_id, video_url, poster_url, ratio).run();

        return Response.json(
          { message: "Thêm video thành công!", id: info.meta.last_row_id },
          { status: 201, headers: corsHeaders }
        );
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 12. Xóa video (Admin)
    if (url.pathname.startsWith("/api/videos/") && request.method === "DELETE") {
      if (!(await verifyToken(request, env))) return unauthorized();
      try {
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(id).run();
        return Response.json({ message: "Đã xóa video!" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    return new Response("API Flower Shop OK!", { status: 200, headers: corsHeaders });
  },
};