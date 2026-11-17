import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { phoneGroup } from '../test/fixtures';
import { routes } from './router';

const UUID = /^\/chat\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/conversations'
        ? respond([{ id: 'c1', title: 'show me smartphones', updatedAt: new Date().toISOString() }])
        : url === '/api/products?limit=10'
          ? respond([phoneGroup.products[0]])
          : respond({ error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } }, 404),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('routes', () => {
  it('/ shows the shop page with top-rated Products and the copilot launcher (US6b)', async () => {
    renderAt('/');
    expect(await screen.findByRole('button', { name: /iPhone 9/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open shopping copilot' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shopping copilot/i })).toHaveAttribute('href', '/chat');
  });

  it('/chat puts a new Conversation id in the URL and opens an empty chat (D27)', async () => {
    const router = renderAt('/chat');
    expect(await screen.findByText('What are you shopping for?')).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(UUID);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('New chat');
  });

  it('/chat/:id lists Conversations in the sidebar', async () => {
    renderAt('/chat/c1');
    expect(await screen.findByRole('button', { name: /^show me smartphones/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('show me smartphones');
  });
});
