import express from "express";
import cors from "cors";
import { supabase } from "./config/supabase.js";  // ← importa conexión

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const api = express.Router();

// Health
api.get("/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", ts: new Date().toISOString() });
});

// Spots (Supabase)
api.get("/spots", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("spots")
      .select("id, name, description, city, country, rating, created_at");

    if (error) throw error;

    res.status(200).json({ ok: true, count: data.length, spots: data });
  } catch (err) {
    console.error("Error fetching spots:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/api/v1", api);

app.listen(PORT, () => console.log(`API listening on port ${PORT}`));

console.log("Supabase URL:", process.env.SUPABASE_URL);
