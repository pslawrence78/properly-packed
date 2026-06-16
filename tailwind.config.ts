import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF7ED",
        creamSoft: "#FEF3DE",
        sand: "#EED8B8",
        sandMuted: "#D9BE9C",
        paper: "#FFFFFF",
        charcoal: "#243033",
        charcoalSoft: "#415154",
        slateAccent: "#0F5F68",
        teal: "#147C86",
        tealDeep: "#0F5F68",
        tealSoft: "#DDF4F2",
        poolBlue: "#3BAFDA",
        blueSoft: "#E2F5FC",
        coral: "#F9735B",
        coralSoft: "#FFE2DA",
        amber: "#F5B84B",
        amberSoft: "#FFF2D2",
        green: "#4FA36B",
        greenSoft: "#E4F6EA",
        clay: "#D95C59",
        redSoft: "#FFE1DE",
        lilac: "#8B7BD8",
        lilacSoft: "#EEEAFE",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(36, 48, 51, 0.12)",
        travel: "0 24px 70px rgba(15, 95, 104, 0.16)",
        tactile: "0 10px 26px rgba(36, 48, 51, 0.12)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
