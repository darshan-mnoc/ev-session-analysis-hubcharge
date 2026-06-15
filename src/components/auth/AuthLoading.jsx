/**
 * Auth Loading Component
 * Shown while checking authentication status
 */

import React from "react";
import { Loader2 } from "lucide-react";

const AuthLoading = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
    <Loader2 className="size-7 animate-spin text-primary" />
    <p className="text-sm">Checking authentication…</p>
  </div>
);

export default AuthLoading;
