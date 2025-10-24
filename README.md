# CronJobManager

Electron app for managing cron jobs with a modern UI.

## 🌐 Languages / Ngôn ngữ
- [English](#english) | [Tiếng Việt](#tiếng-việt)

---

## English

### 🚀 Quick Start

#### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

#### Installation
```bash
# Clone the repository
git clone https://github.com/ngocthuan1989/CronJobManager.git
cd CronJobManager

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Build for Production
```bash
# Build the app
npm run build

# Package for distribution
npm run dist
```

### 📁 Project Structure
- `src/` - React frontend source code
- `main/` - Electron main process
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration

### 🛠️ Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run dist` - Package the app
- `npm run lint` - Run linter

### 📤 How to Push Your Project to GitHub

#### Prerequisites
- GitHub account
- Git installed on your machine
- Completed project

#### Step 1: Create GitHub Repository
1. Go to [github.com](https://github.com) and sign in
2. Click **"New"** button (green) in top right
3. Fill repository information:
   - **Repository name**: `YourProjectName`
   - **Description**: Brief project description
   - **Visibility**: Public or Private
4. **⚠️ IMPORTANT**: Do NOT check:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
5. Click **"Create repository"**

#### Step 2: Setup Local Git
```bash
# Navigate to your project
cd /path/to/your/project

# Create .gitignore file
echo "node_modules/
dist/
build/
.DS_Store
*.log
*.db" > .gitignore

# Initialize Git
git init
git add .
git commit -m "Initial commit: Your Project Name"
```

#### Step 3: Create Personal Access Token
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Fill information:
   - **Note**: `ProjectName-Token`
   - **Expiration**: Choose duration
   - **Select scopes**: Check **repo**
4. Click **"Generate token"**
5. **Copy the token** (only shown once!)

#### Step 4: Push to GitHub
```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Rename branch to main
git branch -M main

# Push code
git push -u origin main
```

When prompted:
- **Username**: `YOUR_GITHUB_USERNAME`
- **Password**: `PERSONAL_ACCESS_TOKEN`

#### Troubleshooting
- **Repository has files**: `git pull origin main --allow-unrelated-histories`
- **Authentication failed**: Update URL with token
- **Permission denied**: Check token permissions

---

## Tiếng Việt

### 🚀 Hướng dẫn nhanh

#### Yêu cầu hệ thống
- Node.js (v16 trở lên)
- npm hoặc yarn

#### Cài đặt
```bash
# Clone repository
git clone https://github.com/ngocthuan1989/CronJobManager.git
cd CronJobManager

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

#### Build cho Production
```bash
# Build ứng dụng
npm run build

# Tạo package phân phối
npm run dist
```

### 📁 Cấu trúc dự án
- `src/` - Mã nguồn React frontend
- `main/` - Electron main process
- `package.json` - Dependencies và scripts
- `vite.config.ts` - Cấu hình build

### 🛠️ Scripts có sẵn
- `npm run dev` - Chạy development server
- `npm run build` - Build cho production
- `npm run dist` - Tạo package
- `npm run lint` - Chạy linter

### 📤 Cách đẩy dự án lên GitHub

#### Chuẩn bị
- Tài khoản GitHub
- Git đã cài đặt trên máy
- Dự án đã hoàn thiện

#### Bước 1: Tạo Repository trên GitHub
1. Truy cập [github.com](https://github.com) và đăng nhập
2. Nhấn nút **"New"** (màu xanh lá) ở góc trên bên phải
3. Điền thông tin repository:
   - **Repository name**: `TênDựAn`
   - **Description**: Mô tả ngắn gọn về dự án
   - **Visibility**: Public hoặc Private
4. **⚠️ QUAN TRỌNG**: KHÔNG tích vào:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
5. Nhấn **"Create repository"**

#### Bước 2: Thiết lập Git Local
```bash
# Di chuyển đến thư mục dự án
cd /đường/dẫn/đến/dự/án

# Tạo file .gitignore
echo "node_modules/
dist/
build/
.DS_Store
*.log
*.db" > .gitignore

# Khởi tạo Git
git init
git add .
git commit -m "Initial commit: Tên Dự Án"
```

#### Bước 3: Tạo Personal Access Token
1. Truy cập [github.com/settings/tokens](https://github.com/settings/tokens)
2. Nhấn **"Generate new token"** → **"Generate new token (classic)"**
3. Điền thông tin:
   - **Note**: `TênDựAn-Token`
   - **Expiration**: Chọn thời hạn
   - **Select scopes**: Tích vào **repo**
4. Nhấn **"Generate token"**
5. **Sao chép token** (chỉ hiển thị 1 lần!)

#### Bước 4: Push lên GitHub
```bash
# Thêm remote repository
git remote add origin https://github.com/TEN_USERNAME/TEN_REPOSITORY.git

# Đổi tên branch thành main
git branch -M main

# Push code
git push -u origin main
```

Khi được hỏi:
- **Username**: `TEN_USERNAME_GITHUB`
- **Password**: `PERSONAL_ACCESS_TOKEN`

#### Xử lý lỗi
- **Repository đã có file**: `git pull origin main --allow-unrelated-histories`
- **Authentication failed**: Cập nhật URL với token
- **Permission denied**: Kiểm tra quyền token

---

## 📝 License
MIT License

## 🤝 Contributing
Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📋 Changelog
See [CHANGELOG.md](CHANGELOG.md) for version history.
