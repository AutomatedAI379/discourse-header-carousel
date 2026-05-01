import { apiInitializer } from "discourse/lib/api";
import { i18n } from "discourse-i18n";

const ROOT_ID = "hf-carousel";
const ANCHOR_SELECTORS = [
  ".list-controls",
  ".navigation-container",
  ".topic-list-header",
];

function parseLocaleMap(raw) {
  // "de:de-de|fr:fr-fr" → { de: "de-de", fr: "fr-fr" }
  const out = {};
  for (const pair of (raw || "").split("|")) {
    const [from, to] = pair.split(":").map((s) => s && s.trim());
    if (from && to) out[from] = to;
  }
  return out;
}

function parseList(raw) {
  return (raw || "").split("|").map((s) => s.trim()).filter(Boolean);
}

function getCurrentLang() {
  return (document.documentElement.lang || "en").split("-")[0];
}

function isRTL() {
  const html = document.documentElement;
  return (
    html.dir === "rtl" ||
    (html.lang || "").toLowerCase().startsWith("ar")
  );
}

function findAnchor() {
  for (const sel of ANCHOR_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return (
    document.querySelector("#main-outlet") ||
    document.querySelector("#main-outlet-wrapper") ||
    document.body
  );
}

function buildShell(doc) {
  const root = doc.createElement("div");
  root.id = ROOT_ID;
  root.className = "hf-wrap";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", i18n("header_carousel.region_aria"));

  const inner = doc.createElement("div");
  inner.className = "hf-inner";

  const prev = doc.createElement("button");
  prev.type = "button";
  prev.className = "hf-nav hf-prev";
  prev.setAttribute("aria-label", i18n("header_carousel.previous_aria"));
  prev.textContent = "‹";

  const card = doc.createElement("div");
  card.className = "hf-card";
  const viewport = doc.createElement("div");
  viewport.className = "hf-viewport";
  viewport.tabIndex = 0;
  viewport.setAttribute("aria-roledescription", "carousel");
  const track = doc.createElement("div");
  track.className = "hf-track";
  viewport.appendChild(track);
  card.appendChild(viewport);

  const next = doc.createElement("button");
  next.type = "button";
  next.className = "hf-nav hf-next";
  next.setAttribute("aria-label", i18n("header_carousel.next_aria"));
  next.textContent = "›";

  const dots = doc.createElement("div");
  dots.className = "hf-dots";
  dots.setAttribute("role", "tablist");
  dots.setAttribute("aria-label", i18n("header_carousel.pagination_aria"));

  inner.appendChild(prev);
  inner.appendChild(card);
  inner.appendChild(next);
  inner.appendChild(dots);
  root.appendChild(inner);
  return root;
}

function buildSlide(doc, slide, index, opts) {
  const { placeholder, readMoreLabel } = opts;
  const hasHref = !!(slide.href && slide.href !== "#");
  const slideEl = doc.createElement(hasHref ? "a" : "div");
  slideEl.className = "hf-slide";
  if (hasHref) slideEl.href = slide.href;
  slideEl.setAttribute(
    "aria-label",
    slide.title || i18n("header_carousel.slide_aria", { n: index + 1 })
  );

  const media = doc.createElement("div");
  media.className = "hf-media";
  const img = doc.createElement("img");
  img.src = slide.image || placeholder;
  img.alt = slide.title || "";
  img.loading = "lazy";
  const gradient = doc.createElement("div");
  gradient.className = "hf-gradient";
  media.appendChild(img);
  media.appendChild(gradient);
  slideEl.appendChild(media);

  const caption = doc.createElement("div");
  caption.className = "hf-caption";

  if (slide.eyebrow) {
    const eyebrow = doc.createElement("span");
    eyebrow.className = "hf-eyebrow";
    eyebrow.textContent = slide.eyebrow;
    caption.appendChild(eyebrow);
  }

  if (slide.title) {
    const h3 = doc.createElement("h3");
    h3.textContent = slide.title;
    caption.appendChild(h3);
  }

  if (slide.description) {
    const p = doc.createElement("p");
    p.textContent = slide.description;
    caption.appendChild(p);
  }

  if (hasHref && readMoreLabel) {
    const cta = doc.createElement("span");
    cta.className = "hf-cta";
    cta.setAttribute("role", "button");
    cta.textContent = readMoreLabel;
    caption.appendChild(cta);
  }

  slideEl.appendChild(caption);
  return slideEl;
}

function attachBehavior(root, opts) {
  const { autoplayMs, signal, debug } = opts;
  const track = root.querySelector(".hf-track");
  const viewport = root.querySelector(".hf-viewport");
  const dotsWrap = root.querySelector(".hf-dots");
  const prevBtn = root.querySelector(".hf-prev");
  const nextBtn = root.querySelector(".hf-next");
  const slides = Array.from(track.children);
  const dotButtons = Array.from(dotsWrap.children);
  if (!slides.length) return;

  const rtl = isRTL();
  let i = 0;
  let timer = null;
  let hover = false;
  let focused = false;

  const goTo = (n) => {
    i = ((n % slides.length) + slides.length) % slides.length;
    const offset = i * 100;
    track.style.transform = `translateX(${rtl ? offset : -offset}%)`;
    dotButtons.forEach((d, di) =>
      d.setAttribute("aria-current", di === i ? "true" : "false")
    );
    if (debug) console.log("[HF] goto", i);
  };
  const nextFn = () => goTo(i + 1);
  const prevFn = () => goTo(i - 1);

  prevBtn.addEventListener("click", prevFn, { signal });
  nextBtn.addEventListener("click", nextFn, { signal });
  dotButtons.forEach((b, di) =>
    b.addEventListener("click", () => goTo(di), { signal })
  );

  viewport.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "ArrowRight") rtl ? prevFn() : nextFn();
      if (e.key === "ArrowLeft") rtl ? nextFn() : prevFn();
    },
    { signal }
  );

  let startX = 0;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true, signal }
  );
  viewport.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) <= 40) return;
      const goingNext = rtl ? dx > 0 : dx < 0;
      goingNext ? nextFn() : prevFn();
    },
    { signal }
  );

  root.addEventListener("mouseenter", () => (hover = true), { signal });
  root.addEventListener("mouseleave", () => (hover = false), { signal });
  viewport.addEventListener("focusin", () => (focused = true), { signal });
  viewport.addEventListener("focusout", () => (focused = false), { signal });

  const reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (autoplayMs > 0 && slides.length > 1 && !reducedMotion) {
    timer = setInterval(() => {
      if (!hover && !focused) nextFn();
    }, autoplayMs);
    signal.addEventListener("abort", () => clearInterval(timer));
  }

  window.addEventListener("resize", () => goTo(i), { signal });
  goTo(0);
}

