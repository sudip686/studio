'use client';

import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {cameraEase} from '@/lib/deck/presentation-motion';
import {buildConcentrator} from '@/lib/deck/mine-scene';
import MetallurgyEvidenceBoard from './MetallurgyEvidenceBoard';
import {MET_GROUPS} from '@/lib/deck/metallurgy-plant';
import {createPlantProcessMotion} from '@/lib/deck/plant-process-motion';
import {createMetallurgyEndUseScene, type MetallurgyEndUseRoute} from '@/lib/deck/metallurgy-end-use-scene';
import {stabilizeSceneMaterialAppearance} from '@/lib/deck/stable-materials';

const PROCESS = [
  {id: 'feed', title: 'Feed & crushing', short: 'Feed', point: [-44, 8, -8] as const, hasRoof: true, input: 'Mine feed', output: 'Prepared feed', description: 'Receive and crush conceptual mine feed, then carry prepared material toward milling.', motion: 'Feed advances on the receiving conveyor.', basis: 'IMO Appendix D · A.1: laboratory stage crushing and sample splitting. Conveyor, industrial equipment and layout are conceptual.'},
  {id: 'milling', title: 'Milling & classification', short: 'Milling', point: [-15, 7.5, -9] as const, hasRoof: true, input: 'Prepared feed', output: 'Ground material', description: 'Grinding prepares the material for separation; industrial equipment is illustrative.', motion: 'The drum rotates on mounted bearings.', basis: 'IMO Appendix D · A.2 and B.3: laboratory rod milling, screening and regrinding. The industrial drum and cyclone cluster are illustrative.'},
  {id: 'flotation', title: 'Flotation', short: 'Flotation', point: [20, 7.5, -18] as const, hasRoof: true, input: 'Ground material', output: 'Concentrate', description: 'Air and agitation separate concentrate in this conceptual flow.', motion: 'Agitators turn; froth moves to the launders.', basis: 'IMO Appendix D · B.1–B.2: laboratory agitation, air addition and froth collection. Table 2 contains the reported final cleaner results; the plant arrangement is illustrative.'},
  {id: 'dewatering', title: 'Concentrate dewatering', short: 'Dewatering', point: [41.5, 6.5, 22] as const, hasRoof: true, input: 'Wet concentrate', output: 'Dried material', description: 'Filter and dry concentrate before handling; industrial equipment remains illustrative.', motion: 'The dryer rotates; filter plates remain still.', basis: 'IMO Appendix D · B.9: laboratory concentrate filtration, drying and sizing. Industrial filtration and rotary drying equipment remain design concepts.'},
  {id: 'product', title: 'Product handling', short: 'Product', point: [50, 8, 55] as const, hasRoof: true, input: 'Dried material', output: 'Storage / loadout', description: 'Convey dried material into storage and loadout; the arrangement remains conceptual.', motion: 'Transfer connects dewatering to storage.', basis: 'Concept only: the reviewed laboratory procedures do not specify an industrial storage or loadout arrangement. No product grade, capacity or commercial qualification is established.'},
] as const;
const IMO_PROCESS_REPORT='/6798-%20Sakariya%20Tanzanian%20Graphite%20-%20Final%20Report%20-%20Rev0%20(1).pdf';

type ProcessId = typeof PROCESS[number]['id'];
type RoofMesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> & {userData: {plantRoof?: boolean; plantStage?: string; roofSlideSign?: number; roofBaseZ?: number}};
type ViewCommand = {frameStage: (stage: ProcessId, animate: boolean) => void; fitOverview: (animate: boolean) => void; updateRoofTargets: () => void; showEndUse: (route: MetallurgyEndUseRoute, animate: boolean) => void; focusEndUseStep: (route: MetallurgyEndUseRoute, step: number, animate: boolean, heroDetail?: boolean) => void; returnToPlant: (animate: boolean) => void};
type FactoryRecoveryView = {position: [number, number, number]; target: [number, number, number]; fov: number; processTime: number; endUseRoute?: MetallurgyEndUseRoute | null; journeyTime?: number};
const END_USE_BACKGROUND = '#aab9b7';

