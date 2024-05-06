"use client";

import {
  BottomSheet as BottomSheetComponent,
  type BottomSheetRef,
} from "@la55u/react-spring-bottom-sheet-updated";
import { useMediaQuery } from "usehooks-ts";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../primitives/Dialog";

type BottomSheetProps = React.ComponentPropsWithoutRef<
  typeof BottomSheetComponent
> & {
  title?: React.ReactNode;
};
export const BottomSheet = forwardRef(
  (props: BottomSheetProps, ref: React.ForwardedRef<BottomSheetRef>) => {
    const isMobile = useMediaQuery("(max-width: 768px)");

    if (!isMobile) {
      return (
        <Dialog
          onOpenChange={(isOpen) => !isOpen && props.onDismiss?.()}
          {...props}
          open={props.open}
        >
          <DialogContent>
            {props.title && (
              <DialogHeader>
                <DialogTitle className="font-bold">{props.title}</DialogTitle>
              </DialogHeader>
            )}

            {props.children}
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <BottomSheetComponent
        {...props}
        ref={ref}
        className={twMerge(
          `
    [--rsbs-bg:#1C1C1E]
    [--rsbs-handle-bg:#5A595E]
    [--rsbs-handle-height:6px]
    [&>[data-rsbs-backdrop]]:top-[-100vh]
    [&_[data-rsbs-content]]:px-4 [&_[data-rsbs-content]]:py-1 [&_[data-rsbs-header]]:before:h-[var(--rsbs-handle-height)]
  `,
          props.className,
        )}
      >
        {props.title && (
          <h1 className="mb-2 text-2xl font-bold">{props.title}</h1>
        )}

        {props.children}

        <div className="h-[10px]" />
      </BottomSheetComponent>
    );
  },
);
