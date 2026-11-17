import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from './router';

const renderAt = (path: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('routes', () => {
  it('/ shows the shop page', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: /shopping copilot/i })).toHaveAttribute('href', '/chat');
  });

  it('/chat/:id shows the full-page chat for that conversation', () => {
    renderAt('/chat/abc');
    expect(screen.getByText(/Chat abc/)).toBeInTheDocument();
  });
});
