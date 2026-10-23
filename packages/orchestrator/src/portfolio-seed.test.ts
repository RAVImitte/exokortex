import { describe, expect, it } from "vitest";
import { portfolioSeedFiles, projectFromSource } from "./portfolio-seed.js";

describe("portfolio seed", () => {
  it("reads a summary and stack from a repository", () => {
    const project = projectFromSource({
      name: "acme/ledger-api",
      url: "https://github.com/acme/ledger-api",
      readme: "# Ledger\n\nTracks approved repository changes.\n",
      packageJson: JSON.stringify({
        description: "Ignored when the readme has a paragraph.",
        dependencies: { hono: "1.0.0", react: "19.0.0" },
      }),
    });
    expect(project.slug).toBe("ledger-api");
    expect(project.name).toBe("ledger-api");
    expect(project.description).toBe("Tracks approved repository changes.");
    expect(project.technologies).toEqual(["hono", "react"]);
    expect(project.sourceUrl).toBe("https://github.com/acme/ledger-api");
  });

  it("builds template files plus one project file per repository", () => {
    const files = portfolioSeedFiles({
      includeTemplate: true,
      projects: [
        projectFromSource({
          name: "acme/ledger",
          url: "https://github.com/acme/ledger",
          readme: "A local record of approved changes.",
        }),
      ],
    });
    const paths = files.map((file) => file.path);
    expect(paths).toContain("exokortex.json");
    expect(paths).toContain("src/App.tsx");
    expect(paths).toContain("src/content/projects/ledger.json");
    expect(paths.some((path) => path.endsWith("/gate.json"))).toBe(false);
    const project = files.find((file) => file.path.endsWith("/ledger.json"));
    expect(project?.content).toContain('"sourceUrl": "https://github.com/acme/ledger"');
  });
});
