# Hướng dẫn áp dụng fix "1 Job = 1 Plist File"

## ✅ CODE ĐÃ SỬA XONG!

Logic mới đã được implement và test thành công.

## 🔧 CÁC FILES ĐÃ THAY ĐỔI:

1. **main/main.ts**:
   - Sửa `createLaunchdPlist()`: Tạo 1 file thay vì nhiều files
   - Sửa `objectToPlist()`: Hỗ trợ array of StartCalendarInterval

2. **Build completed**: `dist/main.js` đã được update

## 📋 CÁCH ÁP DỤNG:

### Option 1: Development Mode (KHUYẾN NGHỊ cho test)

```bash
# 1. Dọn dẹp old plist files
for file in ~/Library/LaunchAgents/com.cronjobmanager.*.plist; do
  launchctl unload "$file" 2>/dev/null
  rm "$file"
done

# 2. Start app
cd /Users/buithuan/DULIEU/Congviec/Python/CronJobManager
npm start
```

### Option 2: Production App

```bash
# 1. Dọn dẹp old plist files
for file in ~/Library/LaunchAgents/com.cronjobmanager.*.plist; do
  launchctl unload "$file" 2>/dev/null
  rm "$file"
done

# 2. Build production app
npm run build
npm run dist  # Build .app file

# 3. Mở app từ Applications hoặc:
open -a "Cron Job Manager"
```

### Option 3: Quick Apply (MỞ APP THỦ CÔNG)

```bash
# 1. Dọn dẹp old plist files
for file in ~/Library/LaunchAgents/com.cronjobmanager.*.plist; do
  launchctl unload "$file" 2>/dev/null
  rm "$file"
done

# 2. Mở app từ GUI (Spotlight hoặc Applications)
# 3. App sẽ tự động tạo plist files mới
```

## ✅ VERIFY THÀNH CÔNG:

Sau khi mở app, chạy:

```bash
# Kiểm tra số lượng plist files
ls ~/Library/LaunchAgents/com.cronjobmanager.*.plist | wc -l
# → Nên bằng số lượng jobs enabled (KHÔNG PHẢI x5 nữa!)

# Xem structure của 1 file
plutil -p ~/Library/LaunchAgents/com.cronjobmanager.*.plist | grep -A30 "StartCalendarInterval"
# → Nên thấy <array> chứa nhiều <dict> (không phải 1 dict duy nhất)
```

## 🎯 KẾT QUẢ MONG ĐỢI:

**TRƯỚC:**
- 2 jobs với schedule thứ 2-6 = 10 plist files (2 x 5)

**SAU:**
- 2 jobs với schedule thứ 2-6 = 2 plist files (1 cho mỗi job) ✅

## ⚠️ LƯU Ý:

- Mỗi lần toggle job ON/OFF, app sẽ tự động tạo lại plist file
- Không cần làm gì thêm, chỉ cần mở app là xong!

