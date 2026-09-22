import { Navigate, Route, Routes } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { LoginPage } from './pages/admin/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminRoute } from './pages/admin/AdminRoute';
import { DashboardPage } from './pages/admin/DashboardPage';
import { PropertiesListPage } from './pages/admin/PropertiesListPage';
import { PropertyFormPage } from './pages/admin/PropertyFormPage';
import { LeadsListPage } from './pages/admin/LeadsListPage';
import { ToastContainer } from './components/ui/Toast';
import { useAuthStore } from './store/useAuthStore';

function AdminEntry() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return <Navigate to={isAuthenticated ? '/admin/dashboard' : '/admin/login'} replace />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/propiedad/:id" element={<PropertyDetailPage />} />

        <Route path="/admin" element={<AdminEntry />} />
        <Route path="/admin/login" element={<LoginPage />} />

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/propiedades" element={<PropertiesListPage />} />
            <Route path="/admin/clientes" element={<LeadsListPage />} />
            <Route path="/admin/propiedades/nueva" element={<PropertyFormPage />} />
            <Route path="/admin/propiedades/:id/editar" element={<PropertyFormPage />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <div className="flex h-screen items-center justify-center text-latorre-ink/50">Página no encontrada</div>
          }
        />
      </Routes>
      <ToastContainer />
    </>
  );
}
