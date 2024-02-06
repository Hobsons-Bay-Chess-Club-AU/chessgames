import React from 'react';
import ReactDOM from 'react-dom/client';
import 'instantsearch.css/themes/reset.css';
import 'instantsearch.css/themes/satellite.css';
import './index.css';
import App from './App.tsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'game/:gameId',
        element: <App />,
        errorElement: <App />,
      },
    ],
  },
]);

<RouterProvider router={router} />;
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
