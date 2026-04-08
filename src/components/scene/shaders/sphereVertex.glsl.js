import { noiseGLSL } from "./noise.glsl.js";
import { shapesGLSL } from "./shapes.glsl.js";
import { waveGLSL } from "./wave.glsl.js";

/**
 * Sphere vertex shader — noise displacement, mouse interaction, shape morphing.
 */
export const sphereVertexShader = `precision highp float;\n${noiseGLSL}\n${shapesGLSL}\n${waveGLSL}
uniform float uTime,uNoiseFreq,uNoiseAmp,uNoiseSpeed,uNoiseLac,uNoisePers,uSpikeSharp,uNoiseWarp;
uniform int uNoiseOctaves;uniform vec3 uMouseWorld;
uniform float uMouseStrength,uMouseRadius,uMouseFalloff,uMouseNoiseBoost,uMouseNoiseFreq,uMouseAttract;
uniform float uWaveformMix,uWaveTime,uShape,uBounds;
varying vec3 vNormal,vWorldPos;varying float vDisp;
float cd(vec3 p,vec3 n,float me){vec3 nc=p*uNoiseFreq+uTime*uNoiseSpeed;
float wx=snoise(nc+vec3(0,13.3,7.7)),wy=snoise(nc+vec3(5.1,0,11.9)),wz=snoise(nc+vec3(9.3,17.1,0));
vec3 w=nc+vec3(wx,wy,wz)*uNoiseWarp;float ns=fbm(w,uNoiseLac,uNoisePers,uNoiseOctaves);
float d=pow(abs(ns),uSpikeSharp)*sign(ns)*uNoiseAmp;
d+=snoise(p*uMouseNoiseFreq+uTime*0.8)*uMouseNoiseBoost*me;
d+=me*dot(n,normalize(uMouseWorld-p+vec3(0.001)))*uMouseAttract*0.5;return d;}
void main(){vec3 p=position,n=normalize(normal);
float md=length(p-uMouseWorld),me=exp(-pow(md/uMouseRadius,uMouseFalloff))*uMouseStrength;
float d=cd(p,n,me);vec3 dp=p+n*d;vDisp=d;
float e=0.006;vec3 t=normalize(cross(n,vec3(0,1,0)));
if(length(cross(n,vec3(0,1,0)))<0.001)t=normalize(cross(n,vec3(1,0,0)));
vec3 b=normalize(cross(n,t));
vec3 pp=p+t*e,pm=p-t*e,qp=p+b*e,qm=p-b*e;
float a1=exp(-pow(length(pp-uMouseWorld)/uMouseRadius,uMouseFalloff))*uMouseStrength;
float a2=exp(-pow(length(pm-uMouseWorld)/uMouseRadius,uMouseFalloff))*uMouseStrength;
float a3=exp(-pow(length(qp-uMouseWorld)/uMouseRadius,uMouseFalloff))*uMouseStrength;
float a4=exp(-pow(length(qm-uMouseWorld)/uMouseRadius,uMouseFalloff))*uMouseStrength;
vec3 d1=pp+normalize(pp)*cd(pp,normalize(pp),a1),d2=pm+normalize(pm)*cd(pm,normalize(pm),a2);
vec3 d3=qp+normalize(qp)*cd(qp,normalize(qp),a3),d4=qm+normalize(qm)*cd(qm,normalize(qm),a4);
vNormal=normalize(cross(d1-d2,d3-d4));
vec3 shapeP=getShape(p,dp,uShape,0.25);
vec3 fP=mix(shapeP,wavePos(p,uWaveTime),uWaveformMix);
if(uShape>0.5)vNormal=normalize(mix(vNormal,normalize(shapeP),0.6));
vec3 wN=normalize(cross(wavePos(pp,uWaveTime)-wavePos(pm,uWaveTime),wavePos(qp,uWaveTime)-wavePos(qm,uWaveTime)));
vNormal=normalize(mix(vNormal,wN,uWaveformMix));
vec3 cFP=clamp(fP,vec3(-uBounds),vec3(uBounds));
vWorldPos=(modelMatrix*vec4(cFP,1)).xyz;
gl_Position=projectionMatrix*modelViewMatrix*vec4(cFP,1);}`;
