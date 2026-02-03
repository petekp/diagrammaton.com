import { useForm, Controller } from "react-hook-form";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CornerLeftUp, HelpCircle, RefreshCcw } from "lucide-react";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { AnimatePresence, type AnimationProps, motion } from "framer-motion";

import { api } from "~/utils/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InferGetServerSidePropsType } from "next";
import type { getServerSideProps } from "..";
import { LICENSE_LENGTH } from "@/lib/utils";

const apiKeyMask = "sk-••••••••••••••••••••••••••••••••";
const anthropicApiKeyMask = "sk-ant-••••••••••••••••••••••••••";

const revealAnimation: AnimationProps = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: "auto",
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 250,
      restDelta: 0.001,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
  },
};

const getLetterAnimation = (index: number): AnimationProps => ({
  initial: { opacity: 1, y: -10 },
  animate: {
    y: index % 2 === 0 ? 10 : -10,
    transition: {
      type: "spring",
      damping: 40,
      stiffness: 150,
      restDelta: 0.001,
    },
  },
});

const openaiApiKeySchema = z.string().startsWith("sk-", {
  message: "Invalid key, please double check it and paste again.",
});
const anthropicApiKeySchema = z.string().startsWith("sk-ant-", {
  message: "Invalid key, please double check it and paste again.",
});

