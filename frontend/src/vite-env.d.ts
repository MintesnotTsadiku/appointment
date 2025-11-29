/// <reference types="vite/client" />

// PWA Type Declarations
declare module "virtual:pwa-register/react" {
  import type { Dispatch, SetStateAction } from "react";

  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

// Window object extensions for PWA
declare global {
  interface Window {
    __PWA_OFFLINE__?: boolean;
    frappe?: {
      boot?: any;
      csrf_token?: string;
      call?: (options: {
        method: string;
        args?: any;
      }) => Promise<any>;
      show_alert?: (options: {
        message: string;
        indicator: string;
      }) => void;
    };
    csrf_token?: string;
    app_name?: string;
  }
}

export {};
