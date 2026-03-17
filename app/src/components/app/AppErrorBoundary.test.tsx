import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AppErrorBoundary } from '@/components/app/AppErrorBoundary';
import { renderWithProviders } from '@/test/renderWithProviders';

function CrashingComponent(): null {
  throw new Error('boom');
}

describe('AppErrorBoundary', () => {
  it('renders the fallback UI when a child crashes', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(
      <AppErrorBoundary>
        <CrashingComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload TrailReplay' })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('keeps the fallback accessible', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderWithProviders(
      <AppErrorBoundary>
        <CrashingComponent />
      </AppErrorBoundary>
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
    consoleErrorSpy.mockRestore();
  });
});
