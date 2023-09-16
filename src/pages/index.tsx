import Head from "next/head";
import { motion, type AnimationProps } from "framer-motion";
import { ArrowRightIcon, DoorOpenIcon } from "lucide-react";
import Link from "next/link";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getProviders, signIn, signOut, getSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import AccountView from "./components/AccountView";
import Logo3 from "./components/Logo3";
import ThemeToggle from "./components/ThemeToggle";
import StarArrows from "./components/StarArrows";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const approxDiamondAnimLength = 2;

export default function Home({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const diamondAnimation: AnimationProps = {
    initial: {
      opacity: sessionData ? 1 : 0,
      scale: sessionData ? 1.2 : 0.5,
      rotate: 45,
    },
    animate: {
      opacity: 1,
      scale: sessionData ? 1.2 : 1,
      rotate: 45,
      transition: { type: "spring", damping: 50, stiffness: 80 },
    },
  };

  const arrowsAnimation: AnimationProps = {
    initial: {
      opacity: sessionData ? 1 : 0,
      scale: sessionData ? 1.2 : 0.85,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", damping: 50, stiffness: 80 },
    },
  };

  const footerAnimation: AnimationProps = {
    initial: {
      opacity: sessionData ? 1 : 0,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", damping: 50, stiffness: 80 },
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
      <main className="flex min-h-[100dvh] min-w-[100dvw] flex-col items-center justify-center bg-background">
        <motion.div
          {...arrowsAnimation}
          className="fixed flex min-h-[100dvh] min-w-[100dvw] items-center justify-center"
        >
          <StarArrows className="fill-border stroke-border" />
        </motion.div>
        <motion.div
          {...diamondAnimation}
          className="fixed h-[450px] w-[450px] origin-center rotate-45 rounded-sm border-2 border-border bg-gradient-radial from-background to-background/70"
        ></motion.div>
        <SignIn providers={providers} sessionData={sessionData} />
      </main>
      <div className="absolute right-0 top-0 p-4">
        <ThemeToggle />
      </div>
      <motion.div
        {...footerAnimation}
        className="fixed bottom-0 right-0 flex w-full flex-col justify-center space-y-2 bg-gradient-to-t from-background to-transparent px-5 py-5 sm:right-10 sm:flex-row sm:justify-between sm:space-y-0"
      >
        <div className="flex items-center">
          {sessionData ? (
            <>
              <p className="text-center text-sm text-muted-foreground">
                {`Signed in as ${sessionData?.user.email || ""}`}
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-5 gap-2"
                onClick={() => void signOut()}
              >
                Sign Out
                <DoorOpenIcon size={16} />
              </Button>
            </>
          ) : null}
        </div>
        <div className="flex justify-center gap-1 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Pete Petrash</p>
          <span className="text-muted-foreground/40">•</span>
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </Link>{" "}
          <span className="text-muted-foreground/40">•</span>
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
        </div>
      </motion.div>
    </>
  );
}

function SignIn({
  providers,
  sessionData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [eyeHeight, setEyeHeight] = useState(300);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const toggleEyeHeight = () => {
      setEyeHeight(0); // Close the eye
      void new Promise((resolve) => setTimeout(resolve, 200)).then(() => {
        setEyeHeight(300); // Open the eye after 200ms
      });
    };

    // Call once immediately
    toggleEyeHeight();

    const intervalId = setInterval(() => {
      void toggleEyeHeight();
    }, Math.random() * 2000 + 3000); // Random interval between 1-3 seconds

    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const logoAnimation: AnimationProps = {
    initial: {
      opacity: sessionData ? 1 : 0,
      scale: sessionData ? 1 : 0.9,
      y: sessionData ? 0 : 10,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 40,
        delay: 1.3,
      },
    },
  };

  const letterAnimation: AnimationProps = {
    initial: { opacity: sessionData ? 1 : 0 },
    animate: {
      opacity: 1,
      transition: { type: "spring", damping: 40, stiffness: 150 },
    },
  };

  const staggerAnimation: AnimationProps = {
    initial: "hidden",
    animate: "visible",
    variants: {
      hidden: { opacity: sessionData ? 1 : 0 },
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
    initial: { opacity: sessionData ? 1 : 0, y: sessionData ? 0 : -15 },
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
    initial: { opacity: 0.01, y: -10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: sessionData ? 0 : approxDiamondAnimLength + 0.3,
        type: "spring",
        damping: 40,
        stiffness: 150,
      },
    },
  };

  return (
    <div className="relative flex flex-col items-center justify-center pt-3">
      <div className="flex flex-col items-center justify-center space-y-10">
        <div className="select-none space-y-8">
          <motion.div
            {...logoAnimation}
            className="flex items-center justify-center align-middle"
          >
            <Logo3 eyeHeight={eyeHeight} darkMode={resolvedTheme === "dark"} />
          </motion.div>
          <div className="space-y-1 text-center">
            <motion.div
              {...staggerAnimation}
              className="text text-2xl font-extrabold uppercase tracking-widest text-foreground"
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

            <motion.p
              {...descriptionAnimation}
              className="text tracking-wide text-muted"
            >
              AI powered diagrams for FigJam
            </motion.p>
          </div>
        </div>
        {sessionData && (
          <motion.div {...signInAnimation}>
            <AccountView />
          </motion.div>
        )}
        {!sessionData && (
          <motion.div {...signInAnimation}>
            {Object.values(providers).map((provider) => (
              <motion.div layout key={provider.name}>
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={() => void signIn(provider.id)}
                >
                  {`Sign in with ${provider.name}`}
                  <ArrowRightIcon size={16} />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
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
      // sessionData: true,
    },
  };
}
