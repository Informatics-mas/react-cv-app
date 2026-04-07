import { Routes, Route } from "react-router-dom";

// Pages Publiques
import Create from "../components/Create";
import Models from "../components/Models";
function AppRouter() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/models" element={<Models />} />
      </Routes>
  );
}

export default AppRouter;