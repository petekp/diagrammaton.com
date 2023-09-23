import { type SubmitHandler, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Copy, LockIcon, RefreshCcw } from "lucide-react";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";

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

const apiKeyMask = "sk-•••••••••••••••••••••••••";

const formSchema = z.object({
  openaiApiKey: z
    .string()
    .min(50, {
      message: "Invalid OpenAI key length, please verify and try again.",
    })
    .max(50, {
      message: "Invalid OpenAI key length, please verify and try again.",
    })
    .startsWith("sk-", {
      message: "Invalid OpenAI key format, please verify and try again.",
    }),
});

export default function AccountView() {
  const utils = api.useContext();
  const [copySuccess, setCopySuccess] = useState("");

  const { data: session } = useSession();
  const generateLicenseKey = api.license.generateLicenseKey.useMutation({
    onSuccess: () => {
      void utils.license.invalidate();
    },
  });

  const saveApiKey = api.apiKey.setUserApiKey.useMutation({
    onSuccess: () => {
      void utils.apiKey.invalidate();
    },
  });

  const licenseKeyQuery = api.license.getUserLicenseKey.useQuery();
  const apiKeyQuery = api.apiKey.getUserKeyLastFour.useQuery();

  const licenseKeyRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      openaiApiKey: "",
      licenseKey: "",
    },
  });

  const { setValue } = form;

  useEffect(() => {
    if (apiKeyQuery.data) {
      setValue("openaiApiKey", `${apiKeyMask}${apiKeyQuery.data}`);
    }
    if (licenseKeyQuery.data) {
      setValue("licenseKey", licenseKeyQuery.data);
    }
  }, [apiKeyQuery.data, licenseKeyQuery.data, setValue]);

  const onSubmitApiKey: SubmitHandler<z.infer<typeof formSchema>> = async (
    data
  ) => {
    const lastfour = await saveApiKey.mutateAsync({
      userId: session?.user?.id || "",
      apiKey: data.openaiApiKey,
    });

    if (!lastfour) {
      return;
    }

    setValue("openaiApiKey", `${apiKeyMask}${lastfour}`);
  };

  const onSubmitLicenseKey = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await generateLicenseKey.mutateAsync();
  };

  function copyLicenseKey(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    if (!licenseKeyRef.current?.value) {
      return;
    }

    if (!navigator.clipboard) return;

    licenseKeyRef.current?.focus();

    navigator.clipboard
      .writeText(licenseKeyRef?.current?.value || "")
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

  return (
    <Form {...form}>
      <form
        className="min-w-[310px] max-w-[350px] space-y-6"
        spellCheck="false"
      >
        <Controller
          name="openaiApiKey"
          render={({ field, fieldState: { error } }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel className="flex select-none flex-row gap-2">
                Your OpenAI API key <LockIcon size="14" />
              </FormLabel>
              <FormControl>
                <>
                  <div className="flex w-full flex-grow flex-row">
                    <Input
                      tabIndex={0}
                      disabled={apiKeyFieldIsLoading}
                      onFocus={(e) => e.target.select()}
                      placeholder={"Enter key"}
                      {...field}
                      className="mr-1 flex flex-grow"
                    />
                    <Button
                      type="button"
                      disabled={apiKeyFieldIsLoading}
                      variant="secondary"
                      className="select-none"
                      onClick={(e) => void form.handleSubmit(onSubmitApiKey)(e)}
                    >
                      Save
                    </Button>
                  </div>
                </>
              </FormControl>
              {error && (
                <p className="error-message select-none text-xs text-orange-700 dark:text-orange-400">
                  {error.message}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          name="licenseKey"
          render={({ field, fieldState: { error } }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel className="flex flex-1 justify-between">
                <span className="select-none">FigJam license key</span>
                <AnimatePresence>
                  {copySuccess && (
                    <motion.span
                      initial={{ opacity: 0.01 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="success-message ml-2 animate-bounce text-green-400 "
                    >
                      {copySuccess}
                    </motion.span>
                  )}
                </AnimatePresence>
              </FormLabel>
              <FormControl>
                <div className="flex w-full flex-row">
                  <Input
                    disabled={licenseKeyFieldIsLoading}
                    placeholder={"Generate a key"}
                    onFocus={(e) => e.target.select()}
                    {...field}
                    ref={licenseKeyRef}
                    className="mr-1 w-full flex-1"
                  />
                  <Button
                    disabled={licenseKeyFieldIsLoading}
                    variant="secondary"
                    type="button"
                    className="flex-0 mr-1 flex"
                    onClick={(e) => copyLicenseKey(e)}
                  >
                    <Copy className="h-4" />
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={licenseKeyFieldIsLoading}
                    className="flex-0 flex"
                    onClick={(e) => void onSubmitLicenseKey(e)}
                  >
                    <RefreshCcw
                      className={`h-4 ${
                        generateLicenseKey.isLoading ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </div>
              </FormControl>
              {error && <p className="error-message">{error.message}</p>}
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
