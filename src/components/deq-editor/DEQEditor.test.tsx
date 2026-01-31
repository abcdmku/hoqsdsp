import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/setup';
import userEvent from '@testing-library/user-event';
import { DEQEditor } from './DEQEditor';
import type { DeqBand } from './types';
import { DEFAULT_DEQ_DYNAMICS } from './types';

const defaultBands: DeqBand[] = [
  {
    id: 'band-1',
    enabled: true,
    parameters: { type: 'Peaking', freq: 1000, gain: 0, q: 1 },
    dynamics: { ...DEFAULT_DEQ_DYNAMICS },
  },
];

describe('DEQEditor', () => {
  it('renders the editor shell', () => {
    render(<DEQEditor bands={defaultBands} onChange={() => {}} sampleRate={48000} />);
    expect(screen.getByText('Band Parameters')).toBeInTheDocument();
  });

  it('shows dynamics controls for a selected band', async () => {
    const user = userEvent.setup();
    render(<DEQEditor bands={defaultBands} onChange={vi.fn()} sampleRate={48000} />);

    const bandButton = screen.getAllByRole('button', { name: '1' })[0];
    await user.click(bandButton!);

    expect(screen.getByText('Range')).toBeInTheDocument();
    expect(screen.getByText('Threshold (dBFS)')).toBeInTheDocument();
    expect(screen.getByText('Ratio')).toBeInTheDocument();
    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByText('Release')).toBeInTheDocument();
  });
});
