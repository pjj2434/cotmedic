import type { MetadataRoute } from "next";

const base = "/android";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cot/Liftmedik | Customer Portal",
    short_name: "Cot/Liftmedik",
    description: "Customer portal for Cot/Liftmedik.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#b91c1c",
    categories: ["business", "medical"],
    icons: [
      { src: `${base}/launchericon-48x48.png`, sizes: "48x48", type: "image/png", purpose: "any" },
      { src: `${base}/launchericon-72x72.png`, sizes: "72x72", type: "image/png", purpose: "any" },
      { src: `${base}/launchericon-96x96.png`, sizes: "96x96", type: "image/png", purpose: "any" },
      { src: `${base}/launchericon-144x144.png`, sizes: "144x144", type: "image/png", purpose: "any" },
      {
        src: `${base}/launchericon-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/launchericon-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/launchericon-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${base}/launchericon-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
