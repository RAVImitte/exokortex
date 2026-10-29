import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  GitPullRequest,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/landing.css";

const repositoryUrl = "https://github.com/RAVImitte/exokortex";

const steps = [
  {
    icon: GitBranch,
    title: "Connect your work",
    text: "Link your sources and choose the repository that powers your portfolio.",
  },
  {
    icon: Sparkles,
    title: "Find the story",
    text: "Agents read what changed, explain the meaningful parts, and draft an update.",
  },
  {
    icon: ShieldCheck,
    title: "Make it yours",
    text: "Review the proposed update. Approve what belongs and skip what doesn't.",
  },
  {
    icon: GitPullRequest,
    title: "Merge when ready",
    text: "Get a pull request on your portfolio. You merge it; your existing CI deploys it.",
  },
];

const questions = [
  {
    title: "Will ExoKortex publish anything automatically?",
    answer:
      "No. Portfolio changes wait for your approval. Once approved, ExoKortex opens a pull request in your portfolio repository. You decide when to merge, and your existing deployment workflow takes it from there.",
  },
  {
    title: "Where can my projects live?",
    answer:
      "Connect GitHub repositories, Hugging Face models, datasets and Spaces, Kaggle datasets and notebooks, and Google Colab notebooks. Choose one GitHub repository as your portfolio destination.",
  },
  {
    title: "Can I choose my own AI model?",
    answer:
      "Yes. Bring your own key for an OpenAI-compatible API, with presets for OpenAI, OpenRouter, and Groq. You choose the model and pay your provider directly. Your keys are encrypted and are never sent to the model.",
  },
  {
    title: "Is ExoKortex open source?",
    answer:
      "Yes. ExoKortex is MIT licensed. Explore the source code on GitHub, run it yourself, or contribute an improvement.",
  },
];

function LandingBrand() {
  return (
    <a className="lp-brand" href="#top" aria-label="ExoKortex home">
      <span className="lp-brand-mark">
        <Brain size={23} aria-hidden="true" />
      </span>
      <span translate="no">
        ExoKortex<span className="lp-brand-dot">.</span>
      </span>
    </a>
  );
}

function PortfolioPreview() {
  return (
    <div className="lp-preview" aria-label="Illustrative portfolio update preview">
      <div className="lp-source-note">
        <span className="lp-icon-tile">
          <GitBranch size={19} aria-hidden="true" />
        </span>
        <div>
          <strong>Something worth sharing.</strong>
          <span>image-classifier / new model evaluation</span>
        </div>
        <span className="lp-source-check">
          <Check size={15} aria-hidden="true" />
        </span>
      </div>
      <div className="lp-preview-sheet">
        <div className="lp-preview-toolbar">
          <span className="lp-window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Your next portfolio update</span>
          <Layers3 size={15} aria-hidden="true" />
        </div>
        <div className="lp-project-art" aria-hidden="true">
          <div className="lp-orbit lp-orbit-one" />
          <div className="lp-orbit lp-orbit-two" />
          <div className="lp-art-node lp-art-node-one">
            <Database size={20} />
          </div>
          <div className="lp-art-core">
            <Brain size={49} strokeWidth={1.3} />
          </div>
          <div className="lp-art-node lp-art-node-two">
            <Code2 size={22} />
          </div>
          <span className="lp-art-caption">From experiment to something you can show.</span>
        </div>
        <div className="lp-project-copy">
          <div className="lp-project-meta">
            <span>Machine learning</span>
            <span>Portfolio draft</span>
          </div>
          <h2>A clearer picture of what you built.</h2>
          <p>
            An image classifier with a new evaluation pipeline, documented results, and a
            reproducible training workflow.
          </p>
          <div className="lp-project-tags">
            <span>Python</span>
            <span>PyTorch</span>
            <span>Computer vision</span>
          </div>
          <div className="lp-review-line">
            <span className="lp-review-dot" />
            Ready for your review
            <ArrowUpRight size={16} aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="lp-approval-note">
        <span>
          <ShieldCheck size={21} aria-hidden="true" />
        </span>
        <div>
          <strong>You have the final say.</strong>
          <p>Nothing goes live without you.</p>
        </div>
        <Check size={18} aria-hidden="true" />
      </div>
      <p className="lp-example-label">Illustrative example. Your work tells its own story.</p>
    </div>
  );
}

