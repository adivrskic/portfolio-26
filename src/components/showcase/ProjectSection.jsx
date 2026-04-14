import { Suspense, useRef, Component } from "react";
import { Color, MathUtils, SRGBColorSpace, TextureLoader } from "three";
import { useThree, useFrame, useLoader } from "@react-three/fiber";
import { Text as DreiText } from "@react-three/drei";
import { Flex, Box } from "@react-three/flex";
import {
  L,
  state,
  clamp,
  getSectionY,
  FONT_URL,
  HERO_H,
  SECTION_H,
} from "./ShowcaseLayout";

function Text(props) {
  return <DreiText font={FONT_URL} {...props} />;
}

export function CameraScroll() {
  const { camera, viewport } = useThree();
  const lerp = useRef(0);
  const introOffset = useRef(null);

  useFrame(() => {
    if (introOffset.current === null)
      introOffset.current = viewport.height * 1.3;
    introOffset.current *= 0.975;
    if (Math.abs(introOffset.current) < 0.01) introOffset.current = 0;

    const targetY = getSectionY(state.section);

    if (state.snapCamera) {
      lerp.current = targetY;
      state.snapCamera = false;
    } else {
      lerp.current = MathUtils.lerp(lerp.current, targetY, L.anim.cameraLerp);
    }

    state.top = lerp.current;
    camera.position.y = -lerp.current + introOffset.current;
    camera.position.x = 0;
  });
  return null;
}

