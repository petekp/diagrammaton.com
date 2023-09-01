"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Logo() {
  const [targetWidth, setTargetWidth] = useState(1);

  const toggleStrokeWidth = () => {
    setTargetWidth((prevWidth) => (prevWidth === 2 ? 8 : 2));
  };

  return (
    <motion.svg
      width="894"
      height="894"
      viewBox="0 0 894 894"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      // transition={{ type: "spring", stiffness: 15, damping: 1 }}
      vectorEffect="non-scaling-stroke"
      // onAnimationComplete={toggleStrokeWidth}
    >
      <path
        d="M445.303 891.303V0.696777M445.303 0.696777L413.099 32.9007M445.303 0.696777L477.507 32.9007"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M667.955 831.644L222.652 60.3562M222.652 60.3562L210.864 104.348M222.652 60.3562L266.643 72.1438"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M830.947 668.651L59.6589 223.348M59.6589 223.348L71.4461 267.34M59.6589 223.348L103.65 211.561"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M891.606 442L0.999512 442M0.999512 442L33.2035 474.205M0.999512 442L33.2035 409.796"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M830.946 223.348L59.6585 668.651M59.6585 668.651L103.65 680.439M59.6585 668.651L71.446 624.66"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M667.953 60.3562L222.65 831.644M222.65 831.644L266.642 819.857M222.65 831.644L210.863 787.652"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M445.302 0.696964L445.302 891.303M445.302 891.303L477.507 859.099M445.302 891.303L413.099 859.099"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M222.65 60.3561L667.953 831.644M667.953 831.644L679.741 787.652M667.953 831.644L623.962 819.856"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M59.6589 223.349L830.947 668.652M830.947 668.652L819.159 624.66M830.947 668.652L786.955 680.439"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M0.999698 442L891.606 442M891.606 442L859.402 409.795M891.606 442L859.402 474.204"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M59.6593 668.652L830.947 223.349M830.947 223.349L786.955 211.561M830.947 223.349L819.159 267.34"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M222.652 831.644L667.955 60.3562M667.955 60.3562L623.963 72.1434M667.955 60.3562L679.743 104.348"
        stroke="#EF0985"
        stroke-width="0.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <mask id="path-13-inside-1_20_1548" fill="white">
        <path d="M444.978 628.726L135.709 445.497L444.978 261.332L754.802 445.497L444.978 628.726Z" />
      </mask>
      <path
        d="M135.709 445.497L135.454 445.927L134.73 445.498L135.453 445.067L135.709 445.497ZM444.978 628.726L445.233 629.157L444.978 629.307L444.723 629.156L444.978 628.726ZM444.978 261.332L444.722 260.902L444.978 260.75L445.234 260.902L444.978 261.332ZM754.802 445.497L755.058 445.067L755.783 445.498L755.057 445.927L754.802 445.497ZM135.964 445.067L445.233 628.296L444.723 629.156L135.454 445.927L135.964 445.067ZM445.234 261.762L135.965 445.926L135.453 445.067L444.722 260.902L445.234 261.762ZM755.057 445.927L445.233 629.157L444.724 628.296L754.548 445.066L755.057 445.927ZM445.234 260.902L755.058 445.067L754.547 445.927L444.723 261.762L445.234 260.902Z"
        fill="#00EC42"
        mask="url(#path-13-inside-1_20_1548)"
      />
      <mask id="path-15-inside-2_20_1548" fill="white">
        <path d="M630.425 445.497L444.975 755.877L262.856 445.497L444.975 136.229L630.425 445.497Z" />
      </mask>
      <path
        d="M444.975 755.877L445.404 756.133L444.971 756.858L444.544 756.13L444.975 755.877ZM630.425 445.497L630.854 445.24L631.008 445.497L630.855 445.754L630.425 445.497ZM262.856 445.497L262.425 445.75L262.276 445.497L262.425 445.244L262.856 445.497ZM444.975 136.229L444.544 135.975L444.971 135.25L445.404 135.972L444.975 136.229ZM444.546 755.62L629.996 445.241L630.855 445.754L445.404 756.133L444.546 755.62ZM263.287 445.244L445.406 755.624L444.544 756.13L262.425 445.75L263.287 445.244ZM445.404 135.972L630.854 445.24L629.997 445.754L444.546 136.486L445.404 135.972ZM262.425 445.244L444.544 135.975L445.406 136.482L263.287 445.751L262.425 445.244Z"
        fill="#A259FF"
        mask="url(#path-15-inside-2_20_1548)"
      />
      <circle
        cx="157.953"
        cy="157.953"
        r="157.703"
        transform="matrix(0 -1 -1 0 447.012 603.906)"
        stroke="#ECD500"
        stroke-width="0.5"
      />
      <circle
        cx="157.953"
        cy="157.953"
        r="157.703"
        transform="matrix(-1 0 0 1 602.469 444.29)"
        stroke="#ECD500"
        stroke-width="0.5"
      />
      <circle
        cx="157.953"
        cy="157.953"
        r="157.703"
        transform="matrix(0 1 1 0 443.687 288)"
        stroke="#ECD500"
        stroke-width="0.5"
      />
      <circle
        cx="157.953"
        cy="157.953"
        r="157.703"
        transform="matrix(1 0 0 -1 286.566 447.616)"
        stroke="#ECD500"
        stroke-width="0.5"
      />
    </motion.svg>
  );
}
