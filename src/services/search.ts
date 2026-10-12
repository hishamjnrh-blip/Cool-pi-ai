
export async function searchDuckDuckGo(query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", trimmedQuery);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("t", "coolpi_ai");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo request failed: ${response.status}`);
  }

  const data = await response.json() as {
    Heading?: string;
    AbstractText?: string;
    AbstractURL?: string;
    Answer?: string;
    Definition?: string;
    DefinitionURL?: string;
    RelatedTopics?: Array<{
      Text?: string;
      FirstURL?: string;
      Topics?: Array<{
        Text?: string;
        FirstURL?: string;
      }>;
    }>;
  };

  const results: string[] = [];

  if (data.Answer) results.push(`Answer: ${data.Answer}`);
  if (data.AbstractText) {
    results.push(
      `${data.Heading || "Summary"}: ${data.AbstractText}`
    );
    if (data.AbstractURL) {
      results.push(`Source: ${data.AbstractURL}`);
    }
  }
  if (data.Definition) {
    results.push(`Definition: ${data.Definition}`);
    if (data.DefinitionURL) {
      results.push(`Source: ${data.DefinitionURL}`);
    }
  }

  for (const topic of data.RelatedTopics || []) {
    if (topic.Text) {
      results.push(
        `${topic.Text}${topic.FirstURL ? ` (${topic.FirstURL})` : ""}`
      );
    }

    for (const subtopic of topic.Topics || []) {
      if (subtopic.Text) {
        results.push(
          `${subtopic.Text}${subtopic.FirstURL ? ` (${subtopic.FirstURL})` : ""}`
        );
      }
    }

    if (results.length >= 8) break;
  }

  return results.length ? results.join("\n") : null;
}

