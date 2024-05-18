import { AceBase, SQLiteStorageSettings, type IDisposableLiveDataProxy, type ILiveDataProxy } from "acebase";

const dbSymbol: unique symbol = Symbol("__db__");

type GlobalThisDb = {
  [dbSymbol]: AceBase;
};

const globalThisDb = globalThis as unknown as GlobalThisDb;

function constructDB() {
  const db = new AceBase("openrizz", {
    logLevel: "error",
    storage: {
      removeVoidProperties: true,
    },
    // storage: new SQLiteStorageSettings({ path: "." }),
  });
  globalThisDb[dbSymbol] = db;
  return db;
}

export const db = globalThisDb[dbSymbol] ?? constructDB();

export const proxify = <T>(t: ILiveDataProxy<T>) => {
  // make the t object implement Disposable
  (t as unknown as IDisposableLiveDataProxy<T>)[Symbol.dispose] = () => t.destroy();
  return t as unknown as IDisposableLiveDataProxy<T>;
};
