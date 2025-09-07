import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * This API route handles asynchronous sentiment analysis for mood journal entries.
 * It expects a JSON body with `moodId` (string) and `text` (string).
 * It uses OpenAI to classify sentiment and then updates the mood record in Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const { moodId, text } = await req.json();
    if (!moodId || !text) {
      return NextResponse.json(
        { error: 'Missing moodId or text' },
        { status: 400 },
      );
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Ask OpenAI to evaluate sentiment
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant that extracts sentiment from mood journal entries. Return a JSON object with properties "label" (one of positive, neutral, negative) and "score" (a float between -1 and 1).',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.0,
      max_tokens: 60,
    });
    const content = chat.choices[0].message?.content?.trim();
    let sentiment: { label: string; score: number } | null = null;
    if (content) {
      try {
        sentiment = JSON.parse(content);
      } catch (e) {
        // if not valid JSON, attempt to parse simple outputs
        const lower = content.toLowerCase();
        if (lower.includes('positive')) sentiment = { label: 'positive', score: 0.5 };
        else if (lower.includes('negative')) sentiment = { label: 'negative', score: -0.5 };
        else sentiment = { label: 'neutral', score: 0 };
      }
    }
    // update mood record
    if (sentiment) {
      await supabaseAdmin
        .from('moods')
        .update({ sentiment })
        .eq('id', moodId);
    }
    return NextResponse.json({ success: true, sentiment });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}