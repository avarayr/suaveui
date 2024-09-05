import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Globe, InfoIcon, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/primitives/Alert";
import { Button } from "~/components/primitives/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/primitives/Card";
import { Switch } from "~/components/primitives/Switch";
import { useNotifications } from "~/hooks/useNotifications";

const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isLocalhost = () => ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const NotificationsTab = () => {
  const {
    notificationsEnabled,
    toggleNotifications,
    silentNotifications,
    toggleSilentNotifications,
    sendTestNotification,
  } = useNotifications();

  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [isHttps, setIsHttps] = useState(false);
  const [showHttpsWarning, setShowHttpsWarning] = useState(false);
  const [isSafariUser, setIsSafariUser] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const https = window.location.protocol === "https:";
    const localhost = isLocalhost();
    setShowHttpsWarning(!https && !localhost);
    setIsHttps(https);
    setIsSafariUser(isSafari());

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsPWA(standalone);
  }, []);

  const sendTestNotificationMutation = useMutation({
    mutationFn: sendTestNotification,
    onSuccess: () => {
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 1000);
    },
  });

  const handleToggleNotifications = () => {
    toggleNotifications(!notificationsEnabled);
  };

  const handleToggleSilent = (silent: boolean) => {
    void toggleSilentNotifications(silent);
  };

  const handleSendTestNotification = () => {
    sendTestNotificationMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>Manage your notification preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AnimatePresence>
          {(showHttpsWarning || (isSafariUser && !isIOS) || (isIOS && !isPWA)) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="warning" className="mb-4">
                <ShieldAlert className="size-4" />
                <AlertTitle>Important Notice</AlertTitle>
                <AlertDescription className="mt-2">
                  {showHttpsWarning && (
                    <p className="mb-2">
                      HTTPS connection is required for notifications to work.
                      <span className="text-green-400">
                        {" "}
                        (try <Globe className="inline-block size-3" /> Remote Access)
                      </span>
                    </p>
                  )}
                  {isSafariUser && !isIOS && (
                    <p>Safari users: You may need to install this app as a PWA to get notifications working.</p>
                  )}
                  {isIOS && !isPWA && (
                    <p>
                      iOS users: Please install this app as a PWA using Safari to enable notifications. Notifications
                      will NOT work in other browsers or without PWA installation.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium">Enable Notifications</h3>
            <p className="text-xs text-muted-foreground">Receive notifications for new messages and updates.</p>
          </div>
          <Switch checked={notificationsEnabled} onCheckedChange={handleToggleNotifications} />
        </div>

        <AnimatePresence>
          {notificationsEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium">Silent Notifications</h3>
                    <p className="text-xs text-muted-foreground">Disable sound for notifications.</p>
                  </div>
                  <Switch checked={silentNotifications} onCheckedChange={handleToggleSilent} />
                </div>

                <Alert>
                  <InfoIcon className="size-4" />
                  <AlertTitle>Notification Settings</AlertTitle>
                  <AlertDescription>
                    Additional notification settings can be configured in your browser or device settings.
                  </AlertDescription>
                </Alert>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant={"outline"}
          className="w-full"
          onClick={handleSendTestNotification}
          disabled={
            !notificationsEnabled || sendTestNotificationMutation.isPending || testNotificationSent || showHttpsWarning
          }
          loading={sendTestNotificationMutation.isPending}
        >
          {testNotificationSent ? <Check className="mr-1 size-4" /> : <Bell className="mr-1 size-4" />}
          {testNotificationSent ? "Sent!" : "Send Test Notification"}
        </Button>
      </CardContent>
    </Card>
  );
};
