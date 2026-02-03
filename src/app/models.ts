export type ModelProvider = "openai" | "anthropic";
export type ModelVariant = "fast" | "thinking";

export type ModelSelection = {
  provider: ModelProvider;
  model: string;
  variant: ModelVariant;
};

export const DEFAULT_MODEL_SELECTION: ModelSelection = {
  provider: "openai",
  model: "gpt-5",
  variant: "fast",
};

const LEGACY_MODEL_MAP: Record<string, string> = {
  gpt3: "openai:gpt-5:fast",
  "gpt-3.5": "openai:gpt-5:fast",
  "gpt-3.5-turbo": "openai:gpt-5:fast",
  gpt4: "openai:gpt-5:fast",
  "gpt-4": "openai:gpt-5:fast",
  gpt5: "openai:gpt-5:fast",
  "gpt-5": "openai:gpt-5:fast",
};

export const normalizeLegacyModelId = (value: string): string => {
  return LEGACY_MODEL_MAP[value] ?? value;
};

const isProvider = (value: string): value is ModelProvider =>
  value === "openai" || value === "anthropic";

export const parseModelSelection = (raw: unknown): ModelSelection => {
  if (typeof raw !== "string") {
    return DEFAULT_MODEL_SELECTION;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_MODEL_SELECTION;
  }

  const normalized = normalizeLegacyModelId(trimmed);

  if (normalized.includes(":")) {
    const [providerRaw, modelRaw, variantRaw] = normalized.split(":");
    if (modelRaw) {
      const providerCandidate = providerRaw ?? "";
      const provider = isProvider(providerCandidate) ? providerCandidate : "openai";
      const variant: ModelVariant = variantRaw === "thinking" ? "thinking" : "fast";
      return {
        provider,
        model: modelRaw,
        variant,
      };
    }
  }

  if (normalized.startsWith("claude-")) {
    return {
      provider: "anthropic",
      model: normalized,
      variant: "fast",
    };
  }

  return {
    provider: "openai",
    model: normalized,
    variant: "fast",
  };
};

export const formatModelSelection = (selection: ModelSelection): string => {
  return `${selection.provider}:${selection.model}:${selection.variant}`;
};
