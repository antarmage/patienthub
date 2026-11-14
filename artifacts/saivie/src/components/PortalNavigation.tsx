import React, { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export const navigationPreferenceKey = "saivie.navigation.expanded";

export interface PortalNavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onSelect: () => void;
  testId?: string;
  badge?: ReactNode;
}

export function PortalNavigation({ label, items, footer, hidden = false }: {
  label: string;
  items: PortalNavigationItem[];
  footer: (expanded: boolean) => ReactNode;
  hidden?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try { setExpanded(localStorage.getItem(navigationPreferenceKey) !== "false"); }
    catch (error) { console.warn("Navigation preference could not load.", error); setStorageError("Navigation preference could not load."); }
    const media = matchMedia("(min-width: 768px)");
    const closeMobile = () => { if (media.matches) setMobileOpen(false); };
    media.addEventListener("change", closeMobile);
    return () => media.removeEventListener("change", closeMobile);
  }, []);
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try { localStorage.setItem(navigationPreferenceKey, String(next)); setStorageError(""); }
    catch (error) { console.warn("Navigation preference could not save.", error); setStorageError("Navigation preference could not be saved on this device."); }
  };
  if (hidden) return null;
  const content = (open: boolean, mobile: boolean) => <>
    <div className="portal-navigation-brand">
      <BrandLogo fallback="S" className={open ? "h-14 w-32" : "h-10 w-10"} />
      {!mobile && <Button variant="ghost" size="icon" className="portal-navigation-toggle" onClick={toggle}
        aria-label={open ? "Collapse navigation" : "Expand navigation"} aria-expanded={open} data-testid="btn-toggle-sidebar">
        {open ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
      </Button>}
    </div>
    <nav className="portal-navigation-items" aria-label={label}>
      {items.map((item) => {
        const button = <button type="button" className="portal-navigation-item" aria-label={item.label}
          aria-current={item.active ? "page" : undefined} data-testid={item.testId}
          onClick={() => { item.onSelect(); if (mobile) setMobileOpen(false); }}>
          <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.6} />
          {open && <><span className="min-w-0 flex-1 truncate text-left">{item.label}</span>{item.badge}</>}
        </button>;
        return open ? <React.Fragment key={item.id}>{button}</React.Fragment> : <Tooltip key={item.id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>;
      })}
    </nav>
    <div className="portal-navigation-footer">{footer(open)}</div>
    {storageError && <p role="alert" className="px-3 pb-3 text-xs text-rose-700">{storageError}</p>}
  </>;
  return <TooltipProvider delayDuration={150}>
    <aside className="portal-navigation-desktop" data-expanded={expanded}>{content(expanded, false)}</aside>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild><Button variant="ghost" size="icon" className="portal-navigation-mobile-trigger" aria-label={`Open ${label.toLowerCase()}`}><Menu className="h-5 w-5" /></Button></SheetTrigger>
      <SheetContent side="left" className="portal-navigation-drawer">
        <SheetTitle className="sr-only">{label}</SheetTitle>
        <SheetDescription className="sr-only">Choose a page. Close the menu to return to the current page.</SheetDescription>
        {content(true, true)}
      </SheetContent>
    </Sheet>
  </TooltipProvider>;
}
