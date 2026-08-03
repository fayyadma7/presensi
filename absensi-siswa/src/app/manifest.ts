import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Presensi - SMK Muhammadiyah 3 Purbalingga",
    short_name: "Presensi",
    description:
      "Sistem kehadiran siswa SMK Muhammadiyah 3 Purbalingga - Modern & Playful",
    start_url: "/",
    display: "standalone",
    background_color: "#EEF2FF",
    theme_color: "#4F46E5",
    lang: "id",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
