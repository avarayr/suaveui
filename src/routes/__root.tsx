/* eslint-disable react-hooks/rules-of-hooks */
import { createRootRouteWithContext, useMatch, useMatches } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { useCallback, useEffect } from "react";
import { useRouteTransitioning } from "~/hooks/useRouteTransitioning";
import AnimatedOutlet from "~/internal/AnimatedOutlet";

export const Route = createRootRouteWithContext()({
  component: () => {
    const matches = useMatches();
    const match = useMatch({ strict: false });
    const nextMatchIndex = matches.findIndex((d) => d.id === match.id) + 1;
    const nextMatch = matches[nextMatchIndex];
    const [, setIsRouteTransitioning] = useRouteTransitioning();

    useEffect(() => {
      if (nextMatch?.id) {
        setIsRouteTransitioning(true);
      }
    }, [nextMatch?.id, setIsRouteTransitioning]);

    const onExitComplete = useCallback(() => {
      setTimeout(() => {
        setIsRouteTransitioning(false);
      }, 300);
    }, [setIsRouteTransitioning]);

    // Sets the transition state to false on initial render (hooks always run in order)
    useEffect(() => {
      setIsRouteTransitioning(false);
    }, [onExitComplete, setIsRouteTransitioning]);

    return (
      <main>
        <AnimatePresence onExitComplete={onExitComplete} initial={false} mode="popLayout" presenceAffectsLayout>
          <AnimatedOutlet key={nextMatch?.id} />
        </AnimatePresence>
      </main>
    );
  },
});
