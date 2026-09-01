#!/bin/sh
# Đổ bản build FE vào thư mục tĩnh mà nginx đang phục vụ.
#
# Đây là ENTRYPOINT của ảnh phát hành frontend, chạy một lần rồi thoát:
#
#   docker run --rm -v hanora-api_frontend-dist:/target \
#     ghcr.io/quocnguyen2001/hanora-app:0.1.0
#
# `/srv/build` do ảnh mang theo. `/target` là volume `frontend-dist` mà nginx
# của stack `hanora-api` mount (mount ĐỌC-GHI ở đây, còn nginx mount `:ro`).
set -eu

SOURCE=/srv/build
TARGET=${TARGET:-/target}

if [ ! -d "$TARGET" ]; then
  echo "install-dist: chưa mount gì vào $TARGET." >&2
  echo "  docker run --rm -v <volume>:$TARGET <ảnh>" >&2
  exit 1
fi

# CHÉP TRƯỚC, DỌN SAU — thứ tự này là đúng/sai, không phải sở thích.
#
# Xoá sạch rồi mới chép sẽ mở ra một khoảng nginx phục vụ thư mục RỖNG: mọi
# request rơi vào khoảng đó nhận 404, kể cả `index.html`, kể cả khi việc chép
# chỉ mất vài trăm mili giây. Chép đè trước thì ở mọi thời điểm thư mục luôn có
# một bộ file phục vụ được — cũ hoặc mới, không bao giờ trống.
cp -a "$SOURCE/." "$TARGET/"

# Rồi mới dọn thứ bản build mới không còn dùng.
#
# Bỏ bước này thì asset có hash của MỌI lần deploy nằm lại vĩnh viễn và volume
# chỉ có phình. Nó cũng là thứ giữ cho `sw.js` mới không nằm cạnh một đống file
# mà precache manifest của nó không còn nhắc tới.
cd "$TARGET"
find . -type f | while read -r path; do
  [ -e "$SOURCE/$path" ] || rm -f "$path"
done

# Thư mục rỗng còn lại sau khi dọn file. `-depth` để xoá từ trong ra ngoài;
# `rmdir` từ chối thư mục còn nội dung nên không cần tự kiểm tra.
find . -depth -type d -exec rmdir {} \; 2>/dev/null || true

echo "install-dist: đã đổ $(find "$SOURCE" -type f | wc -l | tr -d ' ') file vào $TARGET"
