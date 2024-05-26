import { atom, useAtom } from "jotai";
const IsRouteTransitioningAtom = atom<boolean>(false);

const disableTransitionClassnames = "!transform-none !transition-none";

export const useRouteTransitioning = () => {
  const [isRouteTransitioning, setIsRouteTransitioning] = useAtom(IsRouteTransitioningAtom);

  const className = isRouteTransitioning ? disableTransitionClassnames : "";

  return [isRouteTransitioning, setIsRouteTransitioning, className] as const;
};
