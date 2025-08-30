This is a modern AI image editing app powered by Google's Gemini 2.5 Flash Image (aka "nano-banana"). Users can upload an image and use natural language prompts to generate or edit images. Results are shown in a chat-like timeline so you can iterate quickly.

## Getting Started

## Getting Started

### Environment

Set your API key in the environment (local dev uses `.env.local`):

```
GEMINI_API_KEY=your_api_key
```

Optionally, `GOOGLE_API_KEY` is also supported.

### Develop

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## API

Server route: `src/app/api/images/route.ts`

POST multipart/form-data fields:
- `prompt`: string, optional
- `image`: file, optional
- `history`: JSON array of prior messages with parts (text or inlineData)

Response JSON:
```
{ imageBase64: string, mimeType: string }
```

Model: `models/gemini-2.5-flash-image-preview` via `@google/generative-ai`.

## Features
- Upload and preview an image
- Prompt-based edits/generation
- Chat timeline with image propagation
- Clean, responsive UI with dark mode

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
