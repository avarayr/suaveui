import { useMediaQuery } from "usehooks-ts";

export function useScreenSize() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return {
    isMobile,
  };
}
