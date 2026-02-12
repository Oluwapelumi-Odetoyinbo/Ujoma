
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  mousePos: { x: number; y: number };
  phase: string;
}

const ThreeBackground: React.FC<Props> = ({ mousePos, phase }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    stars: THREE.Points;
    embers: THREE.Points;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 2000;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Embers (Spirit particles)
    const emberGeometry = new THREE.BufferGeometry();
    const emberCount = 200;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberVelocities = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount * 3; i++) {
      emberPositions[i] = (Math.random() - 0.5) * 1000;
      emberVelocities[i] = (Math.random() - 0.5) * 0.2;
    }
    emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberMaterial = new THREE.PointsMaterial({
      color: 0xf59e0b, // amber-500
      size: 2,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const embers = new THREE.Points(emberGeometry, emberMaterial);
    scene.add(embers);

    sceneRef.current = { scene, camera, renderer, stars, embers };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      const { stars, embers, camera, renderer, scene } = sceneRef.current;

      // Subtle rotation
      stars.rotation.y += 0.0002;
      embers.rotation.y += 0.0005;

      // Mouse Parallax
      camera.position.x += (mousePos.x * 50 - camera.position.x) * 0.05;
      camera.position.y += (-mousePos.y * 50 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      // Spirit drift
      const positions = embers.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < emberCount; i++) {
        const idx = i * 3;
        positions[idx] += emberVelocities[idx];
        positions[idx + 1] += emberVelocities[idx + 1];
        positions[idx + 2] += emberVelocities[idx + 2];

        // Bounds check
        if (Math.abs(positions[idx]) > 500) positions[idx] *= -0.9;
        if (Math.abs(positions[idx + 1]) > 500) positions[idx + 1] *= -0.9;
      }
      embers.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Update logic for phase changes
  useEffect(() => {
    if (sceneRef.current) {
      const { embers } = sceneRef.current;
      const targetOpacity = phase === 'intro' ? 0.4 : 0.15;
      // @ts-ignore
      embers.material.opacity = targetOpacity;
    }
  }, [phase]);

  return <div id="three-canvas-container" ref={containerRef} />;
};

export default ThreeBackground;
