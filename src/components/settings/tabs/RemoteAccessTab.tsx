import React, { useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/primitives/Button";
import { Switch } from "~/components/primitives/Switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/primitives/Tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/primitives/Card";
import { AlertCircle, Check, ExternalLink, Globe, Link, Loader2 } from "lucide-react";

export const RemoteAccessTab = () => {
  const { data: status, isLoading, refetch } = api.settings.remoteAccess.getStatus.useQuery();
  const enableMutation = api.settings.remoteAccess.enable.useMutation({ onSuccess: () => refetch() });
  const disableMutation = api.settings.remoteAccess.disable.useMutation({ onSuccess: () => refetch() });
  const [isCopied, setIsCopied] = useState(false);

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
      void navigator.clipboard.writeText(status.url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Remote Access
        </CardTitle>
        <CardDescription>Access your instance from anywhere in the world.</CardDescription>
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
              <span className="font-medium">
                {isLoading || isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
                      {isCopied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isCopied ? "Copied!" : "Copy Link"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" asChild>
                      <a href={status.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open URL</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          {status?.enabled && status.url && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <AlertCircle className="mr-1 inline h-3 w-3" />
              The URL may take a few minutes to become accessible due to DNS propagation.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
