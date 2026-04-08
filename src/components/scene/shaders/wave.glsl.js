/**
 * Waveform position GLSL function.
 */
export const waveGLSL = `
vec3 wavePos(vec3 p,float wTime){float ang=atan(p.z,p.x);float yN=p.y;
  float pulse=sin(wTime*2.0)*0.08;
  float wv=sin(ang*16.0+wTime*4.0)*(0.3+pulse)+sin(ang*11.0-wTime*3.0)*0.2
    +sin(ang*23.0+wTime*7.0)*0.12+sin(ang*5.0+wTime*1.5)*0.25;
  return vec3(cos(ang)*(1.0+wv*0.35),yN*0.06,sin(ang)*(1.0+wv*0.35));}`;
