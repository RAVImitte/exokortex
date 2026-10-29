import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  GitBranch,
  GitPullRequest,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../layout/Brand.js";
import { ThemeToggle } from "../layout/ThemeToggle.js";
import { Sculpture } from "../ui/Sculpture.js";

const repo = "https://github.com/RAVImitte/exokortex";
const process = [
  {
    title: "Connect the dots.",
    text: "Bring together the places your projects live. Choose a GitHub repository as your portfolio.",
    icon: GitBranch,
  },
  {
    title: "Find the meaning.",
    text: "Agents read what changed and turn the meaningful parts into a portfolio draft.",
    icon: Sparkles,
  },
  {
    title: "Keep the final say.",
    text: "Review the proposal. Approve it for a pull request, then merge when you're ready.",
    icon: ShieldCheck,
  },
];
const questions = [
  [
    "Does anything publish without me?",
    "No. Every proposed update waits for your approval. Approved changes arrive as a pull request. You merge it, and your existing CI deploys it.",
  ],
  [
    "Where can my work live?",
    "Connect GitHub repositories, Hugging Face models, datasets and Spaces, Kaggle datasets and notebooks, and Google Colab notebooks. Your portfolio lives in one GitHub repository.",
  ],
  [
    "Can I bring my own model?",
    "Yes. Use your own OpenAI-compatible API key, with presets for OpenAI, OpenRouter, and Groq. You choose the model and pay your provider directly. Your key is encrypted and is never sent to the model.",
  ],
  [
    "Can I run this myself?",
    "Yes. ExoKortex is open source and MIT licensed. The repository includes instructions for local development and deployment.",
  ],
];

