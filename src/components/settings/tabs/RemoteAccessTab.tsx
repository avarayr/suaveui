import { AlertCircle, Check, ExternalLink, Globe, InfoIcon, Link, Loader2 } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "~/components/primitives/Alert";
import { Button } from "~/components/primitives/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/primitives/Card";
import { Switch } from "~/components/primitives/Switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/primitives/Tooltip";
import { api } from "~/trpc/react";
import { copyToClipboard } from "~/utils/clipboard";
import QRCode from "qrcode";

export const RemoteAccessTab = () => {
  const { data: status, isLoading, refetch } = api.settings.remoteAccess.getStatus.useQuery();
  const enableMutation = api.settings.remoteAccess.enable.useMutation({
    onSuccess: () => refetch(),
    onError: (error) => toast.error(error.message),
  });
  const disableMutation = api.settings.remoteAccess.disable.useMutation({
    onSuccess: () => refetch(),
    onError: (error) => toast.error(error.message),
  });
  const [isCopied, setIsCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const handleToggleRemoteAccess = useCallback(() => {
    if (status?.enabled) {
      disableMutation.mutate();
    } else {
      enableMutation.mutate();
    }
  }, [status?.enabled, disableMutation, enableMutation]);

  const isPending = enableMutation.isPending || disableMutation.isPending;

  const handleCopyLink = () => {
    if (status?.url) {
      copyToClipboard(status.url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // reset after 2 seconds
    }
  };

  useEffect(() => {
    if (status?.url) {
      QRCode.toDataURL(status.url, { width: 200, margin: 2 }).then(setQrCodeUrl).catch(console.error);
    } else {
      setQrCodeUrl(null);
    }
  }, [status?.url]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Remote Access
        </CardTitle>
        <CardDescription>Access your instance from anywhere in the world, powered by cloudflared.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={status?.enabled || false}
                onCheckedChange={handleToggleRemoteAccess}
                disabled={isLoading || isPending}
              />
              <span className="text-sm font-medium">
                {isLoading || isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : status?.enabled ? (
                  "Enabled"
                ) : (
                  "Disabled"
                )}
              </span>
            </div>
            {status?.enabled && status.url && (
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      {isCopied ? <Check className="size-4" /> : <Link className="size-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isCopied ? "Copied!" : "Copy Link"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" asChild>
                      <a href={status.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open URL</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {status?.enabled && status.url && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-400">
                <AlertCircle className="mr-1 inline size-3" />
                Anyone with the link can access your instance and read your chats.
              </p>
              <p className="text-xs text-gray-400">
                <InfoIcon className="mr-1 inline size-3" />
                The URL may take a few minutes to become accessible due to DNS propagation.
              </p>
              {qrCodeUrl && (
                <div className="hidden md:block">
                  <img src={qrCodeUrl} alt="QR Code for remote access" className="mx-auto mt-4" />
                  <p className="mt-2 text-center text-sm text-gray-400">Scan to access on mobile devices</p>
                </div>
              )}
            </div>
          )}

          <Alert variant="info">
            <AlertTitle className="font-medium text-blue-500">
              <InfoIcon className="-mt-1 mr-1 inline size-4" />
              Why is this needed?
            </AlertTitle>
            <AlertDescription className="text-sm text-gray-100">
              Remote access allows for a HTTPS connection, which is required for PWA installation and push
              notifications.
              <br />
              <br />
              You may use alternative methods of remote access such as Tailscale with a custom domain for more secure
              access.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};
