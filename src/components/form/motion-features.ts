// Motion's animation features for LazyMotion (src/components/form/motion.tsx). A module of its
// own so it becomes a separate chunk, loaded right after hydration: the animation engine (about
// 25 kB gzipped) is not part of the island's first JavaScript.
import { domAnimation } from 'motion/react';

export default domAnimation;
