export type Soundbite = { name: string; quote: string };
export type Highlight = {
  id: string;
  title: string;
  youtubeUrl: string;
  date?: string;
  credit?: string;
};

// CPP content can be added here once the league supplies it.
export const LEAGUE_SOUNDBITES: Soundbite[] = [];
export const MEDIA_HIGHLIGHTS: Highlight[] = [];

export function youtubeId(input: string): string | null {
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(url.hostname)
    ) {
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : ["embed", "shorts", "live"].includes(url.pathname.split("/")[1])
            ? url.pathname.split("/")[2]
            : null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
