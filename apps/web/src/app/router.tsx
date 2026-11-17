import { createBrowserRouter, type RouteObject } from 'react-router';
import { ShopPage } from '../shells/ShopPage';
import { NewChatRedirect, PageShell } from '../shells/PageShell';

/** Routes per docs/architecture.md → Frontend: `/` shop page + widget (D), `/chat/:id` full page (A). */
export const routes: RouteObject[] = [
  { path: '/', element: <ShopPage /> },
  { path: '/chat', element: <NewChatRedirect /> },
  { path: '/chat/:conversationId', element: <PageShell /> },
];

export const createRouter = () => createBrowserRouter(routes);
