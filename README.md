# 🧠 ForgetMeNot - Smart Flashcard Application

Ứng dụng Flashcard thông minh sử dụng AI (Google Gemini) và thuật toán Spaced Repetition (SM-2) để tối ưu việc học tập.

## ✨ Tính năng

- 🤖 **AI Generation**: Tự động tạo flashcard từ PDF, Word, Text
- 🧠 **Spaced Repetition**: Thuật toán SM-2 giúp ghi nhớ tối ưu
- 🚨 **Cram Mode**: Chế độ ôn thi cấp tốc trước 7 ngày
- 📐 **KaTeX Support**: Hiển thị công thức toán học
- 🌙 **Dark/Light Theme**: Giao diện tối/sáng
- 📊 **Statistics**: Thống kê chi tiết tiến độ học tập
- 📱 **Responsive**: Hỗ trợ mobile, tablet, desktop

## 🛠 Công nghệ

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: MySQL
- **Auth**: JWT (Access + Refresh Tokens)
- **AI**: Google Gemini API
- **File Processing**: pdf-parse, mammoth

### Frontend
- **Core**: HTML5, CSS3, JavaScript (Vanilla)
- **Charts**: Chart.js
- **Math**: KaTeX
- **Icons**: Font Awesome 6

## 📦 Cài đặt

### Yêu cầu
- Node.js 18+
- MySQL 8.0+
- Google Gemini API Key (lấy tại https://makersuite.google.com/app/apikey)

### Backend

```bash
# Clone repository
git clone [repo-url] forgetmenot
cd forgetmenot/backend

# Cài đặt dependencies
npm install

# Tạo file .env từ .env.example
cp .env.example .env
# Sửa .env với thông tin của bạn (đặc biệt là DATABASE_URL và GEMINI_API_KEY)

# Tạo database MySQL
mysql -u root -p
CREATE DATABASE forgetmenot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

# Chạy migration Prisma
npx prisma generate
npx prisma db push

# Seed dữ liệu demo (tùy chọn)
npx prisma db seed

# Khởi động server
npm run dev