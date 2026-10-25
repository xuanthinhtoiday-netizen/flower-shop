INSERT INTO categories (id, name, slug) VALUES 
(1, 'Hoa Sinh Nhật', 'hoa-sinh-nhat'),
(2, 'Hoa Cưới', 'hoa-cuoi'),
(3, 'Hoa Khai Trương', 'hoa-khai-truong');

INSERT INTO products (category_id, name, description, price, image_url) VALUES
(1, 'Bó Hoa Hướng Dương Rạng Rỡ', 'Hoa hướng dương phối cùng hoa baby trắng tươi tắn.', 350000, 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd'),
(1, 'Bó Hoa Hồng Đỏ Tình Yêu', '99 bông hồng đỏ thắm tượng trưng cho tình yêu vĩnh cửu.', 850000, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23'),
(2, 'Bó Hoa Cầm Tay Cầu Vồng', 'Hoa tulip phối nhiều màu sắc nhẹ nhàng sang trọng.', 500000, 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9');