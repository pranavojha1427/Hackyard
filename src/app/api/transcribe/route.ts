import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // 1. Try ElevenLabs Scribe Speech-to-Text if API key is configured
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const elFormData = new FormData();
        elFormData.append('file', file);
        elFormData.append('model_id', 'scribe_v2');

        const elRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
          body: elFormData,
        });

        if (elRes.ok) {
          const elData = await elRes.json();
          return NextResponse.json({ 
            text: elData.text ?? "",
            language_code: elData.language_code
          });
        } else {
          console.warn('ElevenLabs STT error, falling back to Gemini:', await elRes.text());
        }
      } catch (elError) {
        console.warn('ElevenLabs STT request failed, falling back to Gemini:', elError);
      }
    }

    // 2. Fallback to Gemini Multimodal Audio transcription
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    const mimeType = file.type || 'audio/webm';

    const prompt = "Listen to this audio. Transcribe it exactly in the original language spoken. Return only the transcription text, with no extra prefixes, translations, or markdown.";

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1
      }
    };

    if (process.env.GOOGLE_API_KEY) {
      let res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_API_KEY
        },
        body: JSON.stringify(payload)
      });
      
      if (res.status === 503) {
        await new Promise(r => setTimeout(r, 1000));
        res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GOOGLE_API_KEY
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        return NextResponse.json({ text });
      } else {
        console.error("Gemini API Error (Audio):", await res.text());
      }
    }

    return NextResponse.json({ error: "Failed to transcribe audio." }, { status: 500 });
  } catch (err) {
     console.error("Transcription API error:", err);
     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
