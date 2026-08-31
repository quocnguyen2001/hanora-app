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

**Mobile — 5 tab**: Tìm kiếm · Kho từ · Ôn tập · Chủ đề · Thống kê.
**Desktop — 6 mục**: cùng năm mục trên, cộng Tài khoản.

Route `/stats` tồn tại từ P2 để deep link không gãy, nhưng tab Thống kê chỉ xuất
hiện cùng P17 — không ship tab dẫn tới màn trống. Tab Chủ đề thêm theo cùng
nguyên tắc, khi màn học theo chủ đề đã có nội dung thật.

### Vì sao "Tài khoản" rời thanh dưới trên mobile

Thanh dưới 360px chia SÁU là 60px mỗi tab, và ở cỡ chữ 130% (mức lớn nhất người
dùng chọn được ở màn Hiển thị & chữ) nhãn dài như "Thống kê", "Tài khoản" bắt
đầu chật. Nên thay vì nhồi tab thứ sáu, Tài khoản lùi lên **icon ở header**
(`lg:hidden`) và nhường chỗ cho Chủ đề.

Đó là đánh đổi theo TẦN SUẤT: học từ mới là việc hàng ngày, Tài khoản là màn mở
vài lần rồi thôi. Sidebar desktop xếp dọc nên không có ràng buộc bề ngang đó và
vẫn giữ đủ sáu mục.

`BottomNavigation` vẫn là **một `<nav>` duy nhất** cho mọi cỡ màn — mục
`desktopOnly` ẩn bằng CSS chứ không bị bỏ khỏi DOM, nên screen reader vẫn chỉ
thấy một landmark điều hướng. Mục đó phải nằm CUỐI mảng `TABS`: pill nền dựa
vào việc chỉ số của năm mục đầu giống nhau ở cả hai bố cục.

`/account/settings` là trang con, cố ý KHÔNG có mục riêng.

## Học theo chủ đề

`/topics` là lưới 16 chủ đề (tình yêu, văn phòng, thiên nhiên, thức ăn…);
`/topics/:slug` là màn học thẻ. Đây là lối vào NỘI DUNG MỚI — mọi đường khác vào
từ vựng đều bắt đầu bằng "người dùng đã biết cần tra từ gì".

**Tab "Chủ đề" trong thanh điều hướng** là lối vào chính — xem mục Điều hướng ở
trên để biết vì sao nó thay chỗ của Tài khoản trên mobile.

Bản đầu cố ý KHÔNG thêm tab, lấy lý do "thêm tab sau khi biết người dùng có dùng
hay không". Lập luận đó tự phủ định: không tìm thấy tính năng thì không ai dùng,
nên dữ liệu đó không bao giờ tới. Người dùng đầu tiên mở app đã không thấy nó.

Hai lối vào theo NGỮ CẢNH vẫn giữ, vì chúng xuất hiện đúng lúc người dùng đang
muốn học thêm chứ không phải chỉ để dẫn đường:

| Lối vào | Vì sao ở đó |
|---|---|
| Empty state màn **Kho từ** | Hành động PHỤ — chỗ này đã có đích (`/search`), không cướp chỗ của nó |
| Empty state màn **Ôn tập** (`no_words`) | Câu chữ ở đây đang hứa "lưu thêm từ mới để bắt đầu học" mà chưa có đích |

Luồng một phiên: bấm **Bắt đầu học** → 10 thẻ → mỗi thẻ chọn *Thêm vào kho*
hoặc *Đã biết rồi* → tổng kết → **Ôn ngay**. Từ vừa thêm đi thẳng vào SRS.

### Ba điểm dễ làm sai

**Bốc thẻ trong EVENT HANDLER, không phải `useState` khởi tạo lười.** Initializer
chạy ở render đầu tiên, khi cả ba query (`words`, `saved`, `skips`) còn
`pending` — nó sẽ bốc từ mảng rỗng và rơi thẳng vào màn "đã học hết". Nút "Bắt
đầu học" đóng vai `ModePicker` của màn Ôn tập, và tiện thể cho người dùng biết
còn bao nhiêu từ.

**KHÔNG optimistic cho thao tác ghi.** `api.ts` chặn mọi non-GET khi ngoại tuyến
với hợp đồng *"tuyệt đối không giả vờ đã lưu"*. Sang thẻ ngay khi bấm chính là
giả vờ đã lưu: mất mạng ở thẻ 2 thì người dùng học hết phiên, thấy "đã thêm 6
từ", rồi vào `/review` không thấy gì. Thẻ đứng yên, báo lỗi, cho thử lại.

**"Học tiếp chủ đề này" phải `await` refetch trước khi bốc bộ mới.**
`invalidateQueries` bất đồng bộ và trả `data` cũ trong lúc refetch
(`useSavedWordIds` có `staleTime` 30 giây), nên bốc ngay sau khi invalidate sẽ
phát lại đúng 10 từ vừa học.

### Chủ đề tự tạo

Nút **+ Chủ đề mới** trên `/topics` mở `NewTopicForm`: gõ tên, chọn emoji, gửi.
API trả `202` ngay và job sinh từ chạy nền ~20 giây.

`useTopics` **tự poll mỗi 3 giây khi còn chủ đề `generating`**, và dừng hẳn khi
hết — không cần endpoint trạng thái riêng. Vòng poll có điều kiện dừng vì cùng
lý do `LAZY_MAX_POLLS` tồn tại bên lớp ảnh: một vòng chạy mãi cho câu trả lời
không bao giờ tới là chi phí thật.

Thẻ chủ đề có **ba hình dạng**, không phải một:

| Trạng thái | Thẻ hiện gì |
|---|---|
| `generating` | "Đang tìm từ…", không phải link, không hiện `0/0` |
| `failed` | Lý do đọc được + nút **Xoá** |
| `ready` | Như chủ đề gốc |

Tách `generating` ra là bắt buộc: gộp vào nhánh thường thì thẻ vừa tạo hiện
`0/0`, bấm vào ra màn "đã học hết", và người dùng tưởng nó hỏng.

Chủ đề tự tạo **chỉ người tạo thấy**, và chỉ chúng mới có nút xoá — `is_custom`
từ API quyết định điều đó, app không tự suy.

### Ngân sách request của một phiên

Ảnh minh hoạ dùng `maxPolls: 2` thay vì 10 như màn chi tiết từ. Từ chủ đề theo
định nghĩa là từ **chưa ai mở** (bảng ảnh có 12 dòng trên 123.646 mục), nên gần
như luôn rơi vào nhánh `pending`. Với trần 10 lượt hỏi, một phiên 10 thẻ là tới
110 request — trong khi throttle của API là 60/phút **theo user**, tức người
dùng sẽ bị chính vòng poll ảnh của mình chặn không lưu được từ.

Cùng lý do, màn học dùng `useSaveTopicWord` riêng thay vì `useToggleSaveWord`:
hook kia invalidate `vocabularyKeys.ids` sau MỖI thẻ, và query đó đang active vì
chính màn học đọc nó. Invalidate gom về cuối phiên.

Ảnh chỉ resolve cho thẻ ĐANG HIỆN — không prefetch thẻ sau. Người dùng thoát ở
thẻ 2 thì tám từ còn lại không tốn lượt gọi nào.

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
