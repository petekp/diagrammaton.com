import Head from "next/head";

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getProviders, signIn, signOut, getSession } from "next-auth/react";
import { useEffect } from 'react';

import { Button } from "@/components/ui/button";

import AccountView from "./components/AccountView";
import Logo2 from "./components/Logo2";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";
import { motion, type AnimationProps } from 'framer-motion';

const approxDiamondAnimLength = 2

const diamondAnimation: AnimationProps = {
  initial: { opacity: 0, scale: 0.85, rotate: 45 },
  animate: { opacity: 1, scale: 1, rotate: 45, transition: { type: 'spring', damping: 20, stiffness: 20 } }
};

const logoAnimation: AnimationProps = {
  initial: { opacity: 0, scale: 0.9,  },
  animate: { opacity: 1, scale: 1,  transition: { type: 'spring', damping: 10, stiffness: 30, delay: approxDiamondAnimLength } }
};

const letterAnimation: AnimationProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { type: 'spring', damping: 40, stiffness: 150 } }
};

const staggerAnimation: AnimationProps = {
  initial: 'hidden',
  animate: 'visible',
  variants: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        type: "spring",
        damping: 50,
        stiffness: 50,
        delayChildren: 1,
        staggerChildren: 0.05
      }
    }
  }
};

const descriptionAnimation: AnimationProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { delay: approxDiamondAnimLength, type: 'spring', damping: 20, stiffness: 150 } }
};

const signInAnimation: AnimationProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { delay: approxDiamondAnimLength + 2, type: 'spring', damping: 20, stiffness: 150 } }
};


export default function Home({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Diagrammaton - AI Powered diagrams for FigJam</title>
        <meta
          name="description"
          content="Diagrammaton - AI Powered diagrams for FigJam"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="absolute flex h-full max-h-full w-full max-w-full items-center justify-center overflow-hidden align-middle opacity-50">
          <Logo />
        </div>
         <motion.div {...diamondAnimation} className="absolute w-[450px] h-[450px] rounded-sm  border-accent-foreground border backdrop-blur-md rotate-45 origin-center z-auto"></motion.div>
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

        <div className="mx-auto flex w-full flex-col justify-center space-y-6 ">
          <div className="mx-auto flex flex-col space-y-2 text-center ">

            <div className="relative w-[450px] space-y-5 pb-0 pt-7">
              <div className="space-y-10">
                <div className="select-none space-y-5">
                  <motion.div {...logoAnimation} className="flex items-center justify-center align-middle">
                    <Logo2 />
                  </motion.div>
                  <div className="space-y-1">

                      <motion.div {...staggerAnimation} className="text text-lg font-extrabold uppercase tracking-widest text-primary">
                        {"Diagrammaton".split("").map((char, index) => (
                          <motion.span key={index} {...letterAnimation} variants={staggerAnimation.variants}>
                            {char}
                          </motion.span>
                        ))}
                      </motion.div>

                    <motion.div {...descriptionAnimation} className="text text-muted">
                      AI powered diagrams for FigJam
                    </motion.div>
                  </div>
                </div>
                {sessionData && <AccountView />}
                <div className="flex flex-1 flex-col px-5">
                  {!sessionData && (
                    <motion.div {...signInAnimation} className="space-y-2">
                      <div className="text-sm text-muted select-none">
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
                    </motion.div>
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
