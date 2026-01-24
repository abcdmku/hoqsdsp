import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TopNav, type TopNavProps } from './TopNav';
import type { CamillaConfig } from '../../types';

// Mock the stores
const mockToggleSidebar = vi.fn();
const mockSidebarOpen = true;
const mockActiveConnection = { status: 'disconnected' as const };

vi.mock('../../stores', () => ({
  useUIStore: (selector: (state: { toggleSidebar: () => void; sidebarOpen: boolean }) => unknown) =>
    selector({ toggleSidebar: mockToggleSidebar, sidebarOpen: mockSidebarOpen }),
  useConnectionStore: (selector: (state: unknown) => unknown) =>
    selector({ connections: { 'unit-1': mockActiveConnection }, activeUnitId: 'unit-1' }),
  selectActiveConnection: () => mockActiveConnection,
}));

// Mock the config dialogs
vi.mock('../config/ConfigImportDialog', () => ({
  ConfigImportDialog: ({ open, onImport }: { open: boolean; onImport: (config: CamillaConfig) => void }) =>
    open ? (
      <div data-testid="import-dialog">
        <button onClick={() => { onImport({} as CamillaConfig); }} data-testid="import-button">
          Import
        </button>
      </div>
    ) : null,
}));

vi.mock('../config/ConfigExportDialog', () => ({
  ConfigExportDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="export-dialog">Export Dialog</div> : null,
}));

const defaultProps: TopNavProps = {};

describe('TopNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the application title', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /camilladsp/i })).toBeInTheDocument();
    });

    it('should render sidebar toggle button', () => {
      render(<TopNav {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /collapse sidebar|expand sidebar/i })
      ).toBeInTheDocument();
    });

    it('should render import button', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('button', { name: /import configuration/i })).toBeInTheDocument();
    });

    it('should render export button', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('button', { name: /export configuration/i })).toBeInTheDocument();
    });

    it('should render settings button', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    });

    it('should render connection status', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Sidebar Toggle', () => {
    it('should call toggleSidebar when button clicked', async () => {
      const user = userEvent.setup();
      render(<TopNav {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /collapse sidebar|expand sidebar/i }));

      expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('should have correct aria-expanded attribute', () => {
      render(<TopNav {...defaultProps} />);

      const button = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-controls pointing to sidebar', () => {
      render(<TopNav {...defaultProps} />);

      const button = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(button).toHaveAttribute('aria-controls', 'sidebar');
    });
  });

  describe('Import/Export', () => {
    it('should open import dialog when import button clicked', async () => {
      const user = userEvent.setup();
      render(<TopNav {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /import configuration/i }));

      expect(screen.getByTestId('import-dialog')).toBeInTheDocument();
    });

    it('should call onConfigImport when config is imported', async () => {
      const onConfigImport = vi.fn();
      const user = userEvent.setup();
      render(<TopNav {...defaultProps} onConfigImport={onConfigImport} />);

      // Open dialog
      await user.click(screen.getByRole('button', { name: /import configuration/i }));

      // Click import button in dialog
      await user.click(screen.getByTestId('import-button'));

      expect(onConfigImport).toHaveBeenCalled();
    });

    it('should open export dialog when export button clicked', async () => {
      const mockConfig: CamillaConfig = {
        devices: {
          samplerate: 48000,
          chunksize: 1024,
          enable_rate_adjust: false,
          capture: { type: 'Alsa', device: 'hw:0', channels: 2 },
          playback: { type: 'Alsa', device: 'hw:1', channels: 2 },
        },
        filters: {},
        mixers: {},
        pipeline: [],
      };
      const user = userEvent.setup();
      render(<TopNav {...defaultProps} currentConfig={mockConfig} />);

      await user.click(screen.getByRole('button', { name: /export configuration/i }));

      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
    });

    it('should disable export button when no config available', () => {
      render(<TopNav {...defaultProps} currentConfig={undefined} />);

      const exportButton = screen.getByRole('button', { name: /export configuration/i });
      expect(exportButton).toBeDisabled();
    });

    it('should enable export button when config is available', () => {
      const mockConfig: CamillaConfig = {
        devices: {
          samplerate: 48000,
          chunksize: 1024,
          enable_rate_adjust: false,
          capture: { type: 'Alsa', device: 'hw:0', channels: 2 },
          playback: { type: 'Alsa', device: 'hw:1', channels: 2 },
        },
        filters: {},
        mixers: {},
        pipeline: [],
      };
      render(<TopNav {...defaultProps} currentConfig={mockConfig} />);

      const exportButton = screen.getByRole('button', { name: /export configuration/i });
      expect(exportButton).not.toBeDisabled();
    });
  });

  describe('Connection Status', () => {
    it('should show disconnected status', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should have correct aria-label for connection status', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Connection status: disconnected'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have banner role on header', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should have aria-live on status for announcements', () => {
      render(<TopNav {...defaultProps} />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(<TopNav {...defaultProps} />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
