import type { ProductGroup } from '@app/contracts';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChatItem } from '../chat/chat-types';
import { phoneGroup } from '../test/fixtures';
import { MessageBubble } from './MessageBubble';

const coolGroup: ProductGroup = {
  label: 'Cool picks under $30',
  query: {
    ...phoneGroup.query,
    label: 'Cool picks under $30',
    category: null,
    maxPrice: 30,
    confidence: 'guessed',
    assumption: 'trendy accessories under $30',
  },
  products: [
    {
      id: 7,
      title: 'Sunglasses',
      description: 'Stylish shades',
      price: 19.99,
      discountPercentage: 2,
      rating: 4.1,
      thumbnail: 'https://cdn.example/broken.png',
      category: 'sunglasses',
    },
  ],
  total: 1,
};

/** A stored Assistant Message with two Product Groups (multi-intent + ambiguous). */
const item: ChatItem = {
  id: 'a1',
  role: 'assistant',
  text: 'Here you go.',
  productGroups: [phoneGroup, coolGroup],
  offCatalog: [],
  searching: [],
};

function renderBubble(props: { busy?: boolean } = {}) {
  const onOpenProduct = vi.fn();
  const onShowMore = vi.fn();
  render(<MessageBubble item={item} onOpenProduct={onOpenProduct} onShowMore={onShowMore} {...props} />);
  return { onOpenProduct, onShowMore };
}

describe('MessageBubble with Product Groups', () => {
  it('renders each group with label, range, cards and "N more match" (AC4.1, AC4.2, R4, R7)', () => {
    renderBubble();

    const phones = screen.getByRole('region', { name: 'Phones under $500' });
    expect(within(phones).getByRole('heading', { name: 'Phones under $500' })).toBeInTheDocument();
    expect(phones).toHaveTextContent('1–1 of 7');
    expect(phones).toHaveTextContent('6 more match');
    expect(within(phones).getByRole('img', { name: 'iPhone 9' })).toHaveAttribute(
      'src',
      'https://cdn.example/1.png',
    );
    expect(phones).toHaveTextContent('An apple mobile');
    expect(phones).toHaveTextContent('$499.00');
    expect(within(phones).getByLabelText('Rated 4.5 out of 5')).toBeInTheDocument();
    expect(phones).toHaveTextContent('−10%'); // discount badge

    const cool = screen.getByRole('region', { name: 'Cool picks under $30' });
    expect(cool).toHaveTextContent('1–1 of 1');
    expect(cool).not.toHaveTextContent('more match');
    expect(cool).not.toHaveTextContent('%'); // 2% is below the badge threshold
  });

  it('shows the Assumption chip only on a guessed group (R2)', () => {
    renderBubble();
    expect(screen.getByRole('region', { name: 'Cool picks under $30' })).toHaveTextContent(
      'Assumed: trendy accessories under $30',
    );
    expect(screen.getByRole('region', { name: 'Phones under $500' })).not.toHaveTextContent('Assumed');
  });

  it('replaces a broken image with a "No image" placeholder (AC4.5)', () => {
    renderBubble();
    fireEvent.error(screen.getByRole('img', { name: 'Sunglasses' }));
    expect(screen.queryByRole('img', { name: 'Sunglasses' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cool picks under $30' })).toHaveTextContent('No image');
  });

  it('reports card clicks and "Show more" up; renders nothing itself (AC4.3, AC4.4)', async () => {
    const { onOpenProduct, onShowMore } = renderBubble();
    await userEvent.click(screen.getByRole('button', { name: /iPhone 9/ }));
    expect(onOpenProduct).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(onShowMore).toHaveBeenCalledWith(phoneGroup);
  });

  it('disables "Show more" while a reply streams', () => {
    renderBubble({ busy: true });
    expect(screen.getByRole('button', { name: 'Show more' })).toBeDisabled();
  });
});
