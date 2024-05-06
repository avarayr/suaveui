import { createRootRouteWithContext, useMatch, useMatches } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import AnimatedOutlet from "~/internal/AnimatedOutlet";

export const Route = createRootRouteWithContext()({
  component: () => {
    const matches = useMatches();
    const match = useMatch({ strict: false });
    const nextMatchIndex = matches.findIndex((d) => d.id === match.id) + 1;
    const nextMatch = matches[nextMatchIndex];

    return (
      <main>
        <AnimatePresence initial={false} mode="popLayout">
          <AnimatedOutlet key={nextMatch?.id} />
        </AnimatePresence>
      </main>
    );
  },
});
