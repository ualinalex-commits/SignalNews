import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const SCANNER_PROMPT = `You are a global news scanner. Find the 6 most significant breaking news stories happening TODAY worldwide.

Respond ONLY with a valid JSON array, no markdown, no code fences:
[
  { "topic": "description of news event", "region": "US/Europe/Asia/Global" },
  ...
]

Focus on: geopolitics, tech, economy, science, climate. Make them current and real.`;

const WRITER_PROMPT = `You are a senior news editor. Write a compelling news article.

Respond ONLY with a valid JSON object, no markdown, no code fences:
{
  "headline": "Compelling headline under 12 words",
  "subheadline": "One sentence adding context",
  "category": "One of: World, Technology, Business, Science, Politics",
  "body": "Full article in 3-4 paragraphs, journalistic tone",
  "tags": ["tag1", "tag2", "tag3"],
  "read_time": 3
}`;

async function callClaude(system: string, user: string, useSearch = false) {
  const body: any = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system,
    messages: [{ role: "user", content: user }],
  };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
}

export async function POST(req: Request) {
  try {
    // Step 1: Scan for topics
    const topicsRaw = await callClaude(
      SCANNER_PROMPT,
      "Find the 6 most important breaking news stories today.",
      true
    );

    let topics = [];
    try {
      topics = JSON.parse(topicsRaw.replace(/```json|```/g, "").trim());
    } catch {
      return NextResponse.json({ error: "Failed to parse topics" }, { status: 500 });
    }

    // Step 2: Write articles
    const published = [];
    for (const t of topics) {
      try {
        const raw = await callClaude(
          WRITER_PROMPT,
          `Write a news article about: ${t.topic} (Region: ${t.region})`
        );
        const article = JSON.parse(raw.replace(/```json|```/g, "").trim());

        const { data, error } = await supabase
          .from("articles")
          .insert({ ...article, region: t.region })
          .select()
          .single();

        if (!error) published.push(data);
      } catch {
        continue;
      }
    }

    return NextResponse.json({ published: published.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

