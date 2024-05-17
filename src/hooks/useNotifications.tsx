import { atom, useAtom } from "jotai";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import { api } from "~/trpc/react";
import { ClientConsts } from "~/utils/client-consts";
import { base64ToUint8Array } from "~/utils/string";
import { BanIcon, BellDot, CircleX, CogIcon, ShieldAlertIcon } from "lucide-react";
const subscriptionAtom = atom<PushSubscription | null>(null);
const registrationAtom = atom<ServiceWorkerRegistration | null>(null);

export const useNotifications = () => {
  const [subscription, setSubscription] = useAtom(subscriptionAtom);
  const [registration, setRegistration] = useAtom(registrationAtom);
  const [dbSubscriptionID, setDBSubscriptionID] = useLocalStorage<string | null>(
    ClientConsts.LocalStorageKeys.dbSubscriptionID,
    "",
  );

  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage(
    ClientConsts.LocalStorageKeys.areNotificationsEnabled,
    false,
  );
  const dbSubscribeMutation = api.notification.storeSubscription.useMutation();
  const dbUnsubscribeMutation = api.notification.removeSubscription.useMutation();

  const subscribeSW = useCallback(async () => {
    if (!import.meta.env.VITE_VAPID_PUBLIC || typeof import.meta.env.VITE_VAPID_PUBLIC !== "string") {
      throw new Error("Environment variables supplied not sufficient.");
    }
    if (!registration) {
      console.error("No SW registration available.");
      return;
    }
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC),
    });

    const { id } = await dbSubscribeMutation.mutateAsync({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
      subscription: JSON.parse(JSON.stringify(sub)) as any,
    });

    setSubscription(sub);

    setDBSubscriptionID(id);
    console.log("Web push subscribed!");
  }, [registration, dbSubscribeMutation, setSubscription, setDBSubscriptionID]);

  const unsubscribeSW = useCallback(async () => {
    if (!subscription || !dbSubscriptionID) {
      setSubscription(null);

      setDBSubscriptionID(null);
      setNotificationsEnabled(false);
      return;
    }
    await subscription.unsubscribe();

    setSubscription(null);
    setDBSubscriptionID(null);
    setNotificationsEnabled(false);

    await dbUnsubscribeMutation.mutateAsync({ subscriptionId: dbSubscriptionID });
    console.log("Web push unsubscribed!");
  }, [
    dbSubscriptionID,
    dbUnsubscribeMutation,
    setDBSubscriptionID,
    setNotificationsEnabled,
    setSubscription,
    subscription,
  ]);

  const toggleNotifications = useCallback(
    (enabled: boolean) => {
      const promise = async () => {
        if (enabled) {
          const permission = await window?.Notification?.requestPermission();
          const granted = permission === "granted";

          if (permission === "denied") {
            /**
             * Check if we're in secure context
             */
            if (window.location.protocol !== "https:") {
              throw new Error(
                `Notifications permission has been denied.<br><br> It seems like you're not using a HTTPS connection, which is required for notifications to work.`,
              );
            }

            throw new Error("Notifications are not allowed on this device.");
          }

          if (granted) {
            await subscribeSW();
            setNotificationsEnabled(true);
          } else {
            await unsubscribeSW();
            setNotificationsEnabled(false);
            return;
          }
          return;
        } else {
          await unsubscribeSW();
          setNotificationsEnabled(false);
        }
      };

      toast.promise(promise, {
        loading: enabled
          ? "Please allow notification permission in your browser settings."
          : "Disabling notifications...",
        success: `${enabled ? "Enabled" : "Disabled"} notifications.`,
        error: (err: Error) => `${err.message}`,
      });
    },

    [setNotificationsEnabled, subscribeSW, unsubscribeSW],
  );

  /**
   * Use effect to query permissions and disable notifications
   * if user has recently denied permission
   */
  useEffect(() => {
    const granted = window.Notification?.permission === "granted";

    if (!granted && notificationsEnabled) {
      void toggleNotifications(false);
    }
  }, [notificationsEnabled, toggleNotifications]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // run only in browser
      void navigator.serviceWorker.ready.then((reg) => {
        void reg.pushManager.getSubscription().then((sub) => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSubscription(sub);
          }
        });
        setRegistration(reg);
      });
    }
  }, [setRegistration, setSubscription]);

  return {
    toggleNotifications,
    notificationsEnabled: Boolean(notificationsEnabled && registration),
  };
};
