/**
 * Login Form — passwordless magic-link / OTP sign-in (shadcn UI)
 */

import React, { useState } from "react";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "../../AuthContext";
import Logo from "../../assets/hubcharge-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginForm = () => {
  const { loginWithEmail, verifyOtp, loginWithGoogle, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await loginWithEmail(email);
    setLoading(false);
    if (ok) setSent(true);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    await verifyOtp(email, code);
    setVerifying(false);
  };

  const handleReset = () => {
    setSent(false);
    setEmail("");
    setCode("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50/60 to-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-2 text-center">
          <img
            src={Logo}
            alt="HubCharge"
            className="h-10 w-auto max-w-[200px] object-contain"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              HubCharge Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {sent
                ? `We emailed a sign-in code to ${email}`
                : "Sign in to access your EV analytics"}
            </p>
          </div>
        </div>

        <CardContent className="flex flex-col gap-4 pb-6">
          {authError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {authError}
            </div>
          )}

          {sent ? (
            <>
              <form onSubmit={handleVerify} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="text-center text-lg tracking-[0.4em]"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={verifying || !code}>
                  {verifying ? (
                    <>
                      <Loader2 className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <KeyRound /> Verify & sign in
                    </>
                  )}
                </Button>
              </form>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Use a different email
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Mail /> Send sign-in code
                    </>
                  )}
                </Button>
              </form>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={loginWithGoogle}
              >
                <svg viewBox="0 0 24 24" className="size-4">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
