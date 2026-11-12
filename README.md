# Ví Nhỏ

Ứng dụng web quản lý chi tiêu cá nhân cho sinh viên. Giao diện tiếng Việt, tiền VND.

## Chạy trên Windows

1. Giải nén toàn bộ tệp ZIP. Mở thư mục Vi_Nho trong File Explorer.
2. Trong thư mục chứa index.html, bấm vào thanh địa chỉ, gõ powershell rồi nhấn Enter.
3. Chạy lệnh sau nếu máy có Python 3.

   `py -m http.server 8000 --bind 127.0.0.1`

4. Mở http://127.0.0.1:8000 trong Chrome hoặc Edge. Nhấn Ctrl+C trong terminal để dừng.

Trên macOS hoặc Linux, dùng `python3 -m http.server 8000 --bind 127.0.0.1`. Nếu chỉ mở index.html trực tiếp, việc lưu dữ liệu có thể khác nhau giữa các trình duyệt. Bản web trực tuyến dành cho chủ sở hữu ở https://vi-nho-fintech.lovablegait.chatgpt.site.

## Demo trên lớp

1. Mở Tổng quan. Dữ liệu mẫu của tháng hiện tại có 7 khoản chi với tổng chi 4.020.000 ₫.
2. Mục Ăn uống đã dùng 1.560.000 ₫ trên 1.800.000 ₫. Bấm Thêm khoản chi, chọn Ăn uống và nhập 300000.
3. Xem tổng chi lên 4.320.000 ₫ và ngân sách vượt 60.000 ₫.
4. Tải lại trang để kiểm tra khoản chi đã lưu. Mở Báo cáo để xem cơ cấu chi.
5. Để làm lại demo, chọn Chế độ demo rồi chọn Nạp lại dữ liệu mẫu. Thao tác này thay các khoản chi và hạn mức hiện tại bằng dữ liệu mẫu.

## Cấu trúc

- index.html dựng khung giao diện.
- style.css định dạng màn hình laptop và điện thoại.
- app.js xử lý các thao tác, hiển thị biểu đồ, đọc và ghi dữ liệu.
- model.js chứa quy tắc kiểm tra đầu vào, tính tổng và tính mức dùng ngân sách.
- model.test.js chứa kiểm thử logic. Nếu có Node.js, chạy `node --test model.test.js`.

Dữ liệu của người dùng lưu trong localStorage theo trình duyệt và địa chỉ web. Các trình duyệt, thiết bị và địa chỉ khác nhau có sổ riêng. Tổng chi tháng được tính từ các khoản chi mà người dùng đã ghi cho tháng đó.
