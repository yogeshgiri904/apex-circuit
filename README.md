# Panditji Ki Race

A compact procedural arcade racer built with Three.js and Vite. There is no backend, asset pipeline, or server-side code.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Build the static production bundle with:

```bash
npm run build
```

`npm run preview` serves the production bundle locally.

## Controls

- **W / Up**: accelerate
- **S / Down**: brake and reverse
- **A / Left**, **D / Right**: steer
- **Space**: handbrake / drift
- **R**: restart the race
- **G**: open the vehicle garage
- Touch controls appear on mobile and touch-capable devices: rotate the round steering wheel, hold the tall **GO** pedal to accelerate, use the wider **BRAKE / REVERSE** pedal, and hold **E-BRAKE** to drift. **AUTO** toggles cruise acceleration. Tap **STEER LEFT / STEER RIGHT** to mirror the wheel, pedals, auxiliary controls, and speed readout; the preference is saved on the device.

## Vehicle garage

The in-race garage contains eight procedural vehicles with separate speed, acceleration, braking, grip, steering, camera, and animation profiles: Panditji GT, a Lamborghini-inspired V12 supercar, Mahindra Scorpio-N- and Thar-inspired SUVs, a sprint bicycle, heritage tanga, freight truck, and track aeroplane. The branded choices are stylized interpretations without manufacturer logos or affiliation. Selecting a vehicle starts a fresh countdown.

## Competitive race and pickups

Three computer-controlled rivals—Maya, Nova, and Kai—run the same circuit with individual pace and lane behavior. The position card and live-order tower compare continuous lap progress and finish order.

Six procedural pickup families appear around the racing line and respawn after collection:

- **Nitro**: short overdrive and speed impulse
- **Time bank**: adds 12 seconds to the race reserve
- **Fuel cell**: restores 35% fuel
- **Wings**: temporary low-flight and agile handling
- **Shield**: protects against rival contact
- **Grip**: sharper, more planted cornering

Fuel and the two-minute time bank are shown in the systems panel. Running out of fuel leaves a reduced limp mode; running out of time ends the attempt. Active effects and pickup confirmations are shown in the HUD.

The asphalt is now an open racing line with no curbs, guardrails, shoulder collision, or off-road speed penalty. Drivers can leave the circuit and cross the meadow freely. Competitive checkpoint progress is counted only near the racing surface. A light beacon marks the **PANDITJI** dimensional wordmark in the center of the infield. Drive beside it to unlock its cinematic gallery or click the landmark / maker link to open [Yogesh Giri's GitHub profile](https://github.com/yogeshgiri904).

## PANDITJI signature landmark

The shared procedural landmark is built from custom extruded, beveled **PANDITJI** letter outlines with champagne-alloy faces and dark metallic sidewalls. A broad architectural plinth, illuminated edge inlays, an elliptical light frame, orbiting shards, a beacon, and subtle additive particles complete the composition. The letters and plinth cast and receive shadows in the lightweight Three.js race scene.

The optional signature gallery is lazy-loaded with React, React Three Fiber, Drei, GSAP, and Tailwind CSS. It provides a foggy futuristic city, dramatic key/rim lighting and shadows, damped orbit controls, three scroll-driven story chapters, camera choreography, wordmark hover/click behavior, a keyboard-accessible chapter rail and close control, a semantic GitHub link, responsive touch layouts, and reduced-motion handling. The underlying race renderer and timer pause while the gallery is open.

## Meadow reserve

The circuit sits in a procedural valley with faceted mountain and hill silhouettes, two lakes and an infield pond, animated ripples, lily pads, reeds, broadleaf groves, conifers, herb clumps, and wildflowers. Deer, rabbits, dogs, and cats wander and flee from approaching vehicles. Moderate impacts leave an animal resting and injured temporarily; a critical high-speed impact causes a non-graphic collapse and fade for the remainder of the race. Impacts slow the vehicle and deduct time, while the reserve panel and alert toast make the consequence visible. Restarting the race restores the wildlife population.

## Vercel

Import this directory as a Vite project in Vercel. Vercel detects the `vite build` script and serves `dist` automatically; no additional configuration or environment variables are required. All visual assets are generated in code and the entry point uses Vite's normal module path.
