import * as THREE from "three";

/**
 * Shared scene store. Plain singleton of mutable refs the R3F scene
 * populates during mount and GSAP timelines read during scrub.
 *
 * We keep this as a module-local plain object instead of zustand so
 * consumers outside React (e.g. GSAP ScrollTrigger callbacks) can
 * touch the live THREE objects without triggering re-renders.
 */
export const sceneStore = {
  core: {
    /**
     * DevStation root group. Historically typed as a Mesh when the
     * core was a primitive mesh; now a Group that can be position /
     * scale / rotation tweened by existing GSAP timelines. We keep a
     * loose union so legacy call-sites that accessed `.material` no
     * longer compile-crash without narrowing.
     */
    ref: null as THREE.Object3D | null,
    glow: null as THREE.PointLight | null,
  },
  modules: {
    frontend: { ref: null as THREE.Group | null, mesh: null as THREE.Mesh | null },
    backend:  { ref: null as THREE.Group | null, mesh: null as THREE.Mesh | null },
    devops:   { ref: null as THREE.Group | null, mesh: null as THREE.Mesh | null },
    cloud:    { ref: null as THREE.Group | null, mesh: null as THREE.Mesh | null },
    mobile:   { ref: null as THREE.Group | null, mesh: null as THREE.Mesh | null },
  },
  camera: {
    ref: null as THREE.PerspectiveCamera | null,
    target: new THREE.Vector3(0, 0, 0),
    /**
     * When a GSAP timeline is actively driving the camera, the
     * CameraController must NOT lerp toward the mouse-parallax
     * target. Toggle this flag from tween onStart/onComplete.
     */
    gsapControlled: false,
  },
  connections: {
    ref: null as THREE.Group | null,
  },
  timelineRing: {
    ref: null as THREE.Group | null,
  },
  /**
   * Chromatic-aberration pulse intensity. A single scalar in [0..1]
   * that the scene postprocessing reads each frame to drive section
   * transition flashes. SectionOrchestrator tweens this.
   */
  fx: {
    chromaticIntensity: 0,
  },
};

export type ModuleId = keyof typeof sceneStore.modules;
