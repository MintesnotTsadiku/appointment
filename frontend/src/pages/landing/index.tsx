import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import Hero from './sections/Hero';
import LogoCloud from './sections/LogoCloud';
import ValueProposition from './sections/ValueProposition';
import Features from './sections/Features';
import UseCases from './sections/UseCases';
import HowItWorks from './sections/HowItWorks';
import Pricing from './sections/Pricing';
import FAQ from './sections/FAQ';
import FinalCTA from './sections/FinalCTA';

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <LogoCloud />
        <ValueProposition />
        <Features />
        <UseCases />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;

