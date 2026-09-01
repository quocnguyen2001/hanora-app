# syntax=docker/dockerfile:1

# Ảnh phát hành frontend. Nó KHÔNG phục vụ HTTP, và đó là chủ đích.
#
# nginx sống ở stack của `hanora-api` và phục vụ FE tĩnh CÙNG ORIGIN với `/api`
# (quyết định D12). Nhét thêm một nginx vào đây nghĩa là hai nơi cùng giữ SPA
# fallback, cache-control và CSP — mà CSP ở nginx là thứ DUY NHẤT thực thi được
# kỷ luật render mà P9 dựa vào để chấp nhận lưu token trong `localStorage`. Hai
# bản cấu hình là hai bản lệch nhau, sớm hay muộn.
#
# Nên ảnh này chỉ MANG thư mục build: chạy một lần, đổ file vào volume
# `frontend-dist` mà nginx đang mount, rồi thoát. Đổi lại đúng thứ mà bước
# `docker cp` thủ công trong runbook không có — một artifact có version, đẩy
# được lên GHCR, và rollback bằng cách chạy lại tag cũ, giống hệt cách API đang
# rollback.

# `--platform=$BUILDPLATFORM`: stage này chạy trên kiến trúc của MÁY BUILD, kể
# cả khi ảnh đích là linux/amd64.
#
# Đầu ra của nó là JS, CSS và font — file tĩnh, không có gì phụ thuộc kiến trúc.
# Bỏ dòng này thì `npm ci` và `vite build` chạy dưới QEMU khi build ảnh amd64
# trên máy Apple Silicon, và một build vốn hai phút kéo dài quá mười phút chưa
# xong. Chỉ stage cuối cần đúng kiến trúc đích, vì nó mang busybox.
FROM --platform=$BUILDPLATFORM node:26-slim AS build

WORKDIR /app

# Copy manifest TRƯỚC mã nguồn để lớp `npm ci` còn dùng lại được cache khi chỉ
# có mã đổi — đó là lớp nặng nhất của cả build.
COPY package.json package-lock.json ./
# Cache mount cho kho tải của npm. `npm ci` là 214 giây trong khi `vite build`
# chỉ 7 — nó là toàn bộ thời gian của một lần publish. Cache mount không nằm
# trong ảnh kết quả, nên đây thuần là tốc độ, không đổi nội dung ảnh.
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# RỖNG là giá trị PRODUCTION, không phải chỗ chưa điền (D12).
#
# FE và API chung origin nên đường dẫn tương đối `/api/...` là đúng và bài toán
# CORS không tồn tại. Điền một URL tuyệt đối ở đây là tự dựng lại đúng bài toán
# mà kiến trúc đã cố ý loại bỏ.
#
# `.dockerignore` chặn `.env` khỏi build context, nên ARG này là đường DUY NHẤT
# giá trị đó đi vào bundle. Không có ngõ nào để `http://localhost:8080` của máy
# dev lọt vào một ảnh production.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Ảnh cuối: busybox, khoảng 2 MB. Nó cần đúng `cp`, `find` và một shell.
FROM busybox:1.37-uclibc AS release

COPY --from=build /app/dist /srv/build
COPY --chmod=755 docker/install-dist.sh /usr/local/bin/install-dist

# Version đặt Ở CUỐI để mỗi lần bump không thổi bay cache của các layer trên.
ARG APP_VERSION=dev
ARG GIT_REVISION=unknown

# Nhãn OCI là nơi DUY NHẤT truy được version của một ảnh đã kéo về, khi tag
# `:latest` không còn nói lên nó đang trỏ vào bản nào:
#   docker inspect -f '{{index .Config.Labels "org.opencontainers.image.version"}}' <ảnh>
LABEL org.opencontainers.image.title="hanora-app" \
      org.opencontainers.image.description="Bản build tĩnh của PWA hanora, đổ vào volume nginx của stack hanora-api." \
      org.opencontainers.image.source="https://github.com/quocnguyen2001/hanora-app" \
      org.opencontainers.image.version="$APP_VERSION" \
      org.opencontainers.image.revision="$GIT_REVISION"

# Đúng một việc, nên không có CMD để ai đó ghi đè nhầm.
ENTRYPOINT ["/usr/local/bin/install-dist"]
