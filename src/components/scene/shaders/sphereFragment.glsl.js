/**
 * Sphere fragment shader — PBR lighting, iridescence, rim glow.
 */
export const sphereFragmentShader = `precision highp float;
#define PI 3.14159265359
varying vec3 vNormal,vWorldPos;varying float vDisp;
uniform float uTime,uScrollProgress,uBaseBrightStart,uBaseBrightEnd,uRoughness,uMetallic;
uniform float uSpecularIntensity,uFresnelPower,uFresnelIntensity,uIridescence,uEnvReflect,uEnvBrightness;
uniform float uAoStrength,uAoRange,uRimStrength,uAmbientIntensity;uniform vec3 uRimColor;
uniform vec3 uLight1Pos,uLight2Pos,uLight3Pos;uniform float uLight1Int,uLight2Int,uLight3Int;
uniform float uMeshAlpha;
uniform vec3 uGC1,uGC2,uGC3,uGC4;
float D(float NdH,float r){float a=r*r;float a2=a*a;float d=NdH*NdH*(a2-1.0)+1.0;return a2/(PI*d*d+1e-4);}
float G1(float NdV,float r){float k=((r+1.0)*(r+1.0))/8.0;return NdV/(NdV*(1.0-k)+k+1e-4);}
vec3 F(float c,vec3 F0){return F0+(1.0-F0)*pow(clamp(1.0-c,0.0,1.0),5.0);}
vec3 FR(float c,vec3 F0,float r){return F0+(max(vec3(1.0-r),F0)-F0)*pow(clamp(1.0-c,0.0,1.0),5.0);}
vec3 env(vec3 d,float b){float y=d.y;vec3 t=vec3(.95,.93,.88)*1.2,m=vec3(.35,.38,.42),bo=vec3(.05,.05,.07);
vec3 e=y>0.0?mix(m,t,smoothstep(0.0,.8,y)):mix(m,bo,smoothstep(0.0,-.6,y));
e+=vec3(1,.95,.85)*pow(max(dot(d,normalize(vec3(.4,.5,.7))),0.0),16.0)*.5;
e+=vec3(.6,.7,.9)*pow(max(dot(d,normalize(vec3(-.5,.2,.3))),0.0),8.0)*.15;return e*b;}
vec3 cL(vec3 N,vec3 V,vec3 L,float I,vec3 F0,float r,vec3 al){vec3 H=normalize(V+L);
float NL=max(dot(N,L),0.0),NH=max(dot(N,H),0.0),NV=max(dot(N,V),.001),HV=max(dot(H,V),0.0);
float Dv=D(NH,r);float Gv=G1(NV,r)*G1(NL,r);vec3 Fv=F(HV,F0);
vec3 sp=(Dv*Gv*Fv)/(4.0*NV*NL+1e-4);vec3 kD=(vec3(1)-Fv)*(1.0-uMetallic);
return(kD*al/PI+sp*uSpecularIntensity)*NL*I;}
void main(){vec3 Nm=normalize(vNormal),V=normalize(cameraPosition-vWorldPos);float NV=max(dot(Nm,V),.001);
float bb=mix(uBaseBrightStart,uBaseBrightEnd,uScrollProgress);
vec3 al=vec3(0.03);
vec3 F0=mix(vec3(.04),al,uMetallic);float r=max(uRoughness,.01);
vec3 Lo=cL(Nm,V,normalize(uLight1Pos),uLight1Int,F0,r,al)+cL(Nm,V,normalize(uLight2Pos),uLight2Int,F0,r,al)+cL(Nm,V,normalize(uLight3Pos),uLight3Int,F0,r,al);
vec3 R=reflect(-V,Nm);vec3 Fe=FR(NV,F0,r);float eb=uEnvBrightness*mix(1.0,.15,uScrollProgress);
vec3 sE=env(R,eb)*Fe*uEnvReflect;vec3 dE=env(Nm,eb*.3)*(1.0-Fe)*(1.0-uMetallic)*al;
float ao=1.0-smoothstep(-uAoRange,0.0,vDisp)*uAoStrength;ao=max(ao,.1);
vec3 amb=vec3(uAmbientIntensity)*al*ao;vec3 col=amb+(Lo+sE+dE)*ao;
float ia=dot(Nm,V)*PI+uTime*.15+vDisp*3.0;float is=uIridescence*mix(.15,1.0,uScrollProgress);
col*=mix(vec3(1),vec3(sin(ia*2.5)*.5+.5,sin(ia*2.5+2.094)*.5+.5,sin(ia*2.5+4.189)*.5+.5),is);
col+=uRimColor*pow(1.0-NV,uFresnelPower)*uRimStrength*mix(.5,1.0,uScrollProgress);
col=col/(col+vec3(1));col=pow(col,vec3(1.0/2.2));
gl_FragColor=vec4(col,uMeshAlpha);}`;
