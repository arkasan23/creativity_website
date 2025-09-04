#version 300 es
precision highp float;

in vec4 aPosition;
in vec3 aNormal;

out vec3 vN, vL1, vE;
out float dist1;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec3 lightPos1;

void main(){
  vec3 pos = (modelViewMatrix * aPosition).xyz;
  vec3 L1vec = lightPos1 - pos;
  dist1 = length(L1vec);
  vL1 = normalize(L1vec);

  vE = normalize( -pos );
  vN = normalize( (modelViewMatrix*vec4(aNormal, 0.0)).xyz);
  gl_Position = projectionMatrix * vec4(pos, 1.0);
}
