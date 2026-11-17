import type { Conversation } from '@app/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { assistantMessage, phoneGroup, userMessage } from '../test/fixtures';
import { ChatView } from './ChatView';

const CONV_ID = '11111111-1111-4111-8111-111111111111';

/** A POST /api/chat response whose SSE chunks the test pushes one by one. */
function controllableStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start: (c) => (controller = c) });
  const encoder = new TextEncoder();
  return {
    response: new Response(body, { headers: { 'content-type': 'text/event-stream' } }),
    push: async (...chunks: object[]) => {
      await act(async () => {
        for (const chunk of chunks) controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        await new Promise((r) => setTimeout(r, 20));
      });
    },
    end: async () => {
      await act(async () => {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        await new Promise((r) => setTimeout(r, 20));
      });
    },
  };
}

type Route = (init: RequestInit | undefined) => Response | Promise<Response>;

function stubFetch(routes: Record<string, Route>) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      const route = routes[`${init?.method ?? 'GET'} ${url}`];
      if (!route) throw new Error(`Unexpected fetch ${init?.method ?? 'GET'} ${url}`);
      return route(init);
    }),
  );
  return calls;
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const notFound = json({ error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' } }, 404);

function renderChat(props: { fresh?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onNewChat = vi.fn();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <ChatView conversationId={CONV_ID} fresh={props.fresh ?? false} onNewChat={onNewChat} />
    </QueryClientProvider>,
  );
  return { onNewChat, invalidate };
}

afterEach(() => vi.unstubAllGlobals());

describe('ChatView', () => {
  it('shows a stored Conversation with its text and Product Groups after a reload (AC5.1, AC6.3)', async () => {
    const stored: Conversation = {
      id: CONV_ID,
      title: 'a phone under $500',
      updatedAt: '2026-11-17T10:00:05.000Z',
      messages: [
        userMessage('u1', 'a phone under $500'),
        assistantMessage('a1', 'Here is **one** option.', { productGroups: [phoneGroup] }),
      ],
    };
    stubFetch({ [`GET /api/conversations/${CONV_ID}`]: json(stored) });
    renderChat();

    expect(await screen.findByText('a phone under $500')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Phones under $500' })).toHaveTextContent('iPhone 9');
    expect(screen.getByText('one').tagName).toBe('STRONG');
  });

  it('says "Conversation not found" for an unknown id that was not just created', async () => {
    stubFetch({ [`GET /api/conversations/${CONV_ID}`]: notFound });
    const { onNewChat } = renderChat();

    expect(await screen.findByText('Conversation not found')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(onNewChat).toHaveBeenCalled();
  });

  it('streams a new turn: bubble at once, input disabled, search status, group, text in steps (AC1.1, AC2.1, AC2.2)', async () => {
    const stream = controllableStream();
    const calls = stubFetch({
      [`GET /api/conversations/${CONV_ID}`]: notFound,
      'POST /api/chat': () => stream.response,
    });
    const { invalidate } = renderChat({ fresh: true });
    const input = await screen.findByRole('textbox', { name: 'Message' });

    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(calls.filter((c) => c.url === '/api/chat')).toHaveLength(0); // AC1.2

    await userEvent.type(input, 'a phone under $500{Enter}');
    expect(screen.getByText('a phone under $500')).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(input).toHaveValue('');
    expect(screen.getByRole('status', { name: 'Assistant is typing' })).toBeInTheDocument();

    const post = calls.find((c) => c.url === '/api/chat')!;
    const body = JSON.parse(String(post.init?.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['conversationId', 'message']);
    expect(body).toMatchObject({ conversationId: CONV_ID, message: { text: 'a phone under $500' } });

    await stream.push(
      { type: 'start' },
      { type: 'start-step' },
      {
        type: 'tool-input-available',
        toolCallId: 't1',
        toolName: 'search_products',
        input: phoneGroup.query,
      },
    );
    expect(screen.getByText('Searching: Phones under $500…')).toBeInTheDocument();

    await stream.push(
      { type: 'tool-output-available', toolCallId: 't1', output: phoneGroup },
      { type: 'finish-step' },
      { type: 'start-step' },
      { type: 'text-start', id: 'x' },
      { type: 'text-delta', id: 'x', delta: 'Found ' },
    );
    expect(screen.queryByText(/Searching:/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Phones under $500' })).toBeInTheDocument();
    expect(screen.getByText(/^Found/)).toBeInTheDocument();

    await stream.push({ type: 'text-delta', id: 'x', delta: 'one phone.' });
    expect(screen.getByText(/Found one phone\./)).toBeInTheDocument();
    expect(input).toBeDisabled();

    await stream.push({ type: 'text-end', id: 'x' }, { type: 'finish-step' }, { type: 'finish' });
    await stream.end();
    await waitFor(() => expect(input).toBeEnabled());
    // Sidebar list refreshed once the turn ended.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['conversations', 'list'] });
  });

  it('keeps the partial text on a mid-stream error and resends the same Message on Retry (AC2.3)', async () => {
    const first = controllableStream();
    const second = controllableStream();
    const responses = [first.response, second.response];
    const calls = stubFetch({
      [`GET /api/conversations/${CONV_ID}`]: notFound,
      'POST /api/chat': () => responses.shift()!,
    });
    renderChat({ fresh: true });

    await userEvent.type(await screen.findByRole('textbox', { name: 'Message' }), 'smartphones{Enter}');
    await first.push(
      { type: 'start' },
      { type: 'start-step' },
      { type: 'text-start', id: 'x' },
      { type: 'text-delta', id: 'x', delta: 'Here are some' },
      { type: 'error', errorText: 'The assistant could not finish this reply. Please try again.' },
    ); // the client stops reading after an error part — no end() needed

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The assistant could not finish this reply.');
    expect(screen.getByText(/Here are some/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const posts = calls.filter((c) => c.url === '/api/chat').map((c) => JSON.parse(String(c.init?.body)));
    expect(posts).toHaveLength(2);
    expect(posts[1]).toEqual(posts[0]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens the details popup from a card and closes it with Esc, focus back on the card (AC4.3)', async () => {
    stubFetch({
      [`GET /api/conversations/${CONV_ID}`]: json(storedWithPhones),
      'GET /api/products/1': json({
        ...phoneGroup.products[0],
        brand: 'Apple',
        stock: 3,
        images: ['https://cdn.example/1a.png', 'https://cdn.example/1b.png'],
        tags: ['smartphones', 'apple'],
      }),
    });
    renderChat();

    const card = await screen.findByRole('button', { name: /iPhone 9/ });
    await userEvent.click(card);
    const dialog = await screen.findByRole('dialog', { name: 'iPhone 9' });
    expect(dialog).toHaveTextContent('Apple');
    expect(dialog).toHaveTextContent('Only 3 left');
    expect(dialog).toHaveTextContent('$554.44'); // original price before 10% off
    expect(within(dialog).getByRole('img', { name: 'iPhone 9' })).toHaveAttribute(
      'src',
      'https://cdn.example/1a.png',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: 'Image 2' }));
    expect(within(dialog).getByRole('img', { name: 'iPhone 9' })).toHaveAttribute(
      'src',
      'https://cdn.example/1b.png',
    );

    fireEvent(dialog, new Event('cancel', { cancelable: true })); // what the browser fires on Esc
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it('closes the popup with ✕ and on a backdrop click', async () => {
    stubFetch({
      [`GET /api/conversations/${CONV_ID}`]: json(storedWithPhones),
      'GET /api/products/1': json({ ...phoneGroup.products[0], stock: 50, images: [], tags: [] }),
    });
    renderChat();

    await userEvent.click(await screen.findByRole('button', { name: /iPhone 9/ }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /iPhone 9/ }));
    const dialog = await screen.findByRole('dialog', { name: 'iPhone 9' });
    expect(dialog).toHaveTextContent('In stock');
    await userEvent.click(dialog); // the <dialog> element itself = its backdrop
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Show more" asks the Assistant for the next page of that group (AC4.4)', async () => {
    const stream = controllableStream();
    const calls = stubFetch({
      [`GET /api/conversations/${CONV_ID}`]: json(storedWithPhones),
      'POST /api/chat': () => stream.response,
    });
    renderChat();

    await userEvent.click(await screen.findByRole('button', { name: 'Show more' }));
    const post = calls.find((c) => c.url === '/api/chat')!;
    expect(JSON.parse(String(post.init?.body))).toMatchObject({
      message: { text: 'Show more: Phones under $500' },
    });
    expect(screen.getByRole('button', { name: 'Show more' })).toBeDisabled();
  });
});

const storedWithPhones: Conversation = {
  id: CONV_ID,
  title: 'a phone under $500',
  updatedAt: '2026-11-17T10:00:05.000Z',
  messages: [
    userMessage('u1', 'a phone under $500'),
    assistantMessage('a1', 'Here is one.', { productGroups: [phoneGroup] }),
  ],
};
