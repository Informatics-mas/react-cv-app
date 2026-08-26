import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole")?.toLowerCase();

  // 1. Si pas de token -> Direction Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si le rôle n'est pas autorisé (ex: un 'user' qui tente d'aller sur '/admin')
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/Home" replace />;
  }

  // 3. Si tout est OK, on affiche le contenu de la route
  return <Outlet />;
};

export default ProtectedRoute;