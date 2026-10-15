import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export function useBrandLogo(): string | null {
  const { data } = useQuery<{ logoUrl?: string | null }>({
    queryKey: ["/api/invoice-template"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/invoice-template");
      if (!res.ok) throw new Error("Failed to load logo");
      return res.json();
    },
  });
  return data?.logoUrl || null;
}

// Keeps the browser tab icon in sync with the uploaded clinic logo.
export function useBrandFavicon() {
  const logoUrl = useBrandLogo();
  useEffect(() => {
    if (!logoUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.removeAttribute("type");
    link.href = logoUrl;
  }, [logoUrl]);
}

interface BrandLogoProps {
  fallback?: string;
  className?: string;
}

export function BrandLogo({ fallback = "S", className = "w-8 h-8" }: BrandLogoProps) {
  const logoUrl = useBrandLogo();
  if (logoUrl) {
    return <img src={logoUrl} alt="Saivie" className={`${className} rounded-lg object-contain`} />;
  }
  return (
    <div className={`${className} rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold`}>
      {fallback}
    </div>
  );
}
