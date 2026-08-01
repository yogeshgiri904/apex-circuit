import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useCursor } from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { animatePanditjiMonument, createPanditjiMonument, GITHUB_URL } from './panditji-monument.js';
import './hero-experience.css';

gsap.registerPlugin(ScrollTrigger);

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'), update = event => setReduced(event.matches);
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

function HeroModel({ reducedMotion, onHover }) {
  const rig = useMemo(() => createPanditjiMonument(), []);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'pointer', 'auto');
  useFrame(({ clock }) => animatePanditjiMonument(rig, clock.elapsedTime, reducedMotion, hovered));
  const updateHover = value => { setHovered(value); onHover(value); };
  return (
    <primitive
      object={rig.group}
      onPointerOver={event => { event.stopPropagation(); updateHover(true); }}
      onPointerOut={() => updateHover(false)}
      onClick={event => { event.stopPropagation(); window.open(GITHUB_URL, '_blank', 'noopener,noreferrer'); }}
    />
  );
}

function CityBackdrop() {
  const buildingRef = useRef(), lightRef = useRef();
  const data = useMemo(() => {
    let seed = 1439; const next = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    return Array.from({ length: 68 }, (_, index) => {
      const angle = index / 68 * Math.PI * 2 + (next() - .5) * .14, radius = 28 + next() * 25;
      return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, width: 1.7 + next() * 3.6, depth: 1.8 + next() * 3.8, height: 4 + next() * 23, turn: (next() - .5) * .2, tint: [0x142738, 0x1b3142, 0x203746, 0x172b3b][index % 4] };
    });
  }, []);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D(); let lightIndex = 0;
    data.forEach((tower, index) => {
      dummy.position.set(tower.x, tower.height / 2, tower.z); dummy.rotation.set(0, tower.turn, 0); dummy.scale.set(tower.width, tower.height, tower.depth); dummy.updateMatrix(); buildingRef.current.setMatrixAt(index, dummy.matrix); buildingRef.current.setColorAt(index, new THREE.Color(tower.tint));
      for (let row = 0; row < 3; row++) { dummy.position.set(tower.x, tower.height * (.25 + row * .2), tower.z + tower.depth / 2 + .025); dummy.rotation.set(0, tower.turn, 0); dummy.scale.set(tower.width * .68, .065, .035); dummy.updateMatrix(); lightRef.current.setMatrixAt(lightIndex++, dummy.matrix); }
    });
    buildingRef.current.instanceMatrix.needsUpdate = true; buildingRef.current.instanceColor.needsUpdate = true; lightRef.current.count = lightIndex; lightRef.current.instanceMatrix.needsUpdate = true;
  }, [data]);
  return (
    <group>
      <instancedMesh ref={buildingRef} args={[null, null, data.length]} receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#ffffff" metalness={.52} roughness={.67} /></instancedMesh>
      <instancedMesh ref={lightRef} args={[null, null, data.length * 3]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#76c9ce" transparent opacity={.62} /></instancedMesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.03, 0]} receiveShadow><circleGeometry args={[86, 64]} /><meshStandardMaterial color="#0c1822" metalness={.42} roughness={.6} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, 0]}><ringGeometry args={[15, 15.08, 96]} /><meshBasicMaterial color="#d0a966" transparent opacity={.58} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .008, 0]}><ringGeometry args={[20, 20.035, 96]} /><meshBasicMaterial color="#5bd8d2" transparent opacity={.36} /></mesh>
    </group>
  );
}

function CameraChoreography({ progress, controlsRef, interactionUntil, reducedMotion }) {
  const { camera, size } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []), target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (Date.now() < interactionUntil.current) return;
    const p = progress.current.value, portrait = size.height > size.width;
    const targetFov = portrait ? 62 : 45;
    if (Math.abs(camera.fov - targetFov) > .01) { camera.fov = targetFov; camera.updateProjectionMatrix(); }
    const azimuth = -.22 + p * .7, distance = (portrait ? 31.5 : 25.5) - Math.sin(p * Math.PI) * (portrait ? 2.5 : 3.4);
    const height = (portrait ? 8.4 : 7.8) + p * 2.2 - Math.sin(p * Math.PI) * .72;
    desired.set(Math.sin(azimuth) * distance, height, Math.cos(azimuth) * distance);
    target.set(portrait ? 0 : -4.2, (portrait ? 2.95 : 4.05) + p * .48, 0);
    const blend = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(desired, blend);
    if (controlsRef.current) { controlsRef.current.target.lerp(target, blend); controlsRef.current.update(); } else camera.lookAt(target);
  });
  return null;
}

