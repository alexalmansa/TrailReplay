# Component Test Template

Use this structure for new component tests in `app/src/components/**`.

```tsx
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ExampleComponent } from '@/components/example/ExampleComponent';

describe('ExampleComponent', () => {
  it('renders the primary UI state', () => {
    renderWithProviders(<ExampleComponent />);

    expect(screen.getByRole('heading', { name: 'Example title' })).toBeInTheDocument();
  });

  it('stays accessible', async () => {
    const { container } = renderWithProviders(<ExampleComponent />);
    const results = await axe(container);

    expect(results.violations).toHaveLength(0);
  });
});
```

Guidelines:

- Prefer `renderWithProviders(...)` so tests run under the same `StrictMode`
  behavior as the app entrypoint.
- Add one accessibility assertion for user-facing components that own layout,
  controls, or text content.
- Keep feature behavior tests near the component unless the behavior is already
  covered better as a pure utility or store test.
