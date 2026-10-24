import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col">
        {children}
        <ChatAssistant />
      </body>
    </html>
  );
}
