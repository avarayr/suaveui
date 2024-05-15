/** Merge multiple refs into a single one.
 *
 * Taken from https://gist.github.com/jbaiter/8410a118f80d9a7dbfb45953e1eb6aee
 */
export function mergeRefs<T>(...refs: (React.MutableRefObject<T> | React.Ref<T>)[]): React.Ref<T> | null {
  const filteredRefs = refs.filter(Boolean);
  if (!filteredRefs.length) return null;
  if (filteredRefs.length === 0) return filteredRefs[0]!;
  return (inst: T) => {
    for (const ref of filteredRefs) {
      if (typeof ref === "function") {
        ref(inst);
      } else if (ref) {
        (ref as React.MutableRefObject<T>).current = inst;
      }
    }
  };
}
