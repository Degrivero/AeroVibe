import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// prefix de versión
const api = express.Router();

api.get("/health", (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    ts: new Date().toISOString(),
  });
});

// ejemplo de recurso
api.get("/spots", (req, res) => {
  res.json([{ id: "demo", name: "Test Spot", lat: -32.89, lng: -68.83 }]);
});

app.use("/api/v1", api);

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

