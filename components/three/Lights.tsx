"use client";

/**
 * Minimal lighting rig for the MorphCore. The core's body is a fresnel
 * emissive shader, so it lights itself — these lights only add a soft
 * tri-tone neon wash and gentle ambient fill. Kept to four lights total
 * to stay well inside the WebGL uniform budget.
 */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#9fc5ff", "#1a1024", 0.5]} />
      <pointLight position={[-4, 2, 3]} color="#4f9cff" intensity={1.4} distance={12} decay={2} />
      <pointLight position={[4, -1, -3]} color="#9b5cff" intensity={1.4} distance={12} decay={2} />
    </>
  );
}

export default Lights;
