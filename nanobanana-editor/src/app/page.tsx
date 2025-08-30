"use client";

import { useRef, useState } from "react";
import { Upload, Send, ImagePlus, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  prompt?: string;
  imageUrl?: string;
};

export default function Home() {
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const onSend = async () => {
    if (!prompt && !fileInputRef.current?.files?.[0]) {
      toast.error("Add a prompt or upload an image.");
      return;
    }
    setIsLoading(true);
    try {
      const form = new FormData();
      form.append("prompt", prompt);
      const history = chat.map((m) => ({
        role: m.role,
        parts: [
          ...(m.prompt ? [{ text: m.prompt }] : []),
          ...(m.imageUrl
            ? [{ inlineData: { data: m.imageUrl.split(",")[1], mimeType: "image/png" } }]
            : []),
        ],
      }));
      form.append("history", JSON.stringify(history));

      const file = fileInputRef.current?.files?.[0];
      if (file) form.append("image", file);

      const res = await fetch("/api/images", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }
      const data = (await res.json()) as { imageBase64: string; mimeType: string };

      const userEntry: ChatEntry = {
        id: crypto.randomUUID(),
        role: "user",
        prompt,
        imageUrl: previewUrl || undefined,
      };
      const assistantEntry: ChatEntry = {
        id: crypto.randomUUID(),
        role: "assistant",
        imageUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
      };
      setChat((c) => [...c, userEntry, assistantEntry]);
      setPrompt("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-6 h-6" />
            <h1 className="text-lg font-semibold tracking-tight">Nano Banana Editor</h1>
          </div>
          <button
            onClick={onPickFile}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5 transition"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 grid md:grid-cols-[360px_1fr] gap-6">
        <aside className="space-y-3">
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-sm/6 opacity-80">Selected image</p>
            <div className="mt-2 aspect-square overflow-hidden rounded-md bg-white/5 flex items-center justify-center">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-sm opacity-60">No image selected</div>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-sm/6 opacity-80">Tips</p>
            <ul className="mt-2 list-disc pl-5 text-sm/6 opacity-80 space-y-1">
              <li>Describe edits precisely, e.g. "add soft golden hour lighting"</li>
              <li>Upload an image to apply localized edits</li>
              <li>Iterate by referencing the last output in your prompt</li>
            </ul>
          </div>
        </aside>

        <section className="flex flex-col min-h-[60vh]">
          <div className="flex-1 overflow-auto rounded-lg border border-white/10 p-3 space-y-4 bg-white/5">
            {chat.length === 0 && (
              <div className="text-sm opacity-70">Start by uploading an image or entering a prompt.</div>
            )}
            {chat.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">{m.role}</div>
                {m.prompt && <div className="text-sm whitespace-pre-wrap">{m.prompt}</div>}
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="result" className="max-h-[480px] rounded-md border border-white/10" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm/6 opacity-80 mb-1">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the edit or image you want..."
                className="w-full min-h-[88px] rounded-md border border-white/10 bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <button
              onClick={onSend}
              disabled={isLoading}
              className="h-[44px] shrink-0 inline-flex items-center gap-2 rounded-md border border-white/10 px-4 hover:bg-white/5 transition disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Generate</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