function Img({ url, w, h }) {
  const tex = useLoader(TextureLoader, url);
  tex.colorSpace = SRGBColorSpace;

  // Contain: fit image inside w×h without stretching
  const imgW = tex.image?.width || 1;
  const imgH = tex.image?.height || 1;
  const imgAspect = imgW / imgH;
  const boxAspect = w / h;
  const planeW = imgAspect > boxAspect ? w : h * imgAspect;
  const planeH = imgAspect > boxAspect ? w / imgAspect : h;

  return (
    <mesh>
      <planeGeometry args={[planeW, planeH]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

class ImgBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SafeImg(props) {
  return (
    <ImgBoundary>
      <Suspense fallback={null}>
        <Img {...props} />
      </Suspense>
    </ImgBoundary>
  );
}

function FadeIn({ children }) {
  return <group>{children}</group>;
}

// ── Solid section background ──
function GlassCard({ w, h }) {
  return (
    <group>
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color="#e8e8ee"
          transparent={false}
          opacity={1}
          depthWrite={false}
        />
      </mesh>
      <group>
        {[
          [0, h / 2, -0.49, w, 0.01],
          [0, -h / 2, -0.49, w, 0.01],
          [-w / 2, 0, -0.49, 0.01, h],
          [w / 2, 0, -0.49, 0.01, h],
        ].map(([x, y, z, bw, bh], i) => (
          <mesh key={i} position={[x, y, z]}>
            <planeGeometry args={[bw, bh]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={L.card.borderOpacity}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── Mobile layout: stacked vertical ──
function MobileSection({ project, index, vw, vh }) {
  const sectionY = -(L.heroH + index * L.sectionH);
  const edgePad = vw * 0.02;
  const cardW = vw - edgePad * 2;
  const cardH = vh - edgePad * 2;
  const cardPad = vw * 0.02;

  if (!state.panels) state.panels = {};
  state.panels[index] = { seamX: 0, forkY: 0, sectionY };

  const D = "#1a1a2e";
  const usableW = cardW - cardPad * 2;
  const imgH = cardH * 0.35;
  const gap = vw * 0.01;

  return (
    <group position={[0, sectionY, 0]}>
      <GlassCard w={cardW} h={cardH} />

      <Flex
        size={[cardW, cardH, 0]}
        position={[-cardW / 2, cardH / 2, 0]}
        flexDirection="column"
        padding={cardPad}
      >
        {/* Hero image */}
        <Box
          height={imgH}
          marginBottom={gap}
          centerAnchor
          alignItems="center"
          justifyContent="center"
        >
          <FadeIn>
            <SafeImg url={project.images[0]} w={usableW} h={imgH} />
          </FadeIn>
        </Box>

        {/* Number watermark */}
        <Box height={vw * 0.12}>
          <FadeIn>
            <Text
              fontSize={vw * 0.1}
              letterSpacing={-0.03}
              color={D}
              anchorX="left"
              anchorY="top"
              fillOpacity={0.04}
            >
              {project.number}
            </Text>
          </FadeIn>
        </Box>

        {/* Tag */}
        <Box height={0.2}>
          <FadeIn>
            <Text
              fontSize={0.09}
              letterSpacing={0.12}
              color={D}
              anchorX="left"
              anchorY="top"
              fillOpacity={0.9}
            >
              {project.tag}
            </Text>
          </FadeIn>
        </Box>

        {/* Title */}
        <Box height={vw * 0.1} marginTop={gap}>
          <FadeIn>
            <Text
              fontSize={vw * 0.07}
              letterSpacing={-0.02}
              lineHeight={1.15}
              color={D}
              anchorX="left"
              anchorY="top"
              textAlign="left"
              maxWidth={usableW * 0.95}
              fillOpacity={0.95}
            >
              {project.title}
            </Text>
          </FadeIn>
        </Box>

        {/* Description */}
        <Box flex={1} marginTop={gap}>
          <FadeIn>
            <Text
              fontSize={0.16}
              lineHeight={1.7}
              color={D}
              anchorX="left"
              anchorY="top"
              textAlign="left"
              maxWidth={usableW * 0.95}
              fillOpacity={0.85}
            >
              {project.text}
            </Text>
          </FadeIn>
        </Box>

        {/* Skills */}
        <Box height={0.25}>
          <FadeIn>
            <Text
              fontSize={0.08}
              letterSpacing={0.06}
              color={D}
              anchorX="left"
              anchorY="top"
              fillOpacity={0.7}
            >
              {project.skills.join("  ·  ")}
            </Text>
          </FadeIn>
        </Box>

        {/* Link */}
        <Box height={0.3} marginTop={gap}>
          <FadeIn>
            <Text
              fontSize={0.09}
              letterSpacing={0.1}
              color={D}
              anchorX="left"
              anchorY="top"
              fillOpacity={0.7}
              onClick={() => window.open(project.link, "_blank")}
              onPointerOver={(e) => {
                document.body.style.cursor = "pointer";
                e.object.material.opacity = 1;
              }}
              onPointerOut={(e) => {
                document.body.style.cursor = "";
                e.object.material.opacity = 0.7;
              }}
            >
              {"VIEW PROJECT  \u2197"}
            </Text>
          </FadeIn>
        </Box>
      </Flex>
    </group>
  );
}

// ── Desktop layout: side-by-side ──
function DesktopSection({ project, index, s, vw, vh }) {
  const sectionY = -(L.heroH + index * L.sectionH);

  const rightClear = vw * 0.04;
  const edgePad = vw * 0.008;
  const cardW = vw - edgePad - rightClear;
  const cardH = vh - edgePad * 2;
  const gap = vw * 0.004;
  const cardPad = vw * 0.005;

  const flipped = index % 2 === 1;

  const imgFrac = 0.55;
  const usableW = cardW - cardPad * 2 - gap;
  const usableH = cardH - cardPad * 2;
  const imgColW = usableW * imgFrac;
  const txtColW = usableW * (1 - imgFrac);
  const heroH = (usableH - gap) * 0.6;
  const stackH = (usableH - gap) * 0.4;
  const stackItemW = (imgColW - gap) / 2;

  const cardOffsetX = -(rightClear - edgePad) / 2;

  const imgColCenterX =
    cardOffsetX +
    (flipped
      ? cardW / 2 - cardPad - imgColW / 2
      : -(cardW / 2 - cardPad - imgColW / 2));
  const forkY = usableH / 2 - heroH - gap / 2;

  if (!state.panels) state.panels = {};
  state.panels[index] = { seamX: imgColCenterX, forkY, sectionY };

  const D = "#1a1a2e";

  return (
    <group position={[cardOffsetX, sectionY, 0]}>
      <GlassCard w={cardW} h={cardH} />

      <Flex
        size={[cardW, cardH, 0]}
        position={[-cardW / 2, cardH / 2, 0]}
        flexDirection={flipped ? "row-reverse" : "row"}
        padding={cardPad}
      >
        {/* Image column */}
        <Box
          flex={imgFrac}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          marginRight={flipped ? 0 : gap}
          marginLeft={flipped ? gap : 0}
        >
          <Box
            flex={0.6}
            marginBottom={gap}
            centerAnchor
            justifyContent="center"
            alignItems="center"
          >
            <FadeIn>
              <SafeImg url={project.images[0]} w={imgColW} h={heroH} />
            </FadeIn>
          </Box>

          <Box
            flex={0.4}
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              flex={1}
              marginRight={gap / 2}
              centerAnchor
              justifyContent="center"
              alignItems="center"
            >
              <FadeIn>
                <SafeImg url={project.images[1]} w={stackItemW} h={stackH} />
              </FadeIn>
            </Box>
            <Box
              flex={1}
              marginLeft={gap / 2}
              centerAnchor
              justifyContent="center"
              alignItems="center"
            >
              <FadeIn>
                <SafeImg url={project.images[2]} w={stackItemW} h={stackH} />
              </FadeIn>
            </Box>
          </Box>
        </Box>

        {/* Text column */}
        <Box
          flex={1 - imgFrac}
          flexDirection="column"
          justifyContent="center"
          paddingLeft={vw * 0.015}
          paddingRight={vw * 0.005}
        >
          <Box height={2.2}>
            <FadeIn>
              <Text
                fontSize={2.0}
                letterSpacing={-0.03}
                color={D}
                anchorX="left"
                anchorY="top"
                fillOpacity={0.04}
              >
                {project.number}
              </Text>
            </FadeIn>
          </Box>

          <Box height={0.3}>
            <FadeIn>
              <Text
                fontSize={0.12}
                letterSpacing={0.15}
                color={D}
                anchorX="left"
                anchorY="top"
                fillOpacity={0.9}
              >
                {project.tag}
              </Text>
            </FadeIn>
          </Box>

          <Box height={1.2}>
            <FadeIn>
              <Text
                fontSize={0.9}
                letterSpacing={-0.02}
                lineHeight={1.15}
                color={D}
                anchorX="left"
                anchorY="top"
                textAlign="left"
                maxWidth={txtColW * 0.95}
                fillOpacity={0.95}
              >
                {project.title}
              </Text>
            </FadeIn>
          </Box>

          <Box height={2.4}>
            <FadeIn>
              <Text
                fontSize={0.22}
                lineHeight={1.75}
                color={D}
                anchorX="left"
                anchorY="top"
                textAlign="left"
                maxWidth={txtColW * 0.9}
                fillOpacity={0.85}
              >
                {project.text}
              </Text>
            </FadeIn>
          </Box>

          <Box height={0.3}>
            <FadeIn>
              <Text
                fontSize={0.1}
                letterSpacing={0.08}
                color={D}
                anchorX="left"
                anchorY="top"
                fillOpacity={0.7}
              >
                {project.skills.join("  ·  ")}
              </Text>
            </FadeIn>
          </Box>

          <Box height={0.4} marginTop={0.3}>
            <FadeIn>
              <Text
                fontSize={0.11}
                letterSpacing={0.1}
                color={D}
                anchorX="left"
                anchorY="top"
                fillOpacity={0.7}
                onClick={() => window.open(project.link, "_blank")}
                onPointerOver={(e) => {
                  document.body.style.cursor = "pointer";
                  e.object.material.opacity = 1;
                }}
                onPointerOut={(e) => {
                  document.body.style.cursor = "";
                  e.object.material.opacity = 0.7;
                }}
              >
                {"VIEW PROJECT  \u2197"}
              </Text>
            </FadeIn>
          </Box>
        </Box>
      </Flex>
    </group>
  );
}

// ── Router: picks mobile or desktop layout based on viewport ──
export function ProjectSection({ project, index, s, vw, vh }) {
  // vw < ~8 R3F units ≈ roughly 768px screen width at fov 45 distance 12
  const isMobile = vw < 8;

  if (isMobile) {
    return <MobileSection project={project} index={index} vw={vw} vh={vh} />;
  }
  return (
    <DesktopSection project={project} index={index} s={s} vw={vw} vh={vh} />
  );
}

export function Hero({ s, vw }) {
  const groupRef = useRef();
  const opRef = useRef(0);
  const matsRef = useRef(null);
  const lockedVw = useRef(null);
  if (vw > 1 && lockedVw.current === null) lockedVw.current = vw;
  const w = lockedVw.current || vw;

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const dist = Math.abs(camera.position.y);
    const target = clamp(1 - (dist - 1) / 5, 0, 1);
    opRef.current += (target - opRef.current) * 0.03;
    // Cache materials on first frame to avoid traverse() every frame
    if (!matsRef.current) {
      matsRef.current = [];
      groupRef.current.traverse((child) => {
        if (child.material && child.material.opacity !== undefined) {
          child.material.transparent = true;
          matsRef.current.push(child.material);
        }
      });
    }
    const mats = matsRef.current;
    for (let i = 0; i < mats.length; i++) {
      mats[i].opacity = opRef.current;
    }
  });

  return (
    <group position={[0, 0, -1]} ref={groupRef}>
      <Text
        position={[0, 0, 0]}
        fontSize={w * L.hero.titleSize}
        lineHeight={1}
        letterSpacing={-0.03}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={w * 0.95}
        color={L.hero.titleColor}
      >
        Selected Work
      </Text>
    </group>
  );
}
