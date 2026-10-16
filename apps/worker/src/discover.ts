import type { Database } from "@exokortex/database";
import type { SourceProvider } from "@exokortex/source-providers";

export async function storeDiscovered(
  db: Database,
  userId: string,
  connectionId: string,
  provider: SourceProvider,
  installationId: string,
): Promise<number> {
  const discovered = await provider.discoverRepositories({ installationId });
  let stored = 0;
  for (const repo of discovered) {
    try {
      await db.repos.upsert({
        userId,
        connectionId,
        externalId: repo.externalId,
        name: repo.name,
        url: repo.url,
        defaultBranch: repo.defaultBranch,
      });
      stored += 1;
    } catch (error) {
      if (error instanceof Error && error.message.includes("repository limit")) break;
      throw error;
    }
  }
  return stored;
}
