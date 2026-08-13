import { createBrowserRouter } from 'react-router-dom'

import {
  CandidatePage,
  ChallengePage,
  HomePage,
  NotFoundPage,
  SelectRiverPage,
  StatisticsPage,
} from './LazyPages'
import { RootLayout } from './RootLayout'
import { RouteErrorPage } from './RouteErrorPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/select', element: <SelectRiverPage /> },
      { path: '/challenge/:river', element: <ChallengePage /> },
      { path: '/stats', element: <StatisticsPage /> },
      { path: '/candidate', element: <CandidatePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
