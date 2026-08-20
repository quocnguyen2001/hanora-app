/**
 * Chỗ giữ chỗ cho màn chưa dựng. Nói rõ phase nào sẽ thay thế nó, để một màn
 * trống không bị nhầm là màn hỏng.
 *
 * Xóa file này khi phase cuối cùng trong danh sách dưới đây hoàn thành.
 */
export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">Màn này được dựng ở {phase}.</p>
    </section>
  )
}