function WorkflowExample() {
  const [view, setView] = useState<"source" | "draft">("draft");
  return (
    <div className="lp-workflow-example">
      <div className="lp-example-head">
        <span>
          <FileCode2 size={17} aria-hidden="true" /> A small change. A better story.
        </span>
        <span className="lp-sample-label">Sample content</span>
      </div>
      <div className="lp-example-switch" role="group" aria-label="Example view">
        <button
          type="button"
          aria-pressed={view === "source"}
          aria-controls="lp-example-content"
          onClick={() => setView("source")}
        >
          <GitBranch size={16} aria-hidden="true" />
          Source change
        </button>
        <button
          type="button"
          aria-pressed={view === "draft"}
          aria-controls="lp-example-content"
          onClick={() => setView("draft")}
        >
          <Sparkles size={16} aria-hidden="true" />
          Portfolio draft
        </button>
      </div>
      <div
        id="lp-example-content"
        className="lp-example-content"
        aria-live="polite"
        aria-atomic="true"
      >
        {view === "source" ? (
          <>
            <p className="lp-example-overline">image-classifier / evaluation.py</p>
            <h3>The work behind the update</h3>
            <p>
              Added a model evaluation pipeline, per-class metrics, and reproducible training
              instructions.
            </p>
            <span className="lp-example-foot">
              <GitBranch size={15} aria-hidden="true" />A meaningful project change, ready to
              explain.
            </span>
          </>
        ) : (
          <>
            <p className="lp-example-overline">Proposed project description</p>
            <h3>Show the progress, not just the project.</h3>
            <p>
              Built an image classifier with a reproducible evaluation workflow, making model
              performance easier to measure and compare.
            </p>
            <span className="lp-example-foot">
              <ShieldCheck size={16} aria-hidden="true" />A draft for your review. You decide what
              ships.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="lp" id="top">
      <a className="lp-skip" href="#main">
        Skip to content
      </a>
      <header className="lp-header lp-container">
        <LandingBrand />
        <nav className="lp-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#your-control">Your control</a>
          <a href={repositoryUrl} className="lp-source-link">
            Open source
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
        <Link className="lp-nav-cta" to="/login">
          Open workspace
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <main id="main">
        <section className="lp-hero lp-container" aria-labelledby="lp-hero-title">
          <div className="lp-hero-copy">
            <a className="lp-open-source" href={repositoryUrl}>
              <span aria-hidden="true" />
              Open source. Built for builders.
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <h1 id="lp-hero-title">
              Your work moves.
              <br />
              Your portfolio
              <br />
              should too.
            </h1>
            <p className="lp-hero-description">
              Keep building. ExoKortex turns your project progress into portfolio updates, ready for
              your review.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-button lp-button-primary" to="/login">
                Start your workspace
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className="lp-button lp-button-text" href="#how-it-works">
                See how it works
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="lp-hero-assurance">
              <ShieldCheck size={16} aria-hidden="true" />
              Your AI key. Your approval. Your portfolio.
            </p>
          </div>
          <PortfolioPreview />
        </section>

        <section className="lp-sources lp-container" aria-label="Supported project sources">
          <p>
            Good work happens everywhere.
            <br />
            <strong>Bring it together.</strong>
          </p>
          <ul>
            <li>
              <GitBranch size={23} aria-hidden="true" />
              GitHub
            </li>
            <li>
              <span className="lp-source-symbol" aria-hidden="true">
                ◎
              </span>
              Hugging Face
            </li>
            <li>
              <span className="lp-kaggle-symbol" aria-hidden="true">
                k
              </span>
              Kaggle
            </li>
            <li>
              <Code2 size={26} aria-hidden="true" />
              Google Colab
            </li>
          </ul>
        </section>

        <section
          className="lp-workflow lp-container lp-section"
          id="how-it-works"
          aria-labelledby="lp-workflow-title"
        >
          <div className="lp-section-heading">
            <div>
              <p className="lp-section-kicker">Less upkeep. More momentum.</p>
              <h2 id="lp-workflow-title">
                From shipped work
                <br />
                to a story worth showing.
              </h2>
            </div>
            <p>
              Your portfolio shouldn't be another project to maintain. Give every meaningful change
              a place to land.
            </p>
          </div>
          <WorkflowExample />
          <ol className="lp-steps">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <li key={title}>
                <div className="lp-step-top">
                  <span className="lp-step-icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <span className="lp-step-number">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-control-wrap" id="your-control" aria-labelledby="lp-control-title">
          <div className="lp-control lp-container">
            <div className="lp-control-intro">
              <span className="lp-control-mark">
                <ShieldCheck size={32} aria-hidden="true" />
              </span>
              <h2 id="lp-control-title">
                Your work.
                <br />
                Your model.
                <br />
                Your call.
              </h2>
              <p>
                A little help with the upkeep.
                <br />
                Full ownership of what comes next.
              </p>
            </div>
            <div className="lp-control-points">
              <article>
                <LockKeyhole size={23} aria-hidden="true" />
                <div>
                  <h3>Bring your own intelligence.</h3>
                  <p>
                    Use your own OpenAI-compatible API key. Choose your model and pay your provider
                    directly. Your keys stay encrypted.
                  </p>
                </div>
              </article>
              <article>
                <ShieldCheck size={23} aria-hidden="true" />
                <div>
                  <h3>Approval is part of the process.</h3>
                  <p>
                    Every proposed portfolio change waits for your review. Keep what's useful. Skip
                    what isn't.
                  </p>
                </div>
              </article>
              <article>
                <GitPullRequest size={23} aria-hidden="true" />
                <div>
                  <h3>A pull request. Not a leap of faith.</h3>
                  <p>
                    Approved updates arrive as a pull request. You merge it, and your existing CI
                    handles deployment. Familiar tools, all the way through.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-faq lp-container lp-section" aria-labelledby="lp-faq-title">
          <div>
            <p className="lp-section-kicker">A few things to know</p>
            <h2 id="lp-faq-title">Glad you asked.</h2>
            <p>
              Have a closer look at{" "}
              <a href={repositoryUrl}>
                the project on GitHub
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              .
            </p>
          </div>
          <div className="lp-faq-list">
            {questions.map(({ title, answer }) => (
              <details key={title}>
                <summary>
                  {title}
                  <span className="lp-faq-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-final-wrap lp-container" aria-labelledby="lp-final-title">
          <div className="lp-final">
            <span className="lp-final-icon">
              <Brain size={30} aria-hidden="true" />
            </span>
            <h2 id="lp-final-title">
              Build the next thing.
              <br />
              We'll keep up.
            </h2>
            <p>Make your portfolio a reflection of the work you're doing now.</p>
            <Link className="lp-button lp-button-primary" to="/login">
              Start your workspace
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <span className="lp-final-note">Open source. Human approved. Always your work.</span>
          </div>
        </section>
      </main>

      <footer className="lp-footer lp-container">
        <div>
          <LandingBrand />
          <p>For the work that keeps moving.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href={repositoryUrl}>
            Source code
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <a href="#top">
            Back to top
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
        <span>Made for builders.</span>
      </footer>
    </div>
  );
}
