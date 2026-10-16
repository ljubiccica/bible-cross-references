import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { InstallGuideDialog } from '../ui/InstallGuide.tsx';
import '../styles/global.css';

/**
 * Renders a page's root component into `#root`, beside the one thing every page shares that is
 * not part of any of them: the install guide, which the footers open and which lives out here so
 * that a page with several views (each with a footer of its own) still has exactly one.
 */
export function mount(page: ReactNode): void {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element #root not found.');
  }
  createRoot(container).render(
    <StrictMode>
      {page}
      <InstallGuideDialog />
    </StrictMode>,
  );
}