export function LandingPage() {
  const [example, setExample] = useState<"change" | "story">("story");
  return (
    <div className="landing" id="top">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="landing-nav landing-container">
        <Link to="/" aria-label="ExoKortex home">
          <Brand />
        </Link>
        <nav aria-label="Website navigation">
          <a href="#how-it-works">The process</a>
          <a href="#your-control">Your control</a>
          <a href={repo}>
            Open source <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </nav>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <Link className="landing-enter" to="/login">
            Open workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="landing-hero landing-container" aria-labelledby="hero-title">
          <div className="landing-hero-top">
            <span>
              <span className="status-point" />
              For the work that keeps moving.
            </span>
            <span>A portfolio that keeps up.</span>
          </div>
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <h1 id="hero-title">
                Good work.
                <br />
                Better told.
              </h1>
              <p>
                You build the next thing. ExoKortex turns your progress into portfolio updates,
                ready for your review.
              </p>
              <div className="landing-hero-buttons">
                <Link className="landing-button" to="/login">
                  Start your workspace <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className="landing-how">
                  Explore the process <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
              <span className="landing-hero-note">
                <ShieldCheck size={15} aria-hidden="true" />
                Your key. Your approval. Your name on it.
              </span>
            </div>
            <div className="landing-hero-art">
              <Sculpture />
              <div className="landing-art-caption">
                <span>Work becomes a story.</span>
                <span>ExoKortex</span>
              </div>
            </div>
          </div>
          <div className="landing-source-row">
            <p>Wherever your work lives.</p>
            <ul>
              <li>
                <GitBranch size={18} aria-hidden="true" />
                GitHub
              </li>
              <li>
                <Layers size={18} aria-hidden="true" />
                Hugging Face
              </li>
              <li>
                <span className="kaggle-letter" aria-hidden="true">
                  k
                </span>
                Kaggle
              </li>
              <li>
                <Code2 size={20} aria-hidden="true" />
                Google Colab
              </li>
            </ul>
          </div>
        </section>

        <section
          className="landing-process landing-container"
          id="how-it-works"
          aria-labelledby="process-title"
        >
          <div className="landing-section-title">
            <h2 id="process-title">
              Less maintenance.
              <br />
              More momentum.
            </h2>
            <p>
              Your best work shouldn't get lost between commits. Give it a clear path from the
              repository to your portfolio.
            </p>
          </div>
          <ol className="landing-process-steps">
            {process.map(({ title, text, icon: Icon }, index) => (
              <li key={title}>
                <div>
                  <span>0{index + 1}</span>
                  <Icon size={22} aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className="landing-demo">
            <div className="landing-demo-heading">
              <div>
                <span className="demo-symbol">
                  <Sparkles size={19} aria-hidden="true" />
                </span>
                <span>A change worth showing.</span>
              </div>
              <span>Illustrative example</span>
            </div>
            <div className="landing-demo-body">
              <div className="landing-demo-source">
                <GitBranch size={24} aria-hidden="true" />
                <span>image-classifier / main</span>
                <h3>
                  Behind every project,
                  <br />
                  there's progress.
                </h3>
                <p>
                  A new evaluation pipeline.
                  <br />
                  Reproducible training.
                  <br />
                  Results worth talking about.
                </p>
                <span className="landing-demo-source-bottom">
                  <Check size={15} aria-hidden="true" />
                  Meaningful change identified
                </span>
              </div>
              <div className="landing-demo-story">
                <div className="landing-demo-tabs" role="group" aria-label="Portfolio example">
                  <button
                    type="button"
                    aria-pressed={example === "change"}
                    onClick={() => setExample("change")}
                  >
                    The change
                  </button>
                  <button
                    type="button"
                    aria-pressed={example === "story"}
                    onClick={() => setExample("story")}
                  >
                    The story
                  </button>
                </div>
                <div className="landing-demo-text" aria-live="polite" aria-atomic="true">
                  {example === "story" ? (
                    <>
                      <span>Proposed portfolio update</span>
                      <h3>
                        Making model performance
                        <br />
                        easier to understand.
                      </h3>
                      <p>
                        Built an image classifier with a reproducible evaluation workflow, turning
                        model results into clear, comparable insights.
                      </p>
                      <div className="landing-demo-tags">
                        <span>Python</span>
                        <span>PyTorch</span>
                        <span>Machine learning</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>Source change summary</span>
                      <h3>
                        The details that move
                        <br />
                        your project forward.
                      </h3>
                      <p>
                        Added per-class metrics, an evaluation pipeline, and documented training
                        instructions. A meaningful update to an existing project.
                      </p>
                      <div className="landing-demo-tags">
                        <span>Evaluation</span>
                        <span>Documentation</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="landing-demo-review">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>A draft. Until you say otherwise.</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-control" id="your-control" aria-labelledby="control-title">
          <div className="landing-container landing-control-grid">
            <div>
              <p className="landing-control-intro">A little assistance. Full ownership.</p>
              <h2 id="control-title">
                Intelligence,
                <br />
                with your
                <br />
                fingerprints.
              </h2>
              <Sculpture className="sculpture-small" />
            </div>
            <div className="landing-principles">
              <article>
                <ShieldCheck aria-hidden="true" />
                <h3>You decide what belongs.</h3>
                <p>
                  Every proposal waits for your approval. Keep the meaningful updates. Skip the
                  noise. Your portfolio should sound like you.
                </p>
              </article>
              <article>
                <Sparkles aria-hidden="true" />
                <h3>Your model. Your terms.</h3>
                <p>
                  Bring your own OpenAI-compatible key. Choose the intelligence behind your updates
                  and pay your provider directly.
                </p>
              </article>
              <article>
                <GitPullRequest aria-hidden="true" />
                <h3>Familiar tools. No surprises.</h3>
                <p>
                  Approved updates become pull requests. You merge; your existing CI deploys.
                  Everything stays in the workflow you already trust.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-faq landing-container" aria-labelledby="faq-title">
          <div>
            <span className="landing-small-label">The finer details</span>
            <h2 id="faq-title">
              Clarity comes
              <br />
              standard.
            </h2>
            <a href={repo}>
              Explore the source <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div>
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final landing-container" aria-labelledby="final-title">
          <div>
            <span className="status-point" />
            Your next chapter is already in progress.
          </div>
          <h2 id="final-title">
            Keep making.
            <br />
            We'll keep up.
          </h2>
          <Link className="landing-button" to="/login">
            Start your workspace <ArrowUpRight size={21} aria-hidden="true" />
          </Link>
          <p>Open source. Human approved. Always your work.</p>
          <ArrowRight
            className="landing-final-arrow"
            size={140}
            strokeWidth={1}
            aria-hidden="true"
          />
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <Link to="/" aria-label="ExoKortex home">
          <Brand />
        </Link>
        <p>For the work that keeps moving.</p>
        <a href={repo}>
          Source code <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        <a href="#top">
          Back to top <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
