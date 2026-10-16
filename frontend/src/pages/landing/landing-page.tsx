import Lenis from 'lenis';
import { useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { LandingNav } from './sections/nav';
import { Hero } from './sections/hero';
import { Marquee, Platform } from './sections/platform';
import { Volunteers } from './sections/volunteers';
import { CheckInDemo } from './sections/check-in';
import { HowItWorks } from './sections/how';
import { Proof } from './sections/proof';
import { Faq, FinalCta, Footer, Plans, Trust } from './sections/closing';

export default function LandingPage() {
  const reduce = useReducedMotion();

  useEffect(() => {
    document.title = 'VolunTrack — Every shift filled. Every hour proven.';
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: { offset: -90 } });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [reduce]);

  return (
    <div className="relative overflow-x-clip bg-bg">
      <LandingNav />
      <main id="main">
        <Hero />
        <Marquee />
        <Platform />
        <Volunteers />
        <CheckInDemo />
        <HowItWorks />
        <Proof />
        <Trust />
        <Plans />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