async function fetchSlides(opts) {
  const { apiBaseUrl, locale, placeholder, debug } = opts;
  try {
    const url = `${apiBaseUrl}/carousel-${locale}.json`;
    if (debug) console.log("[HF] fetch", url);
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    return data
      .slice()
      .sort((a, b) => (a.Order || 0) - (b.Order || 0))
      .map((item) => ({
        title: item.Title || "",
        description: item.Description || "",
        image: item.Image || placeholder,
        href: item.URL || "",
        eyebrow: "",
      }));
  } catch (e) {
    if (debug) console.warn("[HF] fetch failed", e);
    return [];
  }
}

function removeExisting() {
  document.querySelectorAll(`#${ROOT_ID}`).forEach((el) => {
    if (el.__hfAbort) el.__hfAbort.abort();
    el.remove();
  });
}

function placeAfterAnchor(root) {
  const anchor = findAnchor();
  if (anchor.parentNode === root.parentNode && anchor.nextSibling === root) {
    return; // already in place
  }
  if (anchor.nextSibling) {
    anchor.parentNode.insertBefore(root, anchor.nextSibling);
  } else {
    anchor.parentNode.appendChild(root);
  }
}

export default apiInitializer("1.39.0", (api) => {
  // `settings` is the global object Discourse injects for theme JS — keys
  // are exactly the names defined in settings.yml.
  // eslint-disable-next-line no-undef
  const cfg = {
    apiBaseUrl: (settings.api_base_url || "").replace(/\/+$/, ""),
    allowedPaths: parseList(settings.allowed_paths),
    localeMap: parseLocaleMap(settings.locale_map),
    autoplayMs: Number(settings.autoplay_ms) || 0,
    placeholder: settings.placeholder_image,
    showForAnonymous: !!settings.show_for_anonymous,
    enFallbackEnabled: !!settings.en_static_fallback_enabled,
    enFallbackImage: settings.en_fallback_image,
    enFallbackUrl: settings.en_fallback_url,
    debug: !!settings.debug_logging,
  };

  const log = (...a) => cfg.debug && console.log("[HF]", ...a);

  function pathAllowed() {
    return cfg.allowedPaths.includes(window.location.pathname);
  }

  async function mount() {
    removeExisting();

    if (!pathAllowed()) {
      log("path not allowed:", window.location.pathname);
      return;
    }
    if (!cfg.showForAnonymous && !api.getCurrentUser()) {
      log("anonymous, hidden");
      return;
    }

    const lang = getCurrentLang();
    const locale = cfg.localeMap[lang] || cfg.localeMap.en || "en-gb";
    const slides = await fetchSlides({
      apiBaseUrl: cfg.apiBaseUrl,
      locale,
      placeholder: cfg.placeholder,
      debug: cfg.debug,
    });

    let finalSlides = slides;
    if (!finalSlides.length && lang === "en" && cfg.enFallbackEnabled) {
      finalSlides = [
        {
          title: i18n("header_carousel.welcome_title"),
          description: i18n("header_carousel.welcome_description"),
          image: cfg.enFallbackImage,
          href: cfg.enFallbackUrl,
          eyebrow: "",
        },
      ];
    }
    if (!finalSlides.length) {
      log("no slides, not mounting");
      return;
    }

    const root = buildShell(document);
    const track = root.querySelector(".hf-track");
    const dots = root.querySelector(".hf-dots");

    const readMoreLabel = i18n("header_carousel.read_more");
    finalSlides.forEach((slide, idx) => {
      track.appendChild(
        buildSlide(document, slide, idx, {
          placeholder: cfg.placeholder,
          readMoreLabel,
        })
      );
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.setAttribute(
        "aria-label",
        i18n("header_carousel.go_to_slide_aria", { n: idx + 1 })
      );
      dots.appendChild(dot);
    });

    if (finalSlides.length === 1) root.classList.add("hf-single");

    placeAfterAnchor(root);

    const ac = new AbortController();
    root.__hfAbort = ac;
    attachBehavior(root, {
      autoplayMs: cfg.autoplayMs,
      signal: ac.signal,
      debug: cfg.debug,
    });

    requestAnimationFrame(() => root.classList.add("hf-ready"));
  }

  api.onPageChange(() => {
    mount();
  });
});
