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
        <div className="absolute flex h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden align-middle opacity-50">
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
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 ">
          <div className="mx-auto flex flex-col space-y-2 text-center ">
            <div className="w-[450px] space-y-5 rounded-md border border-accent-foreground pb-0 pt-7 backdrop-blur-md">
              <div className="space-y-10">
                <div className="select-none space-y-5">
                  <div className="flex items-center justify-center align-middle">
                    <Logo2 />
                  </div>
                  <div className="space-y-1">
                    <div className="text text-lg font-bold uppercase tracking-widest">
                      Diagrammaton
                    </div>
                    <div className="text text-muted">
                      AI powered Diagramming for FigJam
                    </div>
                  </div>
                </div>
                {sessionData && <AccountView />}
                <div className="flex flex-1 flex-row space-y-2 border-t border-accent-foreground px-5">
                  {!sessionData && (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Sign in to get a license code
                      </div>
                      {Object.values(providers).map((provider) => (
                        <div key={provider.name}>
                          <Button
                            variant="default"
                            onClick={() => void signIn(provider.id)}
                          >
                            {`Sign in with ${provider.name}`}
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                  {sessionData && (
                    <div className="flex flex-1 select-none flex-row items-center justify-between gap-2 py-1 ">
                      <span className="text-sm text-muted-foreground">
                        Signed in as {sessionData.user?.email}
                      </span>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => void signOut()}
                      >
                        Sign out
                      </Button>
                    </div>
                  )}
                </div>
              </div>
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
