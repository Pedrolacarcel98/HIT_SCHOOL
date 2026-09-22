import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Variable a nivel de módulo para capturar el evento incluso antes del montaje de React
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isWindowStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    window.matchMedia?.('(display-mode: minimal-ui)')?.matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches;
  const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
  const isAndroidApp = typeof document !== 'undefined' && document.referrer?.includes('android-app://');
  return Boolean(isWindowStandalone || isNavigatorStandalone || isAndroidApp);
}

function checkIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

function checkIsSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return (
    checkIsIOS() &&
    /safari/.test(userAgent) &&
    !/crios|fxios|opios|edgios|mercury/.test(userAgent)
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);
  const [isIOS] = useState<boolean>(checkIsIOS);
  const [isSafari] = useState<boolean>(checkIsSafari);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Escuchar cambios de modo de pantalla standalone/instalada
    const standaloneQueries = [
      '(display-mode: standalone)',
      '(display-mode: fullscreen)',
      '(display-mode: minimal-ui)',
      '(display-mode: window-controls-overlay)',
    ];
    const mediaQueries = standaloneQueries.map((query) => window.matchMedia(query));
    const handleMediaChange = () => {
      setIsStandalone(checkIsStandalone());
    };
    mediaQueries.forEach((mq) => mq.addEventListener('change', handleMediaChange));

    // 2. Capturar el evento beforeinstallprompt (Chromium, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 3. Capturar cuando la app ha sido instalada exitosamente
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQueries.forEach((mq) => mq.removeEventListener('change', handleMediaChange));
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Función para disparar la instalación automática o detectar estado
  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'already-installed' | 'unavailable'> => {
    if (checkIsStandalone() || isStandalone) {
      return 'already-installed';
    }

    if (isIOS) {
      // En iOS Safari no existe prompt(), se notifica para abrir la guía visual
      return 'ios';
    }

    const activePrompt = deferredPrompt || globalDeferredPrompt;

    if (activePrompt) {
      try {
        // Ejecutar INMEDIATAMENTE el prompt oficial del navegador sin pasos previos
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
        }
        return choice.outcome;
      } catch (err) {
        console.error('Error al solicitar la instalación PWA:', err);
        return 'unavailable';
      }
    }

    return 'unavailable';
  }, [deferredPrompt, isIOS, isStandalone]);

  const isInstallable = !isStandalone && (Boolean(deferredPrompt || globalDeferredPrompt) || isIOS);

  return {
    isInstallable,
    isStandalone,
    isIOS,
    isSafari,
    isInstalled,
    hasPrompt: Boolean(deferredPrompt || globalDeferredPrompt),
    deferredPrompt: deferredPrompt || globalDeferredPrompt,
    installApp,
  };
}

export default usePWAInstall;
