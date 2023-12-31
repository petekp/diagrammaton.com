import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect } from "react";

export default function Logo3({
  eyeHeight,
  darkMode,
}: {
  eyeHeight: number;
  darkMode: boolean;
}) {
  const svgHeight = 781;
  const maskHeight = useMotionValue(eyeHeight);
  const maskY = useMotionValue((svgHeight - eyeHeight) / 2);

  useEffect(() => {
    const controls = animate(maskHeight, eyeHeight, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      onUpdate: (value) => {
        maskY.set((svgHeight - value) / 2);
      },
    });

    return controls.stop;
  }, [eyeHeight, maskHeight, maskY, svgHeight]);

  return (
    <motion.svg
      width="80"
      height="80"
      viewBox="0 0 781 781"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="636.62"
        y="144.62"
        width="492"
        height="492"
        transform="rotate(90 636.62 144.62)"
        stroke="#FD2E79"
        strokeWidth="60"
      />
      <rect
        x="390.31"
        y="42.4264"
        width="491.982"
        height="491.982"
        transform="rotate(45 390.31 42.4264)"
        stroke="#6F00FD"
        strokeWidth="60"
      />
      <rect x="114.62" y="165.62" width="60" height="226" fill="#FD2E79" />
      <rect
        x="165.62"
        y="666.62"
        width="60"
        height="226"
        transform="rotate(-90 165.62 666.62)"
        fill="#FD2E79"
      />
      <rect
        x="666.62"
        y="617.62"
        width="60"
        height="226"
        transform="rotate(-180 666.62 617.62)"
        fill="#FD2E79"
      />
      <rect
        x="616.62"
        y="114.62"
        width="60"
        height="226"
        transform="rotate(90 616.62 114.62)"
        fill="#FD2E79"
      />
      <motion.mask
        id="mask0_78_298"
        maskUnits="userSpaceOnUse"
        x="175"
        height={maskHeight}
        y={maskY}
      >
        <motion.rect
          x="175"
          y={maskY}
          width="440"
          height={maskHeight}
          fill="#D9D9D9"
        />
      </motion.mask>
      <g mask="url(#mask0_78_298)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M390 505C453.513 505 505 453.513 505 390C505 368.63 499.171 348.621 489.016 331.476C489.978 346.009 485.175 360.779 477.101 368.853C463.201 382.753 437.163 379.252 418.944 361.033C400.725 342.814 397.224 316.776 411.124 302.876C419.195 294.805 433.955 290.003 448.482 290.96C431.347 280.82 411.353 275 390 275C326.487 275 275 326.487 275 390C275 453.513 326.487 505 390 505Z"
          fill="#00E941"
          visibility={darkMode ? "hidden" : "visible"}
        />
        <path
          visibility={darkMode ? "visible" : "hidden"}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M465 390C465 431.421 431.421 465 390 465C348.579 465 315 431.421 315 390C315 348.579 348.579 315 390 315C394.664 315 399.229 315.426 403.657 316.24C400.147 330.135 405.595 347.683 418.944 361.032C432.3 374.388 449.857 379.834 463.754 376.315C464.572 380.752 465 385.326 465 390ZM505 390C505 453.513 453.513 505 390 505C326.487 505 275 453.513 275 390C275 326.487 326.487 275 390 275C453.513 275 505 326.487 505 390Z"
          fill="#00E941"
        />
      </g>
    </motion.svg>
  );
}
