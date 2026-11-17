import type { Conversation } from '@app/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { WIDGET_STORAGE_KEY } from '../lib/widget-state';
import { assistantMessage, phoneGroup, userMessage } from '../test/fixtures';
import { WidgetShell } from './WidgetShell';

const C1 = '11111111-1111-4111-8111-111111111111';
const C2 = '22222222-2222-4222-8222-222222222222';

const conversations: Record<string, Conversation> = {
  [C1]: {
    id: C1,
    title: 'a phone under $500',
    updatedAt: '2026-11-17T10:00:05.000Z',
    messages: [
      userMessage('u1', 'a phone under $500'),
      assistantMessage('a1', 'Here you go.', { productGroups: [phoneGroup] }),
    ],
  },
  [C2]: {
    id: C2,
    title: 'a red lipstick',
    updatedAt: '2026-11-17T09:00:00.000Z',
    messages: [userMessage('u2', 'a red lipstick'), assistantMessage('a2', 'Try these.')],
  },
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/conversations')
        return respond(
          Object.values(conversations).map(({ id, title, updatedAt }) => ({ id, title, updatedAt })),
        );
      const id = url.replace('/api/conversations/', '');
      return conversations[id]
        ? respond(conversations[id])
        : respond({ error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } }, 404);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function FullPage() {
  return <p>full page {useLocation().pathname}</p>;
}

function renderWidget() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <WidgetShell /> },
      { path: '/chat/:conversationId', element: <FullPage /> },
    ],
    { initialEntries: ['/'] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, unmount: view.unmount };
}

const stored = () => JSON.parse(localStorage.getItem(WIDGET_STORAGE_KEY) ?? 'null') as unknown;

describe('WidgetShell (US6b)', () => {
  it('opens from the launcher on an empty new chat and ✕ closes it, focus back on the launcher (AC6b.1)', async () => {
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Open shopping copilot' }));

    const window = screen.getByRole('dialog', { name: 'Shopping copilot' });
    expect(await within(window).findByText('What are you shopping for?')).toBeInTheDocument();
    expect(within(window).getByRole('heading', { name: 'New chat' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close shopping copilot' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open shopping copilot' })).toHaveFocus();
  });

  it('reopens on the same Conversation after a reload, with its Product Cards (AC6b.3)', async () => {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify({ open: true, conversationId: C1 }));
    const first = renderWidget();
    expect(await screen.findByText('Here you go.')).toBeInTheDocument();
    first.unmount();

    renderWidget();
    expect(await screen.findByText('Here you go.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iPhone 9/ })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'a phone under $500' })).toBeInTheDocument();
  });

  it('☰ lists Conversations, picking one switches to it, Esc hides the list (AC6b.2)', async () => {
    const user = userEvent.setup();
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify({ open: true, conversationId: C1 }));
    renderWidget();
    await screen.findByText('Here you go.');

    await user.click(screen.getByRole('button', { name: 'Show conversations' }));
    const list = screen.getByRole('navigation', { name: 'Conversations' });
    await user.click(await within(list).findByRole('button', { name: /^a red lipstick/ }));
    expect(await screen.findByText('Try these.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Conversations' })).not.toBeInTheDocument();
    expect(stored()).toEqual({ open: true, conversationId: C2 });

    await user.click(screen.getByRole('button', { name: 'Show conversations' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Conversations' })).not.toBeInTheDocument();
  });

  it('＋ starts a new chat; the old one stays in the list (AC6b.2)', async () => {
    const user = userEvent.setup();
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify({ open: true, conversationId: C1 }));
    renderWidget();
    await screen.findByText('Here you go.');

    await user.click(screen.getByRole('button', { name: 'New chat' }));
    expect(await screen.findByText('What are you shopping for?')).toBeInTheDocument();
    expect(stored()).toMatchObject({ open: true });
    expect((stored() as { conversationId: string }).conversationId).not.toBe(C1);
  });

  it('⤢ opens the same Conversation as a full page and closes the widget (AC6b.2)', async () => {
    const user = userEvent.setup();
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify({ open: true, conversationId: C1 }));
    const { router } = renderWidget();
    await screen.findByText('Here you go.');

    await user.click(screen.getByRole('button', { name: 'Open as full page' }));
    expect(await screen.findByText(`full page /chat/${C1}`)).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ fresh: true });
    expect(stored()).toEqual({ open: false, conversationId: C1 });
  });

  it('a corrupted pointer falls back to a closed widget on a new chat', () => {
    localStorage.setItem(WIDGET_STORAGE_KEY, '{oops');
    renderWidget();
    expect(screen.getByRole('button', { name: 'Open shopping copilot' })).toBeInTheDocument();
  });
});
