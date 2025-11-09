import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "./config/supabase.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // luego restringimos orígenes
app.use(express.json());

// Helper: Supabase “por request” con el JWT del usuario (Authorization: Bearer <token>)
function supaFromRequest(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  // si viene token, creamos un client con ese header; si no, usamos el global (anon)
  return token
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
    : supabase;
}

const api = express.Router();

// Health
api.get("/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development", ts: new Date().toISOString() });
});

/**
 * GET /spots
 * Devuelve spots públicos (o propios si viene JWT).
 * Incluye lon/lat derivadas del geography.
 */
api.get("/spots", async (req, res) => {
  try {
    const s = supaFromRequest(req);
    const { data, error } = await s
      .from("spots")
      .select(`
        id, name, description, city, country, rating, created_at, created_by,
        location
      `);

    if (error) throw error;

    // mapear lon/lat desde WKT sin pegar a la DB de nuevo
    const spots = (data ?? []).map((row) => {
      // Supabase devuelve geography como WKB/WKT dependiendo; fallback simple:
      // forzamos extracción si viene como "010100..." (WKB) no parseamos; mostramos sin lon/lat
      let lat = null, lng = null;
      if (typeof row.location === "string" && row.location.startsWith("POINT(")) {
        // 'POINT(lon lat)'
        const inner = row.location.slice(6, -1).split(" ");
        lng = parseFloat(inner[0]);
        lat = parseFloat(inner[1]);
      }
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        city: row.city,
        country: row.country,
        rating: row.rating,
        created_at: row.created_at,
        created_by: row.created_by,
        lat, lng,
      };
    });

    res.status(200).json({ ok: true, count: spots.length, spots });
  } catch (err) {
    console.error("GET /spots error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /spots/near?lat=-32.89&lng=-68.83&radiusKm=25
 * Usa la función SQL spots_near
 */
api.get("/spots/near", async (req, res) => {
  try {
    const s = supaFromRequest(req);
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radiusKm ?? "10");

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ ok: false, error: "lat/lng requeridos" });
    }

    const { data, error } = await s.rpc("spots_near", { lat, lng, radius_km: radiusKm });
    if (error) throw error;

    // mismo mapeo opcional a lat/lng si llega WKT
    const spots = (data ?? []).map((row) => {
      let lat = null, lng = null;
      if (typeof row.location === "string" && row.location.startsWith("POINT(")) {
        const inner = row.location.slice(6, -1).split(" ");
        lng = parseFloat(inner[0]);
        lat = parseFloat(inner[1]);
      }
      return { ...row, lat, lng };
    });

    res.json({ ok: true, count: spots.length, spots });
  } catch (err) {
    console.error("GET /spots/near error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /spots
 * Body: { name, description?, city?, country?, rating?, visibility?, lat, lng }
 * Requiere Authorization: Bearer <supabase_jwt>
 */
api.post("/spots", async (req, res) => {
  try {
    const s = supaFromRequest(req);

    // validar auth (user debe existir)
    const { data: userData, error: userErr } = await s.auth.getUser();
    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "No autorizado" });
    }
    const userId = userData.user.id;

    const { name, description, city, country, rating, visibility = "public", lat, lng } = req.body;

    if (!name || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ ok: false, error: "name, lat, lng son obligatorios" });
    }

    // Construimos WKT geography
    const wkt = `SRID=4326;POINT(${lng} ${lat})`; // OJO: lng primero

    const { data, error } = await s
      .from("spots")
      .insert({
        name,
        description,
        city,
        country,
        rating,
        visibility,
        created_by: userId,
        location: wkt, // PostgREST castea WKT a geography
      })
      .select("id, name, city, country, rating, created_at, created_by"); // devuelve el insert

    if (error) throw error;

    res.status(201).json({ ok: true, spot: data?.[0] ?? null });
  } catch (err) {
    console.error("POST /spots error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/api/v1", api);

app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
