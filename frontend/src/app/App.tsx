import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { RealtimeAlertsBridge } from './components/RealtimeAlertsBridge';

export default function App() {
  return (
    <AuthProvider>
      <RealtimeAlertsBridge />
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
