#!/usr/bin/env bash
#
# Build ảnh phát hành frontend rồi đẩy lên GitHub Container Registry.
# Chạy `./scripts/docker-publish.sh --help` để xem tuỳ chọn.
#
# NGUỒN VERSION DUY NHẤT là `version` trong `package.json`; bump bằng
# `npm version patch|minor|major`. Repo `hanora-api` dùng file `VERSION` vì
# composer.json của một ứng dụng không giữ version — ở đây package.json đã giữ
# sẵn, nên thêm một file nữa chỉ tạo ra hai nguồn để lệch nhau.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# ---- Tham số ----

push=true
force=false
# linux/amd64 chứ không phải kiến trúc máy đang chạy, và đây là mặc định CÓ CHỦ
# ĐÍCH: máy dev là Apple Silicon (arm64), VPS gần như chắc chắn là amd64. Để
# buildx tự chọn nghĩa là đẩy lên registry một ảnh mà máy đích không chạy được,
# và lỗi đó chỉ lộ ra lúc deploy.
platform=${PLATFORM:-linux/amd64}

usage() {
  cat <<'EOF'
Build ảnh phát hành frontend rồi đẩy lên GitHub Container Registry.

  ./scripts/docker-publish.sh              # build + push phiên bản trong package.json
  ./scripts/docker-publish.sh --no-push    # chỉ build về máy, để thử
  ./scripts/docker-publish.sh --force      # cho phép đè tag đã có / cây git bẩn

Version lấy từ `version` trong package.json; bump bằng `npm version patch`.

Tuỳ chọn:
  --no-push            Chỉ build và nạp vào docker local, không đẩy lên GHCR.
  --force              Bỏ qua guard cây git sạch và guard tag đã tồn tại.
  --platform <đích>    Kiến trúc đích. Mặc định linux/amd64.
  --image <ref>        Ghi đè tên ảnh. Mặc định suy ra từ remote `origin`.
  -h, --help           In trợ giúp này.

Biến môi trường:
  GHCR_TOKEN     PAT có scope `write:packages`. Có thì script tự đăng nhập.
  VITE_API_URL   Base URL của API nướng vào bundle. Bỏ trống thì lấy từ
                 `.env.production`; đặt biến này chỉ để ghi đè tạm khi thử.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-push) push=false; shift ;;
    --force) force=true; shift ;;
    --platform) platform="${2:?--platform cần một giá trị}"; shift 2 ;;
    --image) image="${2:?--image cần một giá trị}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Tham số lạ: $1" >&2; usage >&2; exit 2 ;;
  esac
done

die() { echo "docker-publish: $*" >&2; exit 1; }

# ---- Version ----

version=$(node -p 'require("./package.json").version')

# `0.0.0` là giá trị Vite dựng sẵn, không phải một bản phát hành. Đẩy nó lên
# registry là tạo ra một tag không nói lên điều gì và không rollback về đâu được.
[[ "$version" == "0.0.0" ]] &&
  die "package.json còn version 0.0.0. Chạy \`npm version patch\` trước."

[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]] ||
  die "version '$version' không phải semver."

# ---- Trạng thái git ----

revision=$(git rev-parse --short HEAD)
dirty=false

if [[ -n "$(git status --porcelain)" ]]; then
  [[ "$force" == true ]] ||
    die "cây làm việc bẩn. Commit trước, hoặc dùng --force để chấp nhận nhãn -dirty."

  # Nhãn phải nói THẬT về nội dung ảnh. Một ảnh build từ cây bẩn không phải là
  # commit $revision, nên tag không được phép nói rằng nó là.
  dirty=true
  revision="${revision}-dirty"
  echo "⚠ Cây làm việc bẩn — chỉ gắn tag revision $revision."
fi

# ---- Tên ảnh ----

