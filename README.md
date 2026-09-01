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
npm run docker:publish # build ảnh và đẩy lên GHCR — xem "Ảnh Docker & GHCR"

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
docker/             script chạy BÊN TRONG ảnh phát hành
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
['dictionary', 'search', mode, refine, q]
['streak', 'summary']
['streak', 'summary', 'calendar']
['dictionary', 'word', id]
['dictionary', 'enrichment', id]
['dictionary', 'strokes', char]
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

## Ảnh Docker & GHCR

```bash
npm version patch            # 0.1.0 → 0.1.1, tạo cả commit và git tag
npm run docker:publish       # build linux/amd64 rồi đẩy lên GHCR
```

Ảnh đẩy lên ba tag: `:0.1.1`, `:0.1.1-<sha>`, `:latest`.

**Ảnh này không phục vụ HTTP.** nginx sống ở stack `hanora-api` và phục vụ FE
_cùng origin_ với `/api` (D12); đóng thêm một nginx vào đây là tạo ra nơi thứ
hai giữ SPA fallback, cache-control và CSP — mà CSP ở nginx là thứ **duy nhất**
thực thi được điều kiện P9 dựa vào để chấp nhận lưu token trong `localStorage`.
Nên ảnh chỉ _mang_ bản build: chạy một lần, đổ file vào volume `frontend-dist`
mà nginx đang mount, rồi thoát.

Trên VPS — thay cho bước `docker cp` thủ công ở mục 5 runbook của `hanora-api`,
và **vẫn giữ nguyên điều kiện thứ tự**: chỉ deploy FE sau khi `cvdict:status`
và `topics:status` PASS.

```bash
docker run --rm -v hanora-api_frontend-dist:/target \
  ghcr.io/quocnguyen2001/hanora-app:0.1.1
```

Rollback = chạy lại đúng lệnh đó với tag cũ. Không phải dựng lại gì, và VPS
không cần Node — đây là thứ cách build-trên-VPS không cho được.

Tên volume có tiền tố là tên project của Compose, mặc định lấy theo tên thư mục
chứa file compose. Kiểm bằng `docker volume ls | grep frontend-dist` thay vì tin
vào `hanora-api_` — sai tên thì `docker run` tạo ra một volume rỗng MỚI, lệnh
báo thành công, và nginx vẫn phục vụ bản cũ.

| Điều                                                | Vì sao                                                                                                                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version ở `package.json`, không phải file `VERSION` | Ngược với `hanora-api`, nơi composer.json không giữ version nên phải có file riêng. Ở đây package.json đã giữ sẵn và `npm version` đã bảo trì nó — thêm file thứ hai chỉ tạo ra hai nguồn để lệch nhau                          |
| Mặc định `linux/amd64`                              | Máy dev là Apple Silicon, VPS là amd64. Để buildx tự chọn nghĩa là đẩy lên một ảnh máy đích không chạy được, và lỗi chỉ lộ lúc deploy. Đổi bằng `--platform`                                                                    |
| Chặn khi cây git bẩn / tag đã tồn tại               | Ảnh phát hành bất biến là toàn bộ cơ sở của rollback. `--force` bỏ qua, nhưng build từ cây bẩn **chỉ** được tag `:<version>-<sha>-dirty` — không `:<version>`, không `:latest`, để không tag nào im lặng trỏ vào mã chưa commit |
| `.dockerignore` là danh sách **cho phép**           | `.env` không bao giờ vào build context, nên `VITE_API_URL` chỉ đến được từ `--build-arg`. Dòng đầu phải là `*` chứ không phải `**` — xem comment trong file                                                                     |
| Chép trước, dọn sau                                 | `docker/install-dist.sh` chép đè rồi mới xoá file thừa, nên không có khoảng nào nginx phục vụ thư mục rỗng                                                                                                                      |

