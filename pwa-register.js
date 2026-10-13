/**
 * PWA Registration, Update Detector & Download/Install Controller
 * for NFT Gym ERP (Desktop & Mobile)
 */

(function initPWA() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported in this browser.');
    return;
  }

  let refreshing = false;

  // 1. Controller Change Handler (Reload once when SW updates)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[PWA] New controller active. Reloading to apply fresh update...');
    window.location.reload();
  });

  // 2. Service Worker Registration
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates on focus and visibility change
        window.addEventListener('focus', () => {
          registration.update().catch(() => {});
        });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });

        // Periodic background update check every 30 minutes
        setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);

        // Detect new updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version ready for activation.');
              showUpdateToast(newWorker);
            }
          });
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdateToast(registration.waiting);
        }
      })
      .catch((err) => {
        console.error('[PWA] Registration failed:', err);
      });
  });

  // 3. UI Update Toast Notification
  function showUpdateToast(waitingWorker) {
    if (document.getElementById('pwa-update-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #111827;
      color: #ffffff;
      border: 1px solid #22c55e;
      border-radius: 12px;
      padding: 14px 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(34, 197, 94, 0.2);
      display: flex;
      align-items: center;
      gap: 14px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 14px;
      animation: pwaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">⚡</span>
        <div>
          <strong style="color: #22c55e; display: block; font-weight: 700;">Update Available</strong>
          <span style="color: #9ca3af; font-size: 12px;">A new version of NFT Gym ERP is ready.</span>
        </div>
      </div>
      <button id="pwa-refresh-btn" style="
        background: #22c55e;
        color: #000000;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.15s, opacity 0.15s;
        margin-left: 8px;
        white-space: nowrap;
      ">Refresh Now</button>
      <button id="pwa-dismiss-btn" style="
        background: transparent;
        color: #6b7280;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
      " aria-label="Dismiss">&times;</button>
    `;

    injectKeyframes();
    document.body.appendChild(toast);

    document.getElementById('pwa-refresh-btn')?.addEventListener('click', () => {
      toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🔄</span>
          <span style="color: #22c55e; font-weight: 600;">Updating & Reloading...</span>
        </div>
      `;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      toast.remove();
    });
  }

  // 4. Capture 'beforeinstallprompt'
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPWAPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
    console.log('[PWA] App is installable. Event captured in window.deferredPWAPrompt');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed on device!');
    window.deferredPWAPrompt = null;
    showNotificationToast('✅ App successfully installed on your device! You can now launch NFT Gym directly from your desktop or app drawer.');
  });

  // 5. In-App Download / Install App Modal and Trigger Function
  function injectKeyframes() {
    if (!document.getElementById('pwa-keyframes')) {
      const style = document.createElement('style');
      style.id = 'pwa-keyframes';
      style.textContent = `
        @keyframes pwaSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pwaFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function showNotificationToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000000;
      background: #0f1612;
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.4);
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      animation: pwaSlideUp 0.25s ease-out;
      text-align: center;
      max-width: 90vw;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s ease';
      setTimeout(() => t.remove(), 300);
    }, 4000);
  }

  // Device detection helper
  function detectPlatform() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
    return 'desktop';
  }

  // Public Trigger Function called by any "Download App" button
  window.triggerPWAInstall = function() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
      showNotificationToast('✅ NFT Gym ERP is already running as an installed standalone application on this device!');
      return;
    }

    if (window.deferredPWAPrompt) {
      window.deferredPWAPrompt.prompt();
      window.deferredPWAPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted the installation prompt.');
          showNotificationToast('⚡ Installing NFT Gym ERP! The app icon is being added to your desktop / apps.');
        } else {
          console.log('[PWA] User dismissed prompt, showing guide modal.');
          window.showDownloadAppModal();
        }
        window.deferredPWAPrompt = null;
      });
      return;
    }

    // If native prompt is not active (iOS Safari, or Chrome address-bar mode), show rich guide modal
    window.showDownloadAppModal();
  };

  // Full Download & Installation Instructions Modal
  window.showDownloadAppModal = function(defaultTab) {
    if (document.getElementById('pwa-download-modal-overlay')) return;

    injectKeyframes();
    const platform = defaultTab || detectPlatform();

    const overlay = document.createElement('div');
    overlay.id = 'pwa-download-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999998;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow-y: auto;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #0d120f;
      border: 1px solid rgba(34, 197, 94, 0.4);
      border-radius: 20px;
      width: 100%;
      max-width: 580px;
      color: #ffffff;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(34, 197, 94, 0.15);
      animation: pwaFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    `;

    modal.innerHTML = `
      <!-- Header -->
      <div style="padding: 20px 24px; border-bottom: 1px solid #1a271f; display: flex; align-items: center; justify-content: space-between; background: #080c09;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #000; border: 1px solid rgba(34, 197, 94, 0.5); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 4px;">
            <img src="/icons/icon-192.png" alt="NFT Gym" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div>
            <h2 style="font-family: 'Chakra Petch', sans-serif; font-size: 18px; font-weight: 800; color: #ffffff; margin: 0; display: flex; align-items: center; gap: 8px;">
              Download NFT Gym ERP
              <span style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); font-family: sans-serif; font-weight: 700;">PWA App</span>
            </h2>
            <p style="font-size: 12px; color: #9ca3af; margin: 2px 0 0;">Official Desktop & Mobile Standalone Application</p>
          </div>
        </div>
        <button id="pwa-modal-close-btn" style="background: transparent; border: none; color: #9ca3af; font-size: 24px; cursor: pointer; padding: 4px 8px; border-radius: 8px;" hover="color:#fff">&times;</button>
      </div>

      <!-- Device Tabs -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 12px 20px; background: #0a0f0c; border-bottom: 1px solid #1a271f;">
        <button class="pwa-tab-btn" data-tab="windows" style="padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid ${platform === 'windows' || platform === 'desktop' || platform === 'mac' ? '#22c55e' : '#1e2922'}; background: ${platform === 'windows' || platform === 'desktop' || platform === 'mac' ? 'rgba(34, 197, 94, 0.15)' : 'transparent'}; color: ${platform === 'windows' || platform === 'desktop' || platform === 'mac' ? '#22c55e' : '#9ca3af'}; cursor: pointer;">
          💻 Desktop (PC / Windows)
        </button>
        <button class="pwa-tab-btn" data-tab="android" style="padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid ${platform === 'android' ? '#22c55e' : '#1e2922'}; background: ${platform === 'android' ? 'rgba(34, 197, 94, 0.15)' : 'transparent'}; color: ${platform === 'android' ? '#22c55e' : '#9ca3af'}; cursor: pointer;">
          📱 Android Mobile
        </button>
        <button class="pwa-tab-btn" data-tab="ios" style="padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid ${platform === 'ios' ? '#22c55e' : '#1e2922'}; background: ${platform === 'ios' ? 'rgba(34, 197, 94, 0.15)' : 'transparent'}; color: ${platform === 'ios' ? '#22c55e' : '#9ca3af'}; cursor: pointer;">
          🍏 iPhone / iPad (iOS)
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="pwa-tab-content-area" style="padding: 20px 24px;"></div>

      <!-- PWA Health & Features Strip -->
      <div style="margin: 0 24px 20px; padding: 12px 16px; border-radius: 12px; background: #060907; border: 1px solid #1a271f; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; font-size: 11px; color: #9ca3af;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #22c55e;">✔</span> <span>Zero Cache-Trap</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #22c55e;">✔</span> <span>Real-Time Sync</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #22c55e;">✔</span> <span>Barcode/RFID Ready</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #22c55e;">✔</span> <span>Standalone Window</span>
        </div>
      </div>

      <!-- Modal Footer -->
      <div style="padding: 16px 24px; border-top: 1px solid #1a271f; display: flex; align-items: center; justify-content: space-between; background: #080c09; gap: 12px; flex-wrap: wrap;">
        <button id="pwa-copy-url-btn" style="padding: 8px 16px; border-radius: 8px; background: #131c16; border: 1px solid #233328; color: #9ca3af; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          📋 Copy ERP App Link
        </button>
        <button id="pwa-direct-install-btn" style="padding: 10px 22px; border-radius: 10px; background: #22c55e; border: none; color: #000000; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);">
          ⚡ Install App Directly
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Render Tab Content
    function renderTabContent(tab) {
      const container = document.getElementById('pwa-tab-content-area');
      if (!container) return;

      if (tab === 'windows' || tab === 'desktop' || tab === 'mac') {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: flex-start; gap: 12px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 12px; padding: 14px;">
              <div style="background: #22c55e; color: #000; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">1</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">One-Click Install from Browser Bar</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  Look at the right side of your browser address bar (top of screen). Click the <strong>Install App icon (⊕ or computer display with arrow)</strong>.
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 12px; background: #101712; border: 1px solid #1e2922; border-radius: 12px; padding: 14px;">
              <div style="background: #1e2922; color: #22c55e; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">2</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Via Chrome / Edge Menu</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  Click the <strong>3 dots (⋮)</strong> at the top right of your browser &rarr; Select <strong>"Save and share"</strong> or <strong>"Apps"</strong> &rarr; Click <strong>"Install NFT Gym ERP"</strong>.
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 12px; background: #101712; border: 1px solid #1e2922; border-radius: 12px; padding: 14px;">
              <div style="background: #1e2922; color: #22c55e; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">3</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Native Desktop Experience</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  The app will open as a standalone native Windows window with its own taskbar icon and desktop shortcut, completely free of browser URL bars!
                </p>
              </div>
            </div>
          </div>
        `;
      } else if (tab === 'android') {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: flex-start; gap: 12px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 12px; padding: 14px;">
              <div style="background: #22c55e; color: #000; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">1</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Tap Browser Menu in Chrome</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  Open this page in Google Chrome on your phone, then tap the <strong>3-dots icon (⋮)</strong> in the top-right corner.
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 12px; background: #101712; border: 1px solid #1e2922; border-radius: 12px; padding: 14px;">
              <div style="background: #1e2922; color: #22c55e; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">2</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Select "Install App" or "Add to Home screen"</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  Tap <strong>"Install App"</strong> (or <strong>"Add to Home screen"</strong>). Confirm the installation in the prompt.
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 12px; background: #101712; border: 1px solid #1e2922; border-radius: 12px; padding: 14px;">
              <div style="background: #1e2922; color: #22c55e; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">3</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Instant Mobile App Launch</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  NFT Gym ERP will appear with its official app logo on your home screen and launcher, running full-screen with safe notch margins.
                </p>
              </div>
            </div>
          </div>
        `;
      } else if (tab === 'ios') {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: flex-start; gap: 12px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 12px; padding: 14px;">
              <div style="background: #22c55e; color: #000; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">1</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Open Safari & Tap Share</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  Open this link in Apple <strong>Safari</strong> on iPhone/iPad. Tap the <strong>Share button</strong> (square with arrow pointing up at bottom of screen).
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 12px; background: #101712; border: 1px solid #1e2922; border-radius: 12px; padding: 14px;">
              <div style="background: #1e2922; color: #22c55e; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">2</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Tap "Add to Home Screen"</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  Scroll down the share sheet and tap <strong>"Add to Home Screen" (➕)</strong>.
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 12px; background: #101712; border: 1px solid #1e2922; border-radius: 12px; padding: 14px;">
              <div style="background: #1e2922; color: #22c55e; font-weight: 800; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">3</div>
              <div>
                <strong style="color: #ffffff; font-size: 13px; display: block;">Tap "Add" in Top Right</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">
                  Tap <strong>"Add"</strong>. The app icon will be installed onto your iOS home screen, launching standalone without Safari address bars.
                </p>
              </div>
            </div>
          </div>
        `;
      }
    }

    renderTabContent(platform === 'windows' || platform === 'desktop' || platform === 'mac' ? 'windows' : platform);

    // Tab switcher events
    modal.querySelectorAll('.pwa-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.pwa-tab-btn').forEach((b) => {
          b.style.borderColor = '#1e2922';
          b.style.background = 'transparent';
          b.style.color = '#9ca3af';
        });
        btn.style.borderColor = '#22c55e';
        btn.style.background = 'rgba(34, 197, 94, 0.15)';
        btn.style.color = '#22c55e';
        renderTabContent(btn.getAttribute('data-tab'));
      });
    });

    // Close button & overlay click
    const closeModal = () => overlay.remove();
    document.getElementById('pwa-modal-close-btn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Copy URL Button
    document.getElementById('pwa-copy-url-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.origin).then(() => {
        const copyBtn = document.getElementById('pwa-copy-url-btn');
        if (copyBtn) {
          const original = copyBtn.innerHTML;
          copyBtn.innerHTML = '✔ Link Copied!';
          copyBtn.style.color = '#22c55e';
          setTimeout(() => {
            copyBtn.innerHTML = original;
            copyBtn.style.color = '#9ca3af';
          }, 2000);
        }
      });
    });

    // Direct Install Button inside modal
    document.getElementById('pwa-direct-install-btn')?.addEventListener('click', () => {
      if (window.deferredPWAPrompt) {
        window.deferredPWAPrompt.prompt();
        window.deferredPWAPrompt.userChoice.then((result) => {
          if (result.outcome === 'accepted') {
            closeModal();
            showNotificationToast('⚡ Installing NFT Gym ERP! The app icon is being added to your desktop/home screen.');
          }
          window.deferredPWAPrompt = null;
        });
      } else {
        showNotificationToast('💡 Please follow the simple step 1-2 above for your device to complete installation in seconds!');
      }
    });
  };

  // 6. Global event listener delegation for any button with data-pwa-install or id matching
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#main-erp-download-app-btn, #header-download-pwa-btn, #header-download-pwa-mobile-btn, #public-download-pwa-btn, #crm-download-pwa-btn, [data-pwa-install]');
    if (target) {
      e.preventDefault();
      window.triggerPWAInstall();
    }
  });

})();
