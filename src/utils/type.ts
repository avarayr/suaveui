export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

declare module "react-hook-form" {
  // @ts-expect-error Redefine is OK - Performance optimization
  export const FormProvider: React.FC<{
    children: React.ReactNode;
  }>;
}
