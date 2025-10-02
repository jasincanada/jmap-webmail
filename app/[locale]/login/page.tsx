"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { Mail, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("login");
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const serverUrl = process.env.NEXT_PUBLIC_JMAP_SERVER_URL || "https://mail.ma2t.com";

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.push(`/${params.locale}`);
    }
  }, [isAuthenticated, router, params.locale]);

  useEffect(() => {
    clearError();
  }, [formData, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await login(
      serverUrl,
      formData.username,
      formData.password
    );

    if (success) {
      router.push(`/${params.locale}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-sm mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6 shadow-lg shadow-primary/5">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            {t("title")}
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {t(`error.${error}`) || t("error.generic")}
            </p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="h-12 px-4 bg-secondary/50 border-border/50 focus:bg-secondary focus:border-primary/50 transition-colors"
              placeholder={t("username_placeholder")}
              required
              autoComplete="off"
              data-form-type="other"
              data-lpignore="true"
              autoFocus
            />

            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-12 px-4 bg-secondary/50 border-border/50 focus:bg-secondary focus:border-primary/50 transition-colors"
              placeholder={t("password_placeholder")}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 font-medium text-base bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("signing_in")}
              </div>
            ) : (
              t("sign_in")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}