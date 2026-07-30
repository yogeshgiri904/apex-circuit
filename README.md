# Apex Circuit

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
- Touch controls appear on mobile and touch-capable devices: drag the left analog pad to steer, hold **GO** to accelerate, use **BRAKE** for braking/reverse, and hold **DRIFT** for the handbrake. **AUTO** toggles cruise acceleration so the right thumb can focus on braking and drift.

## Vehicle garage

The in-race garage contains eight procedural vehicles with separate speed, acceleration, braking, grip, steering, camera, and animation profiles: Apex GT, a Lamborghini-inspired V12 supercar, Mahindra Scorpio-N- and Thar-inspired SUVs, a sprint bicycle, heritage tanga, freight truck, and track aeroplane. The branded choices are stylized interpretations without manufacturer logos or affiliation. Selecting a vehicle starts a fresh countdown.

## Competitive race and pickups

Three computer-controlled rivals—Maya, Nova, and Kai—run the same circuit with individual pace and lane behavior. The position card and live-order tower compare continuous lap progress and finish order.

Six procedural pickup families appear around the racing line and respawn after collection:

- **Nitro**: short overdrive and speed impulse
- **Time bank**: adds 12 seconds to the race reserve
- **Fuel cell**: restores 35% fuel
- **Wings**: temporary low-flight and softer barrier impacts
- **Shield**: protects against rival and barrier contact
- **Grip**: sharper, more planted cornering

Fuel and the two-minute time bank are shown in the systems panel. Running out of fuel leaves a reduced limp mode; running out of time ends the attempt. Active effects and pickup confirmations are shown in the HUD.

## Vercel

Import this directory as a Vite project in Vercel. Vercel detects the `vite build` script and serves `dist` automatically; no additional configuration or environment variables are required. All visual assets are generated in code and the entry point uses Vite's normal module path.
