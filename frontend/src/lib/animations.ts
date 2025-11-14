// Framer Motion Animation Variants for Landing Page

export const fadeInUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.5, ease: [0, 0, 0.2, 1] }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5 }
};

export const slideInFromRight = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: 0.7, ease: [0, 0, 0.2, 1] }
};

export const slideInFromLeft = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: 0.7, ease: [0, 0, 0.2, 1] }
};

export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { duration: 0.3, ease: [0, 0, 0.2, 1] }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const navbarVariants = {
  initial: { y: -100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.5, ease: [0, 0, 0.2, 1] }
};

export const heroContentVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    staggerChildren: 0.1,
    delayChildren: 0.3
  }
};

export const heroItemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.5, ease: [0, 0, 0.2, 1] }
};

// Hover animations
export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

export const cardHover = {
  y: -4,
  transition: { duration: 0.2 }
};

// Spring animation presets
export const spring = {
  type: "spring",
  stiffness: 100,
  damping: 15
};

export const springSnappy = {
  type: "spring",
  stiffness: 300,
  damping: 20
};

