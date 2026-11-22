import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import TushLogo from '../components/TushLogo';
import { CursorFollower, Magnetic, Marquee, Reveal, SplitText, TiltCard } from '../motion';
import './LandingPage.css';

const TushCoin3D = lazy(() => import('../three/TushCoin3D'));

export interface LandingPageProps {
  hasActiveWallet: boolean;
  userTag?: string;
  onLaunchDashboard: () => void;
  onCreateWallet: () => void;
  onExploreApps: () => void;
  onViewActivity: () => void;
  onOpenHelp: () => void;
}

const DEMO_TAGS: Record<string, { address: string; badge: string }> = {
  walzeem: { address: 'GD7X…9TUSH', badge: 'Verified · SEP-2' },
  alice: { address: 'GA4L…SEP5U', badge: 'Passkey account' },
  soroban: { address: 'GBSO…ETWOR', badge: 'Smart account' },
};

const SWAP_WORDS = [
  { word: 'tag.', color: 'lime' },
  { word: 'money.', color: 'pink' },
  { word: 'keys.', color: 'blue' },
  { word: 'rules.', color: 'orange' },
] as const;

const PLAY_CARDS = [
  { title: '@tag payments', sub: 'Send to @alice, not G…56 chars', color: 'lime', icon: '@', x: '4%', y: '14%', mx: '3%', my: '3%', r: -10 },
  { title: 'Passkeys', sub: 'Face ID · Touch ID · Hello', color: 'pink', icon: '◉', x: '27%', y: '50%', mx: '47%', my: '12%', r: 7 },
  { title: 'DEX swaps', sub: 'Live Horizon paths', color: 'orange', icon: '⇄', x: '50%', y: '8%', mx: '5%', my: '36%', r: -4 },
  { title: 'SEP-7 links', sub: 'Pay-by-link & QR', color: 'blue', icon: '⌁', x: '72%', y: '46%', mx: '46%', my: '45%', r: 9 },
  { title: 'Soroban', sub: 'Smart accounts ready', color: 'violet', icon: '✦', x: '8%', y: '62%', mx: '3%', my: '69%', r: 5 },
  { title: 'Earn 4.8%', sub: 'Stake XLM in-wallet', color: 'white', icon: '%', x: '62%', y: '74%', mx: '47%', my: '76%', r: -8 },
] as const;

const STEPS = [
  {
    n: '01',
    kicker: 'Create',
    title: 'A wallet in one tap.',
    body: 'Sign in with a biometric passkey, or generate a 12-word recovery phrase. Your keys are encrypted on your device and never leave it.',
    color: 'lime',
  },
  {
    n: '02',
    kicker: 'Claim',
    title: 'Grab your @tag.',
    body: 'Pick a handle like @you. It resolves via SEP-2 federation, so anyone can pay you without copying 56 characters.',
    color: 'pink',
  },
  {
    n: '03',
    kicker: 'Move',
    title: 'Send, swap, earn.',
    body: 'Pay a tag, share a SEP-7 link, swap on the Stellar DEX or stake XLM. Settles in seconds.',
    color: 'blue',
  },
] as const;

/* ---------------- Icons ---------------- */
const Arrow = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.4" /></svg>
);
const IconPrint = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a8 8 0 0 0-8 8v2M20 13v-2a8 8 0 0 0-12.6-6.5" /><path d="M8 13a4 4 0 0 1 8 0c0 3-1 5.5-2.5 7.5M12 13c0 3.5-1.2 6-3 8M16.5 17.5c-.3 1.2-.8 2.4-1.4 3.5" /></svg>
);
const IconPuzzle = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4z" /></svg>
);

/* ---------------- Small building blocks ---------------- */
function Btn({
  children,
  variant = 'lime',
  size = 'lg',
  onClick,
  href,
  download,
  arrow = true,
}: {
  children: ReactNode;
  variant?: 'lime' | 'pink' | 'ghost' | 'dark' | 'white';
  size?: 'sm' | 'lg';
  onClick?: () => void;
  href?: string;
  download?: string;
  arrow?: boolean;
}) {
  const cls = `tl-btn tl-btn--${variant} tl-btn--${size}`;
  const inner = (
    <>
      <span className="tl-btn__label">{children}</span>
      {arrow && (
        <span className="tl-btn__icon">
          <Arrow />
        </span>
      )}
    </>
  );
  return (
    <Magnetic strength={0.25}>
      {href ? (
        <a className={cls} href={href} download={download}>
          {inner}
        </a>
      ) : (
        <button type="button" className={cls} onClick={onClick}>
          {inner}
        </button>
      )}
    </Magnetic>
  );
}

