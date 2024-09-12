import { useRef } from "react";

export function usePrevious<T>(value: T) {
  const ref = useRef<{
    value: T;
    prev: T | undefined;
  }>({
    value,
    prev: undefined,
  });

  // eslint-disable-next-line react-compiler/react-compiler
  const current = ref.current.value;
  if (value !== current) {
    // eslint-disable-next-line react-compiler/react-compiler
    ref.current = {
      value,
      prev: current,
    };
  }
  // eslint-disable-next-line react-compiler/react-compiler
  return ref.current.prev;
}