export default function AccountView({
  userData,
}: {
  userData: InferGetServerSidePropsType<typeof getServerSideProps>["userData"];
}) {
  const utils = api.useContext();
  const [copySuccess, setCopySuccess] = useState("");
  const [animatedLicenseKey, setAnimatedLicenseKey] = useState(
    userData?.licenseKey || "0".repeat(LICENSE_LENGTH)
  );
  const { data: session } = useSession();
  const generateLicenseKey = api.license.generateLicenseKey.useMutation({
    onSuccess: (data) => {
      void utils.license.invalidate();
      setAnimatedLicenseKey(data);
    },
  });
  const saveOpenAiApiKey = api.apiKey.setUserApiKey.useMutation({
    onSuccess: () => {
      void utils.apiKey.invalidate();
    },
  });
  const saveAnthropicApiKey = api.apiKey.setUserAnthropicApiKey.useMutation({
    onSuccess: () => {
      void utils.apiKey.invalidate();
    },
  });
  const validateOpenAiApiKey = api.apiKey.validate.useMutation();
  const validateAnthropicApiKey = api.apiKey.validateAnthropic.useMutation();
  const licenseKeyQuery = api.license.getUserLicenseKey.useQuery();
  const openaiApiKeyQuery = api.apiKey.getUserKeyLastFour.useQuery();
  const anthropicApiKeyQuery = api.apiKey.getUserAnthropicKeyLastFour.useQuery();

  const form = useForm({
    mode: "onChange",
    defaultValues: {
      openaiApiKey: userData?.openaiApiKey
        ? `${apiKeyMask}${userData?.openaiApiKey}`
        : "",
      anthropicApiKey: userData?.anthropicApiKey
        ? `${anthropicApiKeyMask}${userData?.anthropicApiKey}`
        : "",
      licenseKey: userData?.licenseKey || "0".repeat(LICENSE_LENGTH),
    },
  });

  const { setValue, watch, setError, clearErrors } = form;

  const openaiApiKey = watch("openaiApiKey");
  const anthropicApiKey = watch("anthropicApiKey");

  useEffect(() => {
    if (generateLicenseKey.isLoading) {
      const timer = setInterval(() => {
        setAnimatedLicenseKey(
          Array.from({ length: LICENSE_LENGTH }, () =>
            String.fromCharCode(Math.floor(Math.random() * 36) + 65).replace(
              /91-96/,
              (c) => String.fromCharCode(c.charCodeAt(0) - 26)
            )
          ).join("")
        );
      }, 50);
      return () => clearInterval(timer);
    }
  }, [generateLicenseKey.isLoading]);

  const onSubmitOpenAiApiKey = useCallback(async () => {
    const candidate = openaiApiKey?.trim();
    if (!candidate || candidate.includes("•")) {
      return;
    }

    const isFormatValid = openaiApiKeySchema.safeParse(candidate).success;
    if (!isFormatValid) {
      setError("openaiApiKey", {
        type: "manual",
        message: "Invalid key format. Paste a valid OpenAI key.",
      });
      return;
    }

    const isValid = await validateOpenAiApiKey.mutateAsync(candidate);

    if (!isValid) {
      setError("openaiApiKey", {
        type: "manual",
        message: "Hmm this key isn't working, can you verify and try again?",
      });
      return;
    }

    const lastfour = await saveOpenAiApiKey.mutateAsync({
      userId: session?.user?.id || "",
      apiKey: candidate,
    });

    if (!lastfour) {
      return;
    }

    setValue("openaiApiKey", `${apiKeyMask}${lastfour}`);
    await generateLicenseKey.mutateAsync();
  }, [
    openaiApiKey,
    validateOpenAiApiKey,
    setError,
    saveOpenAiApiKey,
    session,
    setValue,
    generateLicenseKey,
  ]);

  const onSubmitAnthropicApiKey = useCallback(async () => {
    const candidate = anthropicApiKey?.trim();
    if (!candidate || candidate.includes("•")) {
      return;
    }

    const isFormatValid = anthropicApiKeySchema.safeParse(candidate).success;
    if (!isFormatValid) {
      setError("anthropicApiKey", {
        type: "manual",
        message: "Invalid key format. Paste a valid Anthropic key.",
      });
      return;
    }

    const isValid = await validateAnthropicApiKey.mutateAsync(candidate);

    if (!isValid) {
      setError("anthropicApiKey", {
        type: "manual",
        message: "Hmm this key isn't working, can you verify and try again?",
      });
      return;
    }

    const lastfour = await saveAnthropicApiKey.mutateAsync({
      userId: session?.user?.id || "",
      apiKey: candidate,
    });

    if (!lastfour) {
      return;
    }

    setValue("anthropicApiKey", `${anthropicApiKeyMask}${lastfour}`);
    await generateLicenseKey.mutateAsync();
  }, [
    anthropicApiKey,
    validateAnthropicApiKey,
    setError,
    saveAnthropicApiKey,
    session,
    setValue,
    generateLicenseKey,
  ]);

  const onSubmitLicenseKey = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await generateLicenseKey.mutateAsync();
  };

  function copyLicenseKey(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    if (!licenseKeyQuery.data) {
      return;
    }

    if (!navigator.clipboard) return;

    navigator.clipboard
      .writeText(licenseKeyQuery.data || "")
      .then(() => {
        setCopySuccess("Copied!");
      })
      .catch((err) => console.error("Failed to copy text: ", err));
  }

  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const openaiKeyFieldIsLoading =
    saveOpenAiApiKey.isLoading ||
    validateOpenAiApiKey.isLoading ||
    openaiApiKeyQuery.isLoading;
  const anthropicKeyFieldIsLoading =
    saveAnthropicApiKey.isLoading ||
    validateAnthropicApiKey.isLoading ||
    anthropicApiKeyQuery.isLoading;
  const licenseKeyFieldIsLoading =
    generateLicenseKey.isLoading || licenseKeyQuery.isLoading;

  const licenseKeyChars = useMemo(
    () => animatedLicenseKey.split(""),
    [animatedLicenseKey]
  );

  const lastSubmittedOpenAiKey = useRef<string | null>(null);
  const lastSubmittedAnthropicKey = useRef<string | null>(null);

  useEffect(() => {
    const candidate = openaiApiKey?.trim();
    if (!candidate || candidate.includes("•")) {
      return;
    }
    if (!openaiApiKeySchema.safeParse(candidate).success) {
      return;
    }
    if (candidate === lastSubmittedOpenAiKey.current) {
      return;
    }
    if (openaiKeyFieldIsLoading) {
      return;
    }
    lastSubmittedOpenAiKey.current = candidate;
    void onSubmitOpenAiApiKey();
  }, [openaiApiKey, onSubmitOpenAiApiKey, openaiKeyFieldIsLoading]);

  useEffect(() => {
    const candidate = anthropicApiKey?.trim();
    if (!candidate || candidate.includes("•")) {
      return;
    }
    if (!anthropicApiKeySchema.safeParse(candidate).success) {
      return;
    }
    if (candidate === lastSubmittedAnthropicKey.current) {
      return;
    }
    if (anthropicKeyFieldIsLoading) {
      return;
    }
    lastSubmittedAnthropicKey.current = candidate;
    void onSubmitAnthropicApiKey();
  }, [anthropicApiKey, onSubmitAnthropicApiKey, anthropicKeyFieldIsLoading]);

  const openaiApiKeyField = (
    <Controller
      name="openaiApiKey"
      render={({ field, fieldState: { error } }) => {
        const { onChange, ...restField } = field;
        return (
        <FormItem className="flex flex-col items-start">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="flex select-none flex-row gap-2">
              Your OpenAI API key{" "}
            </FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle
                  size={16}
                  className={`border-3 stroke-gray-500 hover:stroke-gray-400 dark:stroke-gray-400 dark:hover:stroke-gray-300`}
                />
              </TooltipTrigger>
              <TooltipContent>
                Your key is used when generating diagrams
              </TooltipContent>
            </Tooltip>
          </div>
          <FormControl>
            <div className=" flex w-full flex-row gap-1">
              <div className="relative flex-1">
                <Input
                  tabIndex={0}
                  disabled={openaiKeyFieldIsLoading}
                  onFocus={(e) => e.target.select()}
                  onChange={(event) => {
                    clearErrors("openaiApiKey");
                    onChange(event);
                  }}
                  placeholder={"Paste key"}
                  {...restField}
                  className="w-full flex-1"
                />
              </div>
            </div>
          </FormControl>
          <AnimatePresence>
            {error && (
              <motion.p
                {...revealAnimation}
                className="error-message select-none text-xs text-orange-700 dark:text-orange-400"
              >
                {error.message}
              </motion.p>
            )}
          </AnimatePresence>
          <FormMessage />
        </FormItem>
        );
      }}
    />
  );

  const anthropicApiKeyField = (
    <Controller
      name="anthropicApiKey"
      render={({ field, fieldState: { error } }) => {
        const { onChange, ...restField } = field;
        return (
        <FormItem className="flex flex-col items-start">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="flex select-none flex-row gap-2">
              Your Anthropic API key{" "}
            </FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle
                  size={16}
                  className={`border-3 stroke-gray-500 hover:stroke-gray-400 dark:stroke-gray-400 dark:hover:stroke-gray-300`}
                />
              </TooltipTrigger>
              <TooltipContent>
                Your key is used when generating diagrams
              </TooltipContent>
            </Tooltip>
          </div>
          <FormControl>
            <div className=" flex w-full flex-row gap-1">
              <div className="relative flex-1">
                <Input
                  tabIndex={0}
                  disabled={anthropicKeyFieldIsLoading}
                  onFocus={(e) => e.target.select()}
                  onChange={(event) => {
                    clearErrors("anthropicApiKey");
                    onChange(event);
                  }}
                  placeholder={"Paste key"}
                  {...restField}
                  className="w-full flex-1"
                />
              </div>
            </div>
          </FormControl>
          <AnimatePresence>
            {error && (
              <motion.p
                {...revealAnimation}
                className="error-message select-none text-xs text-orange-700 dark:text-orange-400"
              >
                {error.message}
              </motion.p>
            )}
          </AnimatePresence>
          <FormMessage />
        </FormItem>
        );
      }}
    />
  );

  const hasOpenaiApiKey = userData?.openaiApiKey || openaiApiKeyQuery.data;
  const hasAnthropicApiKey =
    userData?.anthropicApiKey || anthropicApiKeyQuery.data;
  const hasApiKey = hasOpenaiApiKey || hasAnthropicApiKey;

  const hasLicenseKey = userData?.licenseKey || licenseKeyQuery.data;

  const licenseKeyField = (
    <Controller
      name="licenseKey"
      render={({ fieldState: { error } }) => (
        <FormItem className="flex flex-col items-start">
          <FormLabel className="relative flex flex-1 justify-start gap-2">
            <span className="select-none">Your license key</span>
            <AnimatePresence>
              {copySuccess && (
                <motion.span
                  initial={{ opacity: 0.01 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="success-message animate-bounce text-green-600 dark:text-green-400"
                >
                  {copySuccess}
                </motion.span>
              )}
            </AnimatePresence>
          </FormLabel>
          <FormControl>
            <div className=" flex w-full flex-row gap-1">
              <div className="relative flex flex-1 flex-col gap-2">
                <div className="flex flex-1 items-center">
                  <>
                    <p
                      className={`font-mono text-2xl ${
                        licenseKeyFieldIsLoading
                          ? "text-gray-400 dark:text-gray-500 "
                          : "text-purple-600 dark:text-green-400"
                      } `}
                    >
                      <AnimatePresence>
                        {licenseKeyChars.map((char, index) => (
                          <motion.span key={index} {...getLetterAnimation(index)}>
                            {char}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </p>
                    {hasLicenseKey && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="h-7"
                            variant="link"
                            disabled={licenseKeyFieldIsLoading}
                            onClick={(e) => void onSubmitLicenseKey(e)}
                          >
                            <RefreshCcw
                              size={16}
                              className={`border-3 ${
                                generateLicenseKey.isLoading
                                  ? "animate-spin"
                                  : ""
                              } ${
                                licenseKeyFieldIsLoading
                                  ? "stroke-gray-400 dark:stroke-gray-200 "
                                  : "stroke-purple-600 dark:stroke-green-500"
                              }`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerate key</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                </div>
                <motion.div
                  {...revealAnimation}
                  className="flex select-none items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  <CornerLeftUp size={14} className="mt-[-2px]" />
                  <Button
                    disabled={
                      licenseKeyFieldIsLoading ||
                      !licenseKeyQuery.data ||
                      !hasLicenseKey
                    }
                    variant="secondary"
                    type="button"
                    className="h-6 w-12 border border-purple-700/60 bg-transparent text-purple-700/90 hover:border-purple-700 hover:bg-transparent hover:text-purple-800 dark:border-green-400/50 dark:text-green-400 dark:hover:border-green-600 dark:hover:text-green-400"
                    onClick={(e) => copyLicenseKey(e)}
                  >
                    Copy
                  </Button>
                  and paste me in the plugin!
                </motion.div>
              </div>
            </div>
          </FormControl>

          <AnimatePresence>
            {error && (
              <motion.p
                {...revealAnimation}
                className="error-message select-none text-xs text-orange-700 dark:text-orange-400"
              >
                {error.message}
              </motion.p>
            )}
          </AnimatePresence>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <TooltipProvider>
      <Form {...form}>
        <form
          className="min-w-[310px] max-w-[350px] space-y-6"
          spellCheck="false"
        >
          <motion.div>{openaiApiKeyField}</motion.div>
          <motion.div>{anthropicApiKeyField}</motion.div>
          <AnimatePresence>
            {hasApiKey && <motion.div>{licenseKeyField}</motion.div>}
          </AnimatePresence>
        </form>
      </Form>
    </TooltipProvider>
  );
}
