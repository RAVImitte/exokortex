import { Check, ExternalLink, FolderGit2, Plug, RefreshCw, Search } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { api, messageOf } from "../api/client.js";
import type { RepositoryRow } from "../api/types.js";
import { AnimatedItem, AnimatedList } from "../ui/AnimatedList.js";
import { Button, ButtonLink, IconButton } from "../ui/Button.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Input } from "../ui/Field.js";
import { BuildPortfolioButton } from "../ui/BuildPortfolioButton.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Segmented, type SegmentOption } from "../ui/Segmented.js";
import { SkeletonCards } from "../ui/Skeleton.js";
import { useToast } from "../ui/Toast.js";
import { providerMeta, useConnectedToast } from "../ui/providers.js";

type Role = "SOURCE" | "PORTFOLIO" | "EXCLUDED";
type Filter = "ALL" | Role;

export function RepositoriesPage() {
  const [repos, setRepos] = useState<RepositoryRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const toast = useToast();
  useConnectedToast();

  async function load() {
    const body = await api<{ repositories: RepositoryRow[] }>("/api/repositories");
    setRepos(body.repositories);
  }

  useEffect(() => {
    load().catch((err: unknown) => {
      setRepos([]);
      toast.error(messageOf(err, "Failed to load repositories"));
    });
  }, [toast]);

  async function setRole(repo: RepositoryRow, role: Role) {
    if (repo.role === role) return;
    const before = repos;
    setRepos(
      (current) =>
        current?.map((item) => {
          if (item.id === repo.id) return { ...item, role };
          if (role === "PORTFOLIO" && item.role === "PORTFOLIO") return { ...item, role: "SOURCE" };
          return item;
        }) ?? null,
    );
    try {
      await api(`/api/repositories/${repo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      if (role === "PORTFOLIO") toast.success(`${repo.name} is now your portfolio.`);
      await load();
    } catch (err) {
      setRepos(before);
      toast.error(messageOf(err, "Could not change the role"));
    }
  }

  async function scan() {
    setScanning(true);
    try {
      await api("/api/scans", { method: "POST" });
      toast.success("Scan queued. Results appear in Activity.");
    } catch (err) {
      toast.error(messageOf(err, "Scan failed"));
    } finally {
      setScanning(false);
    }
  }

  const count = (role: Role) => repos?.filter((repo) => repo.role === role).length ?? 0;
  const needle = query.trim().toLowerCase();
  const visible =
    repos?.filter(
      (repo) =>
        (filter === "ALL" || repo.role === filter) &&
        (!needle || repo.name.toLowerCase().includes(needle)),
    ) ?? [];

  return (
    <section>
      <PageHeader
        title="Repositories"
        description="Choose what ExoKortex watches. One GitHub repository is your portfolio."
        actions={
          <div className="cluster">
            {repos && repos.length > 0 ? <BuildPortfolioButton /> : null}
            <Button
              variant="primary"
              icon={RefreshCw}
              loading={scanning}
              disabled={!repos || repos.length === 0}
              onClick={() => void scan()}
            >
              Scan now
            </Button>
          </div>
        }
      />
      {repos === null ? (
        <SkeletonCards count={4} height={64} />
      ) : repos.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No repositories yet"
          action={
            <ButtonLink to="/connections" variant="primary" icon={Plug}>
              Connect a source
            </ButtonLink>
          }
        >
          Connect GitHub, Hugging Face, Kaggle, or Google and your repositories appear here.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <Segmented
              label="Filter by role"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "ALL", label: `All ${repos.length}` },
                { value: "SOURCE", label: `Source ${count("SOURCE")}` },
                { value: "PORTFOLIO", label: `Portfolio ${count("PORTFOLIO")}` },
                { value: "EXCLUDED", label: `Excluded ${count("EXCLUDED")}` },
              ]}
            />
            <label className="search">
              <Search size={15} />
              <span className="sr-only">Search repositories</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search repositories"
              />
            </label>
          </div>
          {visible.length === 0 ? (
            <EmptyState icon={Search} title="No matches">
              No repositories match this filter.
            </EmptyState>
          ) : (
            <AnimatedList key={filter} className="card table-card">
              {visible.map((repo) => (
                <AnimatedItem key={repo.id}>
                  <RepoRow repo={repo} onRole={(role) => void setRole(repo, role)} onSaved={load} />
                </AnimatedItem>
              ))}
            </AnimatedList>
          )}
        </>
      )}
    </section>
  );
}

function RepoRow({
  repo,
  onRole,
  onSaved,
}: {
  repo: RepositoryRow;
  onRole: (role: Role) => void;
  onSaved: () => Promise<void>;
}) {
  const meta = providerMeta(repo.provider);
  const Icon = meta.icon;
  const github = !repo.provider || repo.provider === "github";
  const options: SegmentOption<Role>[] = [
    { value: "SOURCE", label: "Source" },
    ...(github ? [{ value: "PORTFOLIO" as const, label: "Portfolio" }] : []),
    { value: "EXCLUDED", label: "Excluded" },
  ];

  return (
    <motion.div
      layout="position"
      className="repo-row"
      style={{ opacity: repo.role === "EXCLUDED" ? 0.6 : 1 }}
    >
      <div className="repo-name">
        <span className="provider-icon" title={meta.label}>
          <Icon size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <a href={repo.url} target="_blank" rel="noreferrer" title={repo.name}>
            {repo.name}
          </a>
          <div className="subtle mono">{repo.lastRevision?.slice(0, 7) ?? "not scanned yet"}</div>
        </div>
      </div>
      <div className="repo-meta">
        {repo.role === "PORTFOLIO" ? (
          <BranchForm repo={repo} onSaved={onSaved} />
        ) : (
          <span className="mono">{repo.defaultBranch ?? ""}</span>
        )}
      </div>
      <Segmented
        label={`${repo.name} role`}
        value={repo.role as Role}
        onChange={onRole}
        options={options}
      />
    </motion.div>
  );
}

function BranchForm({ repo, onSaved }: { repo: RepositoryRow; onSaved: () => Promise<void> }) {
  const [branch, setBranch] = useState(repo.defaultBranch ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const dirty = branch.trim() !== (repo.defaultBranch ?? "");

  async function save(event: FormEvent) {
    event.preventDefault();
    const defaultBranch = branch.trim();
    setSaving(true);
    try {
      await api(`/api/repositories/${repo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ defaultBranch }),
      });
      toast.success(`Portfolio pull requests target ${defaultBranch}.`);
      await onSaved();
    } catch (err) {
      toast.error(messageOf(err, "Could not save the branch"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="branch-form" onSubmit={(event) => void save(event)}>
      <Input
        aria-label={`${repo.name} portfolio branch`}
        title="Portfolio pull requests target this branch"
        value={branch}
        onChange={(event) => setBranch(event.target.value)}
      />
      {dirty ? (
        <IconButton
          type="submit"
          icon={Check}
          label="Save branch"
          size="sm"
          variant="primary"
          disabled={saving || !branch.trim()}
        />
      ) : null}
      <a
        className="btn btn-ghost btn-sm btn-icon"
        href={repo.url}
        target="_blank"
        rel="noreferrer"
        aria-label="Open repository"
        title="Open repository"
      >
        <ExternalLink size={14} />
      </a>
    </form>
  );
}
