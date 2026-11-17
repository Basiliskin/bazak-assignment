import { createBrowserRouter, type RouteObject } from 'react-router';
import { ShopPage } from '../shells/ShopPage';
import { PageShell } from '../shells/PageShell';

/** Routes per docs/architecture.md → Frontend. Shells are placeholders until S4/S7. */
export const routes: RouteObject[] = [
  { path: '/', element: <ShopPage /> },
  { path: '/chat', element: <PageShell /> },
  { path: '/chat/:conversationId', element: <PageShell /> },
];

export const createRouter = () => createBrowserRouter(routes);