function HeroScene({ progress, reducedMotion, onHover }) {
  const controlsRef = useRef(), interactionUntil = useRef(0);
  const portrait = window.innerHeight > window.innerWidth;
  return (
    <Canvas
      className="hero-canvas"
      shadows
      dpr={[1, window.matchMedia('(pointer: coarse)').matches ? 1.35 : 1.65]}
      camera={{ position: portrait ? [-6.87, 8.4, 30.74] : [-5.56, 7.8, 24.88], fov: portrait ? 62 : 45, near: .1, far: 150 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.16; }}
      role="img"
      aria-label="PANDITJI, a dimensional wordmark landmark in a futuristic city"
    >
      <color attach="background" args={['#07131f']} />
      <fog attach="fog" args={['#0a1b2a', 28, 92]} />
      <hemisphereLight args={['#9dbdd2', '#111821', .62]} />
      <ambientLight intensity={.22} />
      <directionalLight position={[-12, 24, 14]} intensity={2.8} color="#f5d5a4" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={18} shadow-camera-bottom={-9} shadow-bias={-.00035} shadow-normalBias={.018} />
      <directionalLight position={[8, 11, 18]} intensity={1.05} color="#ffe6b4" />
      <spotLight position={[10, 18, -8]} angle={.46} penumbra={.8} intensity={125} distance={50} color="#58cbd0" />
      <pointLight position={[-8, 5, 8]} intensity={28} distance={34} color="#dca85d" />
      <HeroModel reducedMotion={reducedMotion} onHover={onHover} />
      <CityBackdrop />
      <ContactShadows position={[0, .012, 0]} opacity={.48} scale={36} blur={2} far={10} resolution={512} frames={1} />
      <OrbitControls ref={controlsRef} makeDefault enablePan={false} enableDamping dampingFactor={.075} minDistance={13} maxDistance={42} minPolarAngle={.35} maxPolarAngle={1.52} target={portrait ? [0, 2.95, 0] : [-4.2, 4.05, 0]} onStart={() => { interactionUntil.current = Infinity; }} onEnd={() => { interactionUntil.current = Date.now() + 1800; }} />
      <CameraChoreography progress={progress} controlsRef={controlsRef} interactionUntil={interactionUntil} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

const CHAPTERS = [
  { index: '01', label: 'THE SIGNATURE', title: 'A name in motion', copy: 'PANDITJI stands at the heart of the open circuit: a dimensional signature shaped for speed, curiosity, and craft.' },
  { index: '02', label: 'THE CRAFT', title: 'Light, depth and shadow', copy: 'Beveled champagne faces, dark metallic sidewalls, and an illuminated architectural frame turn each letter into a small sculpture.' },
  { index: '03', label: 'THE MAKER', title: 'Beyond the circuit', copy: 'A signature is a starting line. Follow the maker behind this world and explore what is being built beyond the track.' },
];

function HeroExperience({ onClose }) {
  const shell = useRef(), scrollRef = useRef(), closeRef = useRef(), progress = useRef({ value: 0 });
  const reducedMotion = useReducedMotion();
  const [chapter, setChapter] = useState(0), [hovered, setHovered] = useState(false);
  const handleScroll = useCallback(() => {
    const node = scrollRef.current, range = Math.max(1, node.scrollHeight - node.clientHeight), value = node.scrollTop / range;
    setChapter(Math.min(2, Math.round(value * 2)));
    if (reducedMotion) progress.current.value = value; else gsap.to(progress.current, { value, duration: .65, ease: 'power2.out', overwrite: true });
  }, [reducedMotion]);
  useLayoutEffect(() => {
    closeRef.current?.focus();
    if (reducedMotion) return undefined;
    const context = gsap.context(() => {
      gsap.from('.hero-header, .hero-rail', { opacity: 0, y: -14, duration: .72, ease: 'power2.out', stagger: .08 });
      gsap.utils.toArray('.hero-chapter-copy').forEach(element => gsap.fromTo(element, { opacity: .2, y: 28 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: element, scroller: scrollRef.current, start: 'top 82%', toggleActions: 'play none none reverse' } }));
    }, shell);
    ScrollTrigger.refresh(); return () => context.revert();
  }, [reducedMotion]);
  useEffect(() => {
    const keydown = event => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !shell.current) return;
      const focusable = Array.from(shell.current.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keydown); return () => { window.removeEventListener('keydown', keydown); gsap.killTweensOf(progress.current); };
  }, [onClose]);
  const goToChapter = index => scrollRef.current?.scrollTo({ top: index * scrollRef.current.clientHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  return (
    <section ref={shell} className="hero-shell fixed inset-0 isolate overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="hero-title">
      <HeroScene progress={progress} reducedMotion={reducedMotion} onHover={setHovered} />
      <div className="hero-wash" aria-hidden="true" />
      <header className="hero-header absolute flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="hero-mark">P</span><div><span className="hero-header-kicker">PANDITJI / SIGNATURE 01</span><strong className="hero-header-name">PANDITJI</strong></div></div>
        <button ref={closeRef} className="hero-close flex items-center gap-2" type="button" onClick={onClose} aria-label="Close monument and return to race"><span>RETURN TO RACE</span><b aria-hidden="true">×</b></button>
      </header>
      <div className={`hero-hover-hint ${hovered ? 'visible' : ''}`} aria-hidden="true"><span>CLICK THE WORDMARK</span><i>↗</i></div>
      <nav className="hero-rail" aria-label="Monument story chapters">
        {CHAPTERS.map((item, index) => <button key={item.index} type="button" className={chapter === index ? 'active' : ''} onClick={() => goToChapter(index)} aria-label={`Go to chapter ${item.index}: ${item.label}`} aria-current={chapter === index ? 'step' : undefined}><span>{item.index}</span><i /></button>)}
      </nav>
      <div ref={scrollRef} className="hero-story" onScroll={handleScroll} tabIndex={0} aria-label="Scroll the monument story">
        {CHAPTERS.map((item, index) => (
          <article className="hero-chapter flex flex-col justify-center" key={item.index}>
            <div className="hero-chapter-copy">
              <div className="hero-chapter-meta flex items-center gap-3"><span>{item.index}</span><i /><span>{item.label}</span></div>
              <h1 id={index === 0 ? 'hero-title' : undefined}>{item.title}</h1>
              <p>{item.copy}</p>
              {index === 0 && <div className="hero-instruction"><span className="hero-instruction-dot" /> SCROLL TO DISCOVER <em>·</em> DRAG TO ORBIT</div>}
              {index === 1 && <div className="hero-materials flex flex-wrap gap-2"><span>BRUSHED CHAMPAGNE</span><span>DARK TITANIUM</span><span>EDGE LIGHT</span></div>}
              {index === 2 && <a className="hero-github flex items-center justify-between" href={GITHUB_URL} target="_blank" rel="noopener noreferrer"><span>Explore Yogesh Giri on GitHub</span><b aria-hidden="true">↗</b></a>}
            </div>
          </article>
        ))}
      </div>
      <div className="hero-stage-note"><span className="hero-stage-line" /> <span>{reducedMotion ? 'REDUCED MOTION ACTIVE' : 'DRAG THE WORDMARK TO ORBIT'}</span></div>
      <div className="hero-progress" aria-hidden="true"><i style={{ transform: `scaleX(${(chapter + 1) / 3})` }} /></div>
    </section>
  );
}

export function mountHeroExperience(container, onClose) {
  const root = createRoot(container);
  const close = () => { root.unmount(); onClose(); };
  root.render(<HeroExperience onClose={close} />);
}