Đăng nhập registry (token cần scope `write:packages`):

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u quocnguyen2001 --password-stdin
```

## Điều hướng

**Mobile — 5 tab**: Tìm kiếm · Kho từ · Ôn tập · Chủ đề · Thống kê.
Header mang thêm **chip chuỗi ngày** (`/streak`) — nó tự ẩn khi người dùng chưa
có chuỗi nào, nên không vi phạm luật "không ship nút chết".
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

## Tìm lại bằng AI

Trên cùng khối kết quả ở `/search` có nút **"Kết quả chưa đúng? Tìm lại bằng
AI"**. Bấm nó gửi `refine=ai`, và API bỏ qua cổng `SearchWeakness` để luôn hỏi
lớp diễn giải AI.

Nút dùng `variant="ghost"` — phẳng, canh trái, đọc như một dòng phụ chú. Đứng
trên cùng mà mang gờ dày thì nó đọc ra như hành động chính của màn hình, trong
khi hành động chính là mở một từ. Nó không giành chỗ với thẻ dịch: `translation`
chỉ có khi AI đã tham gia, và khi đó nút đã tự ẩn theo luật 1 bên dưới.

Nó tồn tại cho đúng một ca: SQL trông tự tin nhưng SAI. Khi SQL yếu thì API đã tự
gọi AI rồi; khi SQL mạnh mà sai thì KHÔNG có tín hiệu cấu trúc nào nhận ra —
người dùng là tín hiệu duy nhất.

Ba luật hiển thị, và luật thứ ba là phần khó:

1. `meta.source === 'ai'` → không có nút. Cache diễn giải phía API là vĩnh viễn
   theo `(truy vấn, mode)`, nên bấm lại chỉ nhận đúng câu trả lời vừa hiện.
2. Không có kết quả nào → không có nút. `total === 0` đã được coi là yếu nên AI
   đã chạy rồi.
3. **Đã bấm rồi → không có nút, kể cả khi `source` vẫn là `sql`.** Khi AI trả
   rỗng, API vẫn báo `source: 'sql'` và cache câu trả lời rỗng đó vĩnh viễn. Suy
   điều kiện hiện nút từ `source` thôi sẽ cho ra một cái nút bấm mãi không đổi gì.
   Vì thế màn hình tự nhớ đã refine cho cặp `(mode, query)` nào, và đổi nút thành
   câu trả lời: "Đã thử tìm lại bằng AI, chưa có kết quả tốt hơn."

`refine` nằm trong query key vì đúng lý do `mode` nằm trong đó: thiếu nó thì bấm
nút xong TanStack Query trả lại kết quả cũ từ cache và nút trông như hỏng.

Nút này chỉ cần bấm MỘT lần cho mỗi truy vấn, kể cả trên máy khác và với người
dùng khác: API đọc lại dòng diễn giải đã có cho cả đường tra thường, nên lần tra
sau đã trả `source: 'ai'` và luật 1 tự ẩn nút. Không có gì phải làm ở FE cho
chuyện đó — nó đã đúng sẵn.

## Thẻ Hán tự

Mỗi chữ trong từ có một thẻ: ô chữ mẫu (`HanziPlate`) bên trái, sáu thuộc tính
bên phải — bính âm · hình thái · lục thư · bộ · số nét · nét bút.

**Không gọi API nào.** Metadata đi kèm `characters[]` của `GET /words/{id}`, nên
số request khi mở màn chi tiết KHÔNG tăng so với trước. Một endpoint riêng cho
mỗi chữ sẽ là 4 request thêm cho một từ 4 chữ, trên trần 60/phút theo user.

### Bốn điểm dễ làm sai

**Bính âm KHÔNG tra lại ở FE.** `characters[].pinyin` là âm ĐÚNG NGỮ CẢNH của
từ — 银行 cho `行 háng`, không phải `xíng`. API chọn nó bằng cách khớp âm tiết
(red team H11). Tra từ bảng chữ sẽ ra âm phổ biến nhất, tức dạy sai đúng thứ
người học đang học.

**Mọi thuộc tính đều nullable, và ca "thiếu hết" CHẮC CHẮN xảy ra.**
`/words/{id}` sống 30 ngày trong bucket service worker, nên người dùng đã mở một
từ trước khi các trường này tồn tại sẽ nhận lại bản chỉ có `char`/`pinyin`/
`han_viet`. `parseCharacters` điền `null` cho mọi trường vắng — thiếu bước đó
thì `character.stroke_count` là `undefined`, và `undefined !== null` nên UI
render ra chữ "undefined". Có test khoá ca này.

**Lục thư chỉ có BA giá trị.** Bảng ánh xạ nằm MỘT chỗ trong
`CharacterAttributes`; giá trị lạ thì ẩn dòng, không hiện chuỗi tiếng Anh thô.
Nguồn không có hội ý, chuyển chú, giả tá — xem README của `hanora-api`.

**Bộ thủ giữ nguyên biến thể.** `剑` hiện bộ `刂`, không phải `刀`. Đó là hình
dạng thật xuất hiện trong chữ. Âm Hán-Việt của bộ hiển thị viết hoa bằng CSS
(`uppercase`), không phải viết hoa trong dữ liệu.

## Tập viết Hán tự

Nút **"Tập viết Hán tự"** trên mỗi thẻ chữ mở `BottomSheet`: xem hoạt hình thứ
tự nét → tô từng nét → sai 3 lần thì hiện gợi ý → xong thì `animate-pop` +
"Hoàn thành".

Dùng `hanzi-writer` (MIT) chế độ quiz. **Không dùng lại `HandwritingPad`** của
P19 — cái đó là NHẬN DẠNG chữ vẽ tự do, nó không biết thứ tự nét chuẩn nên
không dạy được thứ tự nét, đúng thứ người đang tập viết cần nhất.

### Năm điểm dễ làm sai

**Gói chính không được tăng.** `HanziWritingPad` là chunk lười qua `React.lazy`.
Đo trước/sau: gói chính 343,02 → 343,41 kB (gzip 108,05 → 108,15) — phần tăng là
code UI mới, `hanzi-writer` đóng góp **0 byte**. Chunk lười riêng: 37,3 kB
(11,5 kB gzip).

**`enabled: open` là BẮT BUỘC.** Thiếu nó thì mọi thẻ chữ trên màn tải ~4 KB
hình học ngay khi render — đúng cái mà việc tách endpoint `strokes` khỏi metadata
vừa loại bỏ. Có test khoá điều đó.

**`charDataLoader` tuỳ biến, không dùng CDN mặc định.** Mặc định `hanzi-writer`
tự tải JSON theo chữ từ CDN của nó: một lời gọi mạng nằm ngoài tầm `api.ts` và
không đi qua service worker. Dữ liệu ở đây đến từ `useCharacterStrokes`.

**Giảm chuyển động phải xử lý TAY, và đọc HAI nguồn.** `hanzi-writer` vẽ bằng JS
nên block `animation-duration: 0.01ms` của `app.css` — thứ tự tắt mọi hoạt hình
khác trong app — KHÔNG chạm tới nó. Sheet đọc cả `useDisplay(s => s.motion)`
(lựa chọn trong app) lẫn `useReducedMotion()` của `motion/react` (cài đặt hệ
điều hành). Đây là chốt không test nào hiện có bắt được nếu nó biến mất, nên nó
có test riêng.

**Ca hỏng thật là CHUNK tải lỗi, không phải `create()` ném.** Nó xảy ra ở ranh
giới `lazy()` và một `try/catch` bên trong pad không với tới. `FeatureErrorBoundary`
bọc NGOÀI `Suspense` mới bắt được cả hai.

### Ba câu trả lời khác nhau cho ba tình huống

| Tình huống                 | Sheet nói gì                               |
| -------------------------- | ------------------------------------------ |
| 404 — chữ ngoài bộ dữ liệu | "Chữ này chưa có dữ liệu nét để tập viết." |
| Lỗi mạng / 500             | "Cần kết nối để tải nét của chữ này…"      |
| Chunk hỏng hoặc pad ném    | "Không mở được bảng tập viết…"             |

Ba câu tách bạch có chủ đích: nói "chữ này không có nét" khi thật ra mất mạng là
nói dối người dùng. 2.763/9.574 chữ thật sự không có nét (phần lớn là phồn thể).

### Ngoại tuyến

Rule `runtimeCaching` `CacheFirst`, bucket `hanora-dictionary-strokes`, một năm.
`CacheFirst` chứ không `StaleWhileRevalidate` như chi tiết từ: API đặt
`immutable` vì dữ liệu tất định. Bucket thuộc nhóm DICTIONARY nên KHÔNG bị xoá
khi đăng xuất — không trường nào theo user.

Hệ quả có chủ đích: **chữ đã xem một lần thì tập viết được khi ngoại tuyến**,
chữ chưa xem thì không, và sheet nói thẳng điều đó.

### Ghi công

Dữ liệu nét từ Make Me a Hanzi theo **Arphic Public License** — dòng ghi công ở
chân sheet là nghĩa vụ, không phải chi tiết trang trí. Cùng khuôn mà dòng
Tatoeba và Pixabay đang giữ, và đặt đúng nơi dữ liệu được dùng.

## Lượng từ

Hero màn chi tiết có dòng "Lượng từ: 家 jiā · 个 gè", đứng sau badge HSK và
trước ảnh minh hoạ. Nó thuộc hero chứ không phải một `Card` riêng vì nó là thuộc
tính NGỮ PHÁP của chính từ đang tra — cùng loại với pinyin và âm Hán-Việt.

Trước đây CC-CEDICT để lượng từ ngay trong phần nghĩa dưới dạng
`CL:家[jia1],個|个[ge4]`, và chuỗi đó **hiện nguyên dạng mã** cho người dùng. API
tách ra lúc import; xem mục "Lượng từ" ở README của `hanora-api`.

Ẩn hẳn khi rỗng, và đó là ca THƯỜNG GẶP: đo trên nguồn thật chỉ **1.554 /
123.646** mục có lượng từ.

`measure_words` khai kiểu là MẢNG, không nullable — API chuẩn hoá `NULL` thành
`[]` ở tầng resource. Nhưng `api.ts` vẫn chạy `parseMeasureWords` trên response,
và đó **không phải phòng xa thừa**: `/words/{id}` nằm trong bucket service worker
sống 30 ngày, nên người dùng đã mở một từ trước khi trường này tồn tại sẽ nhận
lại bản cũ không có nó, và `.length` trên `undefined` sẽ ném ngay giữa hero.
Cùng lý do đó áp cho `searchWords`.

## Lớp làm giàu từ vựng

`GET /api/dictionary/words/{id}/enrichment` cấp nghĩa nhóm theo **từ loại**, **từ
ghép**, **thành ngữ** và **ghi chú dùng từ**. Toàn bộ do AI sinh, nên mỗi khối
mang một dòng nhãn nguồn — MỘT lần cho cả khối, không phải mỗi mục.

Nhãn phải ở TỪNG khối chứ không một lần cho cả trang: bốn khối này nằm xen giữa
nội dung có nguồn thật (Tatoeba, CC-CEDICT), nên một nhãn duy nhất ở đầu trang
sẽ đọc ra như thể cả trang do AI sinh.

Đây là lớp lười thứ BA trên màn chi tiết, sau ảnh minh hoạ và dịch câu ví dụ, và
nó bám cùng khuôn `useWordIllustration`: `retry: false`, vòng poll dừng khi khác
`pending`, trần `LAZY_MAX_POLLS`. Ba lớp × trần 10 lượt = 30 request cho một lần
mở trang ở ca xấu nhất, so với trần 60/phút theo user — chấp nhận được cho một
màn người dùng mở có chủ đích, nhưng màn nào mở từ hàng loạt phải hạ trần xuống.

### Ba điểm dễ làm sai

**`senses` thay chỗ `definitions_vi`, không đứng cạnh nó.** Không có luật này
thì màn hình có ba danh sách nghĩa: `senses` (AI, nhóm theo từ loại),
`definitions_vi` (CVDICT), `definitions_en` (CC-CEDICT) — và hai danh sách nghĩa
Việt cạnh nhau nói gần như cùng một việc. `WordDetailHero` nhận
`suppressVietnameseDefinitions` (mặc định `false`, nên `GalleryPage` không đổi).

`definitions_en` **luôn ở lại** — luật R1, và càng đúng ở đây: thứ vừa thay chỗ
nghĩa Việt là nội dung AI chưa ai rà, nên dòng tiếng Anh là cơ chế đối chiếu duy
nhất người học có.

Hệ quả đã biết: lớp làm giàu tải lười, nên phần lớn lần mở hiện
`definitions_vi` trước rồi ĐỔI sang `senses`. Một lần đổi, chấp nhận được.

**Nhóm `senses` ở FE, không ở API.** Model trả danh sách PHẲNG và lặp lại cùng
một `pos` ở hai mục rời nhau. Gom lại là việc trình bày, và làm ở FE thì response
giữ nguyên thứ tự model chọn — thứ tự đó mang thông tin (nghĩa phổ biến trước).

**Từ ghép có `word_id` thì bấm được, không có thì tĩnh.** `null` là trạng thái
hợp lệ ở hai ca: bản làm giàu sinh trước khi API biết tra ngược, và từ model đưa
ra nhưng không có trong từ điển. Cho tất cả trông bấm được rồi để một nửa bấm
không ra gì tệ hơn hẳn — cùng luật mà `SentenceToken.word_id: null` đang giữ.

**KHÔNG đọc `characters` và `examples` của payload làm giàu.** `characters` mang
bộ thủ và số nét do model sinh, trong khi nguồn tất định cho hai trường đó đi
kèm `WordDetail.characters`; đọc bản của model là dựng nguồn thứ hai để hai bên
lệch nhau. `examples` thì trùng với khối "Ví dụ" Tatoeba vốn đã có bản dịch riêng.

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

| Lối vào                                 | Vì sao ở đó                                                             |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Empty state màn **Kho từ**              | Hành động PHỤ — chỗ này đã có đích (`/search`), không cướp chỗ của nó   |
| Empty state màn **Ôn tập** (`no_words`) | Câu chữ ở đây đang hứa "lưu thêm từ mới để bắt đầu học" mà chưa có đích |

Luồng một phiên: bấm **Bắt đầu học** → 10 thẻ → mỗi thẻ chọn _Thêm vào kho_
hoặc _Đã biết rồi_ → tổng kết → **Ôn ngay**. Từ vừa thêm đi thẳng vào SRS.

### Ba điểm dễ làm sai

**Bốc thẻ trong EVENT HANDLER, không phải `useState` khởi tạo lười.** Initializer
chạy ở render đầu tiên, khi cả ba query (`words`, `saved`, `skips`) còn
`pending` — nó sẽ bốc từ mảng rỗng và rơi thẳng vào màn "đã học hết". Nút "Bắt
đầu học" đóng vai `ModePicker` của màn Ôn tập, và tiện thể cho người dùng biết
còn bao nhiêu từ.

**KHÔNG optimistic cho thao tác ghi.** `api.ts` chặn mọi non-GET khi ngoại tuyến
với hợp đồng _"tuyệt đối không giả vờ đã lưu"_. Sang thẻ ngay khi bấm chính là
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

| Trạng thái   | Thẻ hiện gì                                       |
| ------------ | ------------------------------------------------- |
| `generating` | "Đang tìm từ…", không phải link, không hiện `0/0` |
| `failed`     | Lý do đọc được + nút **Xoá**                      |
| `ready`      | Như chủ đề gốc                                    |

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

## Chuỗi ngày

Chip lửa trên header ở **mọi màn**, bấm vào ra `/streak` (chuỗi hiện tại, kỷ lục,
lịch 30 ngày, tiến độ hôm nay).

Mục tiêu mỗi ngày: **5 từ mới HOẶC một phiên ôn đã chốt**. Luật sống ở API; app
không tự tính lại — xem `hanora-api/README.md`, mục Chuỗi ngày.

### Ba điểm dễ làm sai

**Chip nhận dữ liệu ĐẨY VÀO, không refetch.** `useSaveTopicWord` cố ý không
invalidate gì sau mỗi thẻ vì trần 60 request/phút theo user (xem "Ngân sách
request của một phiên"). Nếu chip phải gọi lại `/streak` để nhích thì hoặc nó
đứng im tới cuối phiên, hoặc ta phá chính ngân sách đó. Giải: mọi đường ghi trả
`streak` ngay trong response, và `useApplyStreak()` ghi thẳng vào cache.

Có test khoá việc này, và nó đi qua **hook thật** (`useSaveTopicWord`) chứ không
gọi `useApplyStreak()` trực tiếp: bản đầu làm thế và nó chứng minh cơ chế chạy
đúng trong khi vẫn để xoá được cả dòng nối hai đầu mà suite không đỏ.

**Ngoại tuyến, số đến từ `/auth/me`.** Query client không có persister và
`/api/streak` cố ý `no-store`, nên đường duy nhất chip có số khi mở app lúc mất
mạng là bucket service worker của `/api/auth/me` — response đó mang thêm
`streak`. Số có thể cũ tới 7 ngày; vẫn tốt hơn hẳn chip biến mất với người đang
giữ chuỗi 40 ngày. Bucket đó nằm trong trình tự xoá của `clearSession()`.

**Chúc mừng đọc cờ `advanced` từ server.** Màn tổng kết chỉ mount SAU khi
mutation chốt phiên xong, nên nó không bao giờ quan sát được trạng thái "trước".
So hai lần đọc ở client sẽ hoặc không bao giờ đúng, hoặc chúc mừng lại ở mọi
phiên trong cùng một ngày.

### `streak_days` không còn trong `/stats/summary`

Ô "Chuỗi ngày" ở màn Thống kê đọc `useStreak()`, cùng nguồn với chip. Endpoint
thống kê bị server cache 60 giây nên giữ trường đó lại là tự tạo ra hai con số
lệch nhau trên hai màn.

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

## Ngôn ngữ thị giác

Giao diện theo hướng **app học tập vui**: khối có độ dày, bấm vào thì lún xuống,
chữ đậm, bo góc lớn. Ba thứ dưới đây là nơi hướng đó được cài đặt — sửa giao
diện thì đọc trước, đừng dựng lại bằng giá trị thô.

### Bề mặt dày (`chunky`)

`src/styles/app.css` khai bốn utility. Luôn đi **cặp**: một class màu gờ +
`chunky`.

```jsx
<button className="chunky chunky-primary rounded-control-lg">Kiểm tra</button>
```

- `chunky` vẽ gờ 4px bằng `box-shadow` và lún xuống ở `:active:not(:disabled)`.
- `chunky-primary` / `chunky-neutral` / `chunky-success` / `chunky-error` chỉ
  đặt màu gờ.

Hai luật:

- **`chunky` và `shadow-card` không bao giờ đứng cùng nhau.** Cả hai đặt
  `box-shadow`, nên cái nào thắng phụ thuộc thứ tự trong CSS xuất ra. `Card` và
  `VocabularyCard` chọn một trong hai bằng nhánh ba ngôi, không phải bằng quy ước.
- **Dày = bấm được.** Thẻ tĩnh giữ `shadow-card`. Thẻ mà đích bấm nằm bên trong
  (một `<Link>` phủ kín) truyền `interactive` cho `Card` — nó không nhìn thấy
  `onClick` nào để tự suy ra.

Gờ dùng `box-shadow` chứ không `border-bottom`: viền cộng vào chiều cao, nên nút
`min-h-11` thành 48px và lúc bấm hộp co lại kéo theo mọi thứ bên dưới.

### Chữ Hán

Chữ Hán dùng **tống thể/khải thư hệ thống**, không phải hắc thể, và vẫn 0 byte —
xem khối ghi chú dài ở `--font-hanzi` trong `tokens.css` để biết máy nào rơi vào
font nào. Điều cần nhớ khi sửa:

- **Không tăng `font-weight` cho chữ Hán.** Font khải/tống trên máy người dùng
  gần như luôn chỉ có một nét; ép đậm thì trình duyệt bôi đậm giả và xoá mất
  chênh lệch thanh–đậm, tức xoá đúng cái chất thư pháp. `--text-hanzi-*` đặt 400
  có chủ đích.
- Cỡ hero là 56px vì nét mảnh của font thư pháp cần từng đó pixel mới hiện ra.
- `HanziPlate` là tấm nền cho chữ Hán cỡ hero (màn chi tiết từ, màn trắc
  nghiệm). Không thêm hoa văn hay khung triện vào nó — `brand.md` cấm.

### Chuyển động ăn mừng

`--ease-bounce` là đường cong DUY NHẤT được phép vượt ngoài [0, 1], và nó chỉ
dùng ở ba chỗ: `animate-pop` (dấu đúng/sai, điểm cuối phiên), `animate-nudge`
(trả lời sai), `animate-flame` (chuỗi ngày đang cháy). `ux-rules.md` cấm
"bouncing everything" — cách giữ đúng luật đó là đếm được số chỗ dùng nó.

Nút bấm **không** dùng `--ease-bounce`: một cái nút nảy lại sau mỗi lần chạm là
thứ gây mệt sau lần thứ mười.

Cả ba đều tự tắt theo `prefers-reduced-motion` và theo lựa chọn độ mượt trong
app, nhờ block ép `animation-duration: 0.01ms` ở `app.css` — không cần xử lý
riêng ở component.

## Kế hoạch

`plans/260820-0156-hanora-mvp/plan.md` là nguồn quyết định duy nhất cho cả hai
repo. Các phase gắn nhãn `APP` thực thi trong repo này.

Design system: `.prompts/hanora-design-context/` là source of truth, không tự
phát minh pattern thị giác mới.

> **Hai thư mục này không nằm trong git.** Chúng bị loại bởi global gitignore
> (`~/.config/git/ignore`), nên chỉ tồn tại trên máy dev. Ai clone repo sẽ
> không thấy chúng. Nếu về sau cần chia sẻ, thêm ngoại lệ trong `.gitignore`
> của repo rồi `git add -f`.
