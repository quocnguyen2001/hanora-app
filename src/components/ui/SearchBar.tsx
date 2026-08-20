import { forwardRef } from 'react'
import { CloseIcon, SearchIcon } from '@/components/icons'
import { IconButton } from './IconButton'
import { Input, type InputProps } from './Input'

export interface SearchBarProps extends Omit<InputProps, 'leadingIcon' | 'trailingSlot' | 'label'> {
  onClear?: () => void
}

/**
 * Ô tìm kiếm của màn Tìm kiếm.
 *
 * KHÔNG có nút camera. Tìm bằng ảnh nằm ngoài MVP, và ship một nút không làm gì
 * còn tệ hơn không có nút — người dùng bấm rồi tự hỏi mình làm sai chỗ nào.
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onClear, placeholder = 'Tìm từ vựng tiếng Trung...', ...props },
  ref,
) {
  const hasValue = typeof value === 'string' && value.length > 0

  return (
    <Input
      ref={ref}
      type="search"
      role="searchbox"
      value={value}
      placeholder={placeholder}
      leadingIcon={<SearchIcon size={20} />}
      trailingSlot={
        hasValue && onClear ? (
          <IconButton label="Xóa từ khóa" icon={<CloseIcon size={18} />} onClick={onClear} />
        ) : null
      }
      {...props}
    />
  )
})
