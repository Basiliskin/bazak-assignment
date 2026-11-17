import { useState } from 'react';
import { Link } from 'react-router';
import { useTopProducts } from '../api/queries';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailsContainer } from '../products/ProductDetailsContainer';
import { WidgetShell } from './WidgetShell';

/** Host page (D14): hero + top-rated Products, with the copilot widget floating on top. */
export function ShopPage() {
  const products = useTopProducts();
  const [openProductId, setOpenProductId] = useState<number | null>(null);

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">
            dummy<span className="text-indigo-600">shop</span>
          </span>
          <Link to="/chat" className="text-sm font-medium text-indigo-600 hover:underline">
            Shopping copilot (full page) →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 pb-28">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-10 text-white sm:px-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Not sure what to buy?</h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-50 sm:text-base">
            Ask the shopping copilot — tap ✦ in the corner and describe what you need, like “a phone under
            $500” or “a gift for a coffee lover”.
          </p>
        </section>

        <h2 className="mt-10 mb-4 text-lg font-semibold">Top rated</h2>
        {products.isPending ? (
          <p className="text-sm text-zinc-500">Loading products…</p>
        ) : products.isError ? (
          <p className="text-sm text-rose-700">
            Could not load products.{' '}
            <button type="button" className="underline" onClick={() => void products.refetch()}>
              Try again
            </button>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {products.data.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={setOpenProductId} />
            ))}
          </div>
        )}
      </main>

      {openProductId !== null && (
        <ProductDetailsContainer
          key={openProductId}
          productId={openProductId}
          onClose={() => setOpenProductId(null)}
        />
      )}
      <WidgetShell />
    </div>
  );
}
