import { useRef } from "react";

export function usePrevious<T>(value: T) {
  const ref = useRef({
    value,
    prev: undefined,
  }) as React.MutableRefObject<{
    value: T;
    prev: T;
  }>;

  const current = ref.current.value;
  if (value !== current) {
    ref.current = {
      value,
      prev: current,
    };
  }
  return ref.current.prev;
}
