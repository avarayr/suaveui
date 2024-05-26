import React from "react";

export const Show = React.memo(
  ({ children, when, fallback }: { children: React.ReactNode; when: boolean; fallback?: React.ReactNode }) => {
    return when ? children : fallback;
  },
);
