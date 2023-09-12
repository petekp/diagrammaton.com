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
import { motion, type AnimationProps } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

const approxDiamondAnimLength = 2;

export default function Home({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const diamondAnimation: AnimationProps = {
    initial: { opacity: 0, scale: sessionData ? 1 : 0.85, rotate: 45 },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: sessionData ? 0 : 45,
      transition: { type: "spring", damping: 20, stiffness: 20 },
    },
  };

  return (
    <>
      <Head>
        <title>Diagrammaton • AI powered diagrams for FigJam</title>
        <meta
          name="description"
          content="Diagrammaton - AI Powered diagrams for FigJam"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="absolute flex h-full max-h-full w-full max-w-full items-center justify-center opacity-50">
          <Logo />
        </div>
        <motion.div
          {...diamondAnimation}
          className="fixed h-[450px] w-[450px]  origin-center rotate-45 rounded-sm border border-accent-foreground backdrop-blur-md"
        ></motion.div>
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
  const logoAnimation: AnimationProps = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 40,
        delay: 1.3,
      },
    },
  };

  const letterAnimation: AnimationProps = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { type: "spring", damping: 40, stiffness: 150 },
    },
  };

  const staggerAnimation: AnimationProps = {
    initial: "hidden",
    animate: "visible",
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          type: "spring",
          damping: 50,
          stiffness: 50,
          delayChildren: 1,
          staggerChildren: 0.05,
        },
      },
    },
  };

  const descriptionAnimation: AnimationProps = {
    initial: { opacity: 0, y: -15 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: approxDiamondAnimLength,
        type: "spring",
        damping: 20,
        stiffness: 100,
      },
    },
  };

  const signInAnimation: AnimationProps = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        delay: approxDiamondAnimLength + 0.3,
        type: "spring",
        damping: 40,
        stiffness: 150,
      },
    },
  };

  return (
    <div className="relative flex flex-col items-center justify-center pt-7">
      <div className="flex flex-col items-center justify-center space-y-10">
        <div className="select-none space-y-5">
          <motion.div
            {...logoAnimation}
            className="flex items-center justify-center align-middle"
          >
            <Logo2 />
          </motion.div>
          <div className="space-y-1">
            <motion.div
              {...staggerAnimation}
              className="text text-xl font-bold uppercase tracking-widest text-primary"
            >
              {"Diagrammaton".split("").map((char, index) => (
                <motion.span
                  key={index}
                  {...letterAnimation}
                  variants={staggerAnimation.variants}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>

            <motion.div {...descriptionAnimation} className="text text-muted">
              AI powered diagrams for FigJam
            </motion.div>
          </div>
          {sessionData && <AccountView />}
        </div>

        <div className="flex flex-1 flex-col">
          {!sessionData && (
            <motion.div {...signInAnimation} className="space-y-2">
              {Object.values(providers).map((provider) => (
                <div key={provider.name}>
                  <Button
                    variant="default"
                    className="gap-2"
                    onClick={() => void signIn(provider.id)}
                  >
                    {`Sign in with ${provider.name}`}
                    <ArrowRightIcon size={16} />
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
          {sessionData && (
            <motion.div
              {...signInAnimation}
              className="flex flex-1 select-none flex-row items-center justify-between gap-2 py-1 "
            >
              <Button size="sm" variant="link" onClick={() => void signOut()}>
                Sign out
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <p className="px-8 text-center text-sm text-muted-foreground">
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
      </p>
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
