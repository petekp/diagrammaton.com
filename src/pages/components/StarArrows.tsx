import React, { useEffect, useRef, useState } from "react";

const StarArrows = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    rotationAngle: 0,
  });
  const inset = 10;

  useEffect(() => {
    const updateDimensions = () => {
      const { clientWidth, clientHeight } = document.documentElement;
      const aspectRatio = clientWidth / clientHeight;
      const rotationAngle = Math.atan(aspectRatio) * (180 / Math.PI);
      setDimensions({
        width: clientWidth,
        height: clientHeight,
        rotationAngle,
      });

      if (svgRef.current) {
        svgRef.current.setAttribute(
          "viewBox",
          `0 0 ${clientWidth} ${clientHeight}`
        );
      }
    };

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  console.log(dimensions);

  return (
    <svg ref={svgRef} className="star-arrows" width="100%" height="100%">
      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={dimensions.width / 2}
        y2={inset}
      />
      {/* top center arrow */}
      <polygon
        className="arrow"
        points={`${dimensions.width / 2},${inset} ${
          dimensions.width / 2 - 7.5
        },${inset + 10} ${dimensions.width / 2 + 7.5},${inset + 10}`}
      />

      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={dimensions.width - inset}
        y2={dimensions.height / 2}
      />
      {/* right center arrow */}
      <polygon
        className="arrow"
        points={`${dimensions.width - inset},${dimensions.height / 2} ${
          dimensions.width - inset - 10
        },${dimensions.height / 2 - 7.5} ${dimensions.width - inset - 10},${
          dimensions.height / 2 + 7.5
        }`}
      />

      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={dimensions.width / 2}
        y2={dimensions.height - inset}
      />
      {/* bottom center arrow */}
      <polygon
        className="arrow"
        points={`${dimensions.width / 2},${dimensions.height - inset} ${
          dimensions.width / 2 - 7.5
        },${dimensions.height - inset - 10} ${dimensions.width / 2 + 7.5},${
          dimensions.height - inset - 10
        }`}
      />

      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={inset}
        y2={dimensions.height / 2}
      />
      {/* left center arrow */}
      <polygon
        className="arrow"
        points={`${inset},${dimensions.height / 2} ${inset + 10},${
          dimensions.height / 2 + 7.5
        } ${inset + 10},${dimensions.height / 2 - 7.5}`}
      />

      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={inset}
        y2={inset}
      />
      {/* top left arrow */}
      <polygon
        className="arrow"
        points={`${inset},${inset} ${inset},${inset + 10} ${
          inset + 10
        },${inset}`}
        transform={`rotate(${
          45 - dimensions.rotationAngle
        }, ${inset}, ${inset})`}
      />

      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={dimensions.width - inset}
        y2={inset}
      />
      {/* top right arrow */}
      <polygon
        className="arrow"
        points={`${dimensions.width - inset},${inset} ${
          dimensions.width - inset - 10
        },${inset} ${dimensions.width - inset},${inset + 10}`}
        transform={`rotate(${dimensions.rotationAngle - 45}, ${
          dimensions.width - inset
        }, ${inset})`}
      />

      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={inset}
        y2={dimensions.height - inset}
      />
      {/* bottom left arrow */}
      <polygon
        className="arrow"
        points={`${inset},${dimensions.height - inset} ${inset},${
          dimensions.height - inset - 10
        } ${inset + 10},${dimensions.height - inset}`}
        transform={`rotate(${dimensions.rotationAngle - 45}, ${inset}, ${
          dimensions.height - inset
        })`}
      />

      <line
        className="arrow-line"
        x1={dimensions.width / 2}
        y1={dimensions.height / 2}
        x2={dimensions.width - inset}
        y2={dimensions.height - inset}
      />

      {/* bottom right arrow */}
      <polygon
        className="arrow"
        points={`${dimensions.width - inset},${dimensions.height - inset} ${
          dimensions.width - inset
        },${dimensions.height - inset - 10} ${dimensions.width - inset - 10},${
          dimensions.height - inset
        }`}
        transform={`rotate(${45 - dimensions.rotationAngle}, ${
          dimensions.width - inset
        }, ${dimensions.height - inset})`}
      />
    </svg>
  );
};

export default StarArrows;
