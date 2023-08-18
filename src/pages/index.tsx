import Head from "next/head";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getProviders, signIn, signOut, getSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../@/components/ui/card";
import { AccountView } from "./components/AccountView";

export default function Home({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-200">
        <SignIn providers={providers} sessionData={sessionData} />
      </main>
    </>
  );
}

function SignIn({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  console.log("signin", sessionData);

  return (
    <div className="container relative mx-auto w-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <Card className="w-[450px] p-5">
              <CardHeader className="mb-5">
                <CardTitle className="mb-2">Diagrammaton</CardTitle>
                <CardDescription>
                  {sessionData ? (
                    <span>Logged in as {sessionData.user?.email}</span>
                  ) : (
                    "Sign in to get a license code"
                  )}
                </CardDescription>
                {Object.values(providers).map((provider) => (
                  <div key={provider.name}>
                    <Button
                      variant="outline"
                      onClick={
                        sessionData
                          ? () => void signOut()
                          : () => void signIn(provider.id)
                      }
                    >
                      {sessionData
                        ? "Sign out"
                        : `Sign in with ${provider.name}`}
                    </Button>
                  </div>
                ))}
              </CardHeader>

              {sessionData && <AccountView />}
            </Card>
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // const session = await getServerSession(context.req, context.res, authOptions);

  // If the user is already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  // if (session) {
  //   return { redirect: { destination: "/" } };
  // }

  // update to use getServerSession
  const sessionData = await getSession(context);
  const providers = await getProviders();

  return {
    props: {
      providers: providers ?? [],
      sessionData: sessionData ?? null,
    },
  };
}
