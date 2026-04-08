import { useEffect, useRef } from "react";

const BASE_VERTEX = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;
const COPY_FRAG = `
  precision mediump float; precision mediump sampler2D;
  varying highp vec2 vUv; uniform sampler2D uTexture;
  void main () { gl_FragColor = texture2D(uTexture, vUv); }
`;
const CLEAR_FRAG = `
  precision mediump float; precision mediump sampler2D;
  varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
  void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
`;
const SPLAT_FRAG = `
  precision highp float; precision highp sampler2D;
  varying vec2 vUv; uniform sampler2D uTarget;
  uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
  void main () {
    vec2 p = vUv - point.xy; p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
  }
`;
const ADVECTION_FRAG = `
  precision highp float; precision highp sampler2D;
  varying vec2 vUv; uniform sampler2D uVelocity, uSource;
  uniform vec2 texelSize, dyeTexelSize; uniform float dt, dissipation;
  vec4 bilerp(sampler2D sam, vec2 uv, vec2 ts) {
    vec2 st = uv/ts - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);
    vec4 a=texture2D(sam,(iuv+vec2(.5,.5))*ts); vec4 b=texture2D(sam,(iuv+vec2(1.5,.5))*ts);
    vec4 c=texture2D(sam,(iuv+vec2(.5,1.5))*ts); vec4 d=texture2D(sam,(iuv+vec2(1.5,1.5))*ts);
    return mix(mix(a,b,fuv.x),mix(c,d,fuv.x),fuv.y);
  }
  void main () {
    #ifdef MANUAL_FILTERING
      vec2 coord = vUv - dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;
      vec4 result = bilerp(uSource,coord,dyeTexelSize);
    #else
      vec2 coord = vUv - dt*texture2D(uVelocity,vUv).xy*texelSize;
      vec4 result = texture2D(uSource,coord);
    #endif
    gl_FragColor = result / (1.0 + dissipation*dt);
  }
`;
const DIVERGENCE_FRAG = `
  precision mediump float; precision mediump sampler2D;
  varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
  void main () {
    float L=texture2D(uVelocity,vL).x, R=texture2D(uVelocity,vR).x;
    float T=texture2D(uVelocity,vT).y, B=texture2D(uVelocity,vB).y;
    vec2 C=texture2D(uVelocity,vUv).xy;
    if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y;
    gl_FragColor = vec4(0.5*(R-L+T-B), 0., 0., 1.);
  }
`;
const CURL_FRAG = `
  precision mediump float; precision mediump sampler2D;
  varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
  void main () {
    float L=texture2D(uVelocity,vL).y, R=texture2D(uVelocity,vR).y;
    float T=texture2D(uVelocity,vT).x, B=texture2D(uVelocity,vB).x;
    gl_FragColor = vec4(0.5*(R-L-T+B), 0., 0., 1.);
  }
`;
const VORTICITY_FRAG = `
  precision highp float; precision highp sampler2D;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
  void main () {
    float L=texture2D(uCurl,vL).x, R=texture2D(uCurl,vR).x;
    float T=texture2D(uCurl,vT).x, B=texture2D(uCurl,vB).x;
    float C=texture2D(uCurl,vUv).x;
    vec2 force = 0.5*vec2(abs(T)-abs(B), abs(R)-abs(L));
    force /= length(force)+.0001; force *= curl*C; force.y *= -1.;
    vec2 vel = texture2D(uVelocity,vUv).xy + force*dt;
    gl_FragColor = vec4(clamp(vel,-1000.,1000.), 0., 1.);
  }
`;
const PRESSURE_FRAG = `
  precision mediump float; precision mediump sampler2D;
  varying highp vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uPressure, uDivergence;
  void main () {
    float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x;
    float T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
    float div=texture2D(uDivergence,vUv).x;
    gl_FragColor = vec4((L+R+B+T-div)*0.25, 0., 0., 1.);
  }
`;
const GRADIENT_SUBTRACT_FRAG = `
  precision mediump float; precision mediump sampler2D;
  varying highp vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uPressure, uVelocity;
  void main () {
    float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x;
    float T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
    vec2 vel = texture2D(uVelocity,vUv).xy - vec2(R-L, T-B);
    gl_FragColor = vec4(vel, 0., 1.);
  }
`;

