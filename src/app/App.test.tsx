import { describe, it, expect } from 'vitest';
import { render } from '../test/utils';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });
});
