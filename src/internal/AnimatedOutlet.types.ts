import { MotionProps, Variants } from "framer-motion";

export type Direction = "left" | "right" | "up" | "down";

export type AnimatedOutletProps = MotionProps & {
  direction?: Direction;
};

export const OFFSET: Record<Direction, 1 | -1> = {
  left: 1,
  right: -1,
  up: 1,
  down: -1,
};

export const AXIS: Record<Direction, "x" | "y"> = {
  left: "x",
  right: "x",
  up: "y",
  down: "y",
};

export const RouteTransitionVariants: Variants = {
  initial: (direction: Direction = "left") => ({
    [AXIS[direction]]: `${OFFSET[direction] * 100}dvw`,
  }),
  animate: (direction: Direction = "left") => ({
    [AXIS[direction]]: 0,
  }),
  exit: (direction: Direction = "left") => ({
    [AXIS[direction]]: `${OFFSET[direction] * -35}dvw`,
  }),
};
