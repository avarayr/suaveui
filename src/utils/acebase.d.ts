import type { ILiveDataProxy, DataSnapshot, DataReference } from "acebase";

type DataRetrievalOptions = Omit<
  Parameters<DataReference["forEach"]>[0],
  "exclude"
>;

type SafeDataRetrievalOptionsExclude<const T> = DataRetrievalOptions & {
  exclude?: (keyof T)[];
  include?: never;
};

type SafeDataRetrievalOptionsInclude<const T> = DataRetrievalOptions & {
  include?: (keyof T)[];
  exclude?: never;
};

declare module "acebase" {
  export class DataReference<T> {
    get<Value = T, const TExclude>(
      options?: SafeDataRetrievalOptionsExclude<TExclude>,
    ): Promise<DataSnapshot<Omit<Value, keyof TExclude>>>;

    get<Value = T, const TInclude>(
      options?: SafeDataRetrievalOptionsInclude<TInclude>,
    ): Promise<DataSnapshot<Pick<Value, keyof TInclude>>>;
  }

  export interface IDisposableLiveDataProxy<T> extends ILiveDataProxy {
    [Symbol.dispose]: () => void;
  }
}
