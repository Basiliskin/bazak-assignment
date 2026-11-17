import { parseWidgetState, serializeWidgetState, WIDGET_STORAGE_KEY } from './widget-state';

const ID = '11111111-1111-4111-8111-111111111111';
const NEW_ID = '22222222-2222-4222-8222-222222222222';

describe('widget state (localStorage pointer, D38)', () => {
  it('round-trips open state and Conversation id', () => {
    const state = { open: true, conversationId: ID };
    expect(parseWidgetState(serializeWidgetState(state), NEW_ID)).toEqual(state);
  });

  it.each([
    ['nothing stored', null],
    ['not JSON', '{oops'],
    ['wrong shape', JSON.stringify({ open: 'yes', conversationId: ID })],
    ['id is not a uuid', JSON.stringify({ open: true, conversationId: '../admin' })],
  ])('%s → closed, new chat', (_, raw) => {
    expect(parseWidgetState(raw, NEW_ID)).toEqual({ open: false, conversationId: NEW_ID });
  });

  it('has a namespaced key', () => {
    expect(WIDGET_STORAGE_KEY).toBe('shopping-copilot.widget');
  });
});
