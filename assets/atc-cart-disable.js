(function () {
  const ATC_LOCKED_SELECTOR = '[data-atc-page-load-gate="true"][data-atc-page-load-locked="true"]';

  const CART_TRIGGER_SELECTOR = [
    '[data-cart-page-load-gate="true"]',
    '#cart-icon-bubble',
    '[data-toggle-cart]'
  ].join(',');

  const MAX_WAIT = 7000;
  const LOAD_EXTRA_DELAY = 900;
  const CHECK_INTERVAL = 200;

  let released = false;
  let checkTimer = null;
  let maxWaitTimer = null;

  function getLockedAtcButtons() {
    return Array.from(document.querySelectorAll(ATC_LOCKED_SELECTOR));
  }

  function getCartTriggers() {
    return Array.from(document.querySelectorAll(CART_TRIGGER_SELECTOR));
  }

  function isLiquidDisabled(button) {
    return button.getAttribute('data-liquid-disabled') === 'true';
  }

  function isPageLoaded() {
    return document.readyState === 'complete';
  }

  function isRebuyReady() {
    return Boolean(
      window.Rebuy &&
      (
        window.Rebuy.SmartCart ||
        window.Rebuy.Cart ||
        window.Rebuy.util
      )
    );
  }

  function lockAtcButtons() {
    if (released) return;

    getLockedAtcButtons().forEach(function (button) {
      if (isLiquidDisabled(button)) return;

      button.disabled = true;
      button.classList.add('is-waiting-for-rebuy');
    });
  }

  function lockCartTriggers() {
    if (released) return;

    getCartTriggers().forEach(function (trigger) {
      trigger.setAttribute('data-cart-page-load-locked', 'true');
      trigger.setAttribute('aria-disabled', 'true');
      trigger.classList.add('is-waiting-for-rebuy');
    });
  }

  function releaseAtcButtons() {
    getLockedAtcButtons().forEach(function (button) {
      if (isLiquidDisabled(button)) return;

      button.disabled = false;
      button.removeAttribute('data-atc-page-load-locked');
      button.classList.remove('is-waiting-for-rebuy');
    });
  }

  function releaseCartTriggers() {
    getCartTriggers().forEach(function (trigger) {
      trigger.removeAttribute('data-cart-page-load-locked');
      trigger.removeAttribute('aria-disabled');
      trigger.classList.remove('is-waiting-for-rebuy');
    });
  }

  function releaseGate(reason) {
    if (released) return;

    released = true;

    clearInterval(checkTimer);
    clearTimeout(maxWaitTimer);

    releaseAtcButtons();
    releaseCartTriggers();

    document.documentElement.classList.add('rebuy-cart-gate-released');

    console.warn('[ATC / Cart Gate] Released:', reason);
  }

  function checkReady() {
    lockAtcButtons();
    lockCartTriggers();

    if (!isPageLoaded()) return;

    if (isRebuyReady()) {
      setTimeout(function () {
        releaseGate('page loaded and Rebuy detected');
      }, LOAD_EXTRA_DELAY);
    }
  }

  function blockCartClickWhileLocked(event) {
    if (released) return;

    const trigger = event.target.closest(CART_TRIGGER_SELECTOR);

    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    lockCartTriggers();

    console.warn('[ATC / Cart Gate] Cart click blocked because Rebuy is not ready yet.');
  }

  function initGate() {
    lockAtcButtons();
    lockCartTriggers();

    document.addEventListener('click', blockCartClickWhileLocked, true);

    checkTimer = setInterval(checkReady, CHECK_INTERVAL);

    window.addEventListener('load', function () {
      setTimeout(checkReady, LOAD_EXTRA_DELAY);
    });

    document.addEventListener('rebuy.ready', function () {
      setTimeout(function () {
        releaseGate('rebuy.ready event');
      }, LOAD_EXTRA_DELAY);
    });

    document.addEventListener('rebuy:ready', function () {
      setTimeout(function () {
        releaseGate('rebuy:ready event');
      }, LOAD_EXTRA_DELAY);
    });

    document.addEventListener('rebuy:smartcart.ready', function () {
      setTimeout(function () {
        releaseGate('rebuy:smartcart.ready event');
      }, LOAD_EXTRA_DELAY);
    });

    maxWaitTimer = setTimeout(function () {
      releaseGate('max wait reached');
    }, MAX_WAIT);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGate);
  } else {
    initGate();
  }
})();