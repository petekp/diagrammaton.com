import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { fetchUserByLicenseKey } from "~/app/dataHelpers";
import {
  DEFAULT_MODEL_SELECTION,
  formatModelSelection,
  type ModelProvider,
  type ModelVariant,
} from "~/app/models";
import { logError, logInfo } from "~/utils/log";

export const runtime = "nodejs";

const CACHE_TTL_MS = 15 * 60 * 1000;
const MODELS_PER_PROVIDER = 6;
const modelCache = new Map<
  string,
  { expiresAt: number; payload: ModelListResponse }
>();

type ModelOption = {
  id: string;
  label: string;
  provider: ModelProvider;
  baseModel: string;
  variant: ModelVariant;
};

type ModelListResponse = {
  defaultModelId: string | null;
  models: ModelOption[];
  providers: Record<ModelProvider, boolean>;
};

const openaiAllowsThinking = (modelId: string) => modelId.startsWith("gpt-5");
const anthropicAllowsThinking = (modelId: string) =>
  modelId.startsWith("claude-4") || modelId.startsWith("claude-3-7");

const formatOpenAiLabel = (modelId: string) => {
  if (modelId.startsWith("gpt-")) {
    return modelId.replace(/^gpt-/, "GPT-");
  }
  if (modelId.startsWith("o")) {
    return `O${modelId.slice(1)}`;
  }
  return modelId;
};

const formatAnthropicLabel = (modelId: string) => {
  if (!modelId.startsWith("claude-")) {
    return modelId;
  }
  const withoutPrefix = modelId.replace(/^claude-/, "Claude ");
  return withoutPrefix.replace(/-/g, " ");
};

const buildModelOptions = ({
  provider,
  modelId,
  allowThinking,
}: {
  provider: ModelProvider;
  modelId: string;
  allowThinking: boolean;
}): ModelOption[] => {
  const baseLabel =
    provider === "openai"
      ? formatOpenAiLabel(modelId)
      : formatAnthropicLabel(modelId);

  const options: ModelOption[] = [
    {
      id: formatModelSelection({
        provider,
        model: modelId,
        variant: "fast",
      }),
      label: `${baseLabel} (fast)`,
      provider,
      baseModel: modelId,
      variant: "fast",
    },
  ];

  if (allowThinking) {
    options.push({
      id: formatModelSelection({
        provider,
        model: modelId,
        variant: "thinking",
      }),
      label: `${baseLabel} (thinking)`,
      provider,
      baseModel: modelId,
      variant: "thinking",
    });
  }

  return options;
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function POST(req: Request) {
  const { licenseKey } = (await req.json()) as { licenseKey?: string };

  if (!licenseKey) {
    return NextResponse.json(
      {
        models: [],
        defaultModelId: null,
        providers: { openai: false, anthropic: false },
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const { user } = (await fetchUserByLicenseKey(licenseKey)) as {
    user: {
      id: string;
      openaiApiKey: string | null;
      anthropicApiKey: string | null;
    };
  };
  const openaiKey = user.openaiApiKey ?? null;
  const anthropicKey = user.anthropicApiKey ?? null;

  const cacheKey = `${user.id}:${openaiKey?.slice(-6) ?? "none"}:${anthropicKey?.slice(-6) ?? "none"}`;
  const cached = modelCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `public, max-age=${CACHE_TTL_MS / 1000}`,
      },
    });
  }

  const models: ModelOption[] = [];
  const providers: Record<ModelProvider, boolean> = {
    openai: false,
    anthropic: false,
  };

  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const list = await openai.models.list();
      const openaiModels = list.data
        .filter((item) => item.id.startsWith("gpt-") || item.id.startsWith("o"))
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
        .slice(0, MODELS_PER_PROVIDER);

      for (const model of openaiModels) {
        const modelId = model.id;
        models.push(
          ...buildModelOptions({
            provider: "openai",
            modelId,
            allowThinking: openaiAllowsThinking(modelId),
          })
        );
      }

      if (openaiModels.length > 0) {
        providers.openai = true;
      }
    } catch (error) {
      logError("Model list: OpenAI fetch failed", {
        message: (error as Error)?.message,
      });
    }
  }

  if (anthropicKey) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const list = await anthropic.models.list();
      const anthropicModels = list.data
        .filter((item) => item.id.startsWith("claude-"))
        .sort((a, b) => {
          const aTime = Date.parse(a.created_at ?? "") || 0;
          const bTime = Date.parse(b.created_at ?? "") || 0;
          return bTime - aTime;
        })
        .slice(0, MODELS_PER_PROVIDER);

      for (const model of anthropicModels) {
        const modelId = model.id;
        models.push(
          ...buildModelOptions({
            provider: "anthropic",
            modelId,
            allowThinking: anthropicAllowsThinking(modelId),
          })
        );
      }

      if (anthropicModels.length > 0) {
        providers.anthropic = true;
      }
    } catch (error) {
      logError("Model list: Anthropic fetch failed", {
        message: (error as Error)?.message,
      });
    }
  }

  let defaultModelId: string | null = null;
  if (models.length > 0) {
    const preferred = models.find(
      (model) => model.id === formatModelSelection(DEFAULT_MODEL_SELECTION)
    );
    defaultModelId = preferred ? preferred.id : models[0]?.id ?? null;
  }

  const payload: ModelListResponse = {
    defaultModelId,
    models,
    providers,
  };

  modelCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload,
  });

  logInfo("Model list: response", {
    openai: providers.openai,
    anthropic: providers.anthropic,
    count: models.length,
  });

  return NextResponse.json(payload, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `public, max-age=${CACHE_TTL_MS / 1000}`,
    },
  });
}
