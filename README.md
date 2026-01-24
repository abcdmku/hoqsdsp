# CamillaDSP Frontend

A modern, responsive web interface for [CamillaDSP](https://github.com/HEnquist/camilladsp) - a flexible audio processing application with support for advanced filtering, routing, and real-time monitoring.

## Features

- **Real-time Monitoring**: Live level meters with peak hold, CPU/buffer monitoring
- **Interactive EQ Editor**: Graphical parametric EQ with draggable nodes and frequency response visualization
- **Routing Matrix**: Visual input/output routing with gain and phase control
- **Filter Management**: Support for all CamillaDSP filter types (Biquad, Convolution, Delay, Compressor, etc.)
- **Multi-Unit Support**: Manage multiple CamillaDSP instances from a single dashboard
- **Configuration Import/Export**: Load and save YAML/JSON configuration files
- **Keyboard Shortcuts**: Full keyboard navigation and accessibility support
- **Responsive Design**: Works on desktop and tablet screens (768px minimum)

## Tech Stack

- **React 19** with TypeScript
- **Vite 7** for fast development and optimized builds
- **Tailwind CSS 4** for styling
- **Zustand** for client-side state management
- **TanStack Query** for server state
- **Radix UI** for accessible UI primitives
- **Vitest** for testing

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- A running CamillaDSP instance with WebSocket server enabled

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd camilladsp-frontend

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

The built files will be in the `dist/` directory.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
src/
├── app/              # Application shell (App, router, providers)
├── components/       # React components
│   ├── channel-strip/  # Channel processing view
│   ├── config/         # Import/export dialogs
│   ├── dashboard/      # Network dashboard
│   ├── eq-editor/      # Interactive EQ editor
│   ├── feedback/       # Toast, error boundary, loading states
│   ├── filters/        # Filter editor modals
│   ├── layout/         # TopNav, Sidebar, StatusBar
│   ├── monitoring/     # Level meters, metrics
│   ├── routing/        # Routing matrix
│   └── ui/             # Base UI primitives
├── features/         # Feature-specific hooks and logic
│   ├── configuration/  # Config queries and mutations
│   ├── connection/     # WebSocket connection hooks
│   └── realtime/       # Real-time data subscriptions
├── hooks/            # Shared React hooks
├── lib/              # Core utilities
│   ├── config/         # YAML/JSON parsing and validation
│   ├── dsp/            # DSP calculations (biquad response)
│   ├── filters/        # Filter type handlers with Zod validation
│   ├── utils/          # General utilities
│   └── websocket/      # WebSocket manager and reconnection
├── stores/           # Zustand state stores
├── styles/           # Global styles and Tailwind theme
├── test/             # Test setup and mocks
└── types/            # TypeScript type definitions
```

## Connecting to CamillaDSP

The frontend connects to CamillaDSP's WebSocket server. Make sure your CamillaDSP instance is configured with:

```yaml
# In your CamillaDSP config
server:
  enabled: true
  host: 0.0.0.0
  port: 1234
```

Then add the unit in the dashboard using the address (e.g., `ws://192.168.1.100:1234`).

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modal or clear selection |
| `Ctrl+B` / `Cmd+B` | Toggle sidebar |
| `1-9` | Select EQ band (in EQ editor) |
| `Delete` | Remove selected band/connection |
| `B` | Bypass selected band |
| Arrow keys | Adjust values / navigate |

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

The test suite includes:
- Unit tests for DSP calculations
- Filter handler validation tests
- WebSocket manager tests
- Component rendering tests
- Integration tests with MSW

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes
6. Push to your branch
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [CamillaDSP](https://github.com/HEnquist/camilladsp) by Henrik Enquist
- [Radix UI](https://www.radix-ui.com/) for accessible UI primitives
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