# Suy ra từ remote `origin` để tên ảnh không thành một hằng số thứ hai phải sửa
# tay khi repo đổi chủ. GHCR chỉ nhận chữ thường.
if [[ -z "${image:-}" ]]; then
  slug=$(git remote get-url origin |
    sed -E 's#^(git@|https://|ssh://git@)github\.com[:/]##; s#\.git$##' |
    tr '[:upper:]' '[:lower:]')
  [[ "$slug" == */* ]] || die "không suy được owner/repo từ remote origin."
  image="ghcr.io/$slug"
fi

owner="${image#ghcr.io/}"
owner="${owner%%/*}"

revision_tag="$image:$version-$revision"

# Cây BẨN chỉ được một tag, và đó là tag duy nhất nói đúng nội dung ảnh.
#
# Cho `--force` gắn cả `:$version` lẫn `:latest` là tự phá thứ mà chính script
# này đang bảo vệ: `:0.1.0` sẽ im lặng trỏ vào mã chưa commit, không dựng lại
# được, và rollback về nó là rollback về một thứ không ai biết là gì. Hậu tố
# `-dirty` trên tag revision thì nói thẳng ra điều đó.
tags=("$revision_tag")
deploy_tag="$revision_tag"
if [[ "$dirty" != true ]]; then
  tags+=("$image:$version" "$image:latest")
  deploy_tag="$image:$version"
fi

# ---- Đăng nhập GHCR ----

# Chỉ áp cho ghcr.io. `--image` trỏ sang registry khác thì `$owner` không còn là
# tên tài khoản GitHub, và đăng nhập bằng nó là sai địa chỉ.
if [[ "$push" == true && "$image" == ghcr.io/* ]]; then
  if [[ -n "${GHCR_TOKEN:-}" ]]; then
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$owner" --password-stdin >/dev/null
  elif ! grep -q '"ghcr.io"' "${DOCKER_CONFIG:-$HOME/.docker}/config.json" 2>/dev/null; then
    die "chưa đăng nhập ghcr.io. Chạy:
  echo \$GHCR_TOKEN | docker login ghcr.io -u $owner --password-stdin
Token cần scope \`write:packages\` (và \`read:packages\` để kéo về)."
  fi

  # Ảnh phát hành là BẤT BIẾN — đó là toàn bộ cơ sở của việc rollback bằng cách
  # trỏ lại tag cũ. Đè lên một tag đã đẩy nghĩa là bản 0.1.0 trên máy bạn và bản
  # 0.1.0 trên VPS có thể là hai thứ khác nhau, và không cách nào biết.
  if [[ "$force" != true ]] && docker manifest inspect "$image:$version" >/dev/null 2>&1; then
    die "$image:$version đã tồn tại trên GHCR. Bump version, hoặc --force nếu thật sự muốn đè."
  fi
fi

# ---- Build ----

# `.dockerignore` chặn `.env*` khỏi build context, nên `--build-arg` là đường
# DUY NHẤT giá trị này đi vào bundle. Nguồn của nó là `.env.production` — cùng
# một file mà `vite build --mode production` sẽ đọc nếu chạy ngoài Docker, nên
# build trong ảnh và build trên máy cho ra cùng một base URL.
#
# Đọc bằng sed chứ không `source`: file này là dữ liệu, không phải mã, và
# `source` cho phép mọi dòng trong đó chạy với quyền của script.
env_file=".env.production"
env_file_api_url=""
if [[ -f "$env_file" ]]; then
  env_file_api_url=$(sed -n 's/^[[:space:]]*VITE_API_URL[[:space:]]*=[[:space:]]*//p' "$env_file" | tail -n 1)
  env_file_api_url="${env_file_api_url%$'\r'}"          # file soạn trên Windows
  env_file_api_url="${env_file_api_url%\"}"; env_file_api_url="${env_file_api_url#\"}"
  env_file_api_url="${env_file_api_url%\'}"; env_file_api_url="${env_file_api_url#\'}"
fi

# Biến môi trường thắng file, để thử một base URL khác mà không phải sửa file
# đang được commit.
if [[ -n "${VITE_API_URL+x}" ]]; then
  vite_api_url="$VITE_API_URL"
  echo "⚠ VITE_API_URL='$vite_api_url' từ môi trường, ghi đè $env_file."
else
  vite_api_url="$env_file_api_url"
  [[ -f "$env_file" ]] ||
    echo "⚠ không thấy $env_file — bundle sẽ dùng đường dẫn tương đối."
  [[ -n "$vite_api_url" ]] &&
    echo "→ VITE_API_URL='$vite_api_url' (từ $env_file)"
fi

echo "→ $deploy_tag  ($platform)"

build_args=(
  buildx build
  --platform "$platform"
  --build-arg "VITE_API_URL=$vite_api_url"
  --build-arg "APP_VERSION=$version"
  --build-arg "GIT_REVISION=$revision"
)
for tag in "${tags[@]}"; do
  build_args+=(--tag "$tag")
done

if [[ "$push" == true ]]; then
  build_args+=(--push)
elif [[ "$platform" == *,* ]]; then
  # buildx không nạp được ảnh đa kiến trúc vào docker local — chỉ dừng ở cache.
  die "--no-push không đi cùng nhiều platform ('$platform'). Chọn một."
else
  build_args+=(--load)
fi

docker "${build_args[@]}" .

# ---- Tóm tắt ----

echo
[[ "$push" == true ]] && echo "✓ Đã đẩy lên GHCR" || echo "✓ Đã build về máy"
echo
printf '  %s\n' "${tags[@]}"

cat <<EOF

Deploy trên VPS — kiểm tên volume bằng \`docker volume ls | grep frontend-dist\`,
sai tên thì lệnh dưới tạo volume RỖNG mới và nginx vẫn phục vụ bản cũ:

  docker run --rm -v hanora-api_frontend-dist:/target $deploy_tag

Rollback = chạy lại đúng lệnh trên với tag cũ. Không cần dựng lại gì.
EOF
