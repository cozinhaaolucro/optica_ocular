import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./styles.css";
import "./commerce.css";
import { CartProvider } from "@/contexts/CartContext";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Telemetry from "@/components/Telemetry";
import LogoFilters from "@/components/LogoFilters";
import StoreChrome from "@/components/StoreChrome";
import { siteUrl } from "@/lib/config";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Óptica Ocular | Óculos e lentes em Curitiba",
    template: "%s | Óptica Ocular",
  },
  description:
    "Conheça armações de grau, óculos de sol e lentes com orientação especializada. Óptica Ocular, em Curitiba desde 1990.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Óptica Ocular",
    images: [
      {
        url: "/assets/ensaio/grau-retrato-social.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  robots: {
    index: process.env.OCULAR_INDEXING_ENABLED === "true",
    follow: process.env.OCULAR_INDEXING_ENABLED === "true",
  },
};
export const viewport: Viewport = { themeColor: "#231f20" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="commerce-site">
        <LogoFilters />
        <CartProvider>
          <StoreChrome>
            <SiteHeader />
          </StoreChrome>
          {children}
          <StoreChrome>
            <SiteFooter />
          </StoreChrome>
          <Telemetry
            enabled={process.env.OCULAR_TELEMETRY_ENABLED === "true"}
          />
        </CartProvider>
      </body>
    </html>
  );
}
