'use client'
import { useEffect } from 'react'
export default function PwaLoader() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // In development, unregister existing service workers to avoid precaching errors
            if (process.env.NODE_ENV === 'development') {
                // Unregister all service workers
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.unregister().catch(() => {
                            // Ignore errors during unregistration
                        });
                    });
                });
                // Also try to unregister by scope
                navigator.serviceWorker.getRegistration().then((registration) => {
                    if (registration) {
                        registration.unregister().catch(() => {
                            // Ignore errors during unregistration
                        });
                    }
                });
                return;
            }
            
            // Register Service Worker in production only
            navigator.serviceWorker
              .register('/sw.js')
              .then((registration) => {
                console.log('Service Worker registered:', registration.scope);
              })
              .catch((error) => {
                console.error('Service Worker registration failed:', error);
              });
          }
    }, [])
    return null
}