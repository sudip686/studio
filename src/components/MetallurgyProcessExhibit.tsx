'use client';

import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {cameraEase} from '@/lib/deck/presentation-motion';
import {buildConcentrator} from '@/lib/deck/mine-scene';
import MetallurgyEvidenceBoard from './MetallurgyEvidenceBoard';
import {MET_GROUPS} from '@/lib/deck/metallurgy-plant';
import {createPlantProcessMotion} from '@/lib/deck/plant-process-motion';
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
type RoofMesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> & {userData: {plantRoof?: boolean; plantStage?: string; roofBaseY?: number; roofOpacity?: number}};
type ViewCommand = {frameStage: (stage: ProcessId, animate: boolean) => void; fitOverview: (animate: boolean) => void; updateRoofTargets: () => void};

/** Conceptual connected plant tour. Laboratory measurements stay in the evidence board. */
export default function MetallurgyProcessExhibit({paused, onToggle}: {paused: boolean; onToggle: () => void}) {
  const host = useRef<HTMLDivElement>(null);
  const viewCommand = useRef<ViewCommand | null>(null);
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const [stage, setStage] = useState<ProcessId>('feed');
  const [openRoof, setOpenRoof] = useState(false);
  const [overview, setOverview] = useState(true);
  const [sample, setSample] = useState(0);
  const [showEvidence, setShowEvidence] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [error, setError] = useState('');
  const [rendererAttempt, setRendererAttempt] = useState(0);
  const stageRef = useRef(stage); stageRef.current = stage;
  const openRoofRef = useRef(openRoof); openRoofRef.current = openRoof;
  const overviewRef = useRef(overview); overviewRef.current = overview;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    setError('');
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'}); }
    catch { setError('3D factory unavailable. Open the laboratory evidence board to review the reported results.'); return; }

    let disposed = false, contextLost = false, userOrbit = false, tween = false, dirty = true;
    let frame = 0, last = performance.now(), elapsed = 0, cameraStart = 0, cameraTour = false;
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
    const roofs = plant.children.filter((object): object is RoofMesh => object instanceof THREE.Mesh && Boolean(object.userData.plantRoof));
    roofs.forEach(roof => {
      roof.userData.roofBaseY = roof.position.y;
      roof.userData.roofOpacity = 1;
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x879189, 1.3));
    const sun = new THREE.DirectionalLight(0xfffcf4, 1.9);
    sun.position.set(-330, 520, 360); sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536); sun.shadow.camera.left = -400; sun.shadow.camera.right = 400;
    sun.shadow.camera.top = 400; sun.shadow.camera.bottom = -400; sun.shadow.camera.far = 1500; sun.shadow.normalBias = .08;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xf2f7f8, .82); fill.position.set(400, 180, -350); scene.add(fill);

    const target = new THREE.Vector3(), fromTarget = new THREE.Vector3(), destination = new THREE.Vector3(), fromPosition = new THREE.Vector3(), approachPosition = new THREE.Vector3();
    // Lower the overview orbit to show more façade and spread the campus across
    // the widescreen canvas; fitOverview still frames the complete boundary.
    const direction = new THREE.Vector3(1.1, .58, 1.25).normalize();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionPreference = () => { setReduceMotion(reducedMotion.matches); dirty = true; };
    onMotionPreference();
    reducedMotion.addEventListener('change', onMotionPreference);
    const roofState = new Map<RoofMesh, {y: number; opacity: number}>();
    roofs.forEach(roof => roofState.set(roof, {y: roof.position.y, opacity: 1}));

    function fitOverview(animate: boolean) {
      selected = stageRef.current;
      target.set(0, 0, 0);
      const bounds = overviewBounds;
      const size = bounds.getSize(new THREE.Vector3());
      // The campus has its water allowance and approach yard at the near edge.
      // Bias the view toward the near edge to keep both in frame at desktop
      // viewport sizes after fitting the full plant bounds.
      target.y = bounds.min.y;
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
      // Keep the complete campus, fence, yard and near-side water allowance in
      // frame at both desktop sizes while using the lower façade-forward view.
      distance = Math.max(125, distance * .58);
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
        const selectedRoof = !overviewRef.current && openRoofRef.current && roof.userData.plantStage === stageRef.current;
        const baseY = roof.userData.roofBaseY ?? roof.position.y;
        const targetY = baseY + (selectedRoof ? 38 : 0);
        const targetOpacity = selectedRoof ? .16 : 1;
        const state = roofState.get(roof);
        if (state) { state.y = targetY; state.opacity = targetOpacity; }
        roof.visible = true;
      });
    }
    viewCommand.current = {frameStage, fitOverview, updateRoofTargets};
    let canvasWidth = 0, canvasHeight = 0;
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      // Evidence temporarily hides this same canvas. Returning at the same size
      // should preserve the presenter's orbit rather than reframe the stage.
      if (width === canvasWidth && height === canvasHeight) { dirty = true; return; }
      canvasWidth = width; canvasHeight = height;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      if (overviewRef.current) fitOverview(false); else frameStage(stageRef.current, false);
      dirty = true;
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const onChange = () => { dirty = true; };
    const onStart = () => { tween = false; userOrbit = true; window.dispatchEvent(new Event('tanga:manual-exploration')); };
    controls.addEventListener('change', onChange); controls.addEventListener('start', onStart);
    const onContextLost = (event: Event) => { event.preventDefault(); contextLost = true; element.dataset.ready = 'false'; setError('Graphics context lost. The 3D factory will rebuild when graphics recover.'); };
    const onContextRestored = () => { if (!contextLost) return; contextLost = false; setError('Graphics restored; rebuilding the factory…'); window.setTimeout(() => { if (!disposed) setRendererAttempt(value => value + 1); }, 0); };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);

    updateRoofTargets();
    if (overviewRef.current) fitOverview(false); else frameStage(stageRef.current, false);
    const draw = (now: number) => {
      if (disposed) return;
      const dt = Math.min(.08, Math.max(0, (now - last) / 1000)); last = now;
      if (!document.hidden && element.getClientRects().length) {
        const animateProcess = !pausedRef.current && !reducedMotion.matches;
        if (animateProcess) elapsed += dt;
        const activity=processMotion.update(dt, overviewRef.current?'overview':selected, animateProcess&&(overviewRef.current||openRoofRef.current));
        let roofMoving = false;
        roofs.forEach(roof => {
          const state = roofState.get(roof); if (!state) return;
          const positionDelta = state.y - roof.position.y;
          dirty ||= positionDelta !== 0;
          if (Math.abs(positionDelta) > .01) {
            roof.position.y = reducedMotion.matches ? state.y : roof.position.y + positionDelta * Math.min(1, dt * 5);
            roofMoving = true;
          } else roof.position.y = state.y;
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
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(entry => materials.add(entry)); } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(entry => entry.dispose());
      sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [rendererAttempt]);

  useEffect(() => {
    if (overview) viewCommand.current?.fitOverview(true);
    else viewCommand.current?.frameStage(stage, true);
  }, [overview, stage]);
  useEffect(() => { viewCommand.current?.updateRoofTargets(); }, [overview, stage, openRoof]);

  const selected = PROCESS.find(item => item.id === stage) ?? PROCESS[0];
  const result = MET_GROUPS[sample];
  // Keep the scene host mounted while reading evidence. Its render loop sleeps
  // when hidden, and the same renderer/camera resumes on return.
  return <>
    {showEvidence && <MetallurgyEvidenceBoard selected={sample} onSelect={setSample} onEquipment={() => setShowEvidence(false)} onBack={() => setShowEvidence(false)} />}
    <section className="tanga-process-exhibit tanga-process-exhibit--factory" aria-label="Conceptual graphite processing facility" data-inspection="factory" style={showEvidence ? {display: 'none'} : undefined}>
    <header className="tanga-factory-header">
      <div><small>PROCESSING CONCEPT · ILLUSTRATIVE 3D FACILITY</small><h2>One connected process. Five areas to inspect.</h2></div>
      <div className="tanga-process-actions">
        <button type="button" aria-label="Reset camera to whole-plant overview" title="Reset camera to whole-plant overview" onClick={() => { if (overviewRef.current) viewCommand.current?.fitOverview(true); setOverview(true); setOpenRoof(false); overviewRef.current = true; openRoofRef.current = false; window.dispatchEvent(new Event('tanga:manual-exploration')); }}>Whole plant</button>
        <button type="button" onClick={() => { setOverview(false); overviewRef.current = false; frameRoofToggle(); window.dispatchEvent(new Event('tanga:manual-exploration')); }}> {openRoof ? 'Close selected roof' : 'Open selected roof'}</button>
        <button type="button" onClick={onToggle} aria-pressed={paused || reduceMotion} disabled={reduceMotion} title={reduceMotion ? 'Reduced motion is enabled in your device settings' : undefined}>{reduceMotion ? 'Motion reduced' : paused ? 'Play process motion' : 'Pause process motion'}</button>
        <button type="button" onClick={() => setShowEvidence(true)}>Lab results ↗</button>
      </div>
    </header>
    <nav className="tanga-process-stages tanga-factory-stages" aria-label="Processing facility areas">
      {PROCESS.map((item, index) => <button type="button" key={item.id} aria-pressed={!overview && stage === item.id} onClick={() => { setStage(item.id); setOverview(false); setOpenRoof(true); stageRef.current = item.id; overviewRef.current = false; openRoofRef.current = true; window.dispatchEvent(new Event('tanga:manual-exploration')); }}><b>0{index + 1}</b><span>{item.title}</span></button>)}
    </nav>
    <div className="tanga-factory-body">
      <div className="tanga-process-scene tanga-factory-scene"><div ref={host} className="tanga-process-canvas" data-stage={stage} />
        {error && <div className="tanga-factory-error" role="alert"><strong>3D view unavailable</strong><span>{error}</span><div><button type="button" onClick={() => { setError(''); setRendererAttempt(value => value + 1); }}>Retry factory view</button><button type="button" onClick={() => setShowEvidence(true)}>Open laboratory evidence</button></div></div>}
        <div className="tanga-process-caption"><span>{overview ? 'Facility overview · connected campus and process route' : `${selected.title} · ${openRoof ? 'roof cutaway' : 'selected area'}`}</span><small>Drag to orbit · scroll to zoom · Whole plant restores overview</small></div>
      </div>
      <aside className="tanga-factory-inspector" aria-live="polite">
        <small className="tanga-process-kicker">{overview ? 'FACILITY OVERVIEW' : `AREA ${String(PROCESS.findIndex(item => item.id === stage) + 1).padStart(2, '0')} / 05`}</small>
        <h3>{overview ? 'A single connected campus' : selected.title}</h3>
        <p className="tanga-process-explanation">{overview ? 'Follow the conceptual route from feed receiving through preparation, flotation, dewatering and product handling. The layout and equipment are illustrative.' : selected.description}</p>
        {!overview && <dl className="tanga-factory-flow"><div><dt>Input</dt><dd>{selected.input}</dd></div><div><dt>Output</dt><dd>{selected.output}</dd></div></dl>}
        {!overview&&<><p className="tanga-factory-motion-note">{selected.motion}</p><details className="tanga-factory-operation-basis"><summary>Operation &amp; source basis</summary><p>{selected.basis}</p>{selected.id!=='product'&&<a href={IMO_PROCESS_REPORT} target="_blank" rel="noreferrer">IMO report · Appendix D ↗</a>}</details></>}
        {!overview && selected.id==='flotation' && <button className="tanga-factory-result" type="button" onClick={() => setShowEvidence(true)} title="Open the full laboratory results board"><span>IMO LAB · {result.id}</span><strong>{result.carbon}</strong><small>{result.recovery} recovery · {result.coarse} above 150 µm</small></button>}
        {!overview && selected.id!=='flotation' && <button className="tanga-factory-result" type="button" onClick={() => setShowEvidence(true)}><span>LABORATORY EVIDENCE</span><i>Compare all eight test composites ↗</i></button>}
        {overview && <button className="tanga-factory-result" type="button" onClick={() => setShowEvidence(true)}><span>LABORATORY EVIDENCE</span><strong>8 composites</strong><small>Separate measures for TC, recovery and coarse mass fraction.</small><i>Open comparison board ↗</i></button>}
        <small className="tanga-factory-disclosure">Concept layout only · no approved location, flowsheet or residue design.</small>
      </aside>
    </div>
    <footer className="tanga-factory-footer"><span><i aria-hidden="true"/> Illustrative process motion</span><span>Speeds and particle counts are display cues · laboratory results remain separate from plant performance</span></footer>
  </section></>;

  function frameRoofToggle() {
    setOpenRoof(value => { const next = !value; openRoofRef.current = next; return next; });
    setOverview(false); overviewRef.current = false;
  }
}