// ─── Ferrofluid display shader ───────────────────────────────
const DISPLAY_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv, vL, vR, vT, vB;
  uniform sampler2D uTexture;
  uniform vec2 texelSize;
  uniform float uTime;
  uniform vec3 uBg1, uBg2, uBg3, uBg4;
  uniform float uGradientSpeed, uGradientScale;
  uniform float uGrainIntensity, uGrainSpeed;
  uniform vec2 uResolution;

  // Ferrofluid params
  uniform float uFerroThreshold;
  uniform float uFerroEdge;
  uniform float uFerroDarkness;
  uniform float uFerroMetallic;
  uniform float uFerroSpecular;
  uniform float uFerroSpecPower;
  uniform float uFerroIridescence;
  uniform float uFerroRidgeSharp;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 iridescent(float angle, float intensity) {
    // Thin-film interference colors
    vec3 c;
    c.r = sin(angle * 2.0) * 0.5 + 0.5;
    c.g = sin(angle * 2.0 + 2.094) * 0.5 + 0.5;
    c.b = sin(angle * 2.0 + 4.189) * 0.5 + 0.5;
    return mix(vec3(1.0), c, intensity);
  }

  void main () {
    // Sample fluid
    vec3 c  = texture2D(uTexture, vUv).rgb;
    vec3 cL = texture2D(uTexture, vL).rgb;
    vec3 cR = texture2D(uTexture, vR).rgb;
    vec3 cT = texture2D(uTexture, vT).rgb;
    vec3 cB = texture2D(uTexture, vB).rgb;

    // Height field from fluid density
    float h  = length(c);
    float hL = length(cL);
    float hR = length(cR);
    float hT = length(cT);
    float hB = length(cB);

    // Ferrofluid mask — sharp blob edges
    float mask = smoothstep(uFerroThreshold - uFerroEdge, uFerroThreshold + uFerroEdge, h);

    // Surface normal from height differences
    float dx = (hR - hL) * uFerroRidgeSharp;
    float dy = (hT - hB) * uFerroRidgeSharp;
    vec3 normal = normalize(vec3(-dx, -dy, 0.15));

    // Lighting
    vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);

    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotH = max(dot(normal, halfDir), 0.0);

    // Diffuse — dark metallic base
    float diffuse = mix(0.3, 1.0, NdotL);
    vec3 baseColor = vec3(uFerroDarkness) * diffuse;

    // Metallic reflection — environment-like
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    float metalReflect = mix(0.1, 0.6, fresnel) * uFerroMetallic;

    // Specular highlight — wet glossy look
    float spec = pow(NdotH, uFerroSpecPower) * uFerroSpecular;

    // Iridescence from view angle
    float iridAngle = dot(normal, viewDir) * 3.14159 + uTime * 0.3;
    vec3 iridColor = iridescent(iridAngle, uFerroIridescence);

    // Ridge highlights — bright edges where height changes fast
    float ridge = length(vec2(dx, dy));
    float ridgeHighlight = smoothstep(0.1, 0.8, ridge) * 0.15;

    // Combine ferrofluid surface
    vec3 ferroColor = baseColor * iridColor;
    ferroColor += metalReflect * vec3(0.85, 0.88, 0.92); // cool metallic reflection
    ferroColor += spec * vec3(1.0);
    ferroColor += ridgeHighlight * vec3(0.9, 0.92, 0.95);

    // Shifting background gradient
    float t = uTime * uGradientSpeed;
    vec2 uv = vUv * uGradientScale;
    float angle2 = t * 0.5;
    vec2 dir = vec2(cos(angle2), sin(angle2));
    float grad1 = dot(uv - 0.5, dir) + 0.5;
    float grad2 = dot(uv - 0.5, vec2(-dir.y, dir.x)) + 0.5;
    vec3 bgA = mix(uBg1, uBg2, smoothstep(0.0, 1.0, grad1));
    vec3 bgB = mix(uBg3, uBg4, smoothstep(0.0, 1.0, grad2));
    vec3 bg = mix(bgA, bgB, sin(t * 0.3) * 0.5 + 0.5);
    bg += sin(uv.x * 3.14159 + t * 0.2) * cos(uv.y * 3.14159 + t * 0.15) * 0.04;

    // Shadow under the ferrofluid blobs
    float shadow = smoothstep(uFerroThreshold - uFerroEdge * 3.0, uFerroThreshold, h) * 0.12;
    bg -= shadow;

    // Composite: background -> ferrofluid
    vec3 final = mix(bg, ferroColor, mask);

    // Subtle colored reflection of fluid onto background near edges
    float glow = smoothstep(uFerroThreshold - uFerroEdge * 4.0, uFerroThreshold - uFerroEdge, h);
    final = mix(final, final + c * 0.3, glow * (1.0 - mask));

    // Film grain
    float grain = hash(vUv * uResolution + fract(uTime * uGrainSpeed) * 1000.0);
    final += (grain - 0.5) * uGrainIntensity;

    gl_FragColor = vec4(final, 1.0);
  }