/** Conceptual connected plant tour. Laboratory measurements stay in the evidence board. */
export default function MetallurgyProcessExhibit({paused, onToggle}: {paused: boolean; onToggle: () => void}) {
  const host = useRef<HTMLDivElement>(null);
  const viewCommand = useRef<ViewCommand | null>(null);
  const recoveryViewRef = useRef<FactoryRecoveryView | null>(null);
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const [stage, setStage] = useState<ProcessId>('feed');
  const [openRoof, setOpenRoof] = useState(false);
  const [overview, setOverview] = useState(true);
  const [sample, setSample] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [endUseRoute, setEndUseRoute] = useState<MetallurgyEndUseRoute | null>(null);
  const [journeyStep, setJourneyStep] = useState(0);
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [plantTourActive, setPlantTourActive] = useState(false);
  const [plantTourComplete, setPlantTourComplete] = useState(false);
  const [plantTourStep, setPlantTourStep] = useState(0);
  const [fullStoryActive, setFullStoryActive] = useState(false);
  const [error, setError] = useState('');
  const [rendererAttempt, setRendererAttempt] = useState(0);
  const stageRef = useRef(stage); stageRef.current = stage;
  const journeyStepRef = useRef(journeyStep); journeyStepRef.current = journeyStep;
  const openRoofRef = useRef(openRoof); openRoofRef.current = openRoof;
  const overviewRef = useRef(overview); overviewRef.current = overview;
  const endUseRouteRef = useRef<MetallurgyEndUseRoute | null>(endUseRoute); endUseRouteRef.current = endUseRoute;
  const journeyActiveRef = useRef(journeyActive); journeyActiveRef.current = journeyActive;
  const journeyElapsedRef = useRef(0);
  const journeyHeroRevealRef = useRef(false);
  const plantTourActiveRef = useRef(plantTourActive); plantTourActiveRef.current = plantTourActive;
  const plantTourElapsedRef = useRef(0);
  const plantTourStepRef = useRef(plantTourStep);
  const fullStoryActiveRef = useRef(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const recoveryView = recoveryViewRef.current;
    setError('');
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'}); }
    catch { setError('3D factory unavailable. Open the laboratory evidence board to review the reported results.'); return; }

    let disposed = false, contextLost = false, contextWasLost = false, userOrbit = false, tween = false, dirty = true;
    let frame = 0, last = performance.now(), elapsed = recoveryView?.processTime ?? 0, journeyElapsed = recoveryView?.journeyTime ?? journeyElapsedRef.current, cameraStart = 0, cameraTour = false;
    let selected: ProcessId = stageRef.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Conceptual graphite processing facility in 3D. Drag to orbit, scroll to zoom, select a process area to inspect.');
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#cbd3cf');
    // Use the same view-independent material palette as the shared 3D deck.
    // Room reflections shift metal and cladding highlights as the plant is
    // orbited, which can look like the process colors are flickering.
    scene.environment = null;
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 4000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .075;
    controls.minDistance = 18; controls.maxDistance = 2200;
    controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI * .48;

    const plant = buildConcentrator();
    plant.name = 'Tanga conceptual processing plant';
    scene.add(plant);
    const endUseScene = createMetallurgyEndUseScene();
    scene.add(endUseScene.root);
    const roofs = plant.children.filter((object): object is RoofMesh => object instanceof THREE.Mesh && Boolean(object.userData.plantRoof));
    roofs.forEach(roof => {
      roof.userData.roofBaseZ = roof.position.z;
      const cloneRoofMaterial=(material:THREE.Material)=>{const clone=material.clone();clone.onBeforeCompile=material.onBeforeCompile;clone.customProgramCacheKey=material.customProgramCacheKey;return clone;};
      if (Array.isArray(roof.material)) roof.material = roof.material.map(cloneRoofMaterial);
      else roof.material = cloneRoofMaterial(roof.material);
    });
    // Fit the authored overview to the closed campus, never to lifted roofs or
    // moving markers. Reset must recover one stable whole-plant composition.
    const overviewBounds = new THREE.Box3().setFromObject(plant);

    const processMotion = createPlantProcessMotion(plant);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(680, 680), new THREE.MeshStandardMaterial({color: '#b8b9b0', roughness: .96}));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1.8; ground.receiveShadow = true; scene.add(ground);
    stabilizeSceneMaterialAppearance(scene);
    // A brighter, neutral exhibit recipe keeps the architectural shells and
    // process equipment readable against the ground without washing out their
    // materials. These lights stay fixed in site space while the camera orbits.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x91958b, 1.55));
    const sun = new THREE.DirectionalLight(0xfffcf4, 1.9);
    sun.position.set(-330, 520, 360); sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536); sun.shadow.camera.left = -400; sun.shadow.camera.right = 400;
    sun.shadow.camera.top = 400; sun.shadow.camera.bottom = -400; sun.shadow.camera.far = 1500; sun.shadow.normalBias = .08;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xf2f7f8, 1.02); fill.position.set(400, 180, -350); scene.add(fill);

    const target = new THREE.Vector3(), fromTarget = new THREE.Vector3(), destination = new THREE.Vector3(), fromPosition = new THREE.Vector3(), approachPosition = new THREE.Vector3();
    // Lower the overview orbit to show more façade and spread the campus across
    // the widescreen canvas; fitOverview still frames the complete boundary.
    const direction = new THREE.Vector3(1.1, .58, 1.25).normalize();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionPreference = () => { setReduceMotion(reducedMotion.matches); if (reducedMotion.matches) stopPlantTour(); dirty = true; };
    onMotionPreference();
    reducedMotion.addEventListener('change', onMotionPreference);
    const roofState = new Map<RoofMesh, {z: number; opacity: number}>();
    roofs.forEach(roof => roofState.set(roof, {z: roof.position.z, opacity: 1}));

    function fitOverview(animate: boolean) {
      selected = stageRef.current;
      target.set(0, 0, 0);
      const bounds = overviewBounds;
      const size = bounds.getSize(new THREE.Vector3());
      // The campus has its water allowance and approach yard at the near edge.
      // Aim below the low edge so near-side features clear the canvas caption
      // while the far perimeter keeps a small but visible top margin.
      target.y = bounds.min.y - Math.max(8, size.y * .14);
      const fitCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, .1, 4000);
      let distance = Math.max(size.x, size.z) * .8;
      for (let iteration = 0; iteration < 5; iteration++) {
        fitCamera.position.copy(target).addScaledVector(direction, distance);
        fitCamera.lookAt(target); fitCamera.updateMatrixWorld();
        let extent = 0;
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
          const point = new THREE.Vector3(x, y, z).project(fitCamera);
          extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
        }
        distance *= Math.max(.1, extent / .76);
      }
      // Keep the full campus, fence, yard and near-side water allowance in
      // frame while using more of the canvas for the plant itself. Keep enough
      // clearance for the near-side water allowance and perimeter at 1366 px.
      distance = Math.max(125, distance * .56);
      destination.copy(target).addScaledVector(direction, distance);
      moveCamera(animate);
    }
    function frameStage(next: ProcessId, animate: boolean) {
      selected = next;
      const item = PROCESS.find(candidate => candidate.id === next) ?? PROCESS[0];
      target.set(item.point[0], item.point[1], item.point[2]);
      const distance = next === 'flotation' ? 72 : next === 'product' ? 88 : next === 'dewatering' ? 62 : next === 'milling' ? 48 : 62;
      // Look down through the opened roof, clear of the retained wall height.
      const localDirection = new THREE.Vector3(.55, 1.15, .8).normalize();
      destination.copy(target).addScaledVector(localDirection, distance);
      moveCamera(animate, true);
    }
    function showEndUse(route: MetallurgyEndUseRoute, animate: boolean) {
      endUseScene.setHeroFocus(route, false);
      endUseScene.setRoute(route);
      endUseScene.root.visible = true;
      plant.visible = false;
      ground.visible = false;
      scene.background = new THREE.Color(END_USE_BACKGROUND);
      target.set(34, 17, 0);
      direction.set(.64, .58, 1.2).normalize();
      const horizontalFit = 450 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(.7, camera.aspect));
      const verticalFit = 92 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      // The route is a long, low vignette; preserve a small edge margin while
      // letting it occupy the same confident canvas scale as the plant tour.
      destination.copy(target).addScaledVector(direction, Math.max(245, horizontalFit, verticalFit) * 1.28);
      moveCamera(animate);
      dirty = true;
    }
    function focusEndUseStep(route: MetallurgyEndUseRoute, step: number, animate: boolean, heroDetail = false) {
      const routeTargets = route === 'anode' ? [-128, -34, 44, 82, 202] : [-128, -48, 38, 178];
      const boundedStep = Math.min(routeTargets.length - 1, Math.max(0, step));
      const isAnodeHero = heroDetail && route === 'anode' && boundedStep === 4;
      const isRefractoryHero = heroDetail && route === 'refractory' && boundedStep === 3;
      const targetHeight = isAnodeHero ? 23 : isRefractoryHero ? 40 : route === 'refractory' && boundedStep === 3 ? 42 : route === 'anode' && boundedStep === 3 ? 13 : route === 'anode' && boundedStep === 4 ? 24 : 20;
      // Keep the cell/EV and furnace/brick compositions together while
      // moving the visual center onto the product pair.
      target.set(isAnodeHero ? 202 : isRefractoryHero ? 181 : routeTargets[boundedStep], targetHeight, route === 'anode' && boundedStep === 3 ? 17 : 0);
      if (isRefractoryHero) direction.set(.34, .56, 1.4).normalize();
      else direction.set(.64, .58, 1.2).normalize();
      // Fit the final product vignettes as complete compositions. The
      // refractory hero includes both the furnace cutaway and a brick detail.
      const widths = isAnodeHero ? [178] : isRefractoryHero ? [170] : route === 'anode' ? [86, 116, 142, 146, 148] : [86, 108, 142, 174];
      const heights = isAnodeHero ? [70] : isRefractoryHero ? [102] : route === 'anode' ? [56, 60, 68, 74, 70] : [56, 60, 72, 108];
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const horizontalFit = widths[heroDetail ? 0 : boundedStep] / (2 * tanHalfFov * Math.max(.7, camera.aspect));
      const verticalFit = heights[heroDetail ? 0 : boundedStep] / (2 * tanHalfFov);
      const distance = Math.max(heroDetail ? 40 : 72, horizontalFit, verticalFit) * 1.12;
      destination.copy(target).addScaledVector(direction, distance);
      moveCamera(animate);
      dirty = true;
    }
    function returnToPlant(animate: boolean) {
      if (endUseRouteRef.current) endUseScene.setHeroFocus(endUseRouteRef.current, false);
      endUseScene.root.visible = false;
      plant.visible = true;
      ground.visible = true;
      scene.background = new THREE.Color('#cbd3cf');
      overviewRef.current = true;
      openRoofRef.current = false;
      roofs.forEach(roof => {
        const state = roofState.get(roof);
        if (state) { state.z = roof.userData.roofBaseZ ?? roof.position.z; state.opacity = 1; }
      });
      fitOverview(animate);
      dirty = true;
    }
    function moveCamera(animate: boolean, throughRoof = false) {
      const damping = controls.enableDamping;
      controls.enableDamping = false; controls.update(); controls.enableDamping = damping;
      fromPosition.copy(camera.position); fromTarget.copy(controls.target);
      approachPosition.copy(target).addScaledVector(direction, throughRoof ? 155 : 0);
      if (throughRoof) approachPosition.y += 24;
      cameraStart = performance.now(); userOrbit = false; dirty = true; cameraTour = throughRoof;
      tween = animate && !reducedMotion.matches;
      if (!tween) { camera.position.copy(destination); controls.target.copy(target); controls.update(); }
    }
    function updateRoofTargets() {
      dirty = true;
      roofs.forEach(roof => {
        const selectedRoof = !endUseRouteRef.current && !overviewRef.current && openRoofRef.current && roof.userData.plantStage === stageRef.current;
        const baseZ = roof.userData.roofBaseZ ?? roof.position.z;
        const slideSign = Number(roof.userData.roofSlideSign ?? 0);
        const targetZ = baseZ + (selectedRoof ? slideSign * 18 : 0);
        // Move the pitched roof bays outward at their eaves. The center ridge
        // cap eases back visually so the interior opens without loose parts
        // hovering above the building.
        const targetOpacity = selectedRoof && slideSign === 0 ? .14 : 1;
        const state = roofState.get(roof);
        if (state) { state.z = targetZ; state.opacity = targetOpacity; }
        roof.visible = true;
      });
    }
    viewCommand.current = {frameStage, fitOverview, updateRoofTargets, showEndUse, focusEndUseStep, returnToPlant};
    let canvasWidth = 0, canvasHeight = 0;
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      // Evidence temporarily hides this same canvas. Returning at the same size
      // should preserve the presenter's orbit rather than reframe the stage.
      if (width === canvasWidth && height === canvasHeight) { dirty = true; return; }
      canvasWidth = width; canvasHeight = height;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      if (endUseRouteRef.current) showEndUse(endUseRouteRef.current, false);
      else if (overviewRef.current) fitOverview(false);
      else frameStage(stageRef.current, false);
      dirty = true;
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const onChange = () => { dirty = true; };
    const onStart = () => { tween = false; userOrbit = true; stopPlantTour(); window.dispatchEvent(new Event('tanga:manual-exploration')); };
    controls.addEventListener('change', onChange); controls.addEventListener('start', onStart);
    const onContextLost = (event: Event) => {
      event.preventDefault(); contextLost = true; contextWasLost = true; element.dataset.ready = 'false';
      recoveryViewRef.current = {position: camera.position.toArray() as [number, number, number], target: controls.target.toArray() as [number, number, number], fov: camera.fov, processTime: elapsed, endUseRoute: endUseRouteRef.current, journeyTime: journeyElapsed};
      setError('Graphics context lost. The 3D factory will rebuild when graphics recover.');
    };
    const onContextRestored = () => { if (!contextLost) return; contextLost = false; setError('Graphics restored; rebuilding the factory…'); window.setTimeout(() => { if (!disposed) setRendererAttempt(value => value + 1); }, 0); };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);

    updateRoofTargets();
    if (recoveryView) {
      // Recreate the industrial scene without discarding the presenter's
      // inspection angle, selected target or process-motion phase.
      if (recoveryView.endUseRoute) {
        endUseScene.setRoute(recoveryView.endUseRoute);
        endUseScene.root.visible = true;
        plant.visible = false;
        ground.visible = false;
        scene.background = new THREE.Color(END_USE_BACKGROUND);
        journeyElapsed = recoveryView.journeyTime ?? 0;
        journeyElapsedRef.current = journeyElapsed;
      }
      target.fromArray(recoveryView.target); destination.fromArray(recoveryView.position);
      fromTarget.copy(target); fromPosition.copy(destination); direction.copy(destination).sub(target).normalize();
      camera.position.copy(destination); camera.fov = recoveryView.fov; camera.updateProjectionMatrix();
      controls.target.copy(target); controls.update(); userOrbit = true; tween = false; cameraTour = false;
      recoveryViewRef.current = null; dirty = true;
    } else if (overviewRef.current) fitOverview(false); else frameStage(stageRef.current, false);
    const draw = (now: number) => {
      if (disposed) return;
      const dt = Math.min(.08, Math.max(0, (now - last) / 1000)); last = now;
      if (!document.hidden && element.getClientRects().length) {
        const inEndUse = Boolean(endUseRouteRef.current);
        const animateProcess = !inEndUse && !contextLost && !pausedRef.current && !reducedMotion.matches;
        if (animateProcess) elapsed += dt;
        if (plantTourActiveRef.current && animateProcess) {
          plantTourElapsedRef.current += dt;
          const nextTourStep = Math.min(PROCESS.length - 1, Math.floor(plantTourElapsedRef.current / 6));
          if (nextTourStep !== plantTourStepRef.current) showPlantTourStep(nextTourStep);
          if (plantTourElapsedRef.current >= PROCESS.length * 6) {
            plantTourActiveRef.current = false;
            setPlantTourActive(false);
            setPlantTourComplete(true);
            if (fullStoryActiveRef.current) {
              // Keep the transition evidence-led: the five-area facility tour
              // completes first, then the separate illustrative anode route
              // starts with its own explicit qualification boundary.
              endUseRouteRef.current = 'anode';
              journeyElapsedRef.current = 0;
              journeyStepRef.current = 0;
              journeyActiveRef.current = true;
              setEndUseRoute('anode');
              setJourneyStep(0);
              setJourneyComplete(false);
              setJourneyActive(true);
              window.dispatchEvent(new Event('tanga:manual-exploration'));
            }
          }
        }
        const activity=processMotion.update(dt, overviewRef.current?'overview':selected, animateProcess&&(overviewRef.current||openRoofRef.current));
        if (inEndUse) journeyElapsed = journeyElapsedRef.current;
        const journeyRunning = inEndUse && journeyActiveRef.current && !contextLost && !pausedRef.current && !reducedMotion.matches;
        if (journeyRunning) {
          journeyElapsed = Math.min(endUseScene.duration, journeyElapsed + dt);
          journeyElapsedRef.current = journeyElapsed;
          const route = endUseRouteRef.current;
          const currentJourneyStep = route ? Math.min(endUseScene.steps[route].length - 1, Math.floor(journeyElapsed / 6)) : 0;
          if (currentJourneyStep !== journeyStepRef.current) {
            journeyStepRef.current = currentJourneyStep;
            setJourneyStep(currentJourneyStep);
            if (route && currentJourneyStep === endUseScene.steps[route].length - 1) journeyHeroRevealRef.current = false;
            if (route) focusEndUseStep(route, currentJourneyStep, true);
          }
          // Finish each pathway with a deliberate product close-up: the EV
          // battery-cell anode, or the graphite-bearing refractory working face.
          // This is a camera beat only; process timing and reported evidence do
          // not change. Reduced motion skips this secondary camera move.
          const routeFinalStep = route ? endUseScene.steps[route].length - 1 : -1;
          if (route && currentJourneyStep === routeFinalStep && journeyElapsed - routeFinalStep * 6 >= 3 && !journeyHeroRevealRef.current && !userOrbit) {
            journeyHeroRevealRef.current = true;
            endUseScene.setHeroFocus(route, true);
            focusEndUseStep(route, currentJourneyStep, true, true);
          }
          if (journeyElapsed >= endUseScene.duration) {
            journeyActiveRef.current = false;
            setJourneyActive(false);
            setJourneyComplete(true);
            if (fullStoryActiveRef.current) {
              fullStoryActiveRef.current = false;
              setFullStoryActive(false);
            }
            dirty = true;
          }
        }
        let roofMoving = false;
        roofs.forEach(roof => {
          const state = roofState.get(roof); if (!state) return;
          const positionDelta = state.z - roof.position.z;
          dirty ||= positionDelta !== 0;
          if (Math.abs(positionDelta) > .01) {
            roof.position.z = reducedMotion.matches ? state.z : roof.position.z + positionDelta * Math.min(1, dt * 5);
            roofMoving = true;
          } else roof.position.z = state.z;
          (Array.isArray(roof.material) ? roof.material : [roof.material]).forEach(current => {
            const material = current as THREE.MeshStandardMaterial;
            const opacityDelta = state.opacity - material.opacity;
            dirty ||= opacityDelta !== 0;
            if (Math.abs(opacityDelta) > .001) {
              material.opacity = reducedMotion.matches ? state.opacity : material.opacity + opacityDelta * Math.min(1, dt * 4);
              roofMoving = true;
            } else material.opacity = state.opacity;
            const transparent = material.opacity < .999;
            if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
            material.depthWrite = material.opacity > .55;
          });
        });
        element.dataset.roofSettled = String(!roofMoving);
        dirty ||= roofMoving;
        if (tween && !userOrbit) {
          const progress = reducedMotion.matches ? 1 : cameraEase((now - cameraStart) / (cameraTour ? 2100 : 900));
          if (cameraTour && progress < .4) camera.position.lerpVectors(fromPosition, approachPosition, progress / .4);
          else if (cameraTour) camera.position.lerpVectors(approachPosition, destination, (progress - .4) / .6);
          else camera.position.lerpVectors(fromPosition, destination, progress);
          controls.target.lerpVectors(fromTarget, target, progress);
          if (progress >= 1) { tween = false; cameraTour = false; }
          dirty = true;
        }
        if (inEndUse && (dirty || journeyRunning || tween)) {
          const journey = endUseScene.update(journeyElapsed, journeyRunning);
          element.dataset.endUseRoute = journey.route;
          element.dataset.endUseStep = String(journey.step);
          element.dataset.endUseProgress = journey.progress.toFixed(3);
          element.dataset.endUseComplete = String(journey.complete);
          dirty = true;
        }
        controls.update();
        if (!contextLost && (dirty || animateProcess || tween)) {
          renderer.render(scene, camera); dirty = false;
          element.dataset.cameraPosition = JSON.stringify(camera.position.toArray());
          element.dataset.cameraTarget = JSON.stringify(controls.target.toArray());
          element.dataset.processTime = elapsed.toFixed(3);
          element.dataset.processActivity = JSON.stringify(activity);
          element.dataset.renderCount = String(renderer.info.render.frame);
        }
      }
      element.dataset.motion = document.hidden || !element.getClientRects().length ? 'hidden' : reducedMotion.matches ? 'reduced' : pausedRef.current ? 'paused' : 'playing';
      element.dataset.cameraSettled = String(!tween);
      element.dataset.ready = contextLost ? 'false' : 'true';
      element.dataset.stage = selected;
      element.dataset.roofOpen = String(openRoofRef.current && !overviewRef.current);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); viewCommand.current = null;
      reducedMotion.removeEventListener('change', onMotionPreference);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      // A lost WebGL context already released its GPU objects. Three.js keeps
      // VAO/program handles from before the loss, so disposing those resources
      // after the browser restores the context sends invalid deletes into the
      // new context and floods the console. Let the detached renderer/scene be
      // collected in that case; keep normal disposal for ordinary unmounts.
      if (!contextWasLost) {
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
        scene.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(entry => materials.add(entry)); } });
        geometries.forEach(geometry => geometry.dispose()); materials.forEach(entry => entry.dispose());
        sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss();
      }
      renderer.domElement.remove();
    };
  }, [rendererAttempt]);

  useEffect(() => {
    if (overview) viewCommand.current?.fitOverview(true);
    else viewCommand.current?.frameStage(stage, true);
  }, [overview, stage]);
  useEffect(() => { viewCommand.current?.updateRoofTargets(); }, [overview, stage, openRoof]);
  useEffect(() => {
    if (endUseRoute) viewCommand.current?.showEndUse(endUseRoute, true);
    else if (viewCommand.current) viewCommand.current.returnToPlant(true);
  }, [endUseRoute]);

  const selected = PROCESS.find(item => item.id === stage) ?? PROCESS[0];
  const result = MET_GROUPS[sample];
  const routeSteps = endUseRoute ? (endUseRoute === 'anode' ? ['Shape', 'Purify', 'Coat & heat', 'Electrode line', 'Anode cell cutaway'] : ['Blend', 'Press', 'MgO–C brick', 'Lining detail']) : [];
  const routeTitle = endUseRoute === 'anode' ? 'EV battery anode pathway' : 'Steelmaking refractory pathway';
  const routeDescription = endUseRoute === 'anode'
    ? [
      'Illustrative flake shaping and size classification begin a possible downstream anode-material route.',
      'Purification, washing and filtration are shown as illustrative downstream steps.',
      'A conceptual coating and heat-treatment line prepares material for later electrode production.',
      'Graphite active material is shown coating copper foil before passing through calender rollers.',
      'Cell cutaway: Li⁺ moves toward graphite during charging; the EV is illustrative end-use context.',
    ][journeyStep] ?? 'An illustrative downstream route from concentrate to anode material and an EV context.'
    : [
      'Illustrative blending combines graphite with a magnesia refractory batch.',
      'A conceptual press forms a magnesia-carbon refractory brick.',
      'The cutaway highlights a graphite-bearing working face in the brick.',
      'A conceptual MgO–C brick seats into an exposed furnace lining to show an illustrative refractory application.',
    ][journeyStep] ?? 'An illustrative graphite pathway into a magnesia-carbon refractory application.';
  function openEndUse() {
    stopPlantTour();
    fullStoryActiveRef.current = false;
    setFullStoryActive(false);
    endUseRouteRef.current = 'anode';
    journeyElapsedRef.current = 0;
    journeyActiveRef.current = false;
    journeyStepRef.current = 0; setJourneyStep(0); setJourneyActive(false); setJourneyComplete(false);
    setEndUseRoute('anode');
    window.dispatchEvent(new Event('tanga:manual-exploration'));
  }
  function chooseEndUseRoute(route: MetallurgyEndUseRoute) {
    fullStoryActiveRef.current = false;
    setFullStoryActive(false);
    const sameRoute = endUseRouteRef.current === route;
    endUseRouteRef.current = route;
    journeyElapsedRef.current = 0;
    journeyActiveRef.current = false;
    journeyStepRef.current = 0; setJourneyStep(0); setJourneyActive(false); setJourneyComplete(false);
    setEndUseRoute(route);
    if (sameRoute) viewCommand.current?.showEndUse(route, true);
    window.dispatchEvent(new Event('tanga:manual-exploration'));
  }
  function playEndUseJourney() {
    if (!endUseRoute) return;
    fullStoryActiveRef.current = false;
    setFullStoryActive(false);
    journeyElapsedRef.current = 0;
    journeyHeroRevealRef.current = false;
    if (reduceMotion) {
      const finalStep = endUseRoute === 'anode' ? 4 : 3;
      journeyElapsedRef.current = (finalStep + 1) * 6;
      journeyActiveRef.current = false;
      journeyStepRef.current = finalStep; setJourneyActive(false); setJourneyComplete(true); setJourneyStep(finalStep);
      viewCommand.current?.focusEndUseStep(endUseRoute, finalStep, false);
      const element = host.current;
      if (element) {
        element.dataset.endUseRoute = endUseRoute;
        element.dataset.endUseStep = String(finalStep);
        element.dataset.endUseProgress = '1.000';
        element.dataset.endUseComplete = 'true';
      }
      return;
    }
    journeyActiveRef.current = true;
    journeyStepRef.current = 0; setJourneyStep(0); setJourneyComplete(false); setJourneyActive(true);
    viewCommand.current?.focusEndUseStep(endUseRoute, 0, true);
    window.dispatchEvent(new Event('tanga:manual-exploration'));
  }
  function returnToFactory() {
    stopPlantTour();
    fullStoryActiveRef.current = false;
    setFullStoryActive(false);
    endUseRouteRef.current = null;
    journeyActiveRef.current = false;
    setJourneyActive(false); setJourneyComplete(false); setEndUseRoute(null);
    setOverview(true); setOpenRoof(false); overviewRef.current = true; openRoofRef.current = false;
    window.dispatchEvent(new Event('tanga:manual-exploration'));
  }
  // Keep the scene host mounted while reading evidence. Its render loop sleeps
  // when hidden, and the same renderer/camera resumes on return.
  return <>
    {showEvidence && <MetallurgyEvidenceBoard selected={sample} onSelect={setSample} onEquipment={() => setShowEvidence(false)} onBack={() => setShowEvidence(false)} />}
    <section className="tanga-process-exhibit tanga-process-exhibit--factory" aria-label={endUseRoute ? 'Illustrative downstream graphite end-use pathways' : 'Conceptual graphite processing facility'} data-inspection={endUseRoute ?? 'factory'} style={showEvidence ? {display: 'none'} : undefined}>
    <header className="tanga-factory-header">
      <div><small>{endUseRoute ? 'DOWNSTREAM USE · ILLUSTRATIVE PATHWAY' : 'PROCESSING CONCEPT · ILLUSTRATIVE 3D FACILITY'}</small><h2>{endUseRoute ? 'From graphite concentrate to end use.' : 'One connected process. Five areas to inspect.'}</h2></div>
      <div className="tanga-process-actions">
        {endUseRoute ? <>
          <button type="button" aria-label={fullStoryActive ? 'Stop full metallurgy story and return to the plant' : 'Return to processing plant'} onClick={returnToFactory}>{fullStoryActive ? 'Stop full story' : '← Plant tour'}</button>
          <button type="button" disabled={fullStoryActive} onClick={playEndUseJourney}>{fullStoryActive ? 'Full story · playing' : journeyComplete ? 'Replay pathway' : journeyActive ? 'Journey playing' : 'Play pathway'}</button>
        </> : <>
          <button type="button" aria-label="Reset camera to whole-plant overview" title="Reset camera to whole-plant overview" onClick={() => { stopPlantTour(); if (overviewRef.current) viewCommand.current?.fitOverview(true); setOverview(true); setOpenRoof(false); overviewRef.current = true; openRoofRef.current = false; window.dispatchEvent(new Event('tanga:manual-exploration')); }}>Whole plant</button>
          <button type="button" onClick={() => { stopPlantTour(); setOverview(false); overviewRef.current = false; frameRoofToggle(); window.dispatchEvent(new Event('tanga:manual-exploration')); }}> {openRoof ? 'Close selected roof' : 'Open selected roof'}</button>
          <button type="button" className="tanga-factory-tour-button" disabled={reduceMotion} title={reduceMotion ? 'Use the five stage buttons and end-use controls to explore without camera motion.' : 'Play the 30-second plant tour, then continue through the illustrative 30-second EV-anode pathway.'} aria-pressed={plantTourActive || fullStoryActive} onClick={() => plantTourActive ? stopPlantTour() : startPlantTour(true)}>{plantTourActive ? 'Stop story' : plantTourComplete ? 'Replay full story' : reduceMotion ? 'Story · reduced motion' : 'Play full story'}</button>
        </>}
        <button type="button" onClick={onToggle} aria-pressed={paused || reduceMotion} disabled={reduceMotion} title={reduceMotion ? 'Reduced motion is enabled in your device settings' : undefined}>{reduceMotion ? 'Motion reduced' : paused ? 'Play process motion' : 'Pause process motion'}</button>
        <button type="button" onClick={() => setShowEvidence(true)}>Lab results ↗</button>
      </div>
    </header>
    {endUseRoute ? <nav className="tanga-enduse-routes" aria-label="Choose an illustrative graphite downstream route">
      <button type="button" aria-pressed={endUseRoute === 'anode'} onClick={() => chooseEndUseRoute('anode')}><span>01</span><strong>EV battery anode</strong><small>Shaped · purified · coated</small></button>
      <button type="button" aria-pressed={endUseRoute === 'refractory'} onClick={() => chooseEndUseRoute('refractory')}><span>02</span><strong>Steelmaking refractory</strong><small>Magnesia-carbon brick</small></button>
    </nav> : <nav className="tanga-process-stages tanga-factory-stages" aria-label="Processing facility areas">
      {PROCESS.map((item, index) => <button type="button" key={item.id} aria-pressed={!overview && stage === item.id} aria-current={plantTourActive && plantTourStep === index ? 'step' : undefined} data-tour-step={plantTourActive && plantTourStep === index ? 'active' : undefined} onClick={() => { stopPlantTour(); showPlantTourStep(index); setPlantTourComplete(false); window.dispatchEvent(new Event('tanga:manual-exploration')); }}><b>0{index + 1}</b><span>{item.title}</span></button>)}
    </nav>}
    <div className="tanga-factory-body">
      <div className="tanga-process-scene tanga-factory-scene"><div ref={host} className="tanga-process-canvas" data-stage={stage} />
        {error && <div className="tanga-factory-error" role="alert"><strong>3D view unavailable</strong><span>{error}</span><div><button type="button" onClick={() => { setError(''); setRendererAttempt(value => value + 1); }}>Retry factory view</button><button type="button" onClick={() => setShowEvidence(true)}>Open laboratory evidence</button></div></div>}
        <div className="tanga-process-caption"><span>{endUseRoute ? `${routeTitle} · ${journeyStep + 1} / ${String(routeSteps.length).padStart(2, '0')} · ${routeSteps[journeyStep]}` : overview ? 'Facility overview · connected campus and process route' : `${selected.title} · ${openRoof ? 'roof cutaway' : 'selected area'}`}</span><small>Drag to orbit · scroll to zoom · {endUseRoute ? 'Plant tour returns to the connected facility' : 'Whole plant restores overview'}</small></div>
      </div>
      <aside className="tanga-factory-inspector" aria-live="polite">
        {endUseRoute ? <>
          <small className="tanga-process-kicker">ILLUSTRATIVE DOWNSTREAM PATHWAY</small>
          <h3>{routeTitle}</h3>
          <p className="tanga-process-explanation">{routeDescription}</p>
          <ol className="tanga-enduse-steps" aria-label="Pathway stages">{routeSteps.map((label, index) => <li key={label} aria-current={journeyStep === index ? 'step' : undefined} data-complete={journeyStep > index || journeyComplete}><span>0{index + 1}</span><strong>{label}</strong></li>)}</ol>
          <p className="tanga-enduse-boundary">Illustrative end-use scene only. Tanga’s reported testwork does not establish this conversion route, product specification or qualification.</p>
        </> : <>
          <small className="tanga-process-kicker">{plantTourActive ? `${fullStoryActive ? 'FULL STORY' : 'GUIDED TOUR'} · STOP ${String(plantTourStep + 1).padStart(2, '0')} / 05` : overview ? 'FACILITY OVERVIEW' : `AREA ${String(PROCESS.findIndex(item => item.id === stage) + 1).padStart(2, '0')} / 05`}</small>
          <h3>{overview ? 'A single connected campus' : selected.title}</h3>
          <p className="tanga-process-explanation">{overview ? 'Follow the conceptual route from feed receiving through preparation, flotation, dewatering and product handling. The layout and equipment are illustrative.' : selected.description}</p>
          {!overview && <dl className="tanga-factory-flow"><div><dt>Input</dt><dd>{selected.input}</dd></div><div><dt>Output</dt><dd>{selected.output}</dd></div></dl>}
          {!overview&&<><p className="tanga-factory-motion-note">{selected.motion}</p><details className="tanga-factory-operation-basis"><summary>Operation &amp; source basis</summary><p>{selected.basis}</p>{selected.id!=='product'&&<a href={IMO_PROCESS_REPORT} target="_blank" rel="noreferrer">IMO report · Appendix D ↗</a>}</details></>}
          {!overview && selected.id==='flotation' && <button className="tanga-factory-result" type="button" onClick={() => setShowEvidence(true)} title="Open the full laboratory results board"><span>IMO LAB · {result.id}</span><strong>{result.carbon}</strong><small>{result.recovery} recovery · {result.coarse} above 150 µm</small></button>}
          {!overview && selected.id!=='flotation' && <button className="tanga-factory-result" type="button" onClick={() => setShowEvidence(true)}><span>LABORATORY EVIDENCE</span><i>Compare all eight test composites ↗</i></button>}
          {overview && <button className="tanga-factory-result" type="button" onClick={() => setShowEvidence(true)}><span>LABORATORY EVIDENCE</span><strong>8 composites</strong><small>Separate measures for TC, recovery and coarse mass fraction.</small><i>Open comparison board ↗</i></button>}
          <button className="tanga-factory-pathway-cta" type="button" onClick={openEndUse}><span>NEXT</span><strong>Explore end-use pathways ↗</strong></button>
          <small className="tanga-factory-disclosure">Concept layout only · no approved location, flowsheet or residue design.</small>
        </>}
      </aside>
    </div>
    <footer className="tanga-factory-footer"><span><i aria-hidden="true"/> {endUseRoute ? 'Illustrative downstream pathway' : 'Illustrative process motion'}</span><span>{endUseRoute ? 'These downstream product scenes are separate from the reported Tanga testwork and plant concept.' : 'Speeds and particle counts are display cues · laboratory results remain separate from plant performance'}</span></footer>
  </section></>;

  function frameRoofToggle() {
    setOpenRoof(value => { const next = !value; openRoofRef.current = next; return next; });
    setOverview(false); overviewRef.current = false;
  }

  function showPlantTourStep(index: number) {
    const boundedIndex = Math.max(0, Math.min(PROCESS.length - 1, index));
    const item = PROCESS[boundedIndex];
    plantTourStepRef.current = boundedIndex;
    setPlantTourStep(boundedIndex);
    stageRef.current = item.id;
    overviewRef.current = false;
    openRoofRef.current = true;
    setStage(item.id);
    setOverview(false);
    setOpenRoof(true);
  }

  function startPlantTour(asFullStory = false) {
    if (reduceMotion || endUseRouteRef.current) return;
    fullStoryActiveRef.current = asFullStory;
    setFullStoryActive(asFullStory);
    journeyActiveRef.current = false;
    setJourneyActive(false);
    plantTourElapsedRef.current = 0;
    plantTourStepRef.current = 0;
    plantTourActiveRef.current = true;
    setPlantTourStep(0);
    setPlantTourActive(true);
    setPlantTourComplete(false);
    showPlantTourStep(0);
    window.dispatchEvent(new Event('tanga:manual-exploration'));
  }

  function stopPlantTour() {
    plantTourActiveRef.current = false;
    setPlantTourActive(false);
    fullStoryActiveRef.current = false;
    setFullStoryActive(false);
  }
}
