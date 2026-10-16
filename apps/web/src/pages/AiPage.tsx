import { CircleCheck, KeyRound, Save, TriangleAlert, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { api, messageOf } from "../api/client.js";
import { Button } from "../ui/Button.js";
import { Card } from "../ui/Card.js";
import { Field, Input, SecretInput } from "../ui/Field.js";
import { PageHeader } from "../ui/PageHeader.js";
import { Segmented } from "../ui/Segmented.js";
import { useToast } from "../ui/Toast.js";

type Preset = "openai" | "openrouter" | "groq" | "custom";

const presets: Record<Exclude<Preset, "custom">, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
};

function presetFor(provider: string): Preset {
  return provider in presets ? (provider as Preset) : "custom";
}

interface TestResult {
  ok: boolean;
  text: string;
}

export function AiPage() {
  const [preset, setPreset] = useState<Preset>("openai");
  const [provider, setProvider] = useState("openai");
  const [baseUrl, setBaseUrl] = useState(presets.openai.baseUrl);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const toast = useToast();

  useEffect(() => {
    api<{ config: { provider: string; baseUrl: string; model: string } | null }>("/api/llm-config")
      .then((body) => {
        if (!body.config) return;
        setPreset(presetFor(body.config.provider));
        setProvider(body.config.provider);
        setBaseUrl(body.config.baseUrl);
        setModel(body.config.model);
        setSaved(true);
      })
      .catch(() => undefined);
  }, []);

  function choose(next: Preset) {
    setPreset(next);
    setResult(null);
    if (next === "custom") {
      setProvider("custom");
      return;
    }
    setProvider(next);
    setBaseUrl(presets[next].baseUrl);
    if (!model) setModel(presets[next].model);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      await api("/api/llm-config", {
        method: "PUT",
        body: JSON.stringify({ provider, baseUrl, model, apiKey }),
      });
      setApiKey("");
      setSaved(true);
      toast.success("Saved. The key is encrypted and is not returned by the API.");
    } catch (err) {
      toast.error(messageOf(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const body = await api<{ ok: boolean; model: string }>("/api/llm-config/test", {
        method: "POST",
      });
      setResult({
        ok: body.ok,
        text: body.ok ? `${body.model} replied.` : "The model replied, but not with pong.",
      });
    } catch (err) {
      setResult({ ok: false, text: messageOf(err, "Test failed") });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="AI model"
        description="Bring your own OpenAI-compatible key. ExoKortex does not pay for inference and never sends the key to the agents."
      />
      <Card>
        <form className="stack" onSubmit={(event) => void save(event)}>
          <div className="field">
            <span className="field-label">Provider</span>
            <div>
              <Segmented
                label="Provider"
                value={preset}
                onChange={choose}
                options={[
                  { value: "openai", label: "OpenAI" },
                  { value: "openrouter", label: "OpenRouter" },
                  { value: "groq", label: "Groq" },
                  { value: "custom", label: "Custom" },
                ]}
              />
            </div>
          </div>
          <div className="form-row">
            <Field label="Base URL" hint="Any OpenAI-compatible chat completions endpoint.">
              {(id) => (
                <Input
                  id={id}
                  value={baseUrl}
                  onChange={(event) => {
                    setBaseUrl(event.target.value);
                    if (preset !== "custom") {
                      setPreset("custom");
                      setProvider("custom");
                    }
                  }}
                  required
                />
              )}
            </Field>
            <Field label="Model">
              {(id) => (
                <Input
                  id={id}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder={preset === "custom" ? "model-name" : presets[preset].model}
                  required
                />
              )}
            </Field>
          </div>
          <Field
            label="API key"
            hint={
              saved ? (
                <span className="saved-note">
                  <KeyRound size={13} /> A key is saved. Enter it again to change any setting.
                </span>
              ) : (
                "Encrypted at rest. It is never shown again."
              )
            }
          >
            {(id) => (
              <SecretInput
                id={id}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
                required
              />
            )}
          </Field>
          <div className="cluster">
            <Button type="submit" variant="primary" icon={Save} loading={saving}>
              Save
            </Button>
            <Button icon={Zap} loading={testing} disabled={!saved} onClick={() => void test()}>
              Test model
            </Button>
          </div>
          <AnimatePresence>
            {result ? (
              <motion.div
                key={result.text}
                className={`result ${result.ok ? "result-success" : "result-error"}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {result.ok ? <CircleCheck size={16} /> : <TriangleAlert size={16} />}
                {result.text}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </form>
      </Card>
    </section>
  );
}