`;

// ─── Helpers ─────────────────────────────────────────────────

function HSVtoRGB(h, s, v) {
  let r, g, b;
  const i = Math.floor(h * 6),
    f = h * 6 - i;
  const p = v * (1 - s),
    q = v * (1 - f * s),
    t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return { r, g, b };
}

function hexToGL(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

// ─── Component ───────────────────────────────────────────────

export default function FluidCanvas({ configRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cfg = configRef;

    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };
    let gl = canvas.getContext("webgl2", params);
    const isWebGL2 = !!gl;
    if (!isWebGL2)
      gl =
        canvas.getContext("webgl", params) ||
        canvas.getContext("experimental-webgl", params);
    if (!gl) return;

    let halfFloat, supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = gl.getExtension("OES_texture_half_float");
      supportLinearFiltering = gl.getExtension("OES_texture_half_float_linear");
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    const hfType = isWebGL2 ? gl.HALF_FLOAT : halfFloat?.HALF_FLOAT_OES;
    if (!hfType) return;

    function testFmt(iF, f, t) {
      const tx = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, iF, 4, 4, 0, f, t, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tx,
        0
      );
      const ok =
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.deleteTexture(tx);
      gl.deleteFramebuffer(fb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return ok;
    }
    function getFmt(iF, f, t) {
      if (!testFmt(iF, f, t)) {
        if (iF === gl.R16F) return getFmt(gl.RG16F, gl.RG, t);
        if (iF === gl.RG16F) return getFmt(gl.RGBA16F, gl.RGBA, t);
        return null;
      }
      return { internalFormat: iF, format: f };
    }

    let fRGBA, fRG, fR;
    if (isWebGL2) {
      fRGBA = getFmt(gl.RGBA16F, gl.RGBA, hfType);
      fRG = getFmt(gl.RG16F, gl.RG, hfType);
      fR = getFmt(gl.R16F, gl.RED, hfType);
    } else {
      fRGBA = getFmt(gl.RGBA, gl.RGBA, hfType);
      fRG = getFmt(gl.RGBA, gl.RGBA, hfType);
      fR = getFmt(gl.RGBA, gl.RGBA, hfType);
    }
    if (!fRGBA || !fRG || !fR) return;
    const linF = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    function cs(type, src, kw) {
      if (kw) src = kw.map((k) => `#define ${k}\n`).join("") + src;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(s));
      return s;
    }
    function cp(vs, fs) {
      const p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        console.error(gl.getProgramInfoLog(p));
      const u = {};
      const cnt = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < cnt; i++) {
        const n = gl.getActiveUniform(p, i).name;
        u[n] = gl.getUniformLocation(p, n);
      }
      return {
        program: p,
        uniforms: u,
        bind() {
          gl.useProgram(p);
        },
      };
    }

    const bVS = cs(gl.VERTEX_SHADER, BASE_VERTEX);
    const copyP = cp(bVS, cs(gl.FRAGMENT_SHADER, COPY_FRAG));
    const clearP = cp(bVS, cs(gl.FRAGMENT_SHADER, CLEAR_FRAG));
    const splatP = cp(bVS, cs(gl.FRAGMENT_SHADER, SPLAT_FRAG));
    const advP = cp(
      bVS,
      cs(
        gl.FRAGMENT_SHADER,
        ADVECTION_FRAG,
        supportLinearFiltering ? null : ["MANUAL_FILTERING"]
      )
    );
    const divP = cp(bVS, cs(gl.FRAGMENT_SHADER, DIVERGENCE_FRAG));
    const curlP = cp(bVS, cs(gl.FRAGMENT_SHADER, CURL_FRAG));
    const vortP = cp(bVS, cs(gl.FRAGMENT_SHADER, VORTICITY_FRAG));
    const pressP = cp(bVS, cs(gl.FRAGMENT_SHADER, PRESSURE_FRAG));
    const gradP = cp(bVS, cs(gl.FRAGMENT_SHADER, GRADIENT_SUBTRACT_FRAG));
    const dispP = cp(bVS, cs(gl.FRAGMENT_SHADER, DISPLAY_FRAG));

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function blit(t) {
      if (!t) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, t.width, t.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function makeFBO(w, h, iF, f, t, p) {
      gl.activeTexture(gl.TEXTURE0);
      const tx = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, p);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, p);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, iF, w, h, 0, f, t, null);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tx,
        0
      );
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture: tx,
        fbo: fb,
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        attach(id) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, tx);
          return id;
        },
      };
    }
    function makeDbl(w, h, iF, f, t, p) {
      let a = makeFBO(w, h, iF, f, t, p),
        b = makeFBO(w, h, iF, f, t, p);
      return {
        width: w,
        height: h,
        texelSizeX: a.texelSizeX,
        texelSizeY: a.texelSizeY,
        get read() {
          return a;
        },
        set read(v) {
          a = v;
        },
        get write() {
          return b;
        },
        set write(v) {
          b = v;
        },
        swap() {
          const t = a;
          a = b;
          b = t;
        },
      };
    }
    function resizeFBO(tgt, w, h, iF, f, t, p) {
      const n = makeFBO(w, h, iF, f, t, p);
      copyP.bind();
      gl.uniform1i(copyP.uniforms.uTexture, tgt.attach(0));
      blit(n);
      return n;
    }
    function resizeDbl(tgt, w, h, iF, f, t, p) {
      if (tgt.width === w && tgt.height === h) return tgt;
      tgt.read = resizeFBO(tgt.read, w, h, iF, f, t, p);
      tgt.write = makeFBO(w, h, iF, f, t, p);
      tgt.width = w;
      tgt.height = h;
      tgt.texelSizeX = 1 / w;
      tgt.texelSizeY = 1 / h;
      return tgt;
    }
    function getRes(r) {
      let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (ar < 1) ar = 1 / ar;
      const mn = Math.round(r),
        mx = Math.round(r * ar);
      return gl.drawingBufferWidth > gl.drawingBufferHeight
        ? { width: mx, height: mn }
        : { width: mn, height: mx };
    }

    let dye, vel, divFB, curlFB, pressFB;
    function initFBOs() {
      const c = cfg.current,
        sR = getRes(c.SIM_RESOLUTION),
        dR = getRes(c.DYE_RESOLUTION);
      gl.disable(gl.BLEND);
      dye = dye
        ? resizeDbl(
            dye,
            dR.width,
            dR.height,
            fRGBA.internalFormat,
            fRGBA.format,
            hfType,
            linF
          )
        : makeDbl(
            dR.width,
            dR.height,
            fRGBA.internalFormat,
            fRGBA.format,
            hfType,
            linF
          );
      vel = vel
        ? resizeDbl(
            vel,
            sR.width,
            sR.height,
            fRG.internalFormat,
            fRG.format,
            hfType,
            linF
          )
        : makeDbl(
            sR.width,
            sR.height,
            fRG.internalFormat,
            fRG.format,
            hfType,
            linF
          );
      divFB = makeFBO(
        sR.width,
        sR.height,
        fR.internalFormat,
        fR.format,
        hfType,
        gl.NEAREST
      );
      curlFB = makeFBO(
        sR.width,
        sR.height,
        fR.internalFormat,
        fR.format,
        hfType,
        gl.NEAREST
      );
      pressFB = makeDbl(
        sR.width,
        sR.height,
        fR.internalFormat,
        fR.format,
        hfType,
        gl.NEAREST
      );
    }
    function resizeCanvas() {
      const pr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * pr),
        h = Math.floor(canvas.clientHeight * pr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        return true;
      }
      return false;
    }

    const ptr = {
      x: 0.5,
      y: 0.5,
      px: 0.5,
      py: 0.5,
      moved: false,
      color: { r: 0, g: 0, b: 0 },
    };
    let hueBase = Math.random();
    function genColor(intensity) {
      const c = cfg.current,
        h = (((hueBase + (Math.random() - 0.5) * c.colorSpread) % 1) + 1) % 1;
      const col = HSVtoRGB(h, c.colorSaturation, c.colorValue),
        m = 0.15 * (intensity || 1);
      col.r *= m;
      col.g *= m;
      col.b *= m;
      return col;
    }
    function doSplat(x, y, dx, dy, color, radOvr) {
      const c = cfg.current;
      splatP.bind();
      gl.uniform1i(splatP.uniforms.uTarget, vel.read.attach(0));
      gl.uniform1f(splatP.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatP.uniforms.point, x, y);
      gl.uniform3f(splatP.uniforms.color, dx, dy, 0);
      let rad = (radOvr || c.SPLAT_RADIUS) / 100;
      if (canvas.width / canvas.height > 1) rad *= canvas.width / canvas.height;
      gl.uniform1f(splatP.uniforms.radius, rad);
      blit(vel.write);
      vel.swap();
      gl.uniform1i(splatP.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatP.uniforms.color, color.r, color.g, color.b);
      blit(dye.write);
      dye.swap();
    }

    function simStep(dt) {
      const c = cfg.current;
      gl.disable(gl.BLEND);
      curlP.bind();
      gl.uniform2f(curlP.uniforms.texelSize, vel.texelSizeX, vel.texelSizeY);
      gl.uniform1i(curlP.uniforms.uVelocity, vel.read.attach(0));
      blit(curlFB);
      vortP.bind();
      gl.uniform2f(vortP.uniforms.texelSize, vel.texelSizeX, vel.texelSizeY);
      gl.uniform1i(vortP.uniforms.uVelocity, vel.read.attach(0));
      gl.uniform1i(vortP.uniforms.uCurl, curlFB.attach(1));
      gl.uniform1f(vortP.uniforms.curl, c.CURL);
      gl.uniform1f(vortP.uniforms.dt, dt);
      blit(vel.write);
      vel.swap();
      divP.bind();
      gl.uniform2f(divP.uniforms.texelSize, vel.texelSizeX, vel.texelSizeY);
      gl.uniform1i(divP.uniforms.uVelocity, vel.read.attach(0));
      blit(divFB);
      clearP.bind();
      gl.uniform1i(clearP.uniforms.uTexture, pressFB.read.attach(0));
      gl.uniform1f(clearP.uniforms.value, c.PRESSURE);
      blit(pressFB.write);
      pressFB.swap();
      pressP.bind();
      gl.uniform2f(pressP.uniforms.texelSize, vel.texelSizeX, vel.texelSizeY);
      gl.uniform1i(pressP.uniforms.uDivergence, divFB.attach(0));
      for (let i = 0; i < c.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressP.uniforms.uPressure, pressFB.read.attach(1));
        blit(pressFB.write);
        pressFB.swap();
      }
      gradP.bind();
      gl.uniform2f(gradP.uniforms.texelSize, vel.texelSizeX, vel.texelSizeY);
      gl.uniform1i(gradP.uniforms.uPressure, pressFB.read.attach(0));
      gl.uniform1i(gradP.uniforms.uVelocity, vel.read.attach(1));
      blit(vel.write);
      vel.swap();
      advP.bind();
      gl.uniform2f(advP.uniforms.texelSize, vel.texelSizeX, vel.texelSizeY);
      if (!supportLinearFiltering)
        gl.uniform2f(
          advP.uniforms.dyeTexelSize,
          vel.texelSizeX,
          vel.texelSizeY
        );
      const vi = vel.read.attach(0);
      gl.uniform1i(advP.uniforms.uVelocity, vi);
      gl.uniform1i(advP.uniforms.uSource, vi);
      gl.uniform1f(advP.uniforms.dt, dt);
      gl.uniform1f(advP.uniforms.dissipation, c.VELOCITY_DISSIPATION);
      blit(vel.write);
      vel.swap();
      if (!supportLinearFiltering)
        gl.uniform2f(
          advP.uniforms.dyeTexelSize,
          dye.texelSizeX,
          dye.texelSizeY
        );
      gl.uniform1i(advP.uniforms.uVelocity, vel.read.attach(0));
      gl.uniform1i(advP.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(advP.uniforms.dissipation, c.DENSITY_DISSIPATION);
      blit(dye.write);
      dye.swap();
    }

    let globalTime = 0;
    function render(dt) {
      const c = cfg.current;
      globalTime += dt;
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      dispP.bind();
      const w = gl.drawingBufferWidth,
        h = gl.drawingBufferHeight;
      gl.uniform2f(dispP.uniforms.texelSize, 1 / w, 1 / h);
      gl.uniform1i(dispP.uniforms.uTexture, dye.read.attach(0));
      gl.uniform1f(dispP.uniforms.uTime, globalTime);
      gl.uniform2f(dispP.uniforms.uResolution, w, h);
      const b1 = hexToGL(c.bgColor1),
        b2 = hexToGL(c.bgColor2),
        b3 = hexToGL(c.bgColor3),
        b4 = hexToGL(c.bgColor4);
      gl.uniform3f(dispP.uniforms.uBg1, b1[0], b1[1], b1[2]);
      gl.uniform3f(dispP.uniforms.uBg2, b2[0], b2[1], b2[2]);
      gl.uniform3f(dispP.uniforms.uBg3, b3[0], b3[1], b3[2]);
      gl.uniform3f(dispP.uniforms.uBg4, b4[0], b4[1], b4[2]);
      gl.uniform1f(dispP.uniforms.uGradientSpeed, c.gradientSpeed);
      gl.uniform1f(dispP.uniforms.uGradientScale, c.gradientScale);
      gl.uniform1f(dispP.uniforms.uGrainIntensity, c.grainIntensity);
      gl.uniform1f(dispP.uniforms.uGrainSpeed, c.grainSpeed);
      // Ferrofluid uniforms
      gl.uniform1f(dispP.uniforms.uFerroThreshold, c.ferroThreshold);
      gl.uniform1f(dispP.uniforms.uFerroEdge, c.ferroEdge);
      gl.uniform1f(dispP.uniforms.uFerroDarkness, c.ferroDarkness);
      gl.uniform1f(dispP.uniforms.uFerroMetallic, c.ferroMetallic);
      gl.uniform1f(dispP.uniforms.uFerroSpecular, c.ferroSpecular);
      gl.uniform1f(dispP.uniforms.uFerroSpecPower, c.ferroSpecPower);
      gl.uniform1f(dispP.uniforms.uFerroIridescence, c.ferroIridescence);
      gl.uniform1f(dispP.uniforms.uFerroRidgeSharp, c.ferroRidgeSharp);
      blit(null);
    }

    // Continuous flow sources
    const SEEDS = Array.from({ length: 6 }, () => ({
      ax: 0.3 + Math.random() * 0.4,
      ay: 0.3 + Math.random() * 0.4,
      fx: 0.5 + Math.random() * 1.5,
      fy: 0.5 + Math.random() * 1.5,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
    }));

    function injectFlow(time, dt) {
      const c = cfg.current,
        count = Math.min(Math.round(c.flowComplexity), SEEDS.length);
      const spd = c.flowSpeed,
        force = c.flowForce * dt;
      for (let i = 0; i < count; i++) {
        const s = SEEDS[i],
          t = time * spd;
        const x = 0.5 + s.ax * Math.sin(t * s.fx + s.px),
          y = 0.5 + s.ay * Math.cos(t * s.fy + s.py);
        const vx = s.ax * s.fx * Math.cos(t * s.fx + s.px) * spd,
          vy = -s.ay * s.fy * Math.sin(t * s.fy + s.py) * spd;
        doSplat(
          Math.max(0.05, Math.min(0.95, x)),
          Math.max(0.05, Math.min(0.95, y)),
          vx * force,
          vy * force,
          genColor(c.flowColorIntensity),
          c.flowRadius
        );
      }
    }

    resizeCanvas();
    initFBOs();
    for (let i = 0; i < 12; i++) {
      const col = genColor(8);
      doSplat(
        Math.random(),
        Math.random(),
        600 * (Math.random() - 0.5),
        600 * (Math.random() - 0.5),
        col,
        0.8
      );
    }

    let lastT = Date.now(),
      colorTimer = 0,
      burstTimer = 0,
      raf;

    function loop() {
      raf = requestAnimationFrame(loop);
      const c = cfg.current,
        now = Date.now();
      let dt = (now - lastT) / 1e3;
      dt = Math.min(dt, 0.016666);
      lastT = now;
      if (resizeCanvas()) initFBOs();
      hueBase = (hueBase + c.colorCycleSpeed * dt * 0.1) % 1;
      colorTimer += dt * c.COLOR_UPDATE_SPEED;
      if (colorTimer >= 1) {
        colorTimer %= 1;
        ptr.color = genColor(1);
      }
      injectFlow(globalTime, dt);
      burstTimer += dt;
      if (burstTimer > c.burstInterval) {
        burstTimer = 0;
        for (let i = 0; i < c.burstCount; i++)
          doSplat(
            Math.random(),
            Math.random(),
            c.burstForce * (Math.random() - 0.5),
            c.burstForce * (Math.random() - 0.5),
            genColor(6),
            c.burstRadius
          );
      }
      if (ptr.moved) {
        ptr.moved = false;
        const dx = ptr.x - ptr.px,
          dy = ptr.y - ptr.py,
          ar = canvas.width / canvas.height;
        doSplat(
          ptr.x,
          ptr.y,
          (ar < 1 ? dx * ar : dx) * c.SPLAT_FORCE,
          (ar > 1 ? dy / ar : dy) * c.SPLAT_FORCE,
          ptr.color
        );
      }
      simStep(dt);
      render(dt);
    }

    const onMM = (e) => {
      const r = canvas.getBoundingClientRect(),
        pr = Math.min(window.devicePixelRatio || 1, 2);
      ptr.px = ptr.x;
      ptr.py = ptr.y;
      ptr.x = ((e.clientX - r.left) * pr) / canvas.width;
      ptr.y = 1 - ((e.clientY - r.top) * pr) / canvas.height;
      ptr.moved = Math.abs(ptr.x - ptr.px) > 0 || Math.abs(ptr.y - ptr.py) > 0;
    };
    const onTM = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const r = canvas.getBoundingClientRect(),
        pr = Math.min(window.devicePixelRatio || 1, 2);
      ptr.px = ptr.x;
      ptr.py = ptr.y;
      ptr.x = ((t.clientX - r.left) * pr) / canvas.width;
      ptr.y = 1 - ((t.clientY - r.top) * pr) / canvas.height;
      ptr.moved = true;
    };

    window.addEventListener("mousemove", onMM);
    window.addEventListener("touchmove", onTM, { passive: false });
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("touchmove", onTM);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        display: "block",
      }}
    />
  );
}
