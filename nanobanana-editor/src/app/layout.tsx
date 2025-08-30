import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Nano Banana Editor",
	description: "Edit and generate images with Gemini 2.5 Flash Image (nano-banana)",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[radial-gradient(circle_at_10%_10%,_rgba(255,255,255,0.04),_transparent_40%),_radial-gradient(circle_at_90%_30%,_rgba(255,255,255,0.04),_transparent_40%)]`}
			>
				<div className="mx-auto max-w-[1600px] w-full">{children}</div>
			</body>
		</html>
	);
}
