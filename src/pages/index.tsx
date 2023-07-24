import Head from "next/head";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api } from "~/utils/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";

export default function Home({
  providers,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // const hello = api.example.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <SignIn providers={providers} />
      </main>
    </>
  );
}

function SignIn({
  providers,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined }
  );

  console.log({ sessionData });

  return (
    <div className="container relative mx-auto w-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Diagrammaton
            </h1>

            <p className="text-sm text-muted-foreground">
              Sign in to get a license code
            </p>

            <p className="text-center text-sm text-black">
              {sessionData && (
                <span>Logged in as {sessionData.user?.name}</span>
              )}
              {secretMessage && <span> - {secretMessage}</span>}
            </p>

            {Object.values(providers).map((provider) => (
              <div key={provider.name}>
                <Button
                  onClick={
                    sessionData
                      ? () => void signOut()
                      : () => void signIn(provider.id)
                  }
                >
                  {sessionData ? "Sign out" : `Sign in with ${provider.name}`}
                </Button>
              </div>
            ))}

            {sessionData && <AccountForm />}
          </div>

          {/* <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>

          </p> */}
        </div>
      </div>
    </div>
  );
}

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().min(2, {
    message: "Email must be at least 2 characters.",
  }),
  openaiApiKey: z.string().min(2, {
    message: "OpenAI API Key must be at least 2 characters.",
  }),
});

function AccountForm() {
  const { data: sessionData } = useSession();
  const setApiKey = api.apiKey.setUserApiKey.useMutation();
  const [lastfourdigits, setLastFourDigits] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      openaiApiKey: "",
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (data) => {
    console.log("onSubmit");
    console.log(data);
    const digits = (await setApiKey.mutateAsync({
      userId: sessionData?.user?.id || "",
      apiKey: data.openaiApiKey,
    })) as string;

    setLastFourDigits(`••••••••${digits}`);
    console.log({ lastfourdigits });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log("submit");
          form.handleSubmit(onSubmit);
        }}
        className="space-y-4"
      >
        <FormField
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder={sessionData?.user?.name || ""} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder={sessionData?.user?.email || ""}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="openaiApiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OpenAI API Key</FormLabel>
              <FormControl>
                <Input placeholder={lastfourdigits} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          onClick={() =>
            onSubmit({
              email: "string",
              openaiApiKey: "23r23r5235r235",
              username: "",
            })
          }
        >
          Submit
        </Button>
      </form>
    </Form>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // const session = await getServerSession(context.req, context.res, authOptions);

  // If the user is already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  // if (session) {
  //   return { redirect: { destination: "/" } };
  // }

  const providers = await getProviders();

  console.log({ providers });

  return {
    props: { providers: providers ?? [] },
  };
}
