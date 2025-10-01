import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import About from "@/components/landing/About";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      <Features />
      <Pricing />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}
