/**
 * GLSL for the Reactive Core.
 *
 * The vertex shader displaces an icosahedron along its normals using
 * 3D simplex noise (Ashima/Stefan Gustavson, public domain) so the
 * surface breathes and warps. Amplitude/frequency are uniforms damped
 * per-section by the render loop.
 *
 * The fragment shader is a fresnel rim-emissive: the silhouette glows
 * in the section accent color while the body stays dark, giving the
 * "energy core" read without any postprocessing.
 */

const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const CORE_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;

varying float vDisp;
varying vec3 vNormalW;
varying vec3 vViewDir;

${SIMPLEX_NOISE}

void main() {
  // Two octaves of noise for a richer, less uniform surface.
  float n1 = snoise(normal * uFreq + uTime * 0.25);
  float n2 = snoise(normal * uFreq * 2.3 - uTime * 0.18) * 0.5;
  float disp = (n1 + n2) * uAmp;
  vDisp = disp;

  vec3 displaced = position + normal * disp;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const CORE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;

varying float vDisp;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 2.6);

  // Dark body that lifts subtly where the surface bulges, plus a
  // controlled fresnel rim. Kept modest so Bloom doesn't blow out.
  vec3 body = uColor * (0.05 + max(vDisp, 0.0) * 0.5);
  vec3 rim  = uColor * fres * (0.7 + uGlow * 0.4);

  vec3 color = body + rim;

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Morph-core variants — identical lighting to CORE_/WIRE_ but with a
 * `uOpacity` uniform so two shapes can cross-fade as the scroll crosses
 * a section boundary (the centerpiece "changes models" on scroll).
 */
export const MORPH_SOLID_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
uniform float uOpacity;

varying float vDisp;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 2.6);
  vec3 body = uColor * (0.05 + max(vDisp, 0.0) * 0.5);
  vec3 rim  = uColor * fres * (0.7 + uGlow * 0.4);
  vec3 color = body + rim;
  gl_FragColor = vec4(color, uOpacity);
}
`;

export const MORPH_WIRE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
uniform float uOpacity;
varying float vDisp;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 1.8);
  float a = (0.10 + max(vDisp, 0.0) * 0.7 + fres * 0.3) * uOpacity;
  gl_FragColor = vec4(uColor * (0.55 + uGlow * 0.25), clamp(a, 0.0, 0.6));
}
`;

export const PARTICLE_VERTEX = /* glsl */ `
uniform float uSize;
uniform float uSpread;
attribute float aScale;
varying float vAlpha;

void main() {
  vec3 pos = position * uSpread;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  // Small, perspective-scaled points (a few px), not huge sprites.
  gl_PointSize = uSize * aScale * (22.0 / -mvPosition.z);
  vAlpha = aScale;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const PARTICLE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  // Round, soft points — kept dim so additive stacking + Bloom can't
  // wash the field out.
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.3;
  gl_FragColor = vec4(uColor, a);
}
`;
