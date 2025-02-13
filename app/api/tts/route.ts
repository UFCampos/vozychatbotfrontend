import { NextResponse } from "next/server";
import { ElevenLabsClient, stream } from "elevenlabs";
import { Readable } from "stream";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const elevenlabs = new ElevenLabsClient({
        apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
      });

    const audioStream = await elevenlabs.textToSpeech.convertAsStream('JBFqnCBsd6RMkjVDRZzb', {
    text,
    model_id: 'eleven_multilingual_v2',
    });

    const readableStream = new ReadableStream({
        start(controller) {
          const readable = Readable.from(audioStream);
          readable.on('data', (chunk) => controller.enqueue(chunk));
          readable.on('end', () => controller.close());
          readable.on('error', (err) => controller.error(err));
        }
      });
    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS Streaming Error:", error);
    return NextResponse.json({ error: "Failed to stream audio" }, { status: 500 });
  }
}
