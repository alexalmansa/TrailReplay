import { StrictMode, type ReactElement } from 'react';
import { render } from '@testing-library/react';

/**
 * Shared render helper for component tests. Keep tests mounted under StrictMode
 * so component behavior matches the app entry point.
 */
export function renderWithProviders(ui: ReactElement) {
  return render(<StrictMode>{ui}</StrictMode>);
}
