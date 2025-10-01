"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { Mail, Lock, Server, User, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("login");
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [formData, setFormData] = useState({
    serverUrl: "https://mail.ma2t.com",
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
      formData.serverUrl,
      formData.username,
      formData.password
    );

    if (success) {
      router.push(`/${params.locale}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border dark:border-gray-800 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Mail className="w-8 h-8 text-gray-700 dark:text-gray-300" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("title")}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t("subtitle")}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                {error && (t(`error.${error}`) || t("error.generic"))}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="server" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("server_label")}
              </label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="server"
                  type="url"
                  value={formData.serverUrl}
                  onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                  className="pl-9"
                  placeholder={t("server_placeholder")}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("username_label")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-9"
                  placeholder={t("username_placeholder")}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("password_label")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-9"
                  placeholder={t("password_placeholder")}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t("signing_in") : t("sign_in")}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("secure_connection")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {t("security_note")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}