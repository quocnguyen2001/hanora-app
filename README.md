# hanora-app

PWA mobile-first giúp người Việt tra cứu, lưu và ôn tập từ vựng tiếng Trung.

React 19 · TypeScript · Vite 8 · Tailwind v4 · React Router · TanStack Query ·
Zustand · Motion.

Backend nằm ở repo riêng [`hanora-api`](../hanora-api).

## Chạy

```bash
cp .env.example .env   # bắt buộc ở dev: trỏ tới API localhost:8080
npm install
npm run dev            # http://localhost:5173
```

API phải chạy trước — xem [`hanora-api/README.md`](../hanora-api/README.md).

## Lệnh

```bash
npm run dev           # dev server, cổng 5173 cố định
npm run build         # typecheck + bundle production
npm run typecheck     # tsc -b
npm run lint          # ESLint
npm run format        # Prettier, ghi đè
npm run format:check  # Prettier, chỉ kiểm tra
npm run test          # Vitest
npm run test:watch    # Vitest watch
npm run test:coverage # Vitest + báo cáo độ phủ

node scripts/check-contrast.mjs  # đo tương phản WCAG mọi tông chữ × chủ đề
node scripts/export-icons.mjs    # xuất icon PWA từ src/assets/icon-source.svg
```

Node ≥ 26 (xem `.nvmrc`).

## Cấu trúc

Feature-first. Mỗi feature tự chứa API, hook và component của nó.

```text
src/
├── app/            router.tsx, providers.tsx
├── components/
│   ├── ui/         component dùng chung, KHÔNG biết gì về API
│   ├── layout/     AppShell, BottomNavigation
│   └── common/     component ghép, dùng ở nhiều feature
├── features/       dictionary/ vocabulary/ review/ stats/ auth/ settings/
├── hooks/          hook dùng chung, không thuộc feature nào
├── lib/            api.ts, query-client.ts, …
├── stores/         Zustand
├── types/
└── styles/         app.css — entry Tailwind

public/fonts/       woff2 self-host (Inter, Lora) — xem src/styles/fonts.css
scripts/            tiện ích chạy tay, không nằm trong build
```

## Quy tắc phân tầng

Bốn quy tắc dưới đây chốt ở Phase 2 và áp dụng cho mọi phase sau. Chúng tồn tại
vì đặt sai chỗ ở phase đầu sẽ phải refactor rộng về sau.

| Tầng                     | Được làm gì                                         | Không được làm gì         |
| ------------------------ | --------------------------------------------------- | ------------------------- |
| `features/*/api.ts`      | Gọi HTTP, trả kiểu đã typed                         | Chứa state, gọi hook      |
| `features/*/hooks.ts`    | TanStack Query hook. **Nơi duy nhất đặt query key** | Gọi `fetch` trực tiếp     |
| `features/*/components/` | UI riêng của feature                                | Gọi HTTP trực tiếp        |
| `components/ui/`         | UI thuần, nhận props                                | Biết bất cứ thứ gì về API |

Hai ràng buộc nữa:

- **Không business logic trong page component.** Page chỉ ghép hook và component.
- **Zustand chỉ giữ state client** — theme, trạng thái UI phiên ôn tập, tùy chọn
  âm thanh, tìm kiếm gần đây. **Không** dùng Zustand cho dữ liệu server; đó là
  việc của TanStack Query.

## Query key

Chốt ở đây, mọi phase sau bám theo. Key đặt trong `features/*/hooks.ts` của
chính feature đó, không tập trung vào một file dùng chung.

```text
['dictionary', 'search', q]
['dictionary', 'word', id]
['vocabulary', 'list', filters]
['vocabulary', 'ids']
['reviews', 'session', mode]
['stats', 'summary', range]
['auth', 'me']
```

## API client

`src/lib/api.ts` là cửa duy nhất đi ra ngoài. Nó bóc lớp `{ data }` mà API luôn
bọc quanh response, và ném `ApiError` mang theo `status` cùng `errors` của lỗi
validation 422.

