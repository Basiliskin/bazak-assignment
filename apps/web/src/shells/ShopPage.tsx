import { Link } from 'react-router';

/** Placeholder — S7 adds the product grid and the floating copilot widget. */
export function ShopPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        dummy<span className="text-indigo-600">shop</span>
      </h1>
      <Link to="/chat" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
        Open the shopping copilot →
      </Link>
    </main>
  );
}
