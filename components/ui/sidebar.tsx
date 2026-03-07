"use client";

import * as React from "react";
import { PanelLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

const SIDEBAR_WIDTH = "38rem";
const SIDEBAR_WIDTH_MOBILE = "24rem";
const SIDEBAR_WIDTH_ICON = "0rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const MOBILE_PEEK_SNAP = 0.25;
const MOBILE_OPEN_SNAP = 0.9;

type SidebarContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  state: "expanded" | "collapsed";
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(true);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const open = openProp ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(nextOpen);
      } else {
        setUncontrolledOpen(nextOpen);
      }
    },
    [onOpenChange]
  );

  const toggleSidebar = React.useCallback(() => {
    setOpenMobile(!openMobile);
    if (!isMobile) {
      setOpen(!open);
    }
  }, [isMobile, open, openMobile, setOpen]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const value = React.useMemo<SidebarContextProps>(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      state: open ? "expanded" : "collapsed",
      toggleSidebar,
    }),
    [open, setOpen, openMobile, isMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex min-h-[calc(100svh-3.5rem)] w-full has-data-[variant=inset]:bg-sidebar",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"aside"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "inset";
  collapsible?: "offcanvas" | "none";
}) {
  const { state, openMobile, setOpenMobile } = useSidebar();
  const [activeSnapPoint, setActiveSnapPoint] = React.useState<
    number | string | null
  >(MOBILE_PEEK_SNAP);

  const handleMobileOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpenMobile(nextOpen);
    },
    [setOpenMobile]
  );

  if (collapsible === "none") {
    return (
      <aside
        data-slot="sidebar"
        className={cn(
          "flex h-full w-(--sidebar-width) flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          className
        )}
        {...props}
      >
        {children}
      </aside>
    );
  }

  return (
    <>
      <Drawer
        open={openMobile}
        onOpenChange={handleMobileOpenChange}
        direction="bottom"
        modal={false}
        dismissible={false}
        snapPoints={[MOBILE_PEEK_SNAP, MOBILE_OPEN_SNAP]}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={setActiveSnapPoint}
        fadeFromIndex={1}
      >
        <DrawerContent className="h-[90svh] max-h-[90svh] rounded-t-2xl border-t border-sidebar-border bg-sidebar p-0 text-sidebar-foreground md:hidden">
          <DrawerTitle className="sr-only">Search Sidebar</DrawerTitle>
          <DrawerDescription className="sr-only">
            Search filters and results panel.
          </DrawerDescription>
          <div className="flex h-full w-full flex-col">{children}</div>
        </DrawerContent>
      </Drawer>

      <aside
        data-slot="sidebar"
        data-state={state}
        data-side={side}
        data-variant={variant}
        className={cn(
          "peer hidden min-h-[calc(100svh-3.5rem)] border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear md:flex",
          "w-(--sidebar-width) data-[state=collapsed]:w-(--sidebar-width-icon)",
          variant === "inset" && "p-2",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex h-full w-full min-h-0 flex-col overflow-hidden",
            "data-[state=collapsed]:pointer-events-none",
            variant === "inset" && "rounded-xl border border-sidebar-border"
          )}
          data-state={state}
        >
          {state === "expanded" ? children : null}
        </div>
      </aside>
    </>
  );
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      data-slot="sidebar-trigger"
      className={cn("size-8", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        "flex flex-col gap-2 border-b border-sidebar-border p-3",
        className
      )}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("min-h-0 flex-1 overflow-y-auto p-3", className)}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("border-t border-sidebar-border p-3", className)}
      {...props}
    />
  );
}

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative flex min-h-[calc(100svh-3.5rem)] w-full flex-1 flex-col bg-background",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm",
        className
      )}
      {...props}
    />
  );
}
