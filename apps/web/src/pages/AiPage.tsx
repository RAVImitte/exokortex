import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client.js";

interface LlmForm {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

const empty: LlmForm = {
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
};

export function AiPage() {
  const [form, setForm] = useState<LlmForm>(empty);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api<{ config: { provider: string; baseUrl: string; model: string } | null }>("/api/llm-config")
      .then((body) => {
        if (!body.config) return;
        setForm((current) => ({
          ...current,
          provider: body.config?.provider ?? current.provider,
          baseUrl: body.config?.baseUrl ?? "",
          model: body.config?.model ?? "",
        }));
        setStatus("A key is saved. It is never shown again.");
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    try {
      await api("/api/llm-config", { method: "PUT", body: JSON.stringify(form) });
      setForm((current) => ({ ...current, apiKey: "" }));
      setStatus("Saved. The key is encrypted and is not returned by the API.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <section>
      <h1>AI</h1>
      <p className="muted">
        Bring your own OpenAI-compatible key. ExoKortex does not pay for inference.
      </p>
      <form className="stack" onSubmit={(event) => void save(event)}>
        <label>
          Provider
          <input
            value={form.provider}
            onChange={(event) => setForm({ ...form, provider: event.target.value })}
          />
        </label>
        <label>
          Base URL
          <input
            value={form.baseUrl}
            onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
          />
        </label>
        <label>
          Model
          <input
            value={form.model}
            onChange={(event) => setForm({ ...form, model: event.target.value })}
            required
          />
        </label>
        <label>
          API key
          <input
            type="password"
            value={form.apiKey}
            onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
            autoComplete="off"
          />
        </label>
        <button type="submit">Save</button>
      </form>
      <p>
        <button
          className="ghost"
          type="button"
          onClick={() => {
            void api<{ ok: boolean; model: string }>("/api/llm-config/test", { method: "POST" })
              .then((result) =>
                setStatus(
                  result.ok
                    ? `Model ${result.model} replied.`
                    : "The model replied, but not with pong.",
                ),
              )
              .catch((err: unknown) =>
                setStatus(err instanceof Error ? err.message : "Test failed"),
              );
          }}
        >
          Test LLM
        </button>
      </p>
      {status ? <p>{status}</p> : null}
    </section>
  );
}
