import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create();
  const result = await yt.music.search('never gonna give you up', { type: 'song' });
  const first = result.songs?.contents?.[0] as { [k: string]: unknown } | undefined;
  console.log(
    JSON.stringify(
      first,
      (_k, v) => {
        if (v && typeof v === 'object' && 'type' in (v as object)) {
          const t = (v as { type?: string }).type;
          if (typeof t === 'string' && (t.startsWith('Music') || t === 'Artist' || t === 'Album')) {
            return `[${t}]`;
          }
        }
        return v;
      },
      2,
    ).slice(0, 4000),
  );
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
