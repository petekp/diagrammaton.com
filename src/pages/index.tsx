import Head from "next/head";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getProviders, signIn, signOut, getSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

import AccountView from "./components/AccountView";
import Logo2 from "./components/Logo2";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";

export default function Home({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Diagrammaton - AI Powered Diagramming for FigJam</title>
        <meta
          name="description"
          content="Diagrammaton - AI Powered Diagramming for FigJam"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="absolute flex h-full max-h-full w-full max-w-full scale-150 items-center justify-center overflow-hidden align-middle opacity-50">
          <Logo />
        </div>
        <SignIn providers={providers} sessionData={sessionData} />
      </main>
      <div className="absolute right-0 top-0 p-4">
        <ThemeToggle />
      </div>
    </>
  );
}

function SignIn({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div className="container relative mx-auto w-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6">
          <div className="mx-auto flex flex-col space-y-2 text-center">
            <div className="w-[450px] space-y-5 rounded-md border border-accent-foreground p-5 backdrop-blur-md">
              <div className="space-y-3">
                <div className="flex h-full w-full items-center justify-center align-middle">
                  <Logo2 />
                </div>
                <div className="space-y-1">
                  <div className="text mb-0 text-xl font-medium uppercase tracking-widest">
                    Diagrammaton
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {sessionData ? (
                      <span>Logged in as {sessionData.user?.email}</span>
                    ) : (
                      "Sign in to get a license code"
                    )}
                  </div>
                </div>
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
              </div>

              {sessionData && <AccountView />}
            </div>
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
