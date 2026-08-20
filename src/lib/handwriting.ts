import { apiRequest } from '@/lib/api'

/** Một nét = danh sách điểm [x, y] theo thứ tự vẽ. */
export type Stroke = [number, number][]

/**
 * Bao bọc engine nhận dạng.
 *
 * Cả app chỉ biết tới hàm này. Engine thật (hiện là Google Input Tools, proxy
 * qua backend vì CORS) được chốt sau spike R3 —
 * `plans/reports/spike-260821-0140-handwriting-engine.md`.
 *
 * Endpoint đó KHÔNG chính thức và có thể ngừng bất cứ lúc nào. Giữ interface
 * hẹp ở đây nghĩa là đổi engine chỉ chạm một file, không lan ra UI.
 */
export function recognise(strokes: Stroke[], width: number, height: number): Promise<string[]> {
  return apiRequest<string[]>('/handwriting/recognize', {
    method: 'POST',
    body: { strokes, width, height },
  })
}
