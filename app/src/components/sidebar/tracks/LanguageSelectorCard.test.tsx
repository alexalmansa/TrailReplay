import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { LanguageSelectorCard, MapControlsNote } from '@/components/sidebar/tracks/LanguageSelectorCard';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('LanguageSelectorCard', () => {
  it('renders map controls and language actions accessibly', async () => {
    const { container } = renderWithProviders(
      <>
        <MapControlsNote />
        <LanguageSelectorCard />
      </>
    );

    expect(screen.getByText('Map Controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
