import { useState } from 'react'
import { AudioButton } from '@/components/common/AudioButton'
import { HanziPlate } from '@/components/common/HanziPlate'
import type { CharacterBreakdown } from '@/types/dictionary'
import { CharacterAttributes } from './CharacterAttributes'
import { HanziWritingSheet } from './HanziWritingSheet'

/**
 * Một Hán tự: ô chữ mẫu bên trái, sáu thuộc tính bên phải.
 *
 * Thay `CharacterRow` cũ, vốn chỉ có ba thứ trên một dòng (chữ · pinyin · âm
 * Hán-Việt). Bố cục bám ảnh demo của yêu cầu.
 *
 * `HanziPlate` chứ không dựng lại ô nền: nó đã là "tấm nền cho chữ Hán cỡ hero"
 * và đã ghi rõ ranh giới — không thêm lưới ô ly, hoa văn hay khung triện, vì
 * `brand.md` cấm.
 */
export function CharacterCard({
  character,
  audioState,
  onPlay,
}: {
  character: CharacterBreakdown
  audioState: React.ComponentProps<typeof AudioButton>['state']
  onPlay: () => void
}) {
  const [writing, setWriting] = useState(false)

  return (
    /*
      `flex flex-col` để nút tập viết đẩy được xuống đáy bằng `mt-auto`.

      Bắt buộc từ khi panel xếp các thẻ này thành LƯỚI hai cột: ô lưới cùng hàng
      cao bằng nhau, nhưng nội dung bên trên nút thì không — chữ 8 nét có dòng
      "Nét bút" dài gấp đôi chữ 3 nét. Không có `mt-auto` thì hai nút nằm ở hai
      độ cao khác nhau và cả hàng đọc ra là gãy.

      Viền ngăn cách CHỈ ở bố cục một cột. Ở lưới, `gap` đã tách các ô rồi, và
      viền dưới của ô trái biến thành một vạch cụt lơ lửng giữa thẻ.
    */
    <li className="border-border/60 flex flex-col gap-3 max-md:border-b max-md:pb-4 max-md:last:border-0 max-md:last:pb-0">
      <div className="flex items-start gap-3">
        {/* `shrink-0`: chữ nhiều nét không được co lại nhường chỗ cho cột chữ. */}
        <HanziPlate className="shrink-0 px-4 py-2">{character.char}</HanziPlate>

        <div className="min-w-0 flex-1">
          <CharacterAttributes character={character} />
        </div>

        <AudioButton state={audioState} onPlay={onPlay} size="sm" />
      </div>

      {/*
        `chunky chunky-primary` đi CẶP — luật của `app.css`. Không kèm
        `shadow-card`: cả hai đặt `box-shadow` và cái nào thắng phụ thuộc thứ tự
        trong CSS xuất ra.

        Nút full-width như ảnh demo, và nó là hành động chính của thẻ này.
      */}
      <button
        type="button"
        onClick={() => setWriting(true)}
        className="chunky chunky-primary rounded-control-lg bg-primary text-on-primary text-body duration-press ease-soft mt-auto min-h-11 w-full font-bold transition"
      >
        Tập viết Hán tự
      </button>

      {/*
        Sheet chỉ MOUNT khi đã mở một lần. `enabled: open` bên trong đã chặn
        request, nhưng không mount hẳn thì cũng không dựng `BottomSheet` cho mỗi
        chữ của mọi từ người dùng mở.
      */}
      {writing && (
        <HanziWritingSheet char={character.char} open={writing} onClose={() => setWriting(false)} />
      )}
    </li>
  )
}
