// The Pages Functions live outside app/, so they cannot share the app's Vitest
// config — Vite refuses to serve files above its root. Their pure helpers still
// carry compliance and security weight (consent geography, token hashing, input
// validation), so they get their own runner rooted at the repository.
//
// Exported as a plain object rather than via `defineConfig`, which is only an
// identity helper: importing it would need vitest resolvable from the repo
// root, and it is installed under app/.
export default {
  test: {
    include: ['functions-lib/**/*.{test,spec}.js'],
    environment: 'node',
  },
};
