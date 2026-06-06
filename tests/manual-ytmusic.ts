// Standalone script to test ytmusic source without electron UI
// Usage: npx tsx tests/manual-ytmusic.ts
import { YouTubeMusicSource } from '../electron/main/sources/ytmusic';

async function main() {
  const src = new YouTubeMusicSource();
  await src.initialize();
  src.acknowledgeDisclaimer();
  const info = src.getYtDlpInfo();
  console.log('yt-dlp info:', info);

  console.log('\nSearching for "never gonna give you up"...');
  try {
    const result = await src.search('never gonna give you up', { limit: 3 });
    console.log(`Found ${result.tracks.length} tracks:`);
    for (const t of result.tracks) {
      console.log(
        `  - ${t.title} by ${t.artists.map((a) => a.name).join(', ')} (${t.durationMs}ms) [${t.sourceId}]`,
      );
    }
    if (result.tracks.length > 0) {
      const first = result.tracks[0]!;
      console.log(`\nResolving stream URL for: ${first.title}...`);
      try {
        const stream = await src.getStreamUrl(first);
        console.log(`  Protocol: ${stream.protocol}`);
        console.log(`  URL: ${stream.url.slice(0, 120)}...`);
        console.log(`  Expires at: ${new Date(stream.expiresAt!).toISOString()}`);
      } catch (err) {
        console.log(`  Stream resolution FAILED: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    console.error('Search failed:', (err as Error).message);
  }

  await src.shutdown();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
