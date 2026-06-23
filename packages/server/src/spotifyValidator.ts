let spotifyToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (spotifyToken && Date.now() < spotifyToken.expiresAt) {
    return spotifyToken.value;
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = (await res.json()) as { access_token: string; expires_in: number };
  spotifyToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return spotifyToken.value;
}

export async function validateMusic(
  music: string
): Promise<{ label: string; url: string } | null> {
  try {
    const [title, artist] = music.split(' – ');
    if (!title || !artist) return null;

    const token = await getToken();
    const query = encodeURIComponent(`track:${title} artist:${artist}`);
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = (await res.json()) as {
      tracks?: {
        items?: Array<{
          name: string;
          artists: Array<{ name: string }>;
          external_urls: { spotify: string };
        }>;
      };
    };
    const track = data.tracks?.items?.[0];
    if (!track?.external_urls?.spotify) return null;

    return {
      label: `${track.name} – ${track.artists[0].name}`,
      url: track.external_urls.spotify,
    };
  } catch {
    return null;
  }
}