`ApiError` phân biệt bốn tình huống mà UI cần xử lý khác nhau:

|                                   | Ý nghĩa                                          |
| --------------------------------- | ------------------------------------------------ |
| `isNetworkError` (`status === 0`) | Không có phản hồi nào — mất mạng, DNS hỏng       |
| `isUnauthenticated` (401)         | Token hết hạn hoặc bị thu hồi → về màn đăng nhập |
| `isValidationError` (422)         | Người dùng nhập sai → hiện lỗi ngay tại field    |
| còn lại                           | Lỗi máy chủ                                      |

Tách `isNetworkError` khỏi lỗi HTTP là để màn offline nói đúng chuyện đang xảy
ra thay vì báo "lỗi máy chủ".

## `VITE_API_URL`

**Để trống ở production, và đó là chủ đích.** FE được nginx phục vụ _cùng
origin_ với API (quyết định D12), nên đường dẫn tương đối `/api/...` là đúng và
bài toán CORS không tồn tại. Ở dev, Vite chạy cổng 5173 còn API ở 8080 nên cần
URL tuyệt đối.

## Điều hướng

**5 tab**: Tìm kiếm · Kho từ · Ôn tập · Thống kê · Tài khoản.

Route `/stats` tồn tại từ P2 để deep link không gãy, nhưng tab Thống kê chỉ xuất
hiện cùng P17 — không ship tab dẫn tới màn trống.

`/account/settings` là trang con, cố ý KHÔNG có tab riêng: thêm tab thứ sáu làm
chật thanh điều hướng trên mobile, đổi lại rất ít giá trị cho một màn người dùng
mở vài lần rồi thôi.

## Tùy chỉnh hiển thị

Màn `/account/settings` đổi được ba trục — chủ đề sáng/tối, tông chữ, cỡ chữ —
cộng font giao diện và độ mượt hiệu ứng. Lưu `localStorage` dưới khóa
`hanora.display`, không đồng bộ server: đây là tùy chọn của THIẾT BỊ.

Cả ba trục đổi **giá trị token**, không đổi tên class. Hệ quả cần biết trước khi
sửa giao diện:

- **KHÔNG có class `dark:` nào trong codebase, và đừng thêm.** `bg-surface` viết
  từ trước dark mode vẫn tự đúng ở chế độ tối.
- Bảng màu tối và bốn tông chữ nằm cuối `src/styles/tokens.css`, cố ý đặt NGOÀI
  `@layer` để đè được `@theme`.
- Thêm hay sửa một mã màu chữ thì phải chạy `node scripts/check-contrast.mjs`.
  Script parse thẳng `tokens.css` và thoát khác 0 khi có tông trượt WCAG AA.
- Mọi token chữ nhân với `--font-scale`. Viết cỡ chữ bằng giá trị thô
  (`text-2xl`, `text-[1.75rem]`) là tạo ra chỗ không co giãn theo lựa chọn của
  người dùng — dùng token.
- `index.html` có một script inline áp chủ đề trước khung hình đầu tiên. Nó LẶP
  LẠI logic của `applyDisplay()` trong `src/lib/display-theme.ts` vì phải chạy
  trước module đầu tiên; sửa một bên thì sửa cả bên kia.

## Kế hoạch

`plans/260820-0156-hanora-mvp/plan.md` là nguồn quyết định duy nhất cho cả hai
repo. Các phase gắn nhãn `APP` thực thi trong repo này.

Design system: `.prompts/hanora-design-context/` là source of truth, không tự
phát minh pattern thị giác mới.

> **Hai thư mục này không nằm trong git.** Chúng bị loại bởi global gitignore
> (`~/.config/git/ignore`), nên chỉ tồn tại trên máy dev. Ai clone repo sẽ
> không thấy chúng. Nếu về sau cần chia sẻ, thêm ngoại lệ trong `.gitignore`
> của repo rồi `git add -f`.
