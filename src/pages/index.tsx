import Head from "next/head";
import { motion, type AnimationProps } from "framer-motion";
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

const restDelta = 0.005;
const DIAMONDS_NUM = 30;

const arrowsDelay = 0.5;
const arrowsDamping = 30;
const arrowsStiffness = 90;

const diamondDelay = 0.5;
const diamondDamping = 24;
const diamondStiffness = 200;

const logoDelay = diamondDelay + 0.13;
const logoDamping = 13;
const logoStiffness = 110;

const containerDelay = logoDelay + 2.4;
const containerDamping = 40;
const containerStiffness = 160;

const lettersDelay = containerDelay + 0.3;

const descriptionDelay = lettersDelay + 1;
const descriptionDamping = 20;
const descriptionStiffness = 60;

const signInDelay = descriptionDelay + 0.4;
const signInDamping = 20;
const signInStiffness = 60;

const footerDelay = signInDelay + 2;

export default function Home({
  providers,
  sessionData,
  userData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const arrowsAnimation: AnimationProps = {
    initial: {
      opacity: 0,
      scale: sessionData ? 1 : 0.2,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: arrowsDamping,
        stiffness: arrowsStiffness,
        restDelta: restDelta,
        delay: arrowsDelay,
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
        damping: diamondDamping,
        stiffness: diamondStiffness,
        restDelta: restDelta,
        delay: footerDelay,
      },
    },
  };

  const diamondPath = "M50 0 L100 50 L50 100 L0 50 Z";

  const getScaleFactor = (index: number, total: number) => {
    return Math.log(index / total + 1.3);
  };

  function Diamond({
    index,
    total,
    hue,
  }: {
    index: number;
    total: number;
    hue: number;
  }) {
    const rotation = index * (93.12 / total);
    const scaleFactor = getScaleFactor(index, total);
    const color = `hsl(${hue}, var(--color-saturation), var(--color-lightness))`;

    const initial = {
      opacity: sessionData ? 0 : 0,
      scale: sessionData ? scaleFactor * 1.3 : 1,
      rotate: sessionData ? rotation : 0,
    };

    const animate = {
      opacity: sessionData ? 0.55 : 1,
      scale: sessionData ? scaleFactor * 1.3 : scaleFactor,
      rotate: index * (93.12 / total),
      transition: {
        type: "spring",
        damping: diamondDamping + (index / total / 2) * (diamondDamping + 10),
        stiffness: diamondStiffness + (index / total) * (diamondDamping + 10),
        delay: diamondDelay + (index / total) * 1.4,
        restDelta: 0.001,
      },
    };

    return (
      <motion.path
        d={diamondPath}
        stroke={color}
        strokeLinecap={"round"}
        strokeWidth={0.14}
        fill="transparent"
        initial={initial}
        animate={animate}
      />
    );
  }

  function DiamondAnimation({ numDiamonds }: { numDiamonds: number }) {
    return (
      <motion.svg
        viewBox="0 0 100 100"
        className="fixed z-0 aspect-square min-h-[800px] min-w-[500px] origin-center"
      >
        {Array.from({ length: numDiamonds }).map((_, index) => {
          const hue = (360 * index) / numDiamonds;

          return (
            <Diamond key={index} index={index} total={numDiamonds} hue={hue} />
          );
        })}
      </motion.svg>
    );
  }

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
          className="fixed flex min-h-[100dvh] min-w-[100svw]  items-center justify-center"
        >
          <StarArrows className="fill-border stroke-border" />
        </motion.div>
        <motion.div className="fixed aspect-square h-[200%] origin-center   rounded  bg-gradient-radial from-background/95 to-background/10 " />

        <DiamondAnimation numDiamonds={DIAMONDS_NUM} />

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
        className="fixed bottom-0 left-0 flex w-full  flex-col justify-center space-y-2 bg-gradient-to-t from-background to-transparent px-0 py-5 sm:flex-row sm:justify-between sm:space-y-0 sm:px-10"
      >
        <div className="flex items-center justify-center">
          {sessionData ? (
            <>
              <p className="select-none text-center text-xs text-muted-foreground">
                {`Signed in as ${sessionData?.user.email || ""}`}
              </p>
              <SignOutButton onSignOut={() => void signOut()} />
            </>
          ) : null}
        </div>
        <div className="flex justify-center gap-2 text-xs text-muted-foreground">
          <p className="select-none">
            &copy; {new Date().getFullYear()} Peter Petrash
          </p>
          <Link
            href="https://petekp.notion.site/Terms-of-Service-eacb3d1abe624dcbb7de1b86c0617b18?pvs=4"
            target="_blank"
            className="h-0 p-0 font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Terms
          </Link>{" "}
          <Link
            href="https://petekp.notion.site/Privacy-Policy-d000f7c9676a4979a394070439bb0f99?pvs=4"
            target="_blank"
            className="h-0 p-0 font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Privacy
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
  const [eyeHeight, setEyeHeight] = useState(500);

  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const containerAnimation: AnimationProps = {
    initial: "centered",
    animate: "raised",
    variants: {
      centered: { y: sessionData ? -20 : 105 },
      raised: {
        y: -20,
        transition: {
          type: "spring",
          damping: containerDamping,
          stiffness: containerStiffness,
          delay: containerDelay,
        },
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

  const logoVariants = {
    hidden: { opacity: sessionData ? 1 : 0, scale: sessionData ? 1 : 1.6 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: logoDamping,
        stiffness: logoStiffness,
        delay: logoDelay,
        restDelta: restDelta,
      },
    },
  };

  const letterAnimation: AnimationProps = {
    initial: { opacity: sessionData ? 1 : 0 },
    animate: {
      opacity: 1,
      transition: { type: "spring", damping: 30, stiffness: 170 },
    },
  };

  const descriptionVariants = {
    hidden: { opacity: sessionData ? 1 : 0, y: sessionData ? 0 : -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: descriptionDamping,
        stiffness: descriptionStiffness,
        delay: descriptionDelay,
        restDelta: restDelta,
      },
    },
  };

  const signInVariants = {
    hidden: { opacity: sessionData ? 1 : 0, y: sessionData ? 0 : -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: signInDamping,
        stiffness: signInStiffness,
        delay: signInDelay,
        restDelta: restDelta,
      },
    },
  };

  useEffect(() => {
    const toggleEyeHeight = () => {
      setEyeHeight(1);
      void new Promise((resolve) => setTimeout(resolve, 200)).then(() => {
        setEyeHeight((value) => (isDarkMode ? 50 : 50));
      });
    };

    toggleEyeHeight();

    const intervalId = setInterval(() => {
      void toggleEyeHeight();
    }, Math.random() * 2000 + 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isDarkMode]);

  return (
    <motion.div
      {...containerAnimation}
      initial="centered"
      animate="raised"
      className="relative flex  flex-col items-center justify-center pt-3"
    >
      <div className="flex flex-col items-center justify-center space-y-10">
        <div className="select-none space-y-8">
          <motion.div
            variants={logoVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center align-middle"
          >
            <Logo4
              eyeHeight={eyeHeight}
              isDarkMode={isDarkMode}
              size={sessionData ? 60 : 80}
            />
          </motion.div>
          <div className="space-y-1 text-center">
            <motion.div
              {...staggerAnimation}
              className={`text text-2xl uppercase tracking-widest text-foreground  ${
                lexend.className
              } ${
                sessionData ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
              } `}
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
              variants={descriptionVariants}
              initial="hidden"
              animate="visible"
              className={`text tracking-wide text-center text-muted ${
                sessionData ? "text-sm sm:text-base" : ""
              }`}
            >
              AI powered diagrams for FigJam
            </motion.p>
          </div>
        </div>
        {sessionData && (
          <motion.div
            variants={signInVariants}
            initial="hidden"
            animate="visible"
          >
            <AccountView userData={userData} />
          </motion.div>
        )}
        {!sessionData && (
          <motion.div
            variants={signInVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2"
          >
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
    </motion.div>
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
      // sessionData: {
      //   user: {
      //     email: "something@soemthing.com",
      //     id: "102",
      //   },
      // },
      userData,
    },
  };
}

const SignOutButton = ({ onSignOut }: { onSignOut: () => void }) => {
  const [signOutHovered, setSignOutHovered] = useState(false);

  return (
    <Button
      variant="link"
      size="sm"
      className="h-5 gap-1 text-xs"
      onPointerOver={() => setSignOutHovered(true)}
      onPointerLeave={() => setSignOutHovered(false)}
      onClick={onSignOut}
    >
      {signOutHovered ? (
        <DoorOpenIcon size={16} />
      ) : (
        <DoorClosedIcon size={16} />
      )}
      Sign Out
    </Button>
  );
};
