/**
 * Tush motion kit — small, reusable interaction primitives built on `motion`.
 * Every primitive degrades gracefully when the user prefers reduced motion.
 */
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from 'motion/react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import './motion.css';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/* Reveal — fades/slides children in when they scroll into view        */
/* ------------------------------------------------------------------ */
type RevealProps = HTMLMotionProps<'div'> & {
  delay?: number;
  y?: number;
  once?: boolean;
};

export function Reveal({ delay = 0, y = 36, once = true, children, ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, amount: 0.25 }}
      transition={{ duration: 0.9, delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* SplitText — per-character rise-in, used for big headlines           */
/* ------------------------------------------------------------------ */
export function SplitText({
  text,
  delay = 0,
  stagger = 0.035,
  className,
}: {
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  let index = 0;
  return (
    <span className={`split-text ${className ?? ''}`} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} className="split-text__word" aria-hidden="true">
          {[...word].map((ch) => {
            const i = index++;
            return (
              <span key={i} className="split-text__mask">
                <motion.span
                  className="split-text__char"
                  initial={reduce ? false : { y: '110%', rotate: 8 }}
                  animate={{ y: '0%', rotate: 0 }}
                  transition={{ duration: 0.9, delay: delay + i * stagger, ease: EASE_OUT }}
                >
                  {ch}
                </motion.span>
              </span>
            );
          })}
          {wi < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* TiltCard — 3D perspective tilt that follows the pointer, with glare */
/* ------------------------------------------------------------------ */
type TiltCardProps = HTMLMotionProps<'div'> & {
  max?: number;
  glare?: boolean;
  children?: ReactNode;
};

export function TiltCard({ max = 12, glare = true, className, style, children, ...rest }: TiltCardProps) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      className={`tilt-card ${className ?? ''}`}
      style={{ ...(style as object), rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      {...rest}
    >
      {children}
      {glare && !reduce && (
        <motion.span
          className="tilt-card__glare"
          aria-hidden="true"
          style={{ '--gx': glareX, '--gy': glareY } as unknown as CSSProperties}
        />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Magnetic — element gently pulled toward the cursor                  */
/* ------------------------------------------------------------------ */
export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.5 });
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.5 });
  return (
    <motion.span
      className="magnetic"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === 'touch') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* CountUp — animates a number when it changes / enters view           */
/* ------------------------------------------------------------------ */
export function CountUp({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  duration = 1.2,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const from = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fmt = (n: number) =>
      `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (reduce || !inView || !Number.isFinite(value)) {
      node.textContent = fmt(Number.isFinite(value) ? value : 0);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => {
        node.textContent = fmt(v);
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, decimals, prefix, suffix, duration]);

  return <span ref={ref} className="count-up" />;
}

/* ------------------------------------------------------------------ */
/* CursorFollower — dot + lagging ring, grows over interactive targets */
/* ------------------------------------------------------------------ */
export function CursorFollower() {
  const reduce = useReducedMotion();
  const [finePointer] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches,
  );
  const enabled = finePointer && !reduce;
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 350, damping: 30, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 350, damping: 30, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-custom-cursor');
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      setHover(!!t?.closest('a, button, input, label, [data-cursor="hover"]'));
    };
    const pd = () => setDown(true);
    const pu = () => setDown(false);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', pd);
    window.addEventListener('pointerup', pu);
    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointerup', pu);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <>
      <motion.div className="cursor-dot" style={{ x, y }} aria-hidden="true" />
      <motion.div
        className={`cursor-ring${hover ? ' is-hover' : ''}${down ? ' is-down' : ''}`}
        style={{ x: rx, y: ry }}
        aria-hidden="true"
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee — infinite horizontal ticker                                */
/* ------------------------------------------------------------------ */
export function Marquee({
  items,
  reverse = false,
  className,
  speed = 30,
}: {
  items: ReactNode[];
  reverse?: boolean;
  className?: string;
  speed?: number;
}) {
  const loop = [...items, ...items];
  return (
    <div className={`marquee ${className ?? ''}`} aria-hidden="true">
      <div
        className={`marquee__track${reverse ? ' marquee__track--reverse' : ''}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {loop.map((item, i) => (
          <span key={i} className="marquee__item">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
