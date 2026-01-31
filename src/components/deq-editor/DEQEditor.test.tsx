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

  it('enables dynamics for a selected band', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DEQEditor bands={defaultBands} onChange={onChange} sampleRate={48000} />);

    const bandButton = screen.getAllByRole('button', { name: '1' })[0];
    await user.click(bandButton!);

    const dynamicsSwitch = screen.getByRole('switch', { name: /enable dynamics/i });
    await user.click(dynamicsSwitch);

    expect(onChange).toHaveBeenCalled();
  });
});
