import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'dev-dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      // v7: `configs['recommended-latest']` vẫn là shape eslintrc cũ,
      // bản flat config nằm dưới `configs.flat`.
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      // Cuối cùng: tắt mọi rule về format, Prettier lo phần đó.
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Tailwind v4 biên dịch `rounded-[--radius-card]` thành
      // `border-radius: --radius-card` — thiếu `var()`, giá trị không hợp lệ,
      // trình duyệt bỏ qua declaration. Bug này từng làm MỌI bo góc trong app
      // biến mất mà không có lỗi build nào.
      //
      // Cách đúng: dùng utility sinh từ namespace theme (`rounded-card`), hoặc
      // cú pháp ngoặc tròn (`rounded-(--radius-card)`) khi cần custom property
      // không có trong theme.
      //
      // Chỉ khớp `[--`, nên arbitrary value thường (`max-w-[260px]`,
      // `pb-[env(safe-area-inset-bottom)]`) không bị chặn.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\[--/]',
          message:
            'Arbitrary value với bare custom property không sinh var(). Dùng utility theme (rounded-card) hoặc cú pháp ngoặc tròn (rounded-(--radius-card)).',
        },
        {
          selector: 'TemplateElement[value.raw=/\\[--/]',
          message:
            'Arbitrary value với bare custom property không sinh var(). Dùng utility theme (rounded-card) hoặc cú pháp ngoặc tròn (rounded-(--radius-card)).',
        },
      ],
    },
  },
  {
    // File cấu hình chạy ở Node, không phải trình duyệt, và nằm ngoài tsconfig.app.
    files: ['*.config.{js,ts}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
)
