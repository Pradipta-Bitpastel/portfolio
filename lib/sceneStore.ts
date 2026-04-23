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
     * Scroll-driven base position. SceneDock tweens THIS, not the
     * camera's real position — the CameraController composites
     * `basePos + parallax` every frame so scroll choreography and
     * mouse parallax + boundary nudge coexist.
     */
    basePos: new THREE.Vector3(0, 0, 8),
    /**
     * Additive offset driven by SectionOrchestrator's section-cross
     * cinematic beat (push-in + settle). Tweens independently of
     * scroll; gets added on top of `basePos`.
     */
    cinematicOffset: new THREE.Vector3(0, 0, 0),
    /**
     * Scroll-driven base FOV. SceneDock tweens this each segment;
     * CameraController composites it with `fovPulse` every frame.
     */
    baseFov: 45,
    /**
     * Additive FOV pulse. SectionOrchestrator tweens this on each
     * section cross for a quick "lens zoom" punch. baseFov + fovPulse
     * is what gets flushed to camera.fov each frame.
     */
    fovPulse: 0,
    /**
     * Retained for back-compat; no longer gates parallax. Parallax
     * now ALWAYS composites on top of the GSAP-driven base.
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
