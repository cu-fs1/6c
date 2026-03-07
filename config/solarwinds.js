import axios from "axios";

const SOLARWINDS_URL =
  "https://logs.collector.ap-01.cloud.solarwinds.com/v1/logs";

export async function sendToSolarWinds(logEntry) {
  const token = process.env.SOLARWINDS_TOKEN;
  if (!token) return;

  try {
    await axios.post(SOLARWINDS_URL, logEntry, {
      headers: {
        "Content-Type": "application/octet-stream",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error("[SolarWinds] Failed to send log:", err.message);
  }
}
