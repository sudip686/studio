'use client';

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

const stops = [
  {label: 'Diamond drilling', detail: 'Evidence beneath the surface', href: '?v=1&view=intercepts#drillholes'},
  {label: 'Resource model', detail: 'How the graphite was modelled', href: '?v=1&view=resource#resource'},
  {label: 'Flotation testwork', detail: 'Separating graphite from waste', href: '?v=1&view=samples#metallurgy'},
  {label: 'Conceptual mine plan', detail: 'Two pits in the proposed site layout', href: '?v=1&view=pit-blocks#mine_planning'},
];

export default function TangaClosingFlythrough({onClose}: {onClose: () => void}) {
  const surface = useRef<HTMLDivElement>(null);
  const progressLine = useRef<HTMLSpanElement>(null);
  const finish = useRef(onClose);
  const [active, setActive] = useState(0);
  const [flying, setFlying] = useState(false);
  const [closing, setClosing] = useState(false);
  finish.current = onClose;

  useEffect(() => {
    const mount = surface.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mount || motion.matches) return;
    let disposed = false;
    let frame = 0;
    let teardown: (() => void) | undefined;
    const stopRendering = () => {
      cancelAnimationFrame(frame);
      const release = teardown;
      teardown = undefined;
      release?.();
    };
    const showEvidenceLinks = () => {
      stopRendering();
      mount.style.opacity = '';
      if (!disposed) setFlying(false);
    };

    void import('three').then(T => {
      if (disposed || motion.matches) return;
      const renderer = new T.WebGLRenderer({antialias: true, alpha: true});
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(39, 1, .1, 110);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x07121f, 0);
      scene.fog = new T.FogExp2(0x07121f, .024);
      scene.add(new T.HemisphereLight(0xb5faff, 0x243555, 2.4));
      const key = new T.DirectionalLight(0xffdeb9, 3);
      key.position.set(-4, 9, 6);
      scene.add(key);

      const positions = [[-15, 0, 1], [-5, 0, -2], [5, 0, 1], [15, 0, -2]];
      const rail = new T.CatmullRomCurve3(positions.map(([x, y, z]) => new T.Vector3(x, y, z)));
      const cyan = new T.MeshStandardMaterial({color: 0x80e0dc, metalness: .55, roughness: .32, emissive: 0x15695d});
      const amber = new T.MeshStandardMaterial({color: 0xf4b775, metalness: .45, roughness: .42});
      const base = new T.MeshStandardMaterial({color: 0x143040, metalness: .55, roughness: .48});
      const rock = new T.MeshStandardMaterial({color: 0x947665, roughness: .88, side: T.DoubleSide});
      const pitSurface = new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: .89, side: T.DoubleSide});
      const benchEdge = new T.LineBasicMaterial({color: 0xcab389, transparent: true, opacity: .66});
      const benchEdges: InstanceType<typeof T.LineLoop>['geometry'][] = [];
      const glass = new T.MeshStandardMaterial({color: 0x79c9cd, roughness: .22, transparent: true, opacity: .28, depthWrite: false, side: T.DoubleSide, forceSinglePass: true});
      const froth = new T.MeshBasicMaterial({color: 0xc2fff0});
      const ribbon = new T.MeshBasicMaterial({color: 0x66e5dd});
      const beaconMaterial = new T.MeshStandardMaterial({color: 0x92fff0, emissive: 0x1b8e82, emissiveIntensity: 1.8, metalness: .28, roughness: .22});
      const orbitMaterial = new T.MeshBasicMaterial({color: 0x71e4d7, transparent: true, opacity: .72});
      const orbitAccent = new T.MeshBasicMaterial({color: 0xf4b775, transparent: true, opacity: .86});
      const grid = new T.GridHelper(54, 36, 0x1b3d48, 0x18303e);
      grid.position.y = -.12;
      scene.add(grid);
      scene.add(new T.Mesh(new T.TubeGeometry(rail, 96, .042, 6), ribbon));
      const closingBeacon = new T.Group();
      closingBeacon.position.set(0, 0, -.5);
      closingBeacon.visible = false;
      const beacon = new T.Mesh(new T.IcosahedronGeometry(.86, 1), beaconMaterial);
      beacon.position.y = 1.55;
      closingBeacon.add(beacon);
      const orbit = new T.Mesh(new T.TorusGeometry(4.65, .035, 6, 96), orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      orbit.position.y = 1.55;
      closingBeacon.add(orbit);
      const orbit2 = new T.Mesh(new T.TorusGeometry(6.05, .018, 5, 96), orbitAccent);
      orbit2.rotation.set(Math.PI / 2 + .23, 0, .2);
      orbit2.position.y = 1.55;
      closingBeacon.add(orbit2);
      const flakes = new T.InstancedMesh(new T.CylinderGeometry(.29, .29, .11, 6), orbitAccent, 8);
      const flakeTransform = new T.Matrix4();
      for (let i = 0; i < flakes.count; i++) {
        const angle = i * Math.PI / 4;
        flakes.setMatrixAt(i, flakeTransform.makeTranslation(Math.cos(angle) * 5.35, 1.55, Math.sin(angle) * 5.35));
        flakes.setColorAt(i, new T.Color(i % 2 ? 0x8cefe0 : 0xf4b775));
      }
      closingBeacon.add(flakes);
      const titleCanvas = document.createElement('canvas');
      titleCanvas.width = 1200;
      titleCanvas.height = 260;
      const titleContext = titleCanvas.getContext('2d');
      let titleTexture: InstanceType<typeof T.CanvasTexture> | undefined;
      let titleMaterial: InstanceType<typeof T.SpriteMaterial> | undefined;
      let titleFlakes: InstanceType<typeof T.InstancedMesh> | undefined;
      let titleFlakeMaterial: InstanceType<typeof T.MeshStandardMaterial> | undefined;
      const titleFlakeStarts: InstanceType<typeof T.Vector3>[] = [];
      const titleFlakeTargets: InstanceType<typeof T.Vector3>[] = [];
      if (titleContext) {
        titleContext.textAlign = 'center';
        titleContext.textBaseline = 'middle';
        titleContext.shadowColor = '#65fff0';
        titleContext.shadowBlur = 36;
        titleContext.fillStyle = '#ffffff';
        titleContext.font = '700 118px system-ui, sans-serif';
        titleContext.fillText('TANGA GRAPHITE', 600, 113);
        titleContext.shadowBlur = 0;
        titleContext.fillStyle = '#f4b775';
        titleContext.font = '600 30px system-ui, sans-serif';
        titleContext.letterSpacing = '8px';
        titleContext.fillText('EVIDENCE  ·  RESOURCE  ·  NEXT DECISIONS', 600, 218);
        titleTexture = new T.CanvasTexture(titleCanvas);
        titleTexture.colorSpace = T.SRGBColorSpace;
        titleTexture.generateMipmaps = false;
        titleMaterial = new T.SpriteMaterial({map: titleTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false});
        const title = new T.Sprite(titleMaterial);
        title.position.set(0, 5.2, 0);
        title.scale.set(18.5, 3.55, 1);
        closingBeacon.add(title);

        // Sample the existing wordmark into a deterministic hex-particle reveal.
        const pixels = titleContext.getImageData(0, 48, titleCanvas.width, 128).data;
        for (let y = 0; y < 128; y += 9) {
          for (let x = 0; x < titleCanvas.width; x += 9) {
            if (pixels[(y * titleCanvas.width + x) * 4 + 3] < 110) continue;
            titleFlakeTargets.push(new T.Vector3((x / titleCanvas.width - .5) * 18.5, 5.2 + (.5 - (y + 48) / titleCanvas.height) * 3.55, .08));
          }
        }
        titleFlakeMaterial = new T.MeshStandardMaterial({color: 0xb8fff2, emissive: 0x31a897, emissiveIntensity: 1.45, metalness: .18, roughness: .34, transparent: true, opacity: .92, depthWrite: false});
        titleFlakes = new T.InstancedMesh(new T.CylinderGeometry(.055, .055, .052, 6), titleFlakeMaterial, titleFlakeTargets.length);
        titleFlakes.instanceMatrix.setUsage(T.DynamicDrawUsage);
        const initial = new T.Vector3();
        for (let i = 0; i < titleFlakeTargets.length; i++) {
          const angle = i * 2.399963229728653;
          const radius = 7.1 + (i % 11) * .19;
          initial.set(Math.cos(angle) * radius, 4.8 + Math.sin(i * 1.71) * 3.2, Math.sin(angle) * radius);
          titleFlakeStarts.push(initial.clone());
          titleFlakes.setColorAt(i, new T.Color(i % 7 === 0 ? 0xf4b775 : 0x9af8e8));
        }
        closingBeacon.add(titleFlakes);
      }
      scene.add(closingBeacon);
      const stationLights: InstanceType<typeof T.MeshBasicMaterial>[] = [];
      const stationGroups: InstanceType<typeof T.Group>[] = [];
      const hitTargets: InstanceType<typeof T.Mesh>[] = [];
      let bubbles: InstanceType<typeof T.InstancedMesh> | undefined;
      const bubbleTransform = new T.Matrix4();
      type MeshGeometry = InstanceType<typeof T.Mesh>['geometry'];
      const add = (group: InstanceType<typeof T.Group>, geometry: MeshGeometry, material: InstanceType<typeof T.Material>, x: number, y: number, z: number) => {
        const mesh = new T.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        group.add(mesh);
        mesh.userData.stop = group.userData.stop;
        hitTargets.push(mesh);
        return mesh;
      };
      positions.forEach(([x, y, z], index) => {
        const station = new T.Group();
        station.userData.stop = index;
        station.position.set(x, y, z);
        scene.add(station);
        stationGroups.push(station);
        add(station, new T.CylinderGeometry(2.15, 2.3, .34, 6), base, 0, .24, 0);
        const light = new T.MeshBasicMaterial({color: 0x285360});
        stationLights.push(light);
        add(station, new T.TorusGeometry(2.05, .033, 5, 48), light, 0, .45, 0).rotation.x = -Math.PI / 2;
        if (index === 0) {
          add(station, new T.BoxGeometry(2.55, .2, 2.28), rock, 0, 1.84, 0);
          for (let i = 0; i < 9; i++) {
            const collarX = (i % 3 - 1) * .71;
            const north = (Math.floor(i / 3) - 1) * .65;
            const depth = 1.02 + i % 3 * .23;
            add(station, new T.CylinderGeometry(.045, .045, depth, 6), i % 4 === 0 ? amber : cyan, collarX - Math.sin(.37) * depth / 2, 1.86 - Math.cos(.37) * depth / 2, north).rotation.z = -.37;
            add(station, new T.CylinderGeometry(.095, .095, .085, 8), amber, collarX, 1.96, north);
          }
        } else if (index === 1) {
          const cells = new T.BoxGeometry(.38, .3, .36);
          const mesh = new T.InstancedMesh(cells, cyan, 28);
          const transform = new T.Matrix4();
          for (let i = 0; i < 28; i++) {
            mesh.setMatrixAt(i, transform.makeTranslation(i % 7 * .42 - 1.25, .76 + i % 7 * .19 + Math.floor(i / 14) * .33, Math.floor(i / 7) % 2 * .47 - .23));
            mesh.setColorAt(i, new T.Color(i % 5 === 0 ? 0xc3fff2 : 0x83aebd));
          }
          station.add(mesh);
          mesh.userData.stop = index;
          hitTargets.push(mesh);
        } else if (index === 2) {
          for (const offset of [-.85, .85]) {
            add(station, new T.CylinderGeometry(.66, .58, 1.05, 24, 1, true), glass, offset, .98, 0);
            add(station, new T.CylinderGeometry(.6, .6, .32, 24), cyan, offset, .64, 0);
            add(station, new T.TorusGeometry(.66, .042, 6, 24), amber, offset, 1.5, 0).rotation.x = -Math.PI / 2;
            add(station, new T.CylinderGeometry(.065, .065, 1.48, 8), base, offset, 1.34, 0);
          }
          bubbles = new T.InstancedMesh(new T.IcosahedronGeometry(.044, 0), froth, 32);
          bubbles.frustumCulled = false;
          bubbles.instanceMatrix.setUsage(T.DynamicDrawUsage);
          station.add(bubbles);
          add(station, new T.BoxGeometry(2.45, .14, .2), amber, 0, 1.98, 0);
        } else {
          const benchProfile = [[0, 0], [.27, 0], [.36, .15], [.49, .15], [.58, .3], [.7, .3], [.78, .45], [.9, .45]];
          const profile = benchProfile.map(([radius, height]) => new T.Vector2(radius, height));
          const shell = new T.LatheGeometry(profile, 24);
          const pitVertices = shell.getAttribute('position');
          const colors = new Float32Array(pitVertices.count * 3);
          const pitFloor = new T.Color(0x303c41);
          const pitRim = new T.Color(0x9e845c);
          for (let i = 0; i < pitVertices.count; i++) {
            pitFloor.clone().lerp(pitRim, pitVertices.getY(i) / .45).toArray(colors, i * 3);
          }
          shell.setAttribute('color', new T.BufferAttribute(colors, 3));
          for (const [radius, height] of [[.49, .15], [.7, .3], [.9, .45]]) {
            const points = Array.from({length: 24}, (_, i) => {
              const angle = i * 2 * Math.PI / 24;
              return new T.Vector3(radius * Math.sin(angle), height + .008, radius * Math.cos(angle));
            });
            benchEdges.push(new T.BufferGeometry().setFromPoints(points));
          }
          for (const offset of [-.96, .96]) {
            const pit = add(station, shell, pitSurface, offset, .46, 0);
            pit.scale.z = 1.35;
            benchEdges.forEach(edge => pit.add(new T.LineLoop(edge, benchEdge)));
            add(station, new T.BoxGeometry(.18, .08, .22), cyan, offset, .51, 0);
          }
        }
      });

      const resize = () => {
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      const ray = new T.Raycaster();
      const cursor = new T.Vector2();
      let pointerStartedOnCanvas = false;
      const beginSelection = () => { pointerStartedOnCanvas = true; };
      const selectStation = (event: MouseEvent) => {
        if (!pointerStartedOnCanvas) return;
        pointerStartedOnCanvas = false;
        const bounds = renderer.domElement.getBoundingClientRect();
        cursor.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
        ray.setFromCamera(cursor, camera);
        const stop = ray.intersectObjects(hitTargets, false)[0]?.object.userData.stop;
        if (typeof stop === 'number') window.location.assign(stops[stop].href);
      };
      let previousFrame: number | null = null;
      const updateVisibility = () => {
        cancelAnimationFrame(frame);
        previousFrame = null;
        if (!document.hidden) frame = requestAnimationFrame(render);
      };
      const onMotionChange = () => { if (motion.matches) showEvidenceLinks(); };
      teardown = () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', updateVisibility);
        motion.removeEventListener('change', onMotionChange);
        renderer.domElement.removeEventListener('webglcontextlost', showEvidenceLinks);
        renderer.domElement.removeEventListener('pointerdown', beginSelection);
        renderer.domElement.removeEventListener('click', selectStation);
        const geometries = new Set<MeshGeometry>();
        scene.traverse(object => {
          if (object instanceof T.Mesh) geometries.add(object.geometry);
          if (object instanceof T.InstancedMesh) object.dispose();
        });
        geometries.forEach(geometry => geometry.dispose());
        benchEdges.forEach(geometry => geometry.dispose());
        [cyan, amber, base, rock, pitSurface, benchEdge, glass, froth, ribbon, beaconMaterial, orbitMaterial, orbitAccent, titleMaterial, titleFlakeMaterial, ...stationLights].forEach(material => material?.dispose());
        titleTexture?.dispose();
        grid.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      mount.append(renderer.domElement);
      renderer.domElement.addEventListener('pointerdown', beginSelection);
      renderer.domElement.addEventListener('click', selectStation);
      renderer.domElement.addEventListener('webglcontextlost', showEvidenceLinks);
      observer.observe(mount);
      resize();
      let elapsed = 0;
      let selected = -1;
      let closingStarted = false;
      const titleFlakeTransform = new T.Matrix4();
      const titleFlakeRotation = new T.Quaternion();
      const titleFlakeScale = new T.Vector3();
      const titleFlakePosition = new T.Vector3();
      const titleFlakeAxis = new T.Vector3(0, 1, 0);
      setFlying(true);
      const render = (now: number) => {
        if (previousFrame !== null) elapsed += Math.max(0, now - previousFrame);
        previousFrame = now;
        const seconds = elapsed / 1000;
        if (seconds >= 15) { finish.current(); return; }
        progressLine.current?.style.setProperty('--recap-progress', `${Math.min(100, seconds / 15 * 100)}%`);
        const chapterDuration = 2.75;
        const chapterRun = chapterDuration * stops.length;
        const phase = Math.min(stops.length - 1, Math.floor(seconds / chapterDuration));
        if (bubbles) {
          for (let i = 0; i < bubbles.count; i++) {
            const angle = i * 2.4;
            const radius = .17 + (i % 5) * .072;
            const rise = (seconds * .72 + i * .173) % 1;
            bubbles.setMatrixAt(i, bubbleTransform.makeTranslation((i < 16 ? -.85 : .85) + Math.cos(angle) * radius, .83 + rise * .64, Math.sin(angle) * radius));
          }
          bubbles.instanceMatrix.needsUpdate = true;
        }
        if (phase !== selected) {
          selected = phase;
          setActive(phase);
          stationGroups.forEach((station, index) => { station.visible = index === phase; });
          stationLights.forEach((light, index) => light.color.setHex(index === phase ? 0x9effeb : 0x285360));
        }
        const target = rail.getPoint(phase / (stops.length - 1));
        if (seconds < chapterRun) {
          closingBeacon.visible = false;
          camera.position.set(target.x - 2 + Math.sin(seconds * .42) * .34, 3.4 + Math.sin(seconds * .31) * .08, target.z + 7.3 + Math.cos(seconds * .42) * .22);
          camera.lookAt(target.x, 1.32, target.z);
        } else {
          if (!closingStarted) { closingStarted = true; setClosing(true); }
          stationGroups.forEach(station => { station.visible = true; });
          closingBeacon.visible = true;
          const progress = T.MathUtils.clamp((seconds - chapterRun) / (15 - chapterRun), 0, 1);
          const pullback = T.MathUtils.smoothstep(progress, 0, .72);
          const orbitAngle = .32 + Math.max(0, progress - .55) * 1.25;
          const orbitPosition = new T.Vector3(Math.sin(orbitAngle) * 35, 17 + Math.sin(progress * Math.PI) * 2, Math.cos(orbitAngle) * 35);
          const last = rail.getPoint(1);
          const chapterCamera = new T.Vector3(last.x - 2, 3.4, last.z + 7.3);
          camera.position.copy(chapterCamera.lerp(orbitPosition, pullback));
          camera.lookAt(new T.Vector3(last.x, 1.32, last.z).lerp(new T.Vector3(0, 1.8, -.5), pullback));
          closingBeacon.rotation.y = seconds * .12;
          stationLights.forEach((light, index) => light.color.setHex(Math.sin(seconds * 1.8 - index * .72) > -.25 ? 0x86eee0 : 0x285360));
          beacon.scale.setScalar(1 + Math.sin(seconds * 2.4) * .07);
          beaconMaterial.emissiveIntensity = 1.45 + (Math.sin(seconds * 2.4) + 1) * .48;
          if (titleMaterial && titleFlakes && titleFlakeMaterial) {
            const assemble = T.MathUtils.smoothstep(progress, .05, .72);
            for (let i = 0; i < titleFlakes.count; i++) {
              titleFlakePosition.copy(titleFlakeStarts[i]).lerp(titleFlakeTargets[i], assemble);
              titleFlakeScale.setScalar(.72 + assemble * .28);
              titleFlakeRotation.setFromAxisAngle(titleFlakeAxis, (1 - assemble) * (i % 2 ? 1 : -1) * .65);
              titleFlakes.setMatrixAt(i, titleFlakeTransform.compose(titleFlakePosition, titleFlakeRotation, titleFlakeScale));
            }
            titleFlakes.instanceMatrix.needsUpdate = true;
            const titleReveal = T.MathUtils.smoothstep(progress, .52, .78);
            titleMaterial.opacity = titleReveal;
            titleFlakeMaterial.opacity = .94 - titleReveal * .24;
          }
        }
        mount.style.opacity = String(1 - T.MathUtils.smoothstep(seconds, 14.65, 15));
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      document.addEventListener('visibilitychange', updateVisibility);
      motion.addEventListener('change', onMotionChange);
      updateVisibility();
    }).catch(showEvidenceLinks);

    return () => {
      disposed = true;
      stopRendering();
    };
  }, []);

  return createPortal(<section id="tanga-closing-recap" className="tanga-recap" aria-label="3D project recap" onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
  }}>
    <div className="tanga-recap__canvas" ref={surface} aria-hidden="true"/>
    <div className="tanga-recap__frame" aria-hidden="true"><span/><span/><span/><span/></div>
    <button className="tanga-recap__close" type="button" onClick={onClose} autoFocus>Close recap</button>
    <header>
      <p className="tanga-recap__eyebrow"><span className="tanga-recap__beacon"/>Tanga Graphite <span> / </span> Project recap</p>
      <h2 id="tanga-recap-title" aria-live="polite">{closing ? 'Story in one view' : flying ? stops[active].label : 'Explore the project evidence'}</h2>
      <p className="tanga-recap__detail">{closing ? 'From drilling evidence to a conceptual site plan.' : flying ? stops[active].detail : 'Four connected views. Select any chapter to open its existing evidence view.'}</p>
      <span className="tanga-recap__concept">SCHEMATIC CHAPTER RECAP</span>
    </header>
    <div className="tanga-recap__readout" aria-hidden="true">
      <span>PROJECT STORY</span>
      <strong>{closing ? '04' : String(active + 1).padStart(2, '0')} <i>/</i> 04</strong>
      <small>{closing ? 'OVERVIEW' : 'CHAPTER'}</small>
    </div>
    <div className="tanga-recap__progress" aria-hidden="true"><span ref={progressLine}/></div>
    <nav aria-label="Recap chapters">
      {stops.map((stop, index) => <a key={stop.href} aria-current={flying && !closing && index === active ? 'step' : undefined} href={stop.href}>
        <span className="tanga-recap__step">0{index + 1}</span>
        <span className="tanga-recap__chapter"><strong>{stop.label}</strong><small>{stop.detail}</small></span>
        <span className="tanga-recap__arrow" aria-hidden="true">↗</span>
      </a>)}
    </nav>
  </section>, document.body);
}
