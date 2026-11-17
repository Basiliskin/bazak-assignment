import { createBrowserRouter, type RouteObject } from 'react-router';
import { ShopPage } from '../shells/ShopPage';
import { NewChatRedirect, PageShell } from '../shells/PageShell';

/** Routes per docs/architecture.md → Frontend. ShopPage is a placeholder until S7. */
export const routes: RouteObject[] = [
  { path: '/', element: <ShopPage /> },
  { path: '/chat', element: <NewChatRedirect /> },
  { path: '/chat/:conversationId', element: <PageShell /> },
];

export const createRouter = () => createBrowserRouter(routes);
