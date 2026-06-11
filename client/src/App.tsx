import { Routes, Route, Navigate } from 'react-router-dom';
import { StoreLayout } from './components/store/StoreLayout';
import { Home } from './pages/store/Home';
import { Products } from './pages/store/Products';
import { ProductDetail } from './pages/store/ProductDetail';
import { Offers } from './pages/store/Offers';
import { Checkout } from './pages/store/Checkout';
import { Contact } from './pages/store/Contact';

import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { ProductsAdmin } from './pages/admin/ProductsAdmin';
import { OrdersAdmin } from './pages/admin/OrdersAdmin';
import { CategoriesAdmin } from './pages/admin/CategoriesAdmin';
import { SaleFilesAdmin } from './pages/admin/SaleFilesAdmin';
import { EyeExamsAdmin } from './pages/admin/EyeExamsAdmin';
import { OffersAdmin } from './pages/admin/OffersAdmin';

export default function App() {
  return (
    <Routes>
      {/* Storefront */}
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<ProductsAdmin />} />
        <Route path="orders" element={<OrdersAdmin />} />
        <Route path="categories" element={<CategoriesAdmin />} />
        <Route path="sale-files" element={<SaleFilesAdmin />} />
        <Route path="eye-exams" element={<EyeExamsAdmin />} />
        <Route path="offers" element={<OffersAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
