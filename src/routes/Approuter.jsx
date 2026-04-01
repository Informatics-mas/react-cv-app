import { Routes, Route } from "react-router-dom";

// Pages Publiques
import Create from "../components/Create";
function AppRouter() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
      </Routes>
  );
}

export default AppRouter;