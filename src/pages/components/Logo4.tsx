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

  const gradient = "translate(1 120) rotate(0) scale(300)";

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
    <svg
      width="80"
      height="80"
      viewBox="0 0 150 151"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M35 31C32.7909 31 31 32.7909 31 35V117C31 119.209 32.7909 121 35 121H117C119.209 121 121 119.209 121 117V35C121 32.7909 119.209 31 117 31H35ZM28 21C24.134 21 21 24.134 21 28V124C21 127.866 24.134 131 28 131H124C127.866 131 131 127.866 131 124V28C131 24.134 127.866 21 124 21H28Z"
        fill="url(#paint0_angular_137_624)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M74.9999 12.1425L11.3603 75.7821L74.9999 139.422L138.639 75.7821L74.9999 12.1425ZM79.9496 2.95012C77.216 0.216448 72.7838 0.216448 70.0501 2.95012L2.16789 70.8324C-0.565779 73.566 -0.565782 77.9982 2.16789 80.7319L70.0501 148.614C72.7838 151.348 77.216 151.348 79.9496 148.614L147.832 80.7319C150.566 77.9982 150.566 73.566 147.832 70.8324L79.9496 2.95012Z"
        fill="url(#paint1_angular_137_624)"
      />
      <g filter="url(#filter0_ii_137_624)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M75.4441 99.4977C88.2515 99.4977 98.6339 89.1153 98.6339 76.3079C98.6339 71.3042 97.0491 66.6706 94.3541 62.8817C95.1171 65.9894 94.2107 69.5431 92.4355 71.3183C89.9058 73.848 85.1672 73.2109 81.8515 69.8952C78.5359 66.5795 77.8987 61.8409 80.4284 59.3112C82.203 57.5367 85.7548 56.6302 88.8618 57.3918C85.0745 54.7005 80.4441 53.1182 75.4441 53.1182C62.6368 53.1182 52.2544 63.5006 52.2544 76.3079C52.2544 89.1153 62.6368 99.4977 75.4441 99.4977Z"
          fill="url(#paint2_radial_137_624)"
        />
      </g>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M37.2463 25C37.2463 22.7909 39.0371 21 41.2463 21L71.7203 21C73.9294 21 75.7203 22.7909 75.7203 25V27C75.7203 29.2091 73.9294 31 71.7203 31L41.2463 31C39.0371 31 37.2463 29.2091 37.2463 27L37.2463 25ZM125 73.9229C122.791 73.9229 121 72.132 121 69.9229V39.4806C121 37.2715 122.791 35.4806 125 35.4806H127C129.209 35.4806 131 37.2715 131 39.4806V69.9229C131 72.132 129.209 73.9229 127 73.9229H125ZM25 117.451C22.7909 117.451 21 115.66 21 113.451L21 83.0091C21 80.7999 22.7909 79.0091 25 79.0091H27C29.2091 79.0091 31 80.7999 31 83.0091L31 113.451C31 115.66 29.2091 117.451 27 117.451H25ZM80.9505 125C80.9505 122.791 82.7414 121 84.9505 121L114.574 121C116.783 121 118.574 122.791 118.574 125V127C118.574 129.209 116.783 131 114.574 131L84.9505 131C82.7413 131 80.9505 129.209 80.9505 127L80.9505 125Z"
        fill="url(#paint3_angular_137_624)"
      />
      <defs>
        <filter
          id="filter0_ii_137_624"
          x="52.2544"
          y="47.1182"
          width="46.3794"
          height="58.3799"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="6" />
          <feGaussianBlur stdDeviation="7" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.191667 0 0 0 0 0.8545 0 0 0 0 1 0 0 0 0.6 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_137_624"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="-6" />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 0 0 0 0 0 0.6 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="effect1_innerShadow_137_624"
            result="effect2_innerShadow_137_624"
          />
        </filter>
        <radialGradient
          id="paint0_angular_137_624"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform={gradient}
        >
          <stop stopColor="#FF4789" />
          <stop offset="0.333333" stopColor="#FFD748" />
          <stop offset="0.5625" stopColor="#75F682" />
          <stop offset="0.848958" stopColor="#FF4ACC" />
        </radialGradient>
        <radialGradient
          id="paint1_angular_137_624"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0.4271 20.7821) rotate(0) scale(300.105)"
        >
          <stop offset="0.0375323" stopColor="#8F00FF" />
          <stop offset="0.328125" stopColor="#32D8FF" />
          <stop offset="0.6875" stopColor="#6A67FF" />
        </radialGradient>
        <radialGradient
          id="paint2_radial_137_624"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(58.779 92.6561) rotate(-45) scale(47.2046)"
        >
          <stop stopColor="#EEBDFF" stopOpacity="0.18" />
          <stop offset="1" stopColor="#0500FF" />
        </radialGradient>
        <radialGradient
          id="paint3_angular_137_624"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform={gradient}
        >
          <stop stopColor="#FF4789" />
          <stop offset="0.333333" stopColor="#FFD748" />
          <stop offset="0.5625" stopColor="#75F682" />
          <stop offset="0.848958" stopColor="#FF4ACC" />
        </radialGradient>
      </defs>
    </svg>
  );
}
