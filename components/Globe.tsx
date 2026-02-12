
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GlobeProps } from '../types';

interface ExtendedGlobeProps extends GlobeProps {
  isRevealing?: boolean;
}

const Globe: React.FC<ExtendedGlobeProps> = ({ targetCoordinates, isCinematicMode, isRevealing }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [telemetry, setTelemetry] = useState({ lat: 0, lon: 0, alt: 12000 });
  
  // Interaction Refs
  const isDragging = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });
  const dragInertia = useRef({ x: 0, y: 0 });
  const manualOverride = useRef(false);

  const globeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    earth: THREE.Mesh;
    clouds: THREE.Mesh;
    group: THREE.Group;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 10000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    const normalTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
    const specularTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
    const cloudTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');

    // 1. Earth Body
    const earthGeometry = new THREE.SphereGeometry(200, 128, 128);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.8, 0.8),
      specularMap: specularTexture,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    group.add(earth);

    // 2. Cloud Layer
    const cloudGeometry = new THREE.SphereGeometry(202, 128, 128);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    group.add(clouds);

    // 3. Atmospheric Scattering Shader
    const atmoGeometry = new THREE.SphereGeometry(220, 128, 128);
    const atmoMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
          vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
          gl_FragColor = vec4(atmosphereColor, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmoGeometry, atmoMaterial);
    scene.add(atmosphere);

    // Lights
    scene.add(new THREE.AmbientLight(0x111122, 0.5));
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(1000, 500, 1000);
    scene.add(sunLight);

    camera.position.z = isRevealing ? 2000 : 1000;
    globeRef.current = { scene, camera, renderer, earth, clouds, group };

    const animate = () => {
      if (!globeRef.current) return;
      const { renderer, scene, camera, clouds, group } = globeRef.current;

      // Interaction Logic
      if (!isDragging.current) {
        // Natural Drift or Cinematic Tracking
        if (!manualOverride.current && !targetCoordinates) {
          targetRotation.current.y += 0.0005;
        }
        
        // Apply Inertia Decay
        dragInertia.current.x *= 0.95;
        dragInertia.current.y *= 0.95;
        targetRotation.current.x += dragInertia.current.x;
        targetRotation.current.y += dragInertia.current.y;
      }

      // Smooth Rotation Interpolation
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.1;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.1;

      group.rotation.x = currentRotation.current.x;
      group.rotation.y = currentRotation.current.y;
      
      clouds.rotation.y += 0.0007;

      // Telemetry update
      const lon = (group.rotation.y * (180/Math.PI)) % 360;
      const lat = (group.rotation.x * (180/Math.PI)) % 180;
      setTelemetry({
        lon: Number(lon.toFixed(4)),
        lat: Number(lat.toFixed(4)),
        alt: Math.round(camera.position.z * 15.5)
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    const animReq = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animReq);
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Coordinate transitions
  useEffect(() => {
    if (!globeRef.current || isDragging.current) return;
    
    if (targetCoordinates) {
      manualOverride.current = false; // Reset override when a new target is explicitly set
      const [targetLon, targetLat] = targetCoordinates;
      targetRotation.current.y = THREE.MathUtils.degToRad(targetLon + 90);
      targetRotation.current.x = THREE.MathUtils.degToRad(targetLat);
    }
  }, [targetCoordinates]);

  // Camera Zoom Transition
  useEffect(() => {
    if (!globeRef.current) return;
    const { camera } = globeRef.current;

    const targetZ = isCinematicMode ? 260 : (isRevealing ? 1000 : 800);
    const duration = isRevealing ? 4000 : 2500;
    const startTime = performance.now();
    const startZ = camera.position.z;

    const animateZoom = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      camera.position.z = startZ + (targetZ - startZ) * ease;
      if (progress < 1) requestAnimationFrame(animateZoom);
    };
    requestAnimationFrame(animateZoom);
  }, [isCinematicMode, isRevealing]);

  // Handlers for manual rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    manualOverride.current = true;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    dragInertia.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastPointerPos.current.x;
    const deltaY = e.clientY - lastPointerPos.current.y;

    // Map pixel movement to rotation radians
    const rotSpeed = 0.005;
    const dx = deltaY * rotSpeed;
    const dy = deltaX * rotSpeed;

    targetRotation.current.x += dx;
    targetRotation.current.y += dy;

    // Clamp X rotation to prevent flipping over poles
    targetRotation.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotation.current.x));

    dragInertia.current = { x: dx, y: dy };
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div 
      ref={containerRef} 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`w-full h-full relative bg-transparent group touch-none ${isDragging.current ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* Studio HUD Overlay - Pass-through pointer events to allow globe drag */}
      <div className="absolute inset-0 pointer-events-none z-20 font-mono text-[10px] text-white/40 p-12">
        <div className="flex justify-between h-full border border-white/5 p-4 rounded-sm">
          {/* Left HUD */}
          <div className="flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-white/20 uppercase tracking-widest mb-2">Satellite Status</div>
              <div>SIGNAL: <span className="text-amber-500/80">ENCRYPTED</span></div>
              <div>BANDWIDTH: <span className="text-white/60">8.4 GBPS</span></div>
              <div>FOCAL: <span className="text-white/60">35.00 MM</span></div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <span className="text-[9px] text-white/10 uppercase">Interaction Mode</span>
                <div className={manualOverride.current ? 'text-amber-500/60' : 'text-white/30'}>
                    {manualOverride.current ? 'MANUAL_OVERRIDE' : 'AUTO_TRACKING'}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div>LAT: <span className="text-white/80">{telemetry.lat}°</span></div>
              <div>LON: <span className="text-white/80">{telemetry.lon}°</span></div>
            </div>
          </div>

          {/* Center Target Reticle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
             <div className="w-32 h-32 border border-white/20 rounded-full flex items-center justify-center">
                <div className="w-1 h-px bg-white"></div>
                <div className="h-1 w-px bg-white absolute"></div>
             </div>
          </div>

          {/* Right HUD */}
          <div className="flex flex-col justify-between items-end">
            <div className="text-right space-y-1">
              <div className="text-white/20 uppercase tracking-widest mb-2">Orbital Telemetry</div>
              <div>ALTITUDE: <span className="text-white/80">{telemetry.alt.toLocaleString()} KM</span></div>
              <div>VELOCITY: <span className="text-white/80">7,244 M/S</span></div>
            </div>
            <div className="text-right">
              <div>RENDER ENGINE: <span className="text-white/60">VEO-3.1</span></div>
              <div>MISSION: <span className="text-amber-500/80">UMOJA_RETURN</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 cinematic-vignette pointer-events-none"></div>
    </div>
  );
};

export default Globe;
