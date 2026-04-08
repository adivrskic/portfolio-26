/**
 * Shape morphing GLSL functions (cube, tetrahedron, rotation).
 */
export const shapesGLSL = `
uniform float uTetraScale,uCubeScale,uShapeTiltX,uShapeTiltY;
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}
vec3 cubeShape(vec3 p){vec3 n=normalize(p);return n/max(max(abs(n.x),abs(n.y)),abs(n.z))*uCubeScale;}
vec3 tetraShape(vec3 p){vec3 n=normalize(p);
  vec3 f0=vec3(.5774),f1=vec3(.5774,-.5774,-.5774),f2=vec3(-.5774,.5774,-.5774),f3=vec3(-.5774,-.5774,.5774);
  float mx=max(max(dot(n,f0),dot(n,f1)),max(dot(n,f2),dot(n,f3)));
  return n*(.5774/mx)*uTetraScale;}
vec3 getShape(vec3 raw,vec3 noisy,float shape,float noiseMix){
  if(shape<0.5)return noisy;
  mat3 R=rotY(uShapeTiltY)*rotX(uShapeTiltX);
  mat3 Ri=rotX(-uShapeTiltX)*rotY(-uShapeTiltY);
  vec3 rotated=R*raw;
  vec3 geo=shape<1.5?tetraShape(rotated):cubeShape(rotated);
  geo=Ri*geo;
  return geo+normalize(geo)*(length(noisy-raw))*noiseMix;}`;
