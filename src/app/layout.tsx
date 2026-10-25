import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import ChatAssistant from "@/components/ChatAssistant";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PragatiPulse - MoSPI Project Monitoring Platform",
  description: "Decision-Support & Project Monitoring for MoSPI",
};

export default async function RootLayout({ children }: any) {
  const session = await getSession();
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
          crossOrigin="" 
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ChatAssistant />
      </body>
    </html>
  );
}
