// サイト全体の「滑らかな動き」
// - Lenis：慣性のある滑らかなスクロール
// - GSAP ScrollTrigger：スクロールに合わせた表示・視差・ヒーローの拡大
// 「視差効果を減らす」設定の端末では、動きを付けずにすべて即表示する。
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showAll() {
  document.querySelectorAll<HTMLElement>('.reveal, [data-split], [data-img-reveal]').forEach((el) => {
    el.classList.add('is-visible');
    el.style.opacity = '1';
  });
}

// 見出しを1文字ずつに分割（読み上げ用に元の文は aria-label に残す）
function splitChars(el: HTMLElement) {
  if (el.dataset.splitDone) return el.querySelectorAll('.char');
  const text = el.innerText;
  el.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim());
  const walk = (node: Node): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      // 句読点・閉じかっこは前の文字とくっつけ、行頭に来ないようにする（日本語の禁則）
      const out: Node[] = [];
      for (const ch of node.textContent ?? '') {
        if (/\s/.test(ch)) { out.push(document.createTextNode(ch)); continue; }
        const prev = out[out.length - 1] as HTMLElement | undefined;
        if (/[、。，．,.」』）)！!？?ー〜]/.test(ch) && prev?.classList?.contains('char')) { prev.textContent += ch; continue; }
        const s = document.createElement('span');
        s.className = 'char';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch;
        out.push(s);
      }
      return out;
    }
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') return [node.cloneNode()];
    if (node.nodeType === Node.ELEMENT_NODE) {
      const clone = node.cloneNode(false) as Element;
      clone.setAttribute('aria-hidden', 'true');
      node.childNodes.forEach((c) => walk(c).forEach((n) => clone.appendChild(n)));
      return [clone];
    }
    return [];
  };
  const parts = [...el.childNodes].flatMap(walk);
  el.replaceChildren(...parts);
  el.dataset.splitDone = '1';
  return el.querySelectorAll('.char');
}

function init() {
  if (reduce) return showAll();
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('has-motion');

  // 滑らかなスクロール
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href') || '');
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target as HTMLElement, { offset: -90 });
      }
    }),
  );

  // ふわっと表示（data-stagger を付けた親は子を順番に）
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((parent) => {
    const items = parent.querySelectorAll<HTMLElement>(':scope > *');
    gsap.fromTo(items, { y: 40, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: parent, start: 'top 85%' },
    });
  });
  document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    if (el.closest('[data-stagger]')) return;
    gsap.fromTo(el, { y: 36, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onStart: () => el.classList.add('is-visible'),
    });
  });

  // 見出しを1文字ずつ下から
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const chars = splitChars(el);
    el.style.opacity = '1';
    const inHero = !!el.closest('[data-hero]');
    gsap.fromTo(chars, { yPercent: 110, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 0.9, ease: 'power4.out', stagger: 0.035,
      delay: inHero ? 0.35 : 0,
      scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 85%' },
    });
  });

  // 画像を幕が開くように表示
  document.querySelectorAll<HTMLElement>('[data-img-reveal]').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(12% 12% 12% 12% round 24px)', opacity: 0.4 }, {
      clipPath: 'inset(0% 0% 0% 0% round 24px)', opacity: 1, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // 視差（data-parallax="0.15" のように動く量を指定）
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || '0.15');
    gsap.fromTo(el, { yPercent: -amount * 50 }, {
      yPercent: amount * 50, ease: 'none',
      scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // ヒーロー：読み込み時にゆっくり引き、スクロールで背景が近づきながら暗くなる
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const media = hero?.querySelector<HTMLElement>('[data-hero-media]');
  if (hero && media) {
    gsap.fromTo(media, { scale: 1.15 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
    gsap.to(media, {
      scale: 1.12, opacity: 0.35, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
    const content = hero.querySelector('[data-hero-content]');
    if (content) {
      gsap.to(content, {
        y: -80, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 30%', scrub: true },
      });
    }
  }

  // ヘッダー：下へスクロール中は隠し、上へ戻すと出す
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (header) {
    let last = 0;
    lenis.on('scroll', ({ scroll }: { scroll: number }) => {
      const down = scroll > last && scroll > 240;
      header.style.transform = down ? 'translateY(-100%)' : '';
      last = scroll;
    });
  }

  // 画像の読み込み完了で位置を再計算
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

init();
