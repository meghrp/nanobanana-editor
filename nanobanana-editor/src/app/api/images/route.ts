import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type ChatPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

type ChatMessage = {
  role: "user" | "assistant" | "system";
  parts: ChatPart[];
};

function bufferToBase64(buffer: ArrayBuffer): string {
  const binary = Buffer.from(buffer);
  return binary.toString("base64");
}

function inferMimeType(fileName?: string, fallback?: string): string {
  if (!fileName) return fallback || "image/png";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return fallback || "image/png";
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const form = await req.formData();
    const prompt = (form.get("prompt") as string) || "";
    const historyJson = (form.get("history") as string) || "";
    const imageFile = form.get("image") as File | null;

    if (!prompt && !imageFile) {
      return new Response(
        JSON.stringify({ error: "Provide a prompt or an image to edit." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GEMINI_API_KEY in environment." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Build conversation contents with optional prior history
    const contents: ChatMessage[] = [];

    if (historyJson) {
      try {
        const parsed = JSON.parse(historyJson) as ChatMessage[];
        if (Array.isArray(parsed)) {
          for (const msg of parsed) {
            if (msg && msg.role && Array.isArray(msg.parts)) {
              contents.push(msg);
            }
          }
        }
      } catch {
        // ignore malformed history
      }
    }

    const userParts: ChatPart[] = [];
    if (prompt) {
      userParts.push({ text: prompt });
    }

    if (imageFile) {
      const buf = await imageFile.arrayBuffer();
      const base64 = bufferToBase64(buf);
      const mimeType = imageFile.type || inferMimeType(imageFile.name);
      userParts.push({ inlineData: { data: base64, mimeType } });
    }

    if (userParts.length > 0) {
      contents.push({ role: "user", parts: userParts });
    }

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash-image-preview",
      // Ask the model to return image bytes
      generationConfig: {
        responseMimeType: "image/png",
      },
    });

    const result = await model.generateContent({ contents });

    // Try to locate image inline data in the response parts
    const candidate = result.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    let imageBase64: string | undefined;
    let mimeType = "image/png";

    type CandidatePart = { inlineData?: { data?: string; mimeType?: string } };
    for (const part of parts as CandidatePart[]) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType || mimeType;
        break;
      }
    }

    // Fallback: some SDKs put the data into response.text() when responseMimeType is image
    if (!imageBase64) {
      const maybe = result.response.text();
      if (maybe && /^[A-Za-z0-9+/=]+$/.test(maybe.replace(/\n/g, ""))) {
        imageBase64 = maybe;
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Model did not return an image." }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageBase64, mimeType }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

