import { useEffect, useRef, useState } from "react";
import { type SubmitHandler, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

import { Copy, RefreshCcw } from "lucide-react";
import { useSession } from "next-auth/react";

const apiKeyMask = "sk-•••••••••••••••••••••••••";

const formSchema = z.object({
  openaiApiKey: z
    .string()
    .min(50, {
      message: "Invalid key length, please verify and try again.",
    })
    .startsWith("sk-", {
      message: "Invalid key, please verify and try again.",
    }),
});

export default function AccountView() {
  const utils = api.useContext();
  const [copySuccess, setCopySuccess] = useState("");
  const [diagramDescription, setDiagramDescription] = useState(
    "a basic authentication flow"
  );

  const { data: session } = useSession();
  const generateLicenseKey = api.license.generateLicenseKey.useMutation({
    onSuccess: () => {
      void utils.license.invalidate();
    },
  });

  const generateDiagram = api.diagrammaton.generate.useMutation();
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

  const createDiagram = async () => {
    const newDiagram = await generateDiagram.mutateAsync({
      diagramDescription,
      licenseKey: licenseKeyRef.current?.value || "",
    });
  };

  function copyLicenseKey(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!licenseKeyRef.current?.value) {
      return;
    }

    if (!navigator.clipboard) return;

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

  const apiKeyDefaultValue = apiKeyQuery.data
    ? `${apiKeyMask}${apiKeyQuery.data}`
    : "";

  return (
    <Form {...form}>
      <form className="space-y-6">
        <Controller
          name="openaiApiKey"
          render={({ field, fieldState: { error } }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel>Your OpenAI API key</FormLabel>
              <FormControl>
                <div className="flex w-full flex-grow flex-row">
                  <Input
                    disabled={apiKeyFieldIsLoading}
                    placeholder={"Enter key"}
                    {...field}
                    value={apiKeyDefaultValue}
                    className="mr-1 flex flex-grow"
                  />
                  <Button
                    type="button"
                    disabled={apiKeyFieldIsLoading}
                    variant="secondary"
                    onClick={(e) => void form.handleSubmit(onSubmitApiKey)(e)}
                  >
                    Save
                  </Button>
                </div>
              </FormControl>
              {error && (
                <p className="error-message text-sm text-red-700">
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
                <span>Your license key</span>
                {copySuccess && (
                  <span className="success-message ml-2 animate-bounce text-green-600 ">
                    {copySuccess}
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <div className="flex w-full flex-col space-y-2">
                  <Input
                    disabled={
                      generateLicenseKey.isLoading || licenseKeyQuery.isLoading
                    }
                    placeholder={"Generate a key"}
                    {...field}
                    ref={licenseKeyRef}
                    value={licenseKeyQuery.data || (field.value as string)}
                    className="mr-1 flex-1"
                  />
                  <div className="flex w-full flex-grow flex-row">
                    <Button
                      disabled={
                        generateLicenseKey.isLoading ||
                        licenseKeyQuery.isLoading
                      }
                      variant="outline"
                      type="button"
                      className="mr-1 flex flex-1 flex-grow"
                      onClick={(e) => copyLicenseKey(e)}
                    >
                      <Copy className="mr-3 h-4 w-4" />
                      Copy to clipboard
                    </Button>

                    <Button
                      variant="outline"
                      disabled={generateLicenseKey.isLoading}
                      className="flex flex-1"
                      onClick={(e) => void onSubmitLicenseKey(e)}
                    >
                      <RefreshCcw
                        className={`mr-2 h-4 w-4 stroke-slate-500 ${
                          generateLicenseKey.isLoading ? "animate-spin" : ""
                        }`}
                      />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </FormControl>
              {error && <p className="error-message">{error.message}</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex w-full flex-col space-y-2">
          <Input
            disabled={generateDiagram.isLoading}
            placeholder={"Describe a diagram"}
            onChange={(e) => setDiagramDescription(e.target.value)}
            className="mr-1 flex-1"
          />
          <div className="flex w-full flex-grow flex-row">
            <Button
              disabled={generateDiagram.isLoading}
              variant="outline"
              type="button"
              className="mr-1 flex flex-1 flex-grow"
              onClick={() => void createDiagram()}
            >
              <Copy className="mr-3 h-4 w-4" />
              Generate Diagram
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
