import { useState } from 'react'
import { BookmarkIcon, SearchIcon, TrashIcon } from '@/components/icons'
import { AudioButton } from '@/components/common/AudioButton'
import { IllustrationPlaceholder } from '@/components/common/IllustrationPlaceholder'
import { VocabularyCard } from '@/components/common/VocabularyCard'
import { WordDetailHero } from '@/components/common/WordDetailHero'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { SearchBar } from '@/components/ui/SearchBar'
import { ReviewSkeleton, StatsSkeleton, WordDetailSkeleton } from '@/components/ui/PageSkeleton'
import { Skeleton, VocabularyCardSkeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import type { WordSummary } from '@/types/dictionary'

/**
 * Gallery NỘI BỘ — mọi component × mọi trạng thái, để đối chiếu bằng mắt với
 * `hanora-ui-showcase.png`.
 *
 * Không nằm trong bottom navigation và không ai vào bằng đường thường. Nó là
 * công cụ của người làm, không phải một màn của sản phẩm.
 */
const SAMPLE: WordSummary = {
  id: 1,
  simplified: '学习',
  traditional: '學習',
  pinyin: 'xuéxí',
  han_viet: 'học tập',
  definitions_en: ['to learn', 'to study'],
  definitions_vi: ['học', 'tìm hiểu'],
  hsk_level: 1,
}

const NO_HAN_VIET: WordSummary = {
  ...SAMPLE,
  id: 2,
  simplified: '沙发',
  traditional: '沙發',
  pinyin: 'shāfā',
  han_viet: null,
  definitions_en: ['sofa (loanword)'],
  // `null` là ca thật của ~7% từ không có trong CVDICT — thẻ phải không vỡ và
  // không để lại khung trống. Cùng lý do mẫu này để `han_viet: null`.
  definitions_vi: null,
  hsk_level: null,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-section text-text-primary">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function GalleryPage() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="space-y-8 pb-8">
      <header>
        <h1 className="text-title">Gallery</h1>
        <p className="text-body text-text-secondary">
          Trang nội bộ để kiểm tra thị giác. Không có trong điều hướng.
        </p>
      </header>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Lưu từ</Button>
          <Button variant="secondary">Thứ hai</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Xóa</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Nhỏ</Button>
          <Button size="md">Vừa</Button>
          <Button size="lg">Lớn</Button>
          <Button loading>Đang lưu</Button>
          <Button disabled>Vô hiệu</Button>
        </div>
      </Section>

      <Section title="IconButton">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Tìm kiếm" icon={<SearchIcon />} />
          <IconButton label="Lưu" icon={<BookmarkIcon />} variant="soft" />
          <IconButton label="Đã lưu" icon={<BookmarkIcon filled />} variant="primary" />
          <IconButton label="Xóa" icon={<TrashIcon />} disabled />
        </div>
      </Section>

      <Section title="AudioButton">
        <div className="flex items-center gap-2">
          <AudioButton state="idle" />
          <AudioButton state="playing" />
          <AudioButton state="unsupported" />
        </div>
      </Section>

      <Section title="Input & SearchBar">
        <SearchBar
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
        />
        <Input label="Email" placeholder="ban@email.com" />
        <Input label="Mật khẩu" type="password" error="Mật khẩu phải có ít nhất 8 ký tự." />
        <Input label="Tên" hint="Tên hiển thị trong app." />
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">HSK 1</Badge>
          <Badge tone="neutral">Hôm qua</Badge>
          <Badge tone="success">Đã thuộc</Badge>
          <Badge tone="warning">Tới hạn</Badge>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          label="Lọc kho từ"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: 'Tất cả' },
            { value: 'new', label: 'Chưa học' },
            { value: 'learning', label: 'Đang học' },
            { value: 'mastered', label: 'Đã học' },
          ]}
        />
      </Section>

      <Section title="VocabularyCard">
        <VocabularyCard word={SAMPLE} onSelect={() => {}} onToggleSave={() => {}} />
        <VocabularyCard
          word={SAMPLE}
          variant="featured"
          saved
          onSelect={() => {}}
          onToggleSave={() => {}}
        />
        <VocabularyCard word={SAMPLE} loading onToggleSave={() => {}} />
        <VocabularyCard word={NO_HAN_VIET} onSelect={() => {}} onToggleSave={() => {}} />
      </Section>

      <Section title="WordDetailHero">
        {/*
          Truyền placeholder vào `illustration` có chủ đích: `SAMPLE.id` là một
          id giả, nên để hero tự gọi API ảnh sẽ tạo bản ghi và xếp một job
          Pixabay thật cho một từ chẳng liên quan — mỗi lần ai đó mở gallery.
        */}
        <WordDetailHero
          word={SAMPLE}
          actions={<Button variant="secondary">Lưu vào kho</Button>}
          illustration={<IllustrationPlaceholder className="mt-2 w-32" />}
        />
      </Section>

      <Section title="Skeleton">
        <VocabularyCardSkeleton />
        <Skeleton className="h-4 w-40" />
      </Section>

      {/*
        Khung xương cấp TRANG. Nằm ở đây để soi được hai thứ mà test không bắt
        nổi: tương phản của `--color-skeleton` ở cả hai chủ đề, và chiều cao có
        khớp component thật không.
      */}
      <Section title="PageSkeleton — Thống kê">
        <StatsSkeleton />
      </Section>

      <Section title="PageSkeleton — Chi tiết từ">
        <WordDetailSkeleton />
      </Section>

      <Section title="PageSkeleton — Ôn tập">
        <ReviewSkeleton />
      </Section>

      <Section title="EmptyState">
        <Card>
          <EmptyState
            illustration={<IllustrationPlaceholder className="w-24" />}
            title="Chưa có từ nào trong kho."
            description="Hãy tìm một từ bạn muốn nhớ hôm nay 🌸"
            action={<Button>Tìm từ đầu tiên</Button>}
          />
        </Card>
      </Section>

      <Section title="BottomSheet">
        <Button onClick={() => setSheetOpen(true)}>Mở bottom sheet</Button>
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Tùy chọn">
          <div className="space-y-2">
            <Button fullWidth variant="secondary">
              Đánh dấu đã thuộc
            </Button>
            <Button fullWidth variant="destructive">
              Xóa khỏi kho
            </Button>
          </div>
        </BottomSheet>
      </Section>
    </div>
  )
}
