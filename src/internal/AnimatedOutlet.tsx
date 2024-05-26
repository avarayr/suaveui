import { getRouterContext, Outlet, useMatches } from "@tanstack/react-router";
import { motion, MotionConfig, MotionProps, useIsPresent } from "framer-motion";
import cloneDeep from "lodash/cloneDeep";
import { forwardRef, useContext, useRef } from "react";
import { AnimatedOutletProps, RouteTransitionVariants } from "./AnimatedOutlet.types";

export const TransitionProps = {
  variants: RouteTransitionVariants,
  initial: "initial",
  animate: "animate",
  exit: "exit",
  transition: {
    duration: 0.45,
    ease: [0.39, 0, 0, 1],
  },
  style: {
    display: "grid",
    alignSelf: "stretch",
    justifySelf: "stretch",
  },
} as const satisfies MotionProps;

const AnimatedOutlet = forwardRef<HTMLDivElement, AnimatedOutletProps>(({ direction, ...props }, ref) => {
  const isPresent = useIsPresent();

  const matches = useMatches();
  const prevMatches = useRef(matches);

  const RouterContext = getRouterContext();
  const routerContext = useContext(RouterContext);

  let renderedContext = routerContext;

  if (isPresent) {
    prevMatches.current = cloneDeep(matches);
  } else {
    renderedContext = cloneDeep(routerContext);
    renderedContext.__store.state.matches = [
      ...matches.map((match, i) => ({
        ...(prevMatches.current[i] ?? match),
        id: match.id,
      })),
      ...prevMatches.current.slice(matches.length),
    ];
  }

  return (
    <motion.div ref={ref} className="outlet" custom={direction} {...TransitionProps} {...props}>
      <RouterContext.Provider value={renderedContext}>
        <Outlet />
      </RouterContext.Provider>
    </motion.div>
  );
});

export default AnimatedOutlet;
