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

### 📖 User Guide

#### What is CronJobManager?
CronJobManager is a desktop application that helps you manage cron jobs (scheduled tasks) on your computer with an easy-to-use graphical interface.

#### Main Features
- ✅ **Create Cron Jobs**: Schedule tasks to run automatically
- ✅ **Edit Jobs**: Modify existing scheduled tasks
- ✅ **Delete Jobs**: Remove unwanted scheduled tasks
- ✅ **Visual Schedule Builder**: Easy-to-use interface for setting schedules
- ✅ **Job Monitoring**: Track job execution status and logs
- ✅ **Cross-platform**: Works on macOS, Windows, and Linux

#### How to Use

##### 1. Starting the Application
```bash
# After installation, run the app
npm run dev
```

##### 2. Creating a New Job
1. Click the **"Add New Job"** button
2. Fill in the job details:
   - **Job Name**: Give your job a descriptive name
   - **Command**: The command or script to execute
   - **Schedule**: Set when the job should run
3. Use the **Schedule Builder** to set timing:
   - **Every minute**: `* * * * *`
   - **Every hour**: `0 * * * *`
   - **Daily at 9 AM**: `0 9 * * *`
   - **Weekly on Monday**: `0 9 * * 1`
4. Click **"Save Job"**

##### 3. Managing Jobs
- **View Jobs**: See all your scheduled jobs in the main list
- **Edit Job**: Click on a job to modify its settings
- **Delete Job**: Remove jobs you no longer need
- **Run Job**: Test your job manually

##### 4. Monitoring Jobs
- **Status**: See if jobs are running, completed, or failed
- **Logs**: View detailed execution logs
- **History**: Track job execution history

#### Schedule Examples
```
# Every minute
* * * * *

# Every 5 minutes
*/5 * * * *

# Every hour
0 * * * *

# Every day at 2:30 AM
30 2 * * *

# Every Monday at 9 AM
0 9 * * 1

# Every month on the 1st at midnight
0 0 1 * *
```

#### Troubleshooting
- **Job not running**: Check if the command path is correct
- **Permission errors**: Ensure the app has necessary permissions
- **Schedule not working**: Verify cron expression format

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

### 📖 Hướng dẫn sử dụng

#### CronJobManager là gì?
CronJobManager là ứng dụng desktop giúp bạn quản lý các cron job (tác vụ được lên lịch) trên máy tính với giao diện đồ họa dễ sử dụng.

#### Tính năng chính
- ✅ **Tạo Cron Job**: Lên lịch các tác vụ chạy tự động
- ✅ **Chỉnh sửa Job**: Sửa đổi các tác vụ đã lên lịch
- ✅ **Xóa Job**: Loại bỏ các tác vụ không cần thiết
- ✅ **Schedule Builder**: Giao diện trực quan để thiết lập lịch trình
- ✅ **Giám sát Job**: Theo dõi trạng thái thực thi và logs
- ✅ **Đa nền tảng**: Hoạt động trên macOS, Windows, và Linux

#### Cách sử dụng

##### 1. Khởi động ứng dụng
```bash
# Sau khi cài đặt, chạy ứng dụng
npm run dev
```

##### 2. Tạo Job mới
1. Nhấn nút **"Add New Job"**
2. Điền thông tin job:
   - **Tên Job**: Đặt tên mô tả cho job
   - **Lệnh**: Lệnh hoặc script cần thực thi
   - **Lịch trình**: Thiết lập thời gian chạy job
3. Sử dụng **Schedule Builder** để thiết lập thời gian:
   - **Mỗi phút**: `* * * * *`
   - **Mỗi giờ**: `0 * * * *`
   - **Hàng ngày lúc 9h sáng**: `0 9 * * *`
   - **Hàng tuần thứ 2**: `0 9 * * 1`
4. Nhấn **"Save Job"**

##### 3. Quản lý Jobs
- **Xem Jobs**: Xem tất cả job đã lên lịch trong danh sách chính
- **Chỉnh sửa Job**: Nhấn vào job để sửa đổi cài đặt
- **Xóa Job**: Loại bỏ các job không cần thiết
- **Chạy Job**: Test job thủ công

##### 4. Giám sát Jobs
- **Trạng thái**: Xem job đang chạy, hoàn thành, hay thất bại
- **Logs**: Xem logs chi tiết quá trình thực thi
- **Lịch sử**: Theo dõi lịch sử thực thi job

#### Ví dụ lịch trình
```
# Mỗi phút
* * * * *

# Mỗi 5 phút
*/5 * * * *

# Mỗi giờ
0 * * * *

# Hàng ngày lúc 2:30 sáng
30 2 * * *

# Thứ 2 hàng tuần lúc 9h sáng
0 9 * * 1

# Ngày 1 hàng tháng lúc nửa đêm
0 0 1 * *
```

#### Xử lý sự cố
- **Job không chạy**: Kiểm tra đường dẫn lệnh có đúng không
- **Lỗi quyền**: Đảm bảo ứng dụng có quyền cần thiết
- **Lịch trình không hoạt động**: Kiểm tra định dạng cron expression

---

## 📝 License
MIT License

## 🤝 Contributing
Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📋 Changelog
See [CHANGELOG.md](CHANGELOG.md) for version history.