function WordSwap() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % SWAP_WORDS.length), 2200);
    return () => window.clearInterval(id);
  }, [reduce]);
  const w = SWAP_WORDS[i];
  return (
    <span className={`tl-swap tl-swap--${w.color}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={w.word}
          className="tl-swap__word"
          initial={{ y: '100%', rotateX: -80, opacity: 0 }}
          animate={{ y: '0%', rotateX: 0, opacity: 1 }}
          exit={{ y: '-100%', rotateX: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          {w.word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Toast({ children, className, delay }: { children: ReactNode; className: string; delay: number }) {
  return (
    <motion.div
      className={`tl-toast ${className}`}
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Steps (sticky scroll timeline) ---------------- */
function StepsSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length * 0.999)));
  });
  const step = STEPS[active];

  return (
    <section className="tl-steps" ref={ref} id="how">
      <div className="tl-steps__sticky">
        <div className="tl-wrap tl-steps__grid">
          <div className="tl-steps__left">
            <p className="tl-eyebrow">How it works</p>
            <h2 className="tl-h2">
              Three steps.
              <br />
              <span className="tl-grad-text">One tag.</span>
            </h2>
            <div className="tl-timeline">
              <div className="tl-timeline__rail">
                <motion.div className="tl-timeline__fill" style={{ scaleY: progress }} />
              </div>
              {STEPS.map((s, i) => (
                <div key={s.n} className={`tl-timeline__node tl-timeline__node--${s.color}${i <= active ? ' is-on' : ''}`}>
                  <span className="tl-timeline__hex">{s.n}</span>
                  <span className="tl-timeline__label">{s.kicker}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tl-steps__right">
            <AnimatePresence mode="wait">
              <motion.article
                key={step.n}
                className={`tl-step-card tl-step-card--${step.color}`}
                initial={{ opacity: 0, y: 60, rotate: -3, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, y: -60, rotate: 3, scale: 0.94 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="tl-step-card__n">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <StepVisual index={active} />
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="tl-vis tl-vis--passkey">
        <motion.div
          className="tl-vis__ring"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="tl-vis__print"><IconPrint /></div>
        <span>Passkey verified</span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="tl-vis tl-vis--tag">
        {['@', 'y', 'o', 'u'].map((c, i) => (
          <motion.span
            key={i}
            initial={{ y: 30, opacity: 0, rotate: -20 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.2 + i * 0.08 }}
          >
            {c}
          </motion.span>
        ))}
        <motion.em initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }}>
          ✓ claimed
        </motion.em>
      </div>
    );
  }
  return (
    <div className="tl-vis tl-vis--send">
      <div className="tl-vis__pill">@you</div>
      <div className="tl-vis__track">
        <motion.span
          className="tl-vis__coin"
          animate={{ x: ['0%', '100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
        />
      </div>
      <div className="tl-vis__pill tl-vis__pill--alt">@alice</div>
    </div>
  );
}

/* ---------------- Playground (draggable cards) ---------------- */
function Playground() {
  const area = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(area, { once: true, amount: 0.3 });
  return (
    <section className="tl-play" id="tag">
      <div className="tl-wrap">
        <Reveal>
          <p className="tl-eyebrow">All things Stellar</p>
          <h2 className="tl-h2 tl-h2--wide">
            Everything you need, <span className="tl-hl tl-hl--pink">thrown</span> into one wallet.
          </h2>
          <p className="tl-p tl-play__hint">Go on — grab a card and toss it around.</p>
        </Reveal>
        <div className="tl-play__area" ref={area}>
          {PLAY_CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              className={`tl-chip-card tl-chip-card--${c.color}`}
              style={{ '--x': c.x, '--y': c.y, '--mx': c.mx, '--my': c.my } as React.CSSProperties}
              drag
              dragConstraints={area}
              dragElastic={0.18}
              dragTransition={{ bounceStiffness: 300, bounceDamping: 14 }}
              whileHover={{ scale: 1.05, rotate: c.r * 0.4 }}
              whileDrag={{ scale: 1.12, rotate: 0, zIndex: 20, cursor: 'grabbing' }}
              initial={reduce ? { rotate: c.r } : { y: -420, rotate: c.r * 3, opacity: 0 }}
              animate={inView || reduce ? { y: 0, rotate: c.r, opacity: 1 } : undefined}
              transition={{ type: 'spring', stiffness: 120, damping: 13, delay: i * 0.09 }}
              data-cursor="hover"
            >
              <span className="tl-chip-card__icon">{c.icon}</span>
              <b>{c.title}</b>
              <small>{c.sub}</small>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */
export default function LandingPage({
  hasActiveWallet,
  userTag,
  onLaunchDashboard,
  onCreateWallet,
  onExploreApps,
  onViewActivity,
  onOpenHelp,
}: LandingPageProps) {
  const [query, setQuery] = useState('walzeem');
  const [copied, setCopied] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const finalRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const reduce = useReducedMotion();

  const key = query.trim().replace(/^@/, '').toLowerCase();
  const hit = DEMO_TAGS[key];
  const clean = key.replace(/[^a-z0-9_-]/g, '');

  const copy = () => {
    navigator.clipboard?.writeText(`@${clean}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const launch = hasActiveWallet ? onLaunchDashboard : onCreateWallet;

  // Smooth scrolling (landing only — wallet views keep native scroll)
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenisRef.current = lenis;
    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduce]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -80 });
    else el.scrollIntoView({ behavior: 'smooth' });
  };
  const toTop = () => {
    if (lenisRef.current) lenisRef.current.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll-linked values
  const { scrollYProgress } = useScroll();
  const progressBar = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroCopyY = useTransform(heroP, [0, 1], [0, -120]);
  const heroCopyOpacity = useTransform(heroP, [0, 0.7], [1, 0]);
  const { scrollYProgress: finalP } = useScroll({ target: finalRef, offset: ['start end', 'end end'] });
  const finalScale = useTransform(finalP, [0, 1], [0.7, 1]);
  const finalSpacing = useTransform(finalP, [0, 1], ['0.2em', '-0.04em']);

  // Pointer blob in final CTA
  const [blob, setBlob] = useState({ x: 50, y: 50 });

  return (
    <div className="tl">
      <CursorFollower />
      <motion.div className="tl-progress" style={{ scaleX: progressBar }} aria-hidden="true" />
      <div className="tl-grain" aria-hidden="true" />

      {/* Floating pill nav */}
      <header className="tl-nav">
        <motion.div
          className="tl-nav__inner"
          initial={reduce ? false : { y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <TushLogo size="md" onClick={toTop} />
          <nav className="tl-nav__links" aria-label="Sections">
            <button type="button" onClick={() => scrollTo('how')}>How it works</button>
            <button type="button" onClick={() => scrollTo('tag')}>@tag</button>
            <button type="button" onClick={() => scrollTo('defi')}>DeFi</button>
            <button type="button" onClick={() => scrollTo('security')}>Security</button>
            <button type="button" onClick={() => scrollTo('download')}>Download</button>
            <button type="button" onClick={onOpenHelp}>Guides</button>
          </nav>
          <Btn size="sm" variant="lime" onClick={onLaunchDashboard}>
            {hasActiveWallet ? (userTag ? `Open ${userTag}` : 'Open wallet') : 'Launch App'}
          </Btn>
        </motion.div>
      </header>

      {/* Hero */}
      <section className="tl-hero" ref={heroRef} id="learn">
        <div className="tl-hero__aurora" aria-hidden="true">
          <span /><span /><span />
        </div>
        <Suspense fallback={null}>
          <TushCoin3D interactionTarget={heroRef} />
        </Suspense>

        <motion.div className="tl-hero__inner" style={reduce ? undefined : { y: heroCopyY, opacity: heroCopyOpacity }}>
          <motion.p
            className="tl-badge"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <span className="tl-badge__dot" /> Stellar &amp; Soroban · Testnet live
          </motion.p>
          <h1 className="tl-hero__title">
            <SplitText text="Your name." delay={0.35} />
            <span className="tl-hero__line2">
              <SplitText text="Your" delay={0.65} />
              &nbsp;
              <WordSwap />
            </span>
          </h1>
          <Reveal delay={0.9} y={20}>
            <p className="tl-hero__sub">
              Send, swap and earn on Stellar with a simple <b>@tag</b> that is yours alone — no 56-character keys,
              no hassle.
            </p>
          </Reveal>
          <Reveal delay={1.05} y={20} className="tl-hero__cta">
            <Btn onClick={launch}>Launch web app</Btn>
            <Btn variant="ghost" onClick={() => scrollTo('download')}>Get the extension</Btn>
          </Reveal>
          <Reveal delay={1.2} y={10}>
            <p className="tl-hero__note">
              <span className="tl-hero__hint">Psst — click the coin.</span> Also coming to iOS &amp; Android.
            </p>
          </Reveal>
        </motion.div>

        <Toast className="tl-toast--a" delay={1.5}>
          <i className="tl-dot tl-dot--lime" /> +250 XLM from <b>@alice</b>
        </Toast>
        <Toast className="tl-toast--b" delay={1.8}>
          <i className="tl-dot tl-dot--pink" /> Settled in <b>3.9s</b>
        </Toast>

        <motion.div
          className="tl-scroll-cue"
          aria-hidden="true"
          animate={reduce ? undefined : { y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <span />
        </motion.div>
      </section>

      {/* Crossing marquees */}
      <section className="tl-marquees" aria-label="Highlights">
        <Marquee
          className="tl-marquee tl-marquee--lime"
          speed={28}
          items={['Claim your @tag', 'Passkey sign-in', 'One-tap swaps', 'SEP-7 pay links', 'Stake XLM', 'Soroban ready'].map((t) => (
            <span key={t} className="tl-marquee__chunk">
              {t}
              <i className="tl-marquee__star">✦</i>
            </span>
          ))}
        />
        <Marquee
          className="tl-marquee tl-marquee--pink"
          speed={34}
          reverse
          items={['Self-custody', 'AES-256 vault', 'Open standards', 'Instant settlement', 'Zero seed stress', 'Built on Stellar'].map((t) => (
            <span key={t} className="tl-marquee__chunk">
              {t}
              <i className="tl-marquee__star">●</i>
            </span>
          ))}
        />
      </section>

      <StepsSection />

      <Playground />

      {/* @tag resolver */}
      <section className="tl-section">
        <div className="tl-wrap">
          <Reveal className="tl-resolver">
            <div className="tl-resolver__left">
              <p className="tl-eyebrow">Live demo</p>
              <h3 className="tl-h3">Try an @tag</h3>
              <label className="tl-resolver__input">
                <span>@</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="yourname" aria-label="Tag to look up" />
              </label>
              <div className="tl-chips">
                {Object.keys(DEMO_TAGS).map((k) => (
                  <button key={k} type="button" className={key === k ? 'is-on' : ''} onClick={() => setQuery(k)}>
                    @{k}
                  </button>
                ))}
              </div>
            </div>
            <TiltCard className="tl-resolver__right" max={8}>
              <div className={`tl-resolver__status${hit ? '' : ' is-free'}`}>
                {hit ? hit.badge : clean ? 'Available to claim' : '—'}
              </div>
              <div className="tl-resolver__tag" key={clean}>
                {[...`@${clean || 'yourname'}`].map((ch, i) => (
                  <motion.span
                    key={i}
                    initial={reduce ? false : { y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.02 }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </div>
              <div className="tl-resolver__addr">{hit ? hit.address : 'Claim it when you create a wallet'}</div>
              <div className="tl-resolver__btns">
                <Btn size="sm" variant="pink" onClick={onCreateWallet}>Claim your @tag</Btn>
                <Btn size="sm" variant="ghost" arrow={false} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</Btn>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* DeFi */}
      <section className="tl-section" id="defi">
        <div className="tl-wrap tl-split">
          <Reveal>
            <p className="tl-eyebrow">Tush wallet</p>
            <h2 className="tl-h2">
              Your shortcut to <span className="tl-hl tl-hl--lime">DeFi.</span>
            </h2>
            <p className="tl-p">
              Discover vetted ways to put your crypto to work across Stellar &amp; Soroban protocols, all from your Tush
              wallet.
            </p>
            <ul className="tl-checks">
              <li>Simple, direct execution — enter and manage in a few taps.</li>
              <li>Compare options and confirm when ready.</li>
              <li>Swap through live Horizon DEX paths with auto trustlines.</li>
            </ul>
            <Btn variant="white" onClick={onExploreApps}>Explore dApps</Btn>
          </Reveal>
          <div className="tl-fan" aria-hidden="true">
            {[
              { b: 'Soroswap', s: 'AMM DEX', e: 'Swap', c: 'orange' },
              { b: 'Blend', s: 'Lending & yield', e: 'Earn', c: 'blue' },
              { b: 'Aquarius', s: 'Liquidity', e: 'Vote', c: 'pink' },
            ].map((d, i) => (
              <motion.div
                key={d.b}
                className={`tl-fan__card tl-fan__card--${d.c}`}
                initial={reduce ? false : { opacity: 0, x: 120, rotate: 12 }}
                whileInView={{ opacity: 1, x: 0, rotate: (i - 1) * 5 }}
                whileHover={{ rotate: 0, scale: 1.04, x: -12 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ type: 'spring', stiffness: 140, damping: 16, delay: i * 0.12 }}
              >
                <span className="tl-fan__logo">{d.b[0]}</span>
                <div>
                  <b>{d.b}</b>
                  <small>{d.s}</small>
                </div>
                <em>{d.e}</em>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="tl-section" id="security">
        <div className="tl-wrap">
          <Reveal>
            <h2 className="tl-h2 tl-h2--center">
              Crypto that works. <span className="tl-grad-text">Safely.</span>
            </h2>
          </Reveal>
          <div className="tl-grid3">
            {[
              { icon: <IconLock />, t: 'Encrypted vault', p: 'AES-256-GCM with PBKDF2 (600,000 iterations) and auto-lock. Keys never leave your device.', c: 'lime' },
              { icon: <IconPrint />, t: 'Passkeys', p: 'Face ID, Touch ID or Windows Hello — no extension, no seed phrase to lose.', c: 'pink' },
              { icon: <IconPuzzle />, t: 'Open standards', p: 'SEP-2 names, SEP-5 recovery, SEP-7 payment links and a SEP-43 dApp provider.', c: 'blue' },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 0.12}>
                <TiltCard className={`tl-feature tl-feature--${f.c}`}>
                  <span className="tl-feature__icon">{f.icon}</span>
                  <h3>{f.t}</h3>
                  <p>{f.p}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section className="tl-section" id="download">
        <div className="tl-wrap">
          <Reveal>
            <h2 className="tl-h2 tl-h2--center">
              Tush is always <span className="tl-hl tl-hl--blue">within reach.</span>
            </h2>
          </Reveal>
          <div className="tl-grid3">
            <Reveal delay={0}>
              <TiltCard className="tl-device tl-device--muted">
                <span className="tl-device__tag">Soon</span>
                <h3>Mobile app</h3>
                <p>Full control, anytime, anywhere. Swap, stake and explore in a few taps.</p>
                <Btn size="sm" variant="ghost" onClick={onOpenHelp}>Get notified</Btn>
              </TiltCard>
            </Reveal>
            <Reveal delay={0.12}>
              <TiltCard className="tl-device tl-device--lime">
                <span className="tl-device__tag">Live</span>
                <h3>Web app</h3>
                <p>A powerful wallet, no downloads required. Works in any browser.</p>
                <Btn size="sm" variant="dark" onClick={launch}>Launch web app</Btn>
              </TiltCard>
            </Reveal>
            <Reveal delay={0.24}>
              <TiltCard className="tl-device tl-device--pink">
                <span className="tl-device__tag">Live</span>
                <h3>Browser extension</h3>
                <p>Seamless dApp access with instant approvals right in Chrome.</p>
                <Btn size="sm" variant="dark" href="/tush-wallet-extension.zip" download="tush-wallet-extension.zip">
                  Download for Chrome
                </Btn>
              </TiltCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="tl-final"
        ref={finalRef}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setBlob({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        style={{ '--bx': `${blob.x}%`, '--by': `${blob.y}%` } as React.CSSProperties}
      >
        <motion.h2 style={reduce ? undefined : { scale: finalScale, letterSpacing: finalSpacing }}>
          Claim your name.
          <br />
          <span className="tl-grad-text">Own your tag.</span>
        </motion.h2>
        <div className="tl-hero__cta tl-hero__cta--center">
          <Btn onClick={onCreateWallet}>Get Tush</Btn>
          <Btn variant="ghost" onClick={onLaunchDashboard}>Open dashboard</Btn>
        </div>
      </section>

      <footer className="tl-footer">
        <div className="tl-footer__row">
          <TushLogo size="sm" onClick={toTop} />
          <div className="tl-footer__links">
            <button type="button" onClick={onLaunchDashboard}>Home</button>
            <button type="button" onClick={onExploreApps}>Apps</button>
            <button type="button" onClick={onViewActivity}>Activity</button>
            <button type="button" onClick={onOpenHelp}>Support</button>
          </div>
          <small>© {new Date().getFullYear()} Tush Wallet · Stellar Testnet</small>
        </div>
        <div className="tl-footer__giant" aria-hidden="true">TUSH</div>
      </footer>
    </div>
  );
}
