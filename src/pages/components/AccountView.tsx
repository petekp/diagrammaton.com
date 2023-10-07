import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { CornerLeftUp, InfoIcon, RefreshCcw } from "lucide-react";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InferGetServerSidePropsType } from "next";
import type { getServerSideProps } from "..";
import { LICENSE_LENGTH } from "@/lib/utils";

const apiKeyMask = "sk-••••••••••••••••••••••••••••••••";

const openaiApiKeySchema = z
  .string()
  .min(51, {
    message: "Invalid OpenAI key length, please verify and try again.",
  })
  .max(51, {
    message: "Invalid OpenAI key length, please verify and try again.",
  })
  .startsWith("sk-", {
    message: "Invalid OpenAI key format, please verify and try again.",
  });

const formSchema = z.object({
  openaiApiKey: openaiApiKeySchema,
});

export default function AccountView({
  userData,
}: {
  userData: InferGetServerSidePropsType<typeof getServerSideProps>["userData"];
}) {
  const utils = api.useContext();
  const [copySuccess, setCopySuccess] = useState("");
  const [animatedLicenseKey, setAnimatedLicenseKey] = useState(
    userData?.licenseKey || "API key required"
  );
  const { data: session } = useSession();
  const generateLicenseKey = api.license.generateLicenseKey.useMutation({
    onSuccess: (data) => {
      void utils.license.invalidate();
      setAnimatedLicenseKey(data);
    },
  });
  const saveApiKey = api.apiKey.setUserApiKey.useMutation({
    onSuccess: () => {
      void utils.apiKey.invalidate();
    },
  });
  const validateApiKey = api.apiKey.validate.useMutation();
  const licenseKeyQuery = api.license.getUserLicenseKey.useQuery();
  const apiKeyQuery = api.apiKey.getUserKeyLastFour.useQuery();

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      openaiApiKey: userData?.openaiApiKey
        ? `${apiKeyMask}${userData?.openaiApiKey}`
        : "",
      licenseKey: userData?.licenseKey || "0".repeat(LICENSE_LENGTH),
    },
  });

  const {
    setValue,
    handleSubmit,
    formState: { isValidating, isSubmitting, isValid },
    watch,
    setError,
  } = form;

  const apiKey = watch("openaiApiKey");

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

  const onSubmitApiKey = useCallback(async () => {
    const isValid = await validateApiKey.mutateAsync(apiKey);

    if (isValid) {
      console.log("valid key!");
    } else {
      setError("openaiApiKey", {
        type: "manual",
        message: "Invalid OpenAI key, please verify and try again.",
      });
      console.log("invalid key!");
      return;
    }
    const lastfour = await saveApiKey.mutateAsync({
      userId: session?.user?.id || "",
      apiKey,
    });

    if (!lastfour) {
      return;
    }

    setValue("openaiApiKey", `${apiKeyMask}${lastfour}`);
    await generateLicenseKey.mutateAsync();
  }, [
    apiKey,
    validateApiKey,
    setError,
    saveApiKey,
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

  const apiKeyFieldIsLoading = saveApiKey.isLoading || apiKeyQuery.isLoading;
  const licenseKeyFieldIsLoading =
    generateLicenseKey.isLoading || licenseKeyQuery.isLoading;

  const wasValidRef = useRef(isValid);

  useEffect(() => {
    if (!isValidating && !isSubmitting && isValid && !wasValidRef.current) {
      console.log(apiKey);
      void onSubmitApiKey();
    }
    wasValidRef.current = isValid;
  }, [apiKey, isValidating, isSubmitting, onSubmitApiKey, isValid]);

  const apiKeyField = (
    <Controller
      name="openaiApiKey"
      render={({ field, fieldState: { error } }) => (
        <FormItem
          className="flex flex-col items-start"
          onSubmit={void handleSubmit(onSubmitApiKey)}
        >
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="flex select-none flex-row gap-2">
              Your OpenAI API key{" "}
            </FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon
                  size={16}
                  className={`border-3 ${
                    generateLicenseKey.isLoading ? "animate-spin" : ""
                  } stroke-gray-500 hover:stroke-gray-400 dark:stroke-gray-500 dark:hover:stroke-gray-400`}
                />
              </TooltipTrigger>
              <TooltipContent>Used to generate diagrams</TooltipContent>
            </Tooltip>
          </div>
          <FormControl>
            <div className=" flex w-full flex-row gap-1">
              <div className="relative flex-1">
                <Input
                  tabIndex={0}
                  disabled={apiKeyFieldIsLoading}
                  onFocus={(e) => e.target.select()}
                  placeholder={"Paste key"}
                  {...field}
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
      )}
    />
  );

  const letterAnimation: AnimationProps = {
    initial: { opacity: 1, y: -10 },
    animate: {
      y: Math.random() > 0.5 ? 10 : -10,
      transition: {
        type: "spring",
        damping: 40,
        stiffness: 150,
        restDelta: 0.001,
      },
    },
  };

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

  const hasLicenseKey =
    userData?.licenseKey || licenseKeyQuery.data || animatedLicenseKey;

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
                  className="success-message animate-bounce text-green-600"
                >
                  {copySuccess}
                </motion.span>
              )}
            </AnimatePresence>
          </FormLabel>
          <FormControl>
            <div className=" flex w-full flex-row gap-1">
              <div className="relative flex flex-1 flex-col gap-2">
                <div className="flex flex-1 items-center gap-2">
                  {animatedLicenseKey ? (
                    <>
                      <p
                        className={`font-mono text-2xl ${
                          licenseKeyFieldIsLoading
                            ? "text-gray-400 dark:text-gray-500 "
                            : "text-purple-600 dark:text-green-400"
                        } `}
                      >
                        <AnimatePresence>
                          {animatedLicenseKey.split("").map((char, index) => (
                            <motion.span key={index} {...letterAnimation}>
                              {char}
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </p>
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
                              } stroke-purple-600 hover:stroke-purple-500 dark:stroke-purple-500 dark:hover:stroke-purple-400`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerate key</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <p className="font-mono text-xl text-gray-400">
                      API key required
                    </p>
                  )}
                </div>
                <AnimatePresence>
                  {hasLicenseKey && (
                    <motion.div
                      {...revealAnimation}
                      className="flex select-none items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                    >
                      <CornerLeftUp size={14} className="mt-[-2px]" />
                      <Button
                        disabled={
                          licenseKeyFieldIsLoading || !licenseKeyQuery.data
                        }
                        variant="secondary"
                        type="button"
                        className="h-6 w-12"
                        onClick={(e) => copyLicenseKey(e)}
                      >
                        Copy
                      </Button>
                      and paste me in the plugin!
                    </motion.div>
                  )}
                </AnimatePresence>
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
    <Form {...form}>
      <form
        className="min-w-[310px] max-w-[350px] space-y-6"
        spellCheck="false"
      >
        <motion.div>{apiKeyField}</motion.div>
        <motion.div>{licenseKeyField}</motion.div>
      </form>
    </Form>
  );
}
