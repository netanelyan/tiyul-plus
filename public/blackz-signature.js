// BlackZ Signature - trademark badge (web component)
// Loaded once from the root layout; renders wherever <blackz-signature> appears.
if (!customElements.get('blackz-signature')) {
  class BlackZSignature extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
            font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;

            --bz-ink: #0c0c0d;
            --bz-gold: #c9a962;
            --bz-grey: #8a8a8f;
            --bz-white: #ffffff;
            --bz-line: rgba(255, 255, 255, 0.08);
            --bz-script: 'Yellowtail', 'Snell Roundhand', cursive;
          }

          .bz-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          /* Force LTR even on RTL (Hebrew) pages */
          .bz-trigger {
            display: inline-flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            color: var(--bz-grey);
            font-size: 11px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            cursor: pointer;
            direction: ltr;
            background: none;
            border: none;
            padding: 4px 6px;
            font-family: inherit;
            transition: opacity 0.25s ease;
          }

          .bz-trigger:hover { opacity: 0.8; }
          .bz-trigger:focus-visible {
            outline: 1px solid var(--bz-gold);
            outline-offset: 3px;
            border-radius: 4px;
          }

          .bz-dot {
            width: 5px;
            height: 5px;
            background-color: var(--bz-gold);
            border-radius: 50%;
            animation: bz-breathe 3s ease-in-out infinite;
          }

          @keyframes bz-breathe {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
          }

          /* Signature mark in the trigger.
             The site footer is dark (night), so the mark is white. */
          .bz-mark {
            font-family: var(--bz-script);
            font-size: 22px;
            font-weight: 400;
            text-transform: none;
            color: #ffffff;
            line-height: 1;
            position: relative;
            top: -3px;
            padding-right: 6px; /* script tails get clipped without this */
          }

          /* Backdrop - makes the centered card read as deliberate */
          .bz-backdrop {
            position: fixed;
            inset: 0;
            /* under html.a11y-grayscale the filter sits on <body>, which
               becomes the containing block for fixed children - the
               minimums keep the dim covering the screen there too */
            min-width: 100vw;
            min-height: 100vh;
            background: rgba(8, 8, 10, 0.5);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.2s ease, visibility 0.2s;
            z-index: 2147483000;
          }

          /* Card.
             Centred on the SCREEN, not on the trigger: the badge sits at
             the edge of a right-aligned footer, so a trigger-anchored card
             hung off the side and was clipped on phones. Width is clamped
             to the viewport, and the --bz-dx / --bz-dy vars are a correction the
             script applies after measuring - see the note in the JS. */
          .bz-card {
            position: fixed;
            top: 50%;
            left: 50%;
            --bz-dx: 0px;
            --bz-dy: 0px;
            transform: translate(calc(-50% + var(--bz-dx)), calc(-50% + var(--bz-dy) + 8px));
            width: min(300px, calc(100vw - 32px));
            max-height: calc(100vh - 32px);
            overflow-y: auto;
            background: var(--bz-ink);
            border: 1px solid var(--bz-line);
            border-radius: 14px;
            box-shadow: 0 20px 44px -14px rgba(0, 0, 0, 0.6);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.25s ease, transform 0.3s ease, visibility 0.25s;
            z-index: 2147483001;
            box-sizing: border-box;
            text-align: center;
            direction: ltr;
            overflow: hidden;
          }

          /* Thin gold strip on top */
          .bz-strip {
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--bz-gold), transparent);
          }

          .bz-body {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 20px 18px 18px;
          }

          .bz-top-text-inner {
            color: var(--bz-grey);
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2.5px;
            font-weight: 500;
          }

          /* White signature, the centerpiece of the card */
          .bz-wordmark-inner {
            font-family: var(--bz-script);
            font-weight: 400;
            font-size: 44px;
            color: var(--bz-white);
            line-height: 1.15;
            padding: 0 14px 4px; /* room for script tails */
          }

          .bz-seal {
            color: var(--bz-gold);
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 500;
          }

          .bz-divider {
            width: 100%;
            height: 1px;
            background: var(--bz-line);
            margin: 4px 0 2px;
          }

          .bz-ig {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--bz-grey);
            font-size: 11px;
            letter-spacing: 0.5px;
            text-decoration: none;
            transition: color 0.2s ease;
          }
          .bz-ig:hover { color: var(--bz-white); }
          .bz-ig .bz-ig-label {
            color: var(--bz-gold);
            font-weight: 700;
            font-size: 9px;
            letter-spacing: 1.5px;
          }

          /* Click only. Hover-to-open made sense for a card pinned to the
             trigger; for one centred over the page it would fire whenever
             the pointer crossed the badge. */
          .bz-wrapper.open .bz-card {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translate(calc(-50% + var(--bz-dx)), calc(-50% + var(--bz-dy)));
          }
          .bz-wrapper.open .bz-backdrop {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }

          @media (prefers-reduced-motion: reduce) {
            .bz-dot { animation: none; }
            .bz-trigger, .bz-card, .bz-ig { transition: none; }
          }
        </style>

        <div class="bz-wrapper">
          <button class="bz-trigger" type="button" aria-label="Part of BlackZ network" aria-expanded="false">
            <span class="bz-dot"></span>
            <span>Part of</span>
            <span class="bz-mark">BlackZ</span>
          </button>

          <div class="bz-backdrop" part="backdrop"></div>

          <div class="bz-card" role="dialog" aria-modal="false" aria-label="BlackZ network seal">
            <div class="bz-strip"></div>
            <div class="bz-body">
              <div class="bz-top-text-inner">Authorized Ecommerce Brand</div>
              <div class="bz-wordmark-inner">BlackZ</div>
              <div class="bz-seal">Network Authorized Seal</div>
              <div class="bz-divider"></div>
              <a class="bz-ig" href="https://instagram.com/netanel.yan" target="_blank" rel="noopener">
                <span class="bz-ig-label">OWNER IG</span>
                <span>@netanel.yan</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const wrapper = this.shadowRoot.querySelector('.bz-wrapper');
      const trigger = this.shadowRoot.querySelector('.bz-trigger');
      const card = this.shadowRoot.querySelector('.bz-card');
      const backdrop = this.shadowRoot.querySelector('.bz-backdrop');

      /**
       * Nudge the card back inside the viewport after it opens.
       *
       * `position: fixed` is normally enough, but this site's high-contrast
       * / grayscale accessibility modes put a `filter` on <body>, and a
       * filtered element becomes the containing block for fixed children -
       * so "fixed" silently starts meaning "relative to the document".
       * Measuring the real rect and correcting is the only version that
       * cannot be wrong, and it costs one frame.
       */
      const clamp = () => {
        card.style.setProperty('--bz-dx', '0px');
        card.style.setProperty('--bz-dy', '0px');
        requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const m = 16;
          let dx = 0;
          let dy = 0;
          if (r.left < m) dx = m - r.left;
          else if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right;
          if (r.top < m) dy = m - r.top;
          else if (r.bottom > window.innerHeight - m) dy = window.innerHeight - m - r.bottom;
          card.style.setProperty('--bz-dx', dx + 'px');
          card.style.setProperty('--bz-dy', dy + 'px');
        });
      };

      const setOpen = (open) => {
        wrapper.classList.toggle('open', open);
        trigger.setAttribute('aria-expanded', String(open));
        if (open) clamp();
      };

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!wrapper.classList.contains('open'));
      });
      backdrop.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(false);
      });
      card.addEventListener('click', (e) => e.stopPropagation());
      document.addEventListener('click', () => setOpen(false));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && wrapper.classList.contains('open')) {
          setOpen(false);
          trigger.focus();
        }
      });
      window.addEventListener('resize', () => {
        if (wrapper.classList.contains('open')) clamp();
      });
    }
  }
  customElements.define('blackz-signature', BlackZSignature);
}
