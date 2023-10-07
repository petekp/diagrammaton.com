import Head from "next/head";
import {
  motion,
  type AnimationProps,
  useCycle,
  useAnimation,
} from "framer-motion";
import { ArrowRightIcon, DoorClosedIcon, DoorOpenIcon } from "lucide-react";
import { authOptions } from "~/pages/api/auth/[...nextauth]";
import Link from "next/link";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getProviders, signIn, signOut } from "next-auth/react";
import lexend from "../fonts";

import { Button } from "@/components/ui/button";
import AccountView from "./components/AccountView";
import Logo4 from "./components/Logo4";
import ThemeToggle from "./components/ThemeToggle";
import StarArrows from "./components/StarArrows";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const approxDiamondAnimLength = 2;

const logoDelay = approxDiamondAnimLength + 1;
const lettersDelay = logoDelay + 0.2;
const descriptionDelay = lettersDelay + 1;
const signInDelay = descriptionDelay + 1;
const footerDelay = signInDelay + 2;

const numDiamonds = 11;
const initialScale = 0.01;
const finalScale = 1;
const restDelta = 0.001;

export default function Home({
  providers,
  sessionData,
  userData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [signOutHovered, setSignOutHovered] = useState(false);

  const arrowsAnimation: AnimationProps = {
    initial: {
      opacity: 0,
      scale: sessionData ? 1 : 0.65,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 3,
        stiffness: 2,
        restDelta: restDelta,
      },
    },
  };

  const footerAnimation: AnimationProps = {
    initial: {
      opacity: sessionData ? 1 : 0,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 50,
        stiffness: 80,
        restDelta: restDelta,
        delay: footerDelay,
      },
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/diagrammaton.svg" type="image/svg+xml" />
      </Head>
      <main className="flex min-h-[100dvh] min-w-[100dvw] flex-col items-center justify-center bg-background">
        <motion.div
          {...arrowsAnimation}
          className="fixed flex min-h-[100dvh] min-w-[100dvw] items-center justify-center"
        >
          <StarArrows className="fill-border stroke-border" />
        </motion.div>
        <motion.div
          className="fixed aspect-square h-[200%] origin-center transform-gpu rounded bg-gradient-radial  from-background/95 to-background/10 will-change-transform"
          initial={{
            opacity: 0,
            scale: sessionData ? finalScale : initialScale,
            rotate: 90,
          }}
          animate={{
            opacity: 1,
            scale: finalScale,
            transition: {
              type: "spring",
              damping: 5,
              stiffness: 4,
              restDelta: restDelta,
            },
          }}
        />
        {Array.from({ length: numDiamonds + 1 }).map((_, index) => {
          const colors = [
            `hsl(${360 * (index / numDiamonds)},100%, 80%)`,
            `hsl(${180 * (index / numDiamonds)},100%, 80%)`,
            ,
            `hsl(${20 * (index / numDiamonds)},100%, 80%)`,
          ];
          const color = useColorCycle(colors, 1000 * index);
          return (
            <motion.div
              initial={{
                opacity: 0,
                scale: sessionData
                  ? finalScale
                  : initialScale + (index / numDiamonds) * 0.2,
                rotate: 90,
                borderColor: colors[index % colors.length],
              }}
              animate={{
                opacity: 1,
                scale: finalScale,
                rotate: index * (82.4 / numDiamonds),
                borderColor: color,
                transition: {
                  type: "spring",
                  damping: 3 + (index / numDiamonds / 2) * 5,
                  stiffness: 2 + (index / numDiamonds) * 4,
                  delay: 0 + (index / numDiamonds) * 2,
                  restDelta: restDelta,
                  borderColor: { duration: 1, loop: Infinity, ease: "linear" },
                },
              }}
              className={`rounded-xs fixed aspect-square h-[100%] origin-center  transform-gpu border border-border will-change-transform`}
            />
          );
        })}
        <SignIn
          providers={providers}
          sessionData={sessionData}
          userData={userData}
        />
      </main>
      <div className="fixed right-0 top-0 p-4 sm:right-5">
        <ThemeToggle />
      </div>
      <motion.div
        {...footerAnimation}
        className="fixed bottom-0 left-0 flex w-full flex-col justify-center space-y-2 bg-gradient-to-t from-background to-transparent px-0 py-5 sm:flex-row sm:justify-between sm:space-y-0 sm:px-10"
      >
        <div className="flex items-center justify-center">
          {sessionData ? (
            <>
              <p className="text-center text-xs text-muted-foreground">
                {`Signed in as ${sessionData?.user.email || ""}`}
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-5 gap-1 text-xs"
                onPointerOver={() => setSignOutHovered(true)}
                onPointerLeave={() => setSignOutHovered(false)}
                onClick={() => void signOut()}
              >
                {signOutHovered ? (
                  <DoorOpenIcon size={16} />
                ) : (
                  <DoorClosedIcon size={16} />
                )}
                Sign Out
              </Button>
            </>
          ) : null}
        </div>
        <div className="flex justify-center gap-1 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()}</p>
          <span className="text-muted-foreground/40">•</span>
          <Link
            href="https://petekp.notion.site/Terms-of-Service-eacb3d1abe624dcbb7de1b86c0617b18?pvs=4"
            target="_blank"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Terms of Service
          </Link>{" "}
          <span className="text-muted-foreground/40">•</span>
          <Link
            href="https://petekp.notion.site/Privacy-Policy-d000f7c9676a4979a394070439bb0f99?pvs=4"
            target="_blank"
            className="underline underline-offset-4 hover:text-foreground"
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
  userData,
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
        delay: logoDelay,
      },
    },
  };

  const letterAnimation: AnimationProps = {
    initial: { opacity: sessionData ? 1 : 0 },
    animate: {
      opacity: 1,
      transition: {
        type: "spring",
        damping: 40,
        stiffness: 150,
      },
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
          delayChildren: lettersDelay,
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
        type: "spring",
        damping: 20,
        stiffness: 100,
        delay: descriptionDelay,
      },
    },
  };

  const signInAnimation: AnimationProps = {
    initial: { opacity: 0.01, y: sessionData ? 0 : -10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: sessionData ? 0 : signInDelay + 0.3,
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
            <Logo4 eyeHeight={eyeHeight} darkMode={resolvedTheme === "dark"} />
          </motion.div>
          <div className="space-y-1 text-center">
            <motion.div
              {...staggerAnimation}
              className={`text text-2xl uppercase tracking-widest text-foreground sm:text-3xl ${lexend.className}`}
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
            <AccountView userData={userData} />
          </motion.div>
        )}
        {!sessionData && (
          <motion.div {...signInAnimation} className="flex flex-col gap-2">
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
            <Button variant="outline" asChild>
              <Link
                href="https://petekp.notion.site/Diagrammaton-cfa9b2043fcc4bbba008c4925ff9ccb4?pvs=4"
                target="_blank"
              >
                Learn more
              </Link>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const sessionData = await getServerSession(
    context.req,
    context.res,
    authOptions
  );
  const providers = await getProviders();

  // Default userData
  let userData = {
    licenseKey: "",
    openaiApiKey: "",
  };

  if (sessionData?.user?.id) {
    const prisma = new PrismaClient();
    const userId = sessionData.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        licenseKeys: true,
      },
    });

    userData = {
      licenseKey: user?.licenseKeys[0]?.key || "",
      openaiApiKey: user?.openaiApiKeyLastFour || "",
    };
  }

  return {
    props: {
      providers: providers ?? [],
      sessionData: sessionData ?? null,
      userData,
    },
  };
}

function useColorCycle(colors, delay = 50) {
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setColorIndex((prevColorIndex) => (prevColorIndex + 1) % colors.length);
    }, delay);

    return () => {
      clearInterval(intervalId);
    };
  }, [colors, delay]);

  return colors[colorIndex];
}
