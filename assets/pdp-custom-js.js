(function () {
  const PRODUCT_INFO_SELECTOR = '.product__info-container';
  const PRICE_BLOCK_SELECTOR = '[id^="price-"]';
  const TOOLTIP_SELECTOR = '.buy-now-pay-later-tooltip';

  const PLACEHOLDER = '[price divided by 4]';
  const READY_ATTR = 'data-bnpl-tooltip-ready';

  let observer = null;
  let updateTimer = null;

  function parseMoney(value) {
    if (!value) return null;

    const cleanedValue = value
      .replace(/[^0-9.,-]/g, '')
      .replace(/,/g, '');

    const numberValue = parseFloat(cleanedValue);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function formatMoney(amount, sourceText) {
    const hasDollarSign = sourceText && sourceText.includes('$');
    const formattedAmount = amount.toFixed(2);

    return hasDollarSign ? `$${formattedAmount}` : formattedAmount;
  }

  function getCurrentPrice(priceBlock) {
    if (!priceBlock) return null;

    const priceWrapper = priceBlock.querySelector('.price');
    let priceElement = null;

    if (priceWrapper && priceWrapper.classList.contains('price--on-sale')) {
      priceElement = priceBlock.querySelector(
        '.price__sale .price-item--sale.price-item--last'
      );
    }

    if (!priceElement) {
      priceElement = priceBlock.querySelector(
        '.price__regular .price-item--regular'
      );
    }

    if (!priceElement) {
      priceElement = priceBlock.querySelector('.price-item');
    }

    if (!priceElement) return null;

    const priceText = priceElement.textContent.trim();
    const priceValue = parseMoney(priceText);

    if (!priceValue) return null;

    return {
      value: priceValue,
      text: priceText
    };
  }

  function revealTooltip(tooltip) {
    if (!tooltip) return;

    requestAnimationFrame(function () {
      tooltip.style.opacity = '1';
      tooltip.setAttribute(READY_ATTR, 'true');
    });
  }

  function updateTooltipText() {
    const productInfo = document.querySelector(PRODUCT_INFO_SELECTOR);
    if (!productInfo) return;

    const priceBlock = productInfo.querySelector(PRICE_BLOCK_SELECTOR);
    const tooltip = productInfo.querySelector(TOOLTIP_SELECTOR);

    if (!priceBlock || !tooltip) return;

    const currentPrice = getCurrentPrice(priceBlock);
    if (!currentPrice) return;

    const dividedPrice = currentPrice.value / 4;
    const dividedPriceText = formatMoney(dividedPrice, currentPrice.text);

    if (!tooltip.dataset.originalTooltipHtml) {
      tooltip.dataset.originalTooltipHtml = tooltip.innerHTML;
    }

    const originalHtml = tooltip.dataset.originalTooltipHtml;

    if (!originalHtml.includes(PLACEHOLDER)) {
      revealTooltip(tooltip);
      return;
    }

    const updatedHtml = originalHtml.replaceAll(
      PLACEHOLDER,
      `<strong>${dividedPriceText}</strong>`
    );

    if (tooltip.innerHTML !== updatedHtml) {
      tooltip.innerHTML = updatedHtml;
    }

    revealTooltip(tooltip);
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);

    updateTimer = setTimeout(function () {
      updateTooltipText();
    }, 100);
  }

  function initObserver() {
    const productInfo = document.querySelector(PRODUCT_INFO_SELECTOR);

    if (!productInfo) {
      setTimeout(initObserver, 300);
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(function () {
      scheduleUpdate();
    });

    observer.observe(productInfo, {
      childList: true,
      subtree: true,
      characterData: true
    });

    updateTooltipText();
  }

  document.addEventListener('variant:change', scheduleUpdate);
  document.addEventListener('shopify:section:load', initObserver);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();
